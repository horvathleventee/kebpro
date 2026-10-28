const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createAlerts}=require('../portal/alerts');
const {inspect}=require('../portal/health');
test('Alerts persist thresholds, throttle failures, recover once and never include exception details',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'kebpro-alerts-'));let now=1700000000000;const sent=[];const options={recipient:'ops@example.com',sendEmail:async m=>sent.push(m),stateFile:path.join(dir,'state.json'),now:()=>now};
 try{
  let alerts=createAlerts(options);await alerts.check('database',false);await alerts.check('database',false);assert.equal(sent.length,0);
  alerts=createAlerts(options);await alerts.check('database',false);assert.equal(sent.length,1);assert.match(sent[0].subject,/Hibajelzés/);
  now+=60000;await alerts.check('database',false);assert.equal(sent.length,1);
  now+=3600000;await alerts.check('database',false);assert.equal(sent.length,2);
  now+=300000;await alerts.check('database',true);assert.equal(sent.length,3);assert.match(sent[2].subject,/Helyreállt/);
  await alerts.check('database',true);assert.equal(sent.length,3);assert.equal(sent[0].to,'ops@example.com');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('SMTP failures retry without claiming success and disabled alerts never send',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'kb-alert-fail-'));let now=1700000000000,calls=0;const alerts=createAlerts({recipient:'ops@example.com',stateFile:path.join(dir,'state.json'),threshold:1,now:()=>now,sendEmail:async()=>{calls++;throw Error('SMTP credentials must not leak');}});
 try{assert.equal((await alerts.check('backup',false)).emailFailed,true);now+=60000;await alerts.check('backup',false);assert.equal(calls,1);now+=300000;await alerts.check('backup',false);assert.equal(calls,2);const disabled=createAlerts({sendEmail:()=>{throw Error('Should not send');}});assert.equal((await disabled.check('http',false)).enabled,false);}finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('Health detects stale worker, missing backup and terminal push failures',()=>{
 const now=Date.now(),state={operations:{lastTick:new Date(now).toISOString(),backupAt:new Date(now).toISOString()},outbox:[]};assert.ok(Object.values(inspect(state,now)).every(Boolean));
 state.operations.lastTick=new Date(now-180001).toISOString();state.operations.backupAt=new Date(now-27*3600000).toISOString();state.outbox=[{createdAt:new Date(now).toISOString(),status:'complete',deliveries:{device:{status:'failed'}}}];const checks=inspect(state,now);assert.equal(checks.worker,false);assert.equal(checks.backup,false);assert.equal(checks.push,false);
});
test('Worker reports database failure through independent alert transport even when error-state write fails',async()=>{
 const codes=[];const worker=require('../portal/worker').createWorker({store:{change:async()=>{throw Error('DB unavailable');}},alerts:{check:async(c,ok)=>codes.push([c,ok])}});await assert.rejects(worker.tick(),/DB unavailable/);assert.deepEqual(codes,[['worker',false],['database',false]]);
});
test('Protected health endpoint is unavailable without its token, reports degraded background work',async()=>{
 const {app,store,ready}=require('../portal/app').createPortalApp({filename:':memory:',monitorToken:'test-token'});await ready;const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const url='http://127.0.0.1:'+server.address().port+'/partner/health';
 try{assert.equal((await fetch(url)).status,404);assert.equal((await fetch(url,{headers:{'X-Portal-Monitor':'wrong'}})).status,404);const r=await fetch(url,{headers:{'X-Portal-Monitor':'test-token'}});assert.equal(r.status,503);const p=await r.json();assert.equal(p.checks.database,true);assert.equal(p.checks.worker,false);assert.equal('users' in p,false);}finally{await new Promise(r=>server.close(r));await store.close();}
});

test('Monitor handles outages, database failure, malformed payloads and recovery without leaking the token',async()=>{
 const {createMonitor}=require('../portal/monitor');let response='down';const events=[];
 const monitor=createMonitor({url:'http://localhost/partner/health',token:'private-monitor-token',alerts:{check:async(c,ok)=>events.push([c,ok])},fetchImpl:async(url,options)=>{assert.equal(options.headers['X-Portal-Monitor'],'private-monitor-token');assert.equal(options.redirect,'error');if(response==='down')throw Error('offline');return {status:503,json:async()=>response};}});
 assert.equal((await monitor.check()).healthy,false);assert.deepEqual(events.pop(),['http',false]);
 response={checks:{}};assert.equal((await monitor.check()).checks.http,false);
 response={checks:{database:false}};assert.equal((await monitor.check()).checks.database,false);assert.deepEqual(events.at(-1),['database',false]);
 response={checks:{database:true,worker:true,backup:true,push:true,server:true}};assert.equal((await monitor.check()).healthy,true);assert.deepEqual(events.at(-1),['server',true]);
});
test('Monitor prevents overlapping probes and configuration never loads unrelated production settings',async()=>{
 const {createMonitor}=require('../portal/monitor');let finish;const pending=new Promise(r=>finish=r);let calls=0;
 const m=createMonitor({url:'http://localhost',token:'test',alerts:{check:async()=>{}},fetchImpl:async()=>{calls++;await pending;return {status:200,json:async()=>({checks:{database:true,worker:true,backup:true,push:true,server:true}})};}});
 const a=m.check(),b=m.check();assert.equal(a,b);finish();await a;assert.equal(calls,1);
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'kb-config-'));try{const file=path.join(dir,'config');await fs.writeFile(file,'PORTAL_ALERT_EMAIL=ops@example.com\nDATABASE_URL=do-not-load\nNODE_ENV=production\n');const config=require('../portal/config').loadPortalConfig({file,env:{PORTAL_ALERT_EMAIL:'override@example.com'}});assert.deepEqual(config,{PORTAL_ALERT_EMAIL:'override@example.com'});}finally{await fs.rm(dir,{recursive:true,force:true});}
});
