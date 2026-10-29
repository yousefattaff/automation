/* Offline structural, JavaScript and installed-node-schema validation. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const n8nHome = process.env.N8N_PACKAGE_ROOT || path.join(process.env.APPDATA || '', 'npm/node_modules/n8n');
const packageRoot = path.join(n8nHome, 'node_modules');
const errors = [], warnings = [];
const report = {checked_at:new Date().toISOString(), workflows:[], errors, warnings};
let helpers;
try { helpers = require(path.join(packageRoot,'n8n-workflow')).NodeHelpers;
  report.n8n_version=require(path.join(n8nHome,'package.json')).version;
} catch { warnings.push('Installed n8n unavailable; node-schema checks skipped. Set N8N_PACKAGE_ROOT.'); }
const cache=new Map();
function getDescription(node) {
  const [pkg,name] = [node.type.slice(0,node.type.lastIndexOf('.')),node.type.slice(node.type.lastIndexOf('.')+1)];
  const key=node.type+'@'+node.typeVersion;
  if(cache.has(key)) return cache.get(key);
  const dir=path.join(packageRoot,pkg);
  const registry=require(path.join(dir,'dist/known/nodes.json'));
  const entry=registry[name];
  if(!entry) throw new Error('Unknown installed node type '+node.type);
  const cls=require(path.join(dir,entry.sourcePath))[entry.className];
  let obj=new cls();
  if(obj.nodeVersions) {
    obj=obj.nodeVersions[node.typeVersion];
    if(!obj) throw new Error('Unsupported typeVersion '+node.typeVersion);
  } else {
    const versions=[obj.description.version].flat();
    if(!versions.includes(node.typeVersion)) throw new Error('Unsupported typeVersion '+node.typeVersion+'; installed '+versions);
  }
  cache.set(key,obj.description);
  return obj.description;
}
function visitStrings(value, fn, key='') {
  if(typeof value==='string') fn(value,key);
  else if(Array.isArray(value)) value.forEach((v,i)=>visitStrings(v,fn,key+'['+i+']'));
  else if(value && typeof value==='object') Object.entries(value).forEach(([k,v])=>visitStrings(v,fn,key+'.'+k));
}
const files=fs.readdirSync(path.join(root,'workflows')).filter(f=>f.endsWith('.json')).sort();
if(files.length!==11) errors.push('Expected 11 workflow JSON files, got '+files.length);
const workflows=[];
for(const file of files) {
  try { workflows.push({file,w:JSON.parse(fs.readFileSync(path.join(root,'workflows',file),'utf8').replace(/^\uFEFF/,''))}); }
  catch(e) { errors.push(file+': '+e.message); }
}
const allIds=new Set(workflows.map(({w})=>w.id));
for(const {file,w} of workflows) {
  const fail=msg=>errors.push(file+': '+msg);
  const names=new Map((w.nodes||[]).map(n=>[n.name,n]));
  if(names.size!==w.nodes?.length) fail('Duplicate node names');
  if(new Set(w.nodes.map(n=>n.id)).size!==w.nodes.length) fail('Duplicate node IDs');
  if(w.active!==false) fail('Workflow must import inactive');
  if(w.id!=='capstone11' && w.settings?.errorWorkflow!=='capstone11') fail('Missing global error workflow reference');
  if(w.id==='capstone11' && w.settings?.errorWorkflow) fail('Error handler must not recursively call an error workflow');
  const stats={file,id:w.id,nodes:w.nodes.length,connections:0,chat_models:0,code_nodes:0};
  for(const n of w.nodes) {
    const label=n.name;
    if(!Array.isArray(n.position)||n.position.length!==2||!n.position.every(Number.isFinite)) fail(label+': invalid position');
    if(n.credentials && Object.values(n.credentials).some(c=>c.id)) fail(label+': credential ID must not be embedded');
    if(n.type.endsWith('.lmChatOpenRouter')) {
      stats.chat_models++;
      if(n.parameters.model!=='meta-llama/llama-3.3-70b-instruct') fail(label+': requested model default changed');
    } else if(/\.lmChat/.test(n.type)) fail(label+': unexpected chat model provider');
    if(n.type.endsWith('.code')) {
      stats.code_nodes++;
      try {new vm.Script('(async function(){\n'+n.parameters.jsCode+'\n})');}catch(e){fail(label+': Code syntax: '+e.message);}
    }
    if(n.type.endsWith('.outputParserStructured')) {
      try {JSON.parse(n.parameters.inputSchema||n.parameters.jsonSchemaExample);}catch(e){fail(label+': JSON schema: '+e.message);}
    }
    if(n.type.endsWith('.toolWorkflow')||n.type.endsWith('.executeWorkflow')) {
      const target=n.parameters.workflowId?.value||n.parameters.workflowId;
      if(typeof target==='string' && !target.startsWith('=') && !allIds.has(target)) fail(label+': unresolved workflow '+target);
      const child=workflows.find(({w:other})=>other.id===target)?.w;
      const trigger=child?.nodes.find(x=>x.type.endsWith('.executeWorkflowTrigger'));
      if(trigger?.parameters.inputSource==='workflowInputs') {
        const declared=trigger.parameters.workflowInputs.values||[];
        const mapped=n.parameters.workflowInputs;
        for(const f of declared) {
          if(!(f.name in (mapped?.value||{}))) fail(label+': missing child input mapping '+f.name);
          const schema=mapped?.schema?.find(x=>x.id===f.name);
          if(!schema||schema.type!==f.type) fail(label+': child schema mismatch '+f.name);
        }
        for(const f of Object.keys(mapped?.value||{})) if(!declared.some(x=>x.name===f)) fail(label+': unknown child input '+f);
      }
    }
    visitStrings(n.parameters,(value,key)=>{
      for(const match of value.matchAll(/\$\(['"]([^'"]+)['"]\)/g)) if(!names.has(match[1])) fail(label+key+': missing node reference '+match[1]);
      if(value.startsWith('=') && value.includes('{{')) {
        for(const match of value.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
          try {new vm.Script('(function(){return ('+match[1]+');})');}
          catch(e){fail(label+key+': expression syntax: '+e.message);}
        }
      }
    });
    if(helpers) try {
      const desc=getDescription(n);
      const full=helpers.getNodeParameters(desc.properties,n.parameters,true,false,n,desc)||{};
      const issues=helpers.getNodeParametersIssues(desc.properties,{...n,parameters:full},desc,[]);
      if(issues) fail(label+': installed schema issues '+JSON.stringify(issues));
      const known=new Set(desc.properties.map(p=>p.name));
      // n8n adds this common property to polling triggers when loading packages.
      if(desc.polling) known.add('pollTimes');
      for(const p of Object.keys(n.parameters)) if(!known.has(p)) fail(label+': unknown parameter '+p);
    }catch(e){fail(label+': installed schema '+e.message);}
  }
  for(const [source,channels] of Object.entries(w.connections||{})) {
    if(!names.has(source)) fail('Missing connection source '+source);
    for(const [channel,outputs] of Object.entries(channels)) {
      if(!['main','ai_tool','ai_languageModel','ai_outputParser','ai_embedding','ai_memory','ai_document','ai_textSplitter','ai_retriever'].includes(channel)) fail(source+': unexpected channel '+channel);
      if(!Array.isArray(outputs)) {fail(source+': output list malformed');continue;}
      for(const output of outputs) for(const edge of output) {
        stats.connections++;
        if(!names.has(edge.node)) fail('Missing connection destination '+edge.node);
        if(edge.type!==channel) fail(source+': channel/type mismatch');
        if(!Number.isInteger(edge.index)||edge.index<0) fail(source+': invalid input index');
        if(channel==='main' && /\.(lmChat|toolWorkflow|outputParser|embeddings)/.test(names.get(source)?.type||'')) fail(source+': AI subnode wired on main');
        if(channel==='main' && names.get(source)?.type.endsWith('.mcpTrigger')) fail(source+': MCP trigger must use ai_tool input connections');
      }
    }
  }
  for(const n of w.nodes.filter(n=>n.onError==='continueErrorOutput')) {
    const outs=w.connections[n.name]?.main;
    if(!outs || outs.length<2 || !outs.at(-1).length) fail(n.name+': error output is not connected');
  }
  for(const n of w.nodes.filter(n=>n.type.endsWith('.agent'))) {
    const has=channel=>Object.values(w.connections).some(c=>c[channel]?.some(o=>o.some(e=>e.node===n.name)));
    if(!has('ai_languageModel')) fail(n.name+': missing chat model');
    if(n.parameters.hasOutputParser && !has('ai_outputParser')) fail(n.name+': missing output parser');
  }
  report.workflows.push(stats);
}
const manager=workflows.find(({w})=>w.id==='capstone01')?.w;
if(manager?.nodes.filter(n=>n.type.endsWith('.toolWorkflow')).length!==6) errors.push('Manager requires exactly six workflow tools');
report.result=errors.length?'FAIL':'PASS';
report.scope='Offline syntax, graph, sub-workflow interfaces, Code/expression syntax, and installed n8n parameter schemas. Does not authenticate services or execute LLM calls.';
fs.mkdirSync(path.join(root,'validation'),{recursive:true});
fs.writeFileSync(path.join(root,'validation/workflow-validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
process.exitCode=errors.length?1:0;
