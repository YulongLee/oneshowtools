// Explicit opt-in local QA only. Never loads or copies a production API key.
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
if (!process.env.WORD_QA_SSH_KEY || !process.env.WORD_QA_SSH_HOST) throw new Error('Explicit QA SSH configuration required');
const data = process.env.WORD_QA_DATA || await mkdtemp(join(tmpdir(),'word-immersion-browser-qa-'));
const token = randomBytes(32).toString('hex');
Object.assign(process.env,{DATA_DIR:data,APP_URL:'http://localhost:5173',API_HOST:'127.0.0.1',API_PORT:'8787',ONESHOW_MODEL_API_KEY:token,ONESHOW_MODEL_ID:'qwen3.7-flash',ONESHOW_MODEL_BASE_URL:'http://127.0.0.1:8799/v1',ONESHOW_MODEL_EXECUTION_ENABLED:'true',MODEL_CREDENTIAL_ENCRYPTION_KEY:randomBytes(32).toString('base64'),ADMIN_EMAILS:'word-qa@example.com'});
const {db}=await import('../server/database.mjs');
await import('../server/admin.mjs');
const {hashPassword}=await import('../server/security.mjs');
const id=randomUUID(), now=Date.now();
const password=randomBytes(12).toString('hex');
if (!db.prepare('SELECT id FROM users WHERE email=?').get('word-qa@example.com')) {
db.prepare('INSERT INTO users(id,name,email,password_hash,email_verified,created_at,updated_at) VALUES (?,?,?,?,1,?,?)').run(id,'词浸测试','word-qa@example.com',await hashPassword(password),now,now);
db.prepare("INSERT INTO credit_ledger(id,user_id,type,amount,description_zh,description_en,reference_type,reference_id,created_at) VALUES (?,?,'grant',200,'本地测试','Local QA','test',?,?)").run(randomUUID(),id,id,now);
db.prepare("INSERT INTO admin_memberships(user_id,status,mfa_required,version,created_by,created_at,updated_at) VALUES (?,'active',0,1,?,?,?)").run(id,id,now,now);
db.prepare('INSERT INTO admin_membership_roles(user_id,role_id,assigned_by,assigned_at) VALUES (?,?,?,?)').run(id,'admin_role_super_admin',id,now);
console.log(JSON.stringify({email:'word-qa@example.com',password}));
}
let count=0;
const relay=createServer(async(req,res)=>{
  if(req.headers.authorization!==`Bearer ${token}` || req.method!=='POST' || req.url!=='/v1/chat/completions') {res.writeHead(403).end();return;}
  if(++count>8){res.writeHead(429).end();return;}
  try {
    let body=''; for await(const chunk of req){body+=chunk; if(body.length>100000)throw new Error('QA payload too large');}
    const request=JSON.parse(body);
    const payload={purpose:'managed_runtime',service:'word-immersion-local-qa',instruction:request.messages.filter(m=>m.role==='system').map(m=>m.content).join('\n'),messages:request.messages.filter(m=>m.role==='user'),timeoutMs:110000};
    const script=`const {platformModelRoute}=await import('./server/model-gateway.mjs');const route=platformModelRoute('managed_runtime');const p=${JSON.stringify(payload)};const response=await fetch(route.baseUrl.replace(/\\/$/,'')+'/chat/completions',{method:'POST',headers:{authorization:'Bearer '+route.apiKey,'content-type':'application/json',...(route.workspaceId?{'X-DashScope-WorkSpace':route.workspaceId}:{})},body:JSON.stringify({model:route.modelId,messages:[{role:'system',content:p.instruction},...p.messages],max_tokens:4096,enable_thinking:false}),signal:AbortSignal.timeout(110000)});const r=await response.json();if(!response.ok)process.exit(1);console.log(JSON.stringify({text:r.choices[0].message.content,usage:{inputTokens:r.usage.prompt_tokens,outputTokens:r.usage.completion_tokens}}));`;
    const child=spawn('ssh',['-i',process.env.WORD_QA_SSH_KEY,'-o','BatchMode=yes','-o','ConnectTimeout=10',process.env.WORD_QA_SSH_HOST,'cd /var/www/oneshowtools/app && /opt/node-v22/bin/node --env-file=/etc/oneshowtools/oneshowtools.env --input-type=module -'],{stdio:['pipe','pipe','pipe']});
    let output='';child.stdout.on('data',c=>output+=c);child.stderr.resume();child.stdin.end(script);
    const timer=setTimeout(()=>child.kill(),115000);
    await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>code?reject(new Error('Model relay failed')):resolve());}).finally(()=>clearTimeout(timer));
    const result=JSON.parse(output.trim());
    res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({choices:[{message:{role:'assistant',content:result.text}}],usage:{prompt_tokens:result.usage?.inputTokens||0,completion_tokens:result.usage?.outputTokens||0}}));
    console.log(`Real model request ${count} completed`);
  }catch(e){console.log('QA relay error:',e.message);res.writeHead(502).end(JSON.stringify({error:{message:'QA relay failed'}}));}
});
await new Promise(resolve=>relay.listen(8799,'127.0.0.1',resolve));
console.log(JSON.stringify({data}));
await import('../server/index.mjs');
