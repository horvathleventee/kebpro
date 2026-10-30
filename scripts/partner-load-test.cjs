// Local-only load test: fresh disposable storage, synthetic users, no mail/push transport.
const assert=require('node:assert/strict'),https=require('node:https'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {certificate}=require('./testing/certificate.cjs'),{createPortalApp}=require('../portal/app'),domain=require('../portal/domain'),auth=require('../portal/auth');
async function main(){
 const now=new Date('2026-10-20T08:00:00Z'),tls=certificate(),samples=[],failures=[];
 let storage,pgAdmin,ownsSchema=false,portal,server;
 const url=process.env.PORTAL_TEST_DATABASE_URL;
 try{
  if(url){
   const parsed=new URL(url);
   assert(['localhost','127.0.0.1','[::1]'].includes(parsed.hostname),'Load test only allows local PostgreSQL');
   assert(/^\/kebpro_test_[a-z0-9_]+$/.test(parsed.pathname),'Use a dedicated kebpro_test_* database');
   pgAdmin=new(require('pg').Pool)({connectionString:url});
   const found=await pgAdmin.query("SELECT 1 FROM information_schema.schemata WHERE schema_name='kebpro_portal'");assert.equal(found.rowCount,0,'Database already contains portal data; refusing to run');
   ownsSchema=true;storage=require('../portal/postgres/store').createPostgresStore({connectionString:url});
  }
  const password=crypto.randomBytes(18).toString('base64url');
  const localDir=path.resolve(__dirname,'../.local-tests/load-'+crypto.randomUUID());if(!storage)fs.mkdirSync(localDir,{recursive:true});
  portal=createPortalApp({storage,filename:path.join(localDir,'test.sqlite'),now:()=>now,publicOrigin:'https://localhost',adminCredentials:{username:'load-admin',password},testRateLimits:{global:100000,auth:10000}});
  await portal.ready;
  await portal.store.change(s=>{s.products[0].prices={...(s.products[0].prices||{}),kg:2000};});
  server=https.createServer(tls,portal.app);await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const port=server.address().port,origin='https://localhost:'+port;
  async function request(route,{body,cookie='',csrf='',originHeader=origin,ca=tls.cert}={}){
   const started=performance.now();
   return new Promise((resolve,reject)=>{
    const req=https.request({hostname:'127.0.0.1',servername:'localhost',port,path:route,method:body===undefined?'GET':'POST',ca,headers:{Host:'localhost:'+port,Origin:originHeader,Cookie:cookie,'X-CSRF-Token':csrf,...(body!==undefined?{'Content-Type':'application/json'}:{})}},res=>{
     let raw='';res.on('data',c=>raw+=c);res.on('end',()=>{samples.push({route,ms:performance.now()-started,status:res.statusCode});let json;try{json=JSON.parse(raw);}catch{}resolve({status:res.statusCode,headers:res.headers,raw,json,tlsAuthorized:res.socket?.authorized});});
    });req.setTimeout(30000,()=>req.destroy(Error('Request timeout')));req.on('error',reject);if(body!==undefined)req.write(JSON.stringify(body));req.end();
   });
  }
  // Explicit CA trust works; default trust must reject this test-only certificate.
  await assert.rejects(request('/partner/login',{ca:null}));
  const adminLogin=await request('/partner-admin/api/login',{body:{username:'load-admin',password}});assert.equal(adminLogin.status,200);
  assert.match(adminLogin.headers['set-cookie'][0],/; Secure/);assert.match(adminLogin.headers['set-cookie'][0],/HttpOnly/);assert.match(adminLogin.headers['set-cookie'][0],/SameSite=Strict/);
  const adminCookie=adminLogin.headers['set-cookie'][0].split(';')[0];
  const adminPage=await request('/partner-admin/',{cookie:adminCookie}),adminCsrf=adminPage.raw.match(/name="csrf-token" content="([^"]+)"/)[1];
  assert.equal((await request('/partner-admin/api/archive',{cookie:adminCookie,csrf:adminCsrf,body:{},originHeader:'https://evil.example'})).status,403);
  assert.equal((await request('/partner-admin/api/archive',{cookie:adminCookie,body:{}})).status,403);
  const stages=[];let total=0;
  const stageSizes=process.env.PORTAL_LOAD_STAGES ? process.env.PORTAL_LOAD_STAGES.split(',').map(Number) : [10,30,100];
  assert(stageSizes.length>0 && stageSizes.length<=5 && stageSizes.every(n=>Number.isInteger(n)&&n>0&&n<=300) && new Set(stageSizes).size===stageSizes.length,'Invalid load stages (1–300, max 5 distinct stages)');
  for(const concurrent of stageSizes){
   const digest=await auth.passwordHash(password);
   await portal.store.change(s=>{for(let i=0;i<concurrent;i++){const id='load-'+concurrent+'-'+i;s.partners.push({id,name:id,address:'Synthetic test address',routeId:'route-3',preferences:{news:false,reminders:false}});s.users.push({id,username:id,role:'partner',status:'approved',partnerId:id,passwordHash:digest});}});
   const sampleStart=samples.length,started=performance.now();
   await Promise.all(Array.from({length:concurrent},async(_,i)=>{
    try{
     const id='load-'+concurrent+'-'+i;
     const login=await request('/partner/api/login',{body:{username:id,password}});assert.equal(login.status,200);
     const cookie=login.headers['set-cookie'][0].split(';')[0];
     const page=await request('/partner/',{cookie}),csrf=page.raw.match(/name="csrf-token" content="([^"]+)"/)[1];
     const first=await request('/partner/api/me',{cookie});assert.equal(first.status,200);assert.equal(first.json.id,id);
     const body={kind:'order',date:first.json.nextDelivery.date,requestId:crypto.randomUUID(),items:[{productId:first.json.products[0].id,quantity:2,unit:'kg'}],expectedPrices:[2000],note:'Synthetic load test'};
     const [a,b]=await Promise.all([request('/partner/api/responses',{cookie,csrf,body}),request('/partner/api/responses',{cookie,csrf,body})]);
     assert.equal(a.status,200);assert.equal(b.status,200);assert.equal(a.json.response.id,b.json.response.id);
     const archived=await request('/partner-admin/api/archive',{cookie:adminCookie,csrf:adminCsrf,body:{id:a.json.response.id,archived:true,revision:1}});assert.equal(archived.status,200);
     const final=await request('/partner/api/me',{cookie});assert.equal(final.status,200);assert.equal(final.json.history.length,1);assert.equal(final.json.history[0].status,'archived');
    }catch(error){failures.push({stage:concurrent,partnerIndex:i,message:error.message.slice(0,180)});}
   }));
   const elapsedMs=performance.now()-started,values=samples.slice(sampleStart).map(s=>s.ms).sort((a,b)=>a-b);
   const state=await portal.store.read();total+=concurrent;
   const actual=state.responses.filter(r=>r.partnerId.startsWith('load-'));
   stages.push({concurrent,elapsedMs:Math.round(elapsedMs),requests:values.length,medianMs:Math.round(values[Math.floor(values.length*.5)]),p95Ms:Math.round(values[Math.floor(values.length*.95)]),maxMs:Math.round(values.at(-1)),expectedOrders:total,actualOrders:actual.length,archivedOrders:actual.filter(r=>r.archivedAt).length});
   console.log(JSON.stringify(stages.at(-1)));
   if(actual.length!==total||actual.filter(r=>r.archivedAt).length!==total)failures.push({stage:concurrent,message:'Order count or archive count mismatch'});
  }
  const report={at:new Date().toISOString(),storage:url?'postgres':'sqlite-disk',scope:'Local HTTPS HTTP workload; not browser render or production capacity. Rate limits raised because all simulated users share one IP. No emails or push sent.',tls:{certificateValidated:true,untrustedCertificateRejected:true,secureCookie:true,crossOriginRejected:true,csrfRejected:true},stages,failures};
  const out=process.env.PORTAL_LOAD_OUTPUT_DIR ? path.resolve(process.env.PORTAL_LOAD_OUTPUT_DIR) : path.resolve(__dirname,'../output');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'load-'+report.storage+'.json'),JSON.stringify(report,null,2));
  assert.equal(failures.length,0,'Load test failed; see output report');
 }finally{
  if(server)await new Promise(r=>server.close(r));
  if(portal)await portal.store.close();else if(storage)await storage.close();
  if(pgAdmin){try{if(ownsSchema)await pgAdmin.query('DROP SCHEMA IF EXISTS kebpro_portal CASCADE');}finally{await pgAdmin.end();}}
 }
}
main().catch(error=>{console.error(error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g,'[database URL]'));process.exitCode=1;});

