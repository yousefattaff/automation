// Offline contract tests. No credentials, external requests or email delivery.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const workflows = Object.fromEntries(['03-prospecting','04-revops','05-sdr'].map(name => [name, JSON.parse(fs.readFileSync(path.join(__dirname,'../workflows',name+'.json'),'utf8'))]));
function run(flow,name,input,prior={}) {
  const n=workflows[flow].nodes.find(n=>n.name===name);
  const items=(Array.isArray(input)?input:[input]).map(json=>({json}));
  const getNode=name=>({first:()=>({json:prior[name]}),item:{json:prior[name]}});
  return new Function('$input','$','$execution',n.parameters.jsCode)({first:()=>items[0],all:()=>items},getNode,{id:'offline-test'}).map(x=>x.json);
}
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
const prospect={name:'Mona Ali',company:'Example Ltd',email:'MONA@EXAMPLE.COM',role:'Finance lead',linkedin:null,company_domain:'example.com',website:'https://example.com',source_url:'https://example.com/team',evidence:'Team directory'};
test('rejects unsourced model-only prospects',()=>assert.throws(()=>run('03-prospecting','Validate Prospects',{output:{prospects:[prospect]},intermediateSteps:[]},{'Validate Query':{limit:5}}),/did not call Firecrawl/));
test('rejects source URLs absent from tool evidence',()=>assert.throws(()=>run('03-prospecting','Validate Prospects',{output:{prospects:[prospect]},intermediateSteps:[{action:{tool:'firecrawl_search'},observation:'No results'}]},{'Validate Query':{limit:5}}),/not present/));
test('normalizes and deduplicates sourced prospects',()=>{const r=run('03-prospecting','Validate Prospects',{output:{prospects:[prospect,prospect]},intermediateSteps:[{action:{tool:'firecrawl_search'},observation:'https://example.com/team Mona Ali mona@example.com'}]},{'Validate Query':{limit:5}})[0];assert.equal(r.count,1);assert.equal(r.prospects[0].email,'mona@example.com');});
test('drops invented email even with a sourced page',()=>{const r=run('03-prospecting','Validate Prospects',{output:{prospects:[prospect]},intermediateSteps:[{action:{tool:'firecrawl_scrape'},observation:'https://example.com/team Mona Ali'}]},{'Validate Query':{limit:5}})[0];assert.equal(r.prospects[0].email,null);});
test('optional Hunter failures retain original prospect',()=>{const r=run('03-prospecting','Apply Enrichment',{statusCode:429,body:{}},{'Loop Prospects':{...prospect,email:null}})[0];assert.equal(r.email,null);assert.match(r.enrichment_warning,/failed/);});
test('RevOps rejects email absent from original input',()=>assert.throws(()=>run('04-revops','Normalize Lead',{output:{name:'Mona',email:'madeup@example.com'}},{'Validate Lead Input':{lead_description:'Mona from Example'}}),/not in the supplied evidence/));
test('RevOps constructs normalized RPC parameters',()=>{const r=run('04-revops','Normalize Lead',{output:{name:' Mona ',email:'MONA@EXAMPLE.COM',company_name:'Example',company_domain:'https://www.example.com/team'}},{'Validate Lead Input':{lead_description:'Mona mona@example.com at Example https://www.example.com/team'}})[0];assert.equal(r.p_email,'mona@example.com');assert.equal(r.p_company_domain,'example.com');assert.equal(r.p_source,'outbound');assert.equal(r.p_role,null);});
test('empty manager scope cannot expand to all contacts',()=>{const r=run('05-sdr','Validate SDR Scope',{contact_ids:'[]'})[0];assert.equal(r.filter,'&id=eq.00000000-0000-0000-0000-000000000000');});
test('rejects injected PostgREST contact filter',()=>assert.throws(()=>run('05-sdr','Validate SDR Scope',{contact_ids:'["x)&lead_status=eq.customer"]'}),/UUID/));
test('draft recipient always comes from CRM contact',()=>{const r=run('05-sdr','Validate Draft',{output:{subject:'Hello',body:'A quick introduction.',email:'attacker@example.com'}},{'Loop Contacts':{id:'known-contact',email:'mona@example.com'}})[0];assert.equal(r.email,'mona@example.com');assert.equal(r.contact_id,'known-contact');});
test('rejects email subject header injection',()=>assert.throws(()=>run('05-sdr','Validate Draft',{output:{subject:'Hello\r\nBcc: attacker@example.com',body:'Test'}},{'Loop Contacts':{id:'known-contact',email:'mona@example.com'}}),/one line/));
test('partial batch counts existing drafts and reports failures',()=>{const r=run('05-sdr','Summarize Drafts',[{success:true,draft_id:'r-1'},{success:false,draft_id:'r-2'},{success:false,draft_id:null}])[0];assert.equal(r.success,false);assert.equal(r.drafts_created,2);assert.equal(r.failed,2);});
console.log(`${count} outbound behavior checks passed.`);
