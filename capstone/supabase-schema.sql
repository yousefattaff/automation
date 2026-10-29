-- AccountAI capstone. Run as the Supabase postgres administrator in SQL Editor.
-- Safe to rerun against this schema. Existing Week 2 knowledgebase must have UUID
-- IDs and 1536-dimensional vectors; a different embedding model needs re-ingestion.
BEGIN;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (btrim(name) <> ''),
  domain text UNIQUE CHECK (domain IS NULL OR (domain = lower(btrim(domain)) AND domain !~ '[/[:space:]]')),
  dedupe_key text GENERATED ALWAYS AS (CASE WHEN domain IS NOT NULL THEN 'domain:' || domain ELSE 'name:' || lower(btrim(name)) END) STORED UNIQUE,
  industry text, size text, website text, annual_revenue text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (btrim(name) <> ''),
  email text UNIQUE CHECK (email IS NULL OR (email = lower(btrim(email)) AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  phone text,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  role text, linkedin text,
  source text CHECK (source IN ('inbound','outbound','voice','mcp')),
  lead_status text NOT NULL DEFAULT 'new' CHECK (lead_status IN ('new','qualified','nurture','cold','customer')),
  outreach_drafted_at timestamptz, outreach_draft_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (btrim(title) <> ''),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE RESTRICT,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  stage text NOT NULL DEFAULT 'qualified' CHECK (stage IN ('qualified','demo_booked','proposal','negotiation','won','lost')),
  value numeric CHECK (value IS NULL OR value >= 0), close_date date, assigned_ae text,
  idempotency_key text UNIQUE,
  calendar_event_id text UNIQUE, booked_slot timestamptz,
  followup_drafted_at timestamptz, followup_draft_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.qualification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  transcript_summary text,
  budget_score integer NOT NULL CHECK (budget_score BETWEEN 1 AND 5),
  authority_score integer NOT NULL CHECK (authority_score BETWEEN 1 AND 5),
  need_score integer NOT NULL CHECK (need_score BETWEEN 1 AND 5),
  timeline_score integer NOT NULL CHECK (timeline_score BETWEEN 1 AND 5),
  composite_score integer GENERATED ALWAYS AS (budget_score + authority_score + need_score + timeline_score) STORED,
  lead_category text GENERATED ALWAYS AS (CASE WHEN budget_score + authority_score + need_score + timeline_score >= 14 THEN 'hot' WHEN budget_score + authority_score + need_score + timeline_score >= 8 THEN 'warm' ELSE 'cold' END) STORED,
  request_id text UNIQUE,
  call_timestamp timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_name text, error_message text, execution_id text, node_name text,
  logged_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.knowledgebase (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text, metadata jsonb DEFAULT '{}'::jsonb, embedding vector(1536)
);

CREATE INDEX IF NOT EXISTS contacts_company_idx ON public.contacts(company_id);
CREATE INDEX IF NOT EXISTS contacts_outreach_idx ON public.contacts(lead_status, created_at) WHERE outreach_drafted_at IS NULL AND email IS NOT NULL;
CREATE INDEX IF NOT EXISTS deals_contact_idx ON public.deals(contact_id);
CREATE INDEX IF NOT EXISTS deals_company_idx ON public.deals(company_id);
CREATE INDEX IF NOT EXISTS deals_stale_idx ON public.deals(updated_at) WHERE stage NOT IN ('won','lost');
CREATE INDEX IF NOT EXISTS qualifications_latest_idx ON public.qualification_logs(contact_id, call_timestamp DESC);
CREATE INDEX IF NOT EXISTS error_logs_time_idx ON public.error_logs(logged_at DESC);
CREATE INDEX IF NOT EXISTS knowledgebase_metadata_idx ON public.knowledgebase USING gin(metadata);
CREATE INDEX IF NOT EXISTS knowledgebase_embedding_idx ON public.knowledgebase USING hnsw(embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, extensions AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
-- Creating a draft is not sales activity. Keep the original stale-deal timestamp.
CREATE OR REPLACE FUNCTION public.touch_deal_activity() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, extensions AS $$
BEGIN
  IF (to_jsonb(NEW) - ARRAY['updated_at','followup_drafted_at','followup_draft_id']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['updated_at','followup_drafted_at','followup_draft_id']) THEN
    NEW.updated_at := now();
  ELSE NEW.updated_at := OLD.updated_at;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS contacts_touch_updated_at ON public.contacts;
CREATE TRIGGER contacts_touch_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS companies_touch_updated_at ON public.companies;
CREATE TRIGGER companies_touch_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS deals_touch_updated_at ON public.deals;
CREATE TRIGGER deals_touch_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.touch_deal_activity();

CREATE OR REPLACE FUNCTION public.upsert_crm_contact(
  p_name text, p_email text, p_company_name text DEFAULT NULL,
  p_company_domain text DEFAULT NULL, p_role text DEFAULT NULL,
  p_phone text DEFAULT NULL, p_source text DEFAULT 'outbound',
  p_website text DEFAULT NULL, p_industry text DEFAULT NULL,
  p_size text DEFAULT NULL, p_annual_revenue text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, extensions AS $$
DECLARE v_company_id uuid; v_contact_id uuid; v_email text := nullif(lower(btrim(p_email)), '');
  v_domain text := nullif(lower(btrim(p_company_domain)), '');
BEGIN
  IF nullif(btrim(p_name),'') IS NULL OR v_email IS NULL THEN RAISE EXCEPTION 'name and email are required'; END IF;
  IF p_source NOT IN ('inbound','outbound','voice','mcp') THEN RAISE EXCEPTION 'invalid contact source'; END IF;
  IF nullif(btrim(p_company_name),'') IS NOT NULL THEN
    INSERT INTO public.companies(name,domain,website,industry,size,annual_revenue)
    VALUES (btrim(p_company_name),v_domain,nullif(btrim(p_website),''),nullif(btrim(p_industry),''),nullif(btrim(p_size),''),nullif(btrim(p_annual_revenue),''))
    ON CONFLICT (dedupe_key) DO UPDATE SET
      website = coalesce(EXCLUDED.website,companies.website), industry = coalesce(EXCLUDED.industry,companies.industry),
      size = coalesce(EXCLUDED.size,companies.size), annual_revenue = coalesce(EXCLUDED.annual_revenue,companies.annual_revenue)
    RETURNING id INTO v_company_id;
  END IF;
  INSERT INTO public.contacts(name,email,phone,company_id,role,source)
  VALUES (btrim(p_name),v_email,nullif(btrim(p_phone),''),v_company_id,nullif(btrim(p_role),''),p_source)
  ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name,
    phone=coalesce(EXCLUDED.phone,contacts.phone),company_id=coalesce(EXCLUDED.company_id,contacts.company_id),
    role=coalesce(EXCLUDED.role,contacts.role)
  RETURNING id,company_id INTO v_contact_id,v_company_id;
  RETURN jsonb_build_object('success',true,'contact_id',v_contact_id,'company_id',v_company_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_qualification(p_contact jsonb,p_scores jsonb,p_request_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, extensions AS $$
DECLARE v_contact public.contacts; v_log public.qualification_logs; v_upsert jsonb;
  v_request text := nullif(btrim(p_request_id),''); v_email text := lower(btrim(p_contact->>'email'));
BEGIN
  IF v_request IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('qualification:' || v_request,0));
    SELECT q.* INTO v_log FROM public.qualification_logs q WHERE q.request_id=v_request;
    IF FOUND THEN
      SELECT c.* INTO v_contact FROM public.contacts c WHERE c.id=v_log.contact_id;
      IF v_contact.email IS DISTINCT FROM v_email THEN RAISE EXCEPTION 'request_id belongs to a different contact'; END IF;
      RETURN jsonb_build_object('success',true,'replayed',true,'contact_id',v_contact.id,'company_id',v_contact.company_id,'qualification_id',v_log.id,'log_id',v_log.id,'composite_score',v_log.composite_score,'lead_category',v_log.lead_category,'lead_status',v_contact.lead_status,'deal_id',NULL);
    END IF;
  END IF;
  v_upsert := public.upsert_crm_contact(p_contact->>'name',v_email,p_contact->>'company_name',p_contact->>'company_domain',p_contact->>'role',p_contact->>'phone','voice');
  SELECT c.* INTO v_contact FROM public.contacts c WHERE c.id=(v_upsert->>'contact_id')::uuid;
  INSERT INTO public.qualification_logs(contact_id,transcript_summary,budget_score,authority_score,need_score,timeline_score,request_id)
  VALUES(v_contact.id,left(p_scores->>'summary',8000),(p_scores->>'budget_score')::integer,(p_scores->>'authority_score')::integer,(p_scores->>'need_score')::integer,(p_scores->>'timeline_score')::integer,v_request)
  RETURNING * INTO v_log;
  UPDATE public.contacts SET lead_status=CASE WHEN lead_status='customer' THEN 'customer' WHEN v_log.lead_category='hot' THEN 'qualified' WHEN v_log.lead_category='warm' THEN 'nurture' ELSE 'cold' END WHERE id=v_contact.id RETURNING * INTO v_contact;
  RETURN jsonb_build_object('success',true,'replayed',false,'contact_id',v_contact.id,'company_id',v_contact.company_id,'qualification_id',v_log.id,'log_id',v_log.id,'composite_score',v_log.composite_score,'lead_category',v_log.lead_category,'lead_status',v_contact.lead_status,'deal_id',NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_qualified_deal(p_contact_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, extensions AS $$
DECLARE v_contact public.contacts; v_deal public.deals;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('contact-deal:' || p_contact_id::text,0));
  SELECT c.* INTO STRICT v_contact FROM public.contacts c WHERE c.id=p_contact_id;
  SELECT d.* INTO v_deal FROM public.deals d WHERE d.contact_id=p_contact_id AND d.stage NOT IN ('won','lost') ORDER BY d.created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO public.deals(title,contact_id,company_id,stage) VALUES('AccountAI demo - ' || v_contact.name,v_contact.id,v_contact.company_id,'qualified') RETURNING * INTO v_deal;
  END IF;
  RETURN jsonb_build_object('success',true,'deal_id',v_deal.id,'contact_id',v_contact.id,'company_id',v_contact.company_id,'stage',v_deal.stage,'calendar_event_id',v_deal.calendar_event_id,'booked_slot',v_deal.booked_slot);
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_demo_booking(p_contact_id uuid,p_deal_id uuid,p_event_id text,p_booked_slot timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, extensions AS $$
DECLARE v_deal public.deals;
BEGIN
  IF nullif(btrim(p_event_id),'') IS NULL OR p_booked_slot IS NULL THEN RAISE EXCEPTION 'event ID and booked slot are required'; END IF;
  SELECT d.* INTO STRICT v_deal FROM public.deals d WHERE d.id=p_deal_id AND d.contact_id=p_contact_id FOR UPDATE;
  IF v_deal.stage NOT IN ('qualified','demo_booked') THEN RAISE EXCEPTION 'cannot book a demo for a closed or advanced deal'; END IF;
  IF v_deal.calendar_event_id IS NOT NULL AND v_deal.calendar_event_id<>p_event_id THEN RAISE EXCEPTION 'deal already has a different event'; END IF;
  UPDATE public.deals SET stage='demo_booked',calendar_event_id=p_event_id,booked_slot=p_booked_slot WHERE id=p_deal_id;
  RETURN jsonb_build_object('success',true,'deal_id',p_deal_id,'booked_slot',p_booked_slot,'calendar_event_id',p_event_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.lookup_crm_contact(p_name text DEFAULT NULL,p_email text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, extensions AS $$
DECLARE v_result jsonb;
BEGIN
  IF nullif(btrim(p_name),'') IS NULL AND nullif(btrim(p_email),'') IS NULL THEN RAISE EXCEPTION 'name or email is required'; END IF;
  SELECT coalesce(jsonb_agg(x.row),'[]'::jsonb) INTO v_result FROM (
    SELECT to_jsonb(c) || jsonb_build_object('company',(SELECT to_jsonb(co) FROM public.companies co WHERE co.id=c.company_id),
      'latest_qualification',(SELECT to_jsonb(q) FROM public.qualification_logs q WHERE q.contact_id=c.id ORDER BY q.call_timestamp DESC LIMIT 1)) AS row
    FROM public.contacts c WHERE CASE WHEN nullif(btrim(p_email),'') IS NOT NULL THEN c.email=lower(btrim(p_email)) ELSE lower(c.name)=lower(btrim(p_name)) END
    ORDER BY c.created_at DESC LIMIT 20
  ) x;
  RETURN jsonb_build_object('success',true,'contacts',v_result,'count',jsonb_array_length(v_result));
END;
$$;

CREATE OR REPLACE FUNCTION public.create_crm_deal(p_contact_email text,p_title text,p_value numeric DEFAULT NULL,p_request_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, extensions AS $$
DECLARE v_contact public.contacts; v_deal public.deals; v_key text:=nullif(btrim(p_request_id),'');
BEGIN
  IF nullif(btrim(p_title),'') IS NULL OR p_value<0 THEN RAISE EXCEPTION 'nonempty title and nonnegative value required'; END IF;
  SELECT c.* INTO STRICT v_contact FROM public.contacts c WHERE c.email=lower(btrim(p_contact_email));
  IF v_key IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('deal-request:'||v_key,0));
    SELECT d.* INTO v_deal FROM public.deals d WHERE d.idempotency_key=v_key;
    IF FOUND THEN
      IF v_deal.contact_id IS DISTINCT FROM v_contact.id OR v_deal.title IS DISTINCT FROM btrim(p_title) OR v_deal.value IS DISTINCT FROM p_value THEN RAISE EXCEPTION 'request_id reused with different deal details'; END IF;
      RETURN jsonb_build_object('success',true,'replayed',true,'deal',to_jsonb(v_deal));
    END IF;
  END IF;
  INSERT INTO public.deals(title,contact_id,company_id,value,stage,idempotency_key) VALUES(btrim(p_title),v_contact.id,v_contact.company_id,p_value,'qualified',v_key) RETURNING * INTO v_deal;
  RETURN jsonb_build_object('success',true,'replayed',false,'deal',to_jsonb(v_deal));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_stale_deals(p_limit integer DEFAULT 100)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, extensions AS $$
  SELECT coalesce(jsonb_agg(x.row),'[]'::jsonb) FROM (
    SELECT to_jsonb(d) || jsonb_build_object('contact',jsonb_build_object('id',c.id,'name',c.name,'email',c.email,'role',c.role)) AS row
    FROM public.deals d JOIN public.contacts c ON c.id=d.contact_id
    WHERE d.updated_at < now() - interval '3 days' AND d.stage NOT IN ('won','lost') AND c.email IS NOT NULL
      AND (d.followup_drafted_at IS NULL OR d.followup_drafted_at < d.updated_at)
    ORDER BY d.updated_at LIMIT greatest(1,least(coalesce(p_limit,100),500))
  ) x;
$$;

CREATE OR REPLACE FUNCTION public.match_documents(query_embedding vector(1536),match_count integer DEFAULT 5,filter jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(id uuid,content text,metadata jsonb,similarity double precision)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, extensions AS $$
  SELECT kb.id,kb.content,kb.metadata,1-(kb.embedding <=> query_embedding) AS similarity
  FROM public.knowledgebase kb WHERE kb.metadata @> coalesce(filter,'{}'::jsonb) AND kb.embedding IS NOT NULL
  ORDER BY kb.embedding <=> query_embedding LIMIT greatest(1,least(coalesce(match_count,5),100));
$$;

-- This project is a trusted server integration, not a browser-facing database.
-- No anon/authenticated policies are created. Use the Supabase service-role key in n8n.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['companies','contacts','deals','qualification_logs','error_logs','knowledgebase'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated',t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role',t);
  END LOOP;
END $$;
GRANT USAGE ON SCHEMA public,extensions TO service_role;
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('touch_updated_at','touch_deal_activity','upsert_crm_contact','record_qualification','ensure_qualified_deal','finalize_demo_booking','lookup_crm_contact','create_crm_deal','get_stale_deals','match_documents') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
  END LOOP;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;
