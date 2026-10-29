/* Runs the unmodified migration against an ephemeral PostgreSQL WASM database. */
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
// npm ci --prefix capstone installs the pinned local test dependencies.
// CAPSTONE_TEST_MODULES can point to an existing external node_modules directory.
const runtime=process.env.CAPSTONE_TEST_MODULES;
const {PGlite}=require(runtime ? path.join(runtime,'@electric-sql/pglite') : '@electric-sql/pglite');
const {vector}=require(runtime ? path.join(runtime,'@electric-sql/pglite-pgvector') : '@electric-sql/pglite-pgvector');
const root=path.resolve(__dirname,'..');
const checks=[];
async function run(){
 const db=new PGlite({extensions:{vector}});
 const q=async(sql,args=[]) => (await db.query(sql,args)).rows;
 const rpc=async(sql,args=[]) => (await q(sql,args))[0].result;
 const pass=name=>checks.push(name);
 await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
 const migration=fs.readFileSync(path.join(root,'supabase-schema.sql'),'utf8');
 await db.exec(migration); await db.exec(migration); pass('Unmodified migration executes twice');
 await db.exec('SET ROLE service_role');
 const a=await rpc("SELECT public.upsert_crm_contact($1,$2,$3,$4) result",['Ada Tester',' ADA@EXAMPLE.COM ','Example Co','EXAMPLE.COM']);
 const b=await rpc("SELECT public.upsert_crm_contact($1,$2,$3,$4) result",['Ada Tester','ada@example.com','Example Co','example.com']);
 assert.equal(a.contact_id,b.contact_id);assert.equal(a.company_id,b.company_id);pass('Company/contact normalized upsert deduplicates');
 await q("UPDATE contacts SET lead_status='customer' WHERE id=$1",[a.contact_id]);
 await rpc("SELECT public.upsert_crm_contact($1,$2,$3,$4) result",['Ada Tester','ada@example.com','Example Co','example.com']);
 assert.equal((await q('SELECT lead_status FROM contacts WHERE id=$1',[a.contact_id]))[0].lead_status,'customer');pass('RevOps preserves existing lifecycle status');
 const score=[{vals:[1,1,1,4],cat:'cold',sum:7},{vals:[2,2,2,2],cat:'warm',sum:8},{vals:[3,3,3,4],cat:'warm',sum:13},{vals:[4,3,5,2],cat:'hot',sum:14}];
 for(const [i,s] of score.entries()) {
  const result=await rpc('SELECT public.record_qualification($1::jsonb,$2::jsonb,$3) result',[
   JSON.stringify({name:'Test '+i,email:'bant'+i+'@example.com'}),JSON.stringify({budget_score:s.vals[0],authority_score:s.vals[1],need_score:s.vals[2],timeline_score:s.vals[3],summary:'Verified fixture'}),'fixture-'+i]);
  assert.equal(result.composite_score,s.sum);assert.equal(result.lead_category,s.cat);
 }
 pass('BANT generated score/category boundaries 7,8,13,14');
 const payload=JSON.stringify({name:'Test 3',email:'bant3@example.com'}),scores=JSON.stringify({budget_score:4,authority_score:3,need_score:5,timeline_score:2,summary:'Hot'});
 const replay=await rpc('SELECT public.record_qualification($1::jsonb,$2::jsonb,$3) result',[payload,scores,'fixture-3']);
 assert.equal(replay.replayed,true); assert.equal((await q("SELECT count(*)::int n FROM qualification_logs WHERE request_id='fixture-3'"))[0].n,1);pass('Voice request replay does not duplicate qualification');
 await assert.rejects(()=>rpc('SELECT public.record_qualification($1::jsonb,$2::jsonb,$3) result',[JSON.stringify({name:'Bad',email:'bad@example.com'}),JSON.stringify({budget_score:6,authority_score:1,need_score:1,timeline_score:1}),'bad-score']));
 assert.equal((await q("SELECT count(*)::int n FROM contacts WHERE email='bad@example.com'"))[0].n,0);pass('Invalid BANT rolls back contact and log transaction');
 const d=await rpc('SELECT public.ensure_qualified_deal($1::uuid) result',[replay.contact_id]);
 assert.equal((await rpc('SELECT public.ensure_qualified_deal($1::uuid) result',[replay.contact_id])).deal_id,d.deal_id);pass('Repeated hot qualification reuses an open deal');
 await rpc('SELECT public.finalize_demo_booking($1::uuid,$2::uuid,$3,$4::timestamptz) result',[replay.contact_id,d.deal_id,'fixture-event','2030-01-07T10:00:00Z']);
 assert.equal((await q('SELECT stage FROM deals WHERE id=$1',[d.deal_id]))[0].stage,'demo_booked');
 await assert.rejects(()=>rpc('SELECT public.finalize_demo_booking($1::uuid,$2::uuid,$3,$4::timestamptz) result',[a.contact_id,d.deal_id,'wrong-owner','2030-01-07T10:00:00Z']));pass('Booking updates correct owned deal and rejects mismatched contact');
 const mc=await rpc('SELECT public.create_crm_deal($1,$2,$3,$4) result',['ada@example.com','MCP fixture',100,'mcp-request']);
 const mc2=await rpc('SELECT public.create_crm_deal($1,$2,$3,$4) result',['ada@example.com','MCP fixture',100,'mcp-request']);
 assert.equal(mc.deal.id,mc2.deal.id);assert.equal(mc2.replayed,true);
 await assert.rejects(()=>rpc('SELECT public.create_crm_deal($1,$2,$3,$4) result',['ada@example.com','MCP changed',100,'mcp-request']));pass('MCP create-deal replay protection rejects changed payload');
 const lookup=await rpc('SELECT public.lookup_crm_contact($1,$2) result',[null,'BANT3@example.com']);
 assert.equal(lookup.count,1);assert.equal(lookup.contacts[0].latest_qualification.lead_category,'hot');pass('MCP lookup includes latest qualification');
 const stale=await q("INSERT INTO deals(title,contact_id,updated_at) VALUES('Stale fixture',$1,now()-interval '4 days') RETURNING id,updated_at",[a.contact_id]);
 const old=stale[0].updated_at;
 assert((await rpc('SELECT public.get_stale_deals() result')).some(x=>x.id===stale[0].id));
 await q('UPDATE deals SET followup_drafted_at=now(),followup_draft_id=$2 WHERE id=$1',[stale[0].id,'draft-fixture']);
 assert.equal(String((await q('SELECT updated_at FROM deals WHERE id=$1',[stale[0].id]))[0].updated_at),String(old));
 assert(!(await rpc('SELECT public.get_stale_deals() result')).some(x=>x.id===stale[0].id));pass('Stale query and draft tracking avoid repeat without hiding real activity');
 const e1=Array(1536).fill(0);e1[0]=1;const e2=Array(1536).fill(0);e2[1]=1;
 await q('INSERT INTO knowledgebase(content,metadata,embedding) VALUES($1,$2::jsonb,$3::extensions.vector),($4,$5::jsonb,$6::extensions.vector)',[
 'Matched accounting product',JSON.stringify({product:'accountai'}),JSON.stringify(e1),'Other product',JSON.stringify({product:'other'}),JSON.stringify(e2)]);
 const matches=await q('SELECT * FROM public.match_documents($1::extensions.vector,5,$2::jsonb)',[JSON.stringify(e1),JSON.stringify({product:'accountai'})]);
 assert.equal(matches.length,1);assert.equal(matches[0].similarity,1);pass('1536-dimensional vector retrieval ranks and filters metadata');
 await db.exec('RESET ROLE; SET ROLE anon');
 await assert.rejects(()=>q('SELECT * FROM contacts'));await assert.rejects(()=>q('SELECT public.lookup_crm_contact(NULL,\'ada@example.com\')'));pass('Anonymous table and RPC access denied');
 await db.exec('RESET ROLE');
 const version=(await q('SELECT version()'))[0].version;
 await db.close();
 const report={checked_at:new Date().toISOString(),result:'PASS',engine:version,checks,scope:'Unmodified SQL in PGlite PostgreSQL with pgvector and simulated Supabase roles; no hosted Supabase/PostgREST network calls.'};
 fs.mkdirSync(path.join(root,'validation'),{recursive:true});fs.writeFileSync(path.join(root,'validation/database-validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
