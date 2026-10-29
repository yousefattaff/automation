# Workflows -- importable n8n JSON

These are the workflows I authored to fill the gaps in the course exports.
Import them with **n8n -> three-dot menu -> Import from File**, then fix the
credentials (nothing is pre-wired to an account).

| File | Phase | What it does | Needs |
| --- | --- | --- | --- |
| `00-hello-agent.json` | P1 | Smallest agent: manual trigger -> agent -> model. No tools. | OpenAI credential |
| `01-prospecting-sub-agent.json` | P8 | Sub-agent that searches the web for ICP-matched prospects and returns structured output. | OpenAI + Firecrawl (HTTP Header Auth) |
| `02-product-rag-ingest.json` | P5 | Reads product rows from Google Sheets, chunks + embeds them, inserts into Supabase. | Google Sheets + OpenAI + Supabase |
| `03-product-expert-rag.json` | P6 | Chat agent with Supabase retrieval as a tool (agentic RAG). | OpenAI + Supabase |
| `04-elevenlabs-voice-bridge.json` | P4/P6 | Webhook endpoint that ElevenLabs calls as a tool; returns spoken-friendly text. | OpenAI + ElevenLabs |
| `05-voice-roundtrip.json` | P4/P6 | Record -> STT -> agent -> TTS -> audio response. Pairs with `week2/voice.html`. | OpenAI + ElevenLabs |

---

## Import order

1. `00-hello-agent` -- prove n8n + LLM works.
2. `02-product-rag-ingest` -- create the knowledge base (needs the Supabase SQL
   from `res.pdf`).
3. `03-product-expert-rag` -- chat with the knowledge base.
4. `01-prospecting-sub-agent` -- standalone sub-agent. Import it, run it once
   from its own execution, then wire it into the Business Development Manager.
5. `04-elevenlabs-voice-bridge` -- activate it, copy the Production URL, add it
   as a tool in ElevenLabs.
6. `05-voice-roundtrip` -- activate it, paste the Production URL into
   `week2/voice.html`, then record and play.

---

## Credentials to create in n8n

| Credential | Used by | Setup |
| --- | --- | --- |
| OpenAI | every workflow | API key from `platform.openai.com` |
| Google Sheets OAuth2 | `02` | One-click OAuth in n8n cloud |
| Supabase | `02`, `03` | Project URL **without** `/rest/v1` + service role key |
| HTTP Header Auth | `01` | Name `Authorization`, value `Bearer fc-YOUR-FIRECRAWL-KEY` |

### Supabase SQL

Run this once in the Supabase SQL editor (also in `res.pdf`):

```sql
create table if not exists knowledgebase (
  id uuid primary key default gen_random_uuid(),
  content text,
  metadata jsonb,
  embedding vector(1536)
);

create or replace function public.match_documents (
  query_embedding vector(1536),
  match_count int default 5,
  filter jsonb default '{}'
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    id,
    content,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from knowledgebase
  where metadata @ filter
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

The `1536` must match the embedding model. `text-embedding-3-small` = 1536.

---

## Wiring the capstone together

`week3/Workflows - Business Development/Business Development Manager.json`
already has three `toolWorkflow` nodes. After you import
`01-prospecting-sub-agent.json`, its workflow ID is new, so you must do this
once:

1. Open **Business Development Manager**.
2. Click **Call 'prospecting sub-agent'**.
3. In **Workflow**, reselect `01-prospecting-sub-agent` from the dropdown.
4. Repeat for RevOps/SDR if their IDs differ from your instance.
5. In the Prospecting sub-agent, select your Firecrawl credential.

The other two sub-workflows (`Business Development RevOps Sub-Agent.json`,
`Business Development SDR Sub-Agent.json`) are already in the week 3 folder.

---

## Caveats

- **Model names** are set to `gpt-4.1-mini` in the chat-model nodes. Change
  them to whatever your account can access. If you use OpenRouter, swap the
  model node for `OpenRouter Chat Model` or point the OpenAI credential's base
  URL at OpenRouter.
- **Google Sheets** uses `YOUR_SPREADSHEET_ID` / `gid=0` placeholders. Open the
  node and reselect the spreadsheet from the dropdown once.
- **Firecrawl** is called through a generic HTTP Request Tool, so it survives
  n8n's Firecrawl node renames. If your n8n has the native Firecrawl node, you
  can replace it -- keep the same tool description.
- **Supabase Vector Store v1.3** uses the node's name as the tool name, which
  is why the retrieval node is named `product_knowledge_base` (no spaces).
- These are starting points, not a substitute for building them yourself. The
  learning path works better if you build first and diff against these after.
