const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const d=require('../portal/domain'),auth=require('../portal/auth'),{createPortalApp}=require('../portal/app'),{createStore}=require('../portal/store'),{dispatchNotifications}=require('../portal/notifications');
const clock=new Date('2026-10-14T08:00:00Z');
test('complaint photo is size-limited, isolated and accessible only to its partner and staff',async()=>{
 const portal=createPortalApp({filename:':memory:',now:()=>clock,adminCredentials:{username:'admin',password:'Password123'}});await portal.ready;
 for(const [n,id] of [['one','partner-1'],['two','partner-2']]){await auth.register(portal.store,{username:'user'+n,password:'Password123',email:n+'@example.invalid',company:n,contact:n,phone:'123456789',address:'Teszt utca'});await portal.store.change(s=>{const u=s.users.find(x=>x.username==='user'+n);u.status='approved';u.partnerId=id;});}
 await portal.store.change(s=>{s.responses.push({id:'order-one',partnerId:'partner-1',kind:'order',date:'2026-10-15',items:[],createdAt:clock.toISOString()});});
 const server=portal.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 const post=(url,body,cookie='',csrf='')=>fetch(origin+url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':csrf},body:JSON.stringify(body)});
 async function login(base,user){const r=await post(base+'/api/login',{username:user,password:'Password123'}),cookie=r.headers.get('set-cookie').split(';')[0];const html=await(await fetch(origin+base+'/',{headers:{Cookie:cookie}})).text();return {cookie,csrf:html.match(/name="csrf-token" content="([^"]+)"/)[1]};}
 try{
  const a=await login('/partner','userone'),b=await login('/partner','usertwo'),admin=await login('/partner-admin','admin');
  const device={endpoint:'https://fcm.googleapis.com/fcm/send/partner-test',keys:{auth:'a'.repeat(22),p256dh:'b'.repeat(87)},enableNews:true};
  let subscribe=await post('/partner/api/subscription',device,a.cookie,a.csrf);assert.equal(subscribe.status,200);assert.equal((await portal.store.read()).partners.find(p=>p.id==='partner-1').preferences.news,true);
  subscribe=await post('/partner-admin/api/subscription',{...device,endpoint:'https://fcm.googleapis.com/fcm/send/staff-test',enableNews:undefined},admin.cookie,admin.csrf);assert.equal(subscribe.status,200);
  assert.equal((await portal.store.read()).subscriptions.filter(s=>s.staffUserId).length,1);
  const photo='data:image/jpeg;base64,'+fs.readFileSync(path.join(__dirname,'../public/images/optimized/products/kebab-nyars-640.jpg')).toString('base64');
  let r=await post('/partner/api/complaints',{orderId:'order-one',message:'Próbabejelentés',requestId:d.id(),photo},a.cookie,a.csrf);assert.equal(r.status,200);const c=(await r.json()).complaint;assert.ok(c.photoId);
  assert.equal((await fetch(origin+'/partner/api/complaint-photo/'+c.photoId,{headers:{Cookie:a.cookie}})).status,200);
  assert.equal((await fetch(origin+'/partner/api/complaint-photo/'+c.photoId,{headers:{Cookie:b.cookie}})).status,404);
  assert.equal((await fetch(origin+'/partner-admin/api/complaint-photo/'+c.photoId,{headers:{Cookie:admin.cookie}})).status,200);
  assert.equal((await fetch(origin+'/partner/api/complaint-photo/'+c.photoId)).status,401);
  r=await post('/partner/api/complaints',{orderId:'order-one',message:'Második',requestId:d.id(),photo:'data:image/jpeg;base64,SGVsbG8='},a.cookie,a.csrf);assert.equal(r.status,400);
 }finally{await new Promise(r=>server.close(r));await portal.store.close();}
});
test('new orders enqueue staff push once and dispatch only to active subscribed staff',async()=>{
 const state=d.seed();state.users=[{id:'staff-1',role:'staff',status:'approved'},{id:'staff-2',role:'staff',status:'disabled'}];state.pushMode='live';
 state.subscriptions=[{staffUserId:'staff-1',endpoint:'https://fcm.googleapis.com/fcm/send/admin-test',keys:{auth:'a'.repeat(22),p256dh:'b'.repeat(87)},createdAt:'2026-01-01T00:00:00Z'}];
 const input={kind:'order',date:'2026-10-15',requestId:d.id(),items:[{productId:state.products[0].id,quantity:2,unit:'kg'}]};
 d.submitResponse(state,'partner-1',input,clock);d.submitResponse(state,'partner-1',input,clock);assert.equal(state.outbox.filter(n=>n.category==='staff-order').length,1);
 for(const n of state.outbox)n.createdAt=clock.toISOString();
 const store=createStore(':memory:',()=>state);await store.ready;const sent=[];
 try{await dispatchNotifications(store,{dryRun:false,subject:'mailto:test@example.invalid',now:()=>clock,send:async(s,p)=>sent.push({s,p:JSON.parse(p)})});assert.equal(sent.length,1);assert.equal(sent[0].p.url,'/partner-admin/#dashboard');assert.equal((await store.read()).outbox.find(n=>n.category==='staff-order').status,'complete');}
 finally{await store.close();}
});
test('PostgreSQL upgrade adds the photo table without rerunning old indexes',async()=>{
 const queries=[];const client={query:async sql=>{queries.push(sql);return {rows:sql.includes('SELECT max(version)')?[{version:2}]:[]};}};
 await require('../portal/postgres/schema').migrate(client);
 assert.ok(queries.some(q=>q.includes('CREATE TABLE IF NOT EXISTS kebpro_portal.complaint_photos')));
 assert.ok(queries.some(q=>q.includes('VALUES(3)')));
 assert.equal(queries.some(q=>q.includes('CREATE INDEX order_created_page_idx')),false);
});
