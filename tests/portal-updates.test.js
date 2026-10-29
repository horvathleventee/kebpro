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
  let r=await post('/partner/api/complaints',{orderId:'order-one',message:'Próbabejelentés',requestId:d.id(),photo,labelPhoto:photo},a.cookie,a.csrf);assert.equal(r.status,200);const c=(await r.json()).complaint;assert.ok(c.photoId);assert.ok(c.labelPhotoId);assert.notEqual(c.photoId,c.labelPhotoId);
  assert.equal((await post('/partner/api/complaints',{orderId:'order-one',message:'Hiányzik a címke',requestId:d.id(),photo},a.cookie,a.csrf)).status,400);
  assert.equal((await post('/partner/api/complaints',{kind:'general',message:'Általános',requestId:d.id()},a.cookie,a.csrf)).status,200);
  assert.equal((await fetch(origin+'/partner/api/complaint-photo/'+c.photoId,{headers:{Cookie:a.cookie}})).status,200);
  assert.equal((await fetch(origin+'/partner/api/complaint-photo/'+c.photoId,{headers:{Cookie:b.cookie}})).status,404);
  assert.equal((await fetch(origin+'/partner-admin/api/complaint-photo/'+c.photoId,{headers:{Cookie:admin.cookie}})).status,200);
  const report=await fetch(origin+'/partner-admin/api/complaints/'+c.id+'/export',{headers:{Cookie:admin.cookie}});assert.equal(report.status,200);assert.match(report.headers.get('content-disposition'),/attachment/);const html=await report.text();assert.match(html,/Próbabejelentés/);assert.equal((html.match(/data:image\/jpeg;base64,/g)||[]).length,2);assert.equal((await fetch(origin+'/partner-admin/api/complaints/'+c.id+'/export',{headers:{Cookie:a.cookie}})).status,401);
  assert.equal((await fetch(origin+'/partner/api/complaint-photo/'+c.photoId)).status,401);
  r=await post('/partner/api/complaints',{orderId:'order-one',message:'Második',requestId:d.id(),photo:'data:image/jpeg;base64,SGVsbG8=',labelPhoto:photo},a.cookie,a.csrf);assert.equal(r.status,400);
 }finally{await new Promise(r=>server.close(r));await portal.store.close();}
});
test('new orders enqueue staff push once and dispatch only to active subscribed staff',async()=>{
 const state=d.seed();state.users=[{id:'staff-1',role:'staff',status:'approved'},{id:'staff-2',role:'staff',status:'disabled'}];state.pushMode='live';
 state.subscriptions=[{staffUserId:'staff-1',endpoint:'https://fcm.googleapis.com/fcm/send/admin-test',keys:{auth:'a'.repeat(22),p256dh:'b'.repeat(87)},createdAt:'2026-01-01T00:00:00Z'}];
 state.products[0].prices={kg:1000};const input={kind:'order',date:'2026-10-15',requestId:d.id(),expectedPrices:[1000],items:[{productId:state.products[0].id,quantity:2,unit:'kg'}]};
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

test('Monday deadline and two reminder windows use Budapest time and avoid duplicate or answered reminders',()=>{
 const s=d.seed();s.routes=[{id:'monday',name:'Hétfő',days:[1],reminder:'09:00',cutoff:'14:00'}];s.partners=[{id:'p',name:'Partner',routeId:'monday',preferences:{reminders:true,news:false}}];
 const p=s.partners[0],thuBefore=new Date('2026-10-22T14:59:00Z'),thu=new Date('2026-10-22T15:00:00Z'),friBefore=new Date('2026-10-23T07:59:00Z'),fri=new Date('2026-10-23T08:00:00Z');
 assert.equal(d.nextDelivery(s,p,thu).cutoffDate,'2026-10-23');assert.equal(d.nextDelivery(s,p,thu).cutoff,'14:00');
 assert.equal(d.runReminders(s,thuBefore),0);assert.equal(d.runReminders(s,thu),1);assert.equal(d.runReminders(s,thu),0);
 assert.equal(d.runReminders(s,friBefore),0);assert.equal(d.runReminders(s,fri),1);assert.equal(d.runReminders(s,fri),0);
 assert.equal(d.nextDelivery(s,p,new Date('2026-10-23T12:00:00Z')).open,false);
 const other=d.seed();other.routes=[{id:'tuesday',name:'Kedd',days:[2]}];other.partners=[{id:'p',name:'Partner',routeId:'tuesday',preferences:{reminders:true,news:false}}];
 assert.equal(d.runReminders(other,new Date('2026-10-25T16:00:00Z')),1); // Sunday 17:00 after DST change
 other.responses.push({partnerId:'p',date:'2026-10-27',kind:'skip'});assert.equal(d.runReminders(other,new Date('2026-10-26T09:00:00Z')),0);
});
test('Net promotions apply to individual and default prices; unpriced items cannot be ordered',()=>{
 const s=d.seed(),p=s.products[0],a=s.partners[0],b=s.partners[1],request={kind:'order',date:'2026-10-15',requestId:d.id(),items:[{productId:p.id,quantity:2,unit:'kg'}]};
 assert.throws(()=>d.submitResponse(s,a.id,request,clock),/értékesítő/);
 d.updatePrice(s,{productId:p.id,unit:'kg',price:2000});d.updatePrice(s,{productId:p.id,unit:'kg',price:1500,partnerId:a.id});
 d.updatePromotion(s,{productId:p.id,unit:'kg',kind:'discount',value:200});assert.equal(d.priceFor(p,a,'kg'),1300);assert.equal(d.priceFor(p,b,'kg'),1800);
 assert.throws(()=>d.submitResponse(s,a.id,{...request,expectedPrices:[1500]},clock),/árak megváltoztak/);
 const order=d.submitResponse(s,a.id,{...request,expectedPrices:[1300]},clock);assert.equal(order.total,2600);
 d.updatePromotion(s,{productId:p.id,unit:'kg',kind:'fixed',value:1200});assert.equal(d.priceFor(p,a,'kg'),1200);assert.equal(d.priceFor(p,b,'kg'),1200);assert.equal(order.total,2600);
 d.updatePromotion(s,{productId:p.id,unit:'kg',kind:'none'});assert.equal(d.priceFor(p,a,'kg'),1500);
 assert.throws(()=>d.updatePromotion(s,{productId:p.id,unit:'karton',kind:'discount',value:2}));
});

test('Both Monday reminders can be dispatched, and an already answered delivery is suppressed',async()=>{
 const s=d.seed();s.pushMode='live';s.routes=[{id:'monday',name:'Hétfő',days:[1]}];s.partners=[{id:'p',name:'Partner',routeId:'monday',preferences:{reminders:true,news:false}}];
 s.subscriptions=[{partnerId:'p',endpoint:'https://fcm.googleapis.com/fcm/send/notify-test',keys:{auth:'a'.repeat(22),p256dh:'b'.repeat(87)},createdAt:'2026-01-01T00:00:00Z'}];
 let now=new Date('2026-10-22T15:00:00Z');d.runReminders(s,now);s.outbox[0].createdAt=now.toISOString();const store=createStore(':memory:',()=>s);await store.ready;const sent=[];
 try{await dispatchNotifications(store,{dryRun:false,subject:'mailto:test@example.invalid',now:()=>now,send:async(s,p)=>sent.push(JSON.parse(p))});assert.equal(sent.length,1);
 now=new Date('2026-10-23T08:00:00Z');await store.change(state=>{d.runReminders(state,now);state.outbox.at(-1).createdAt=now.toISOString();});
 await dispatchNotifications(store,{dryRun:false,subject:'mailto:test@example.invalid',now:()=>now,send:async(s,p)=>sent.push(JSON.parse(p))});assert.equal(sent.length,2);
 }finally{await store.close();}
});

test('new registrations and complaints queue private, deduplicated push to subscribed active staff',async()=>{
 const state=d.seed();state.pushMode='live';state.users=[{id:'active',role:'staff',status:'approved'},{id:'disabled',role:'staff',status:'disabled'}];
 state.subscriptions=[{staffUserId:'active',endpoint:'https://fcm.googleapis.com/fcm/send/staff-active',keys:{auth:'a'.repeat(22),p256dh:'b'.repeat(87)},createdAt:'2020-01-01T00:00:00Z'},{partnerId:'partner-1',endpoint:'https://fcm.googleapis.com/fcm/send/partner-private',keys:{auth:'a'.repeat(22),p256dh:'b'.repeat(87)},createdAt:'2020-01-01T00:00:00Z'}];
 const store=createStore(':memory:',()=>state);await store.ready;
 try{
  await auth.register(store,{username:'newpartner',password:'Password123',email:'test@example.invalid',company:'Bizalmas név',contact:'Teszt',phone:'123',address:'Teszt cím'});
  await assert.rejects(auth.register(store,{username:'newpartner',password:'Password123',email:'test@example.invalid',company:'Teszt',contact:'Teszt',phone:'123',address:'Teszt cím'}));
  const input={orderId:'order',message:'Bizalmas panasz',requestId:d.id(),photo:'data:image/jpeg;base64,/9j/2Q==',labelPhoto:'data:image/jpeg;base64,/9j/2Q=='};
  await store.change(s=>{s.responses.push({id:'order',partnerId:'partner-1',kind:'order',date:'2026-10-15'});d.submitComplaint(s,'partner-1',input);d.submitComplaint(s,'partner-1',input);});
  let current=await store.read();const messages=current.outbox.filter(m=>['staff-registration','staff-complaint'].includes(m.category));assert.equal(messages.length,2);assert.ok(messages.every(m=>m.staffUserId==='active'));assert.match(messages.find(m=>m.category==='staff-complaint').title,/🚨/);assert.ok(!JSON.stringify(messages).includes('Bizalmas'));
  const sent=[];await dispatchNotifications(store,{dryRun:false,subject:'mailto:test@example.invalid',send:async(sub,payload)=>sent.push({endpoint:sub.endpoint,payload:JSON.parse(payload)})});
  assert.equal(sent.length,2);assert.ok(sent.every(x=>x.endpoint.includes('staff-active')));assert.deepEqual(new Set(sent.map(x=>x.payload.url)),new Set(['/partner-admin/#applications','/partner-admin/#complaints']));
  current=await store.read();assert.ok(current.outbox.filter(m=>['staff-registration','staff-complaint'].includes(m.category)).every(m=>m.status==='complete'));
 }finally{await store.close();}
});

test('partner session remains valid after application restart using the same persistent database',async()=>{
 const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');const dir=await fs.mkdtemp(path.join(os.tmpdir(),'kebpro-session-restart-'));const filename=path.join(dir,'portal.sqlite');let portal,server;
 async function start(){portal=createPortalApp({filename,adminCredentials:{username:'admin',password:'Password123'}});await portal.ready;server=portal.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));return 'http://127.0.0.1:'+server.address().port;}
 async function stop(){await new Promise(r=>server.close(r));server=null;await portal.store.close();portal=null;}
 try{
  let origin=await start();await auth.register(portal.store,{username:'restartuser',password:'Password123',email:'restart@example.invalid',company:'Test',contact:'Test',phone:'123',address:'Test'});await portal.store.change(s=>{const u=s.users.find(x=>x.username==='restartuser');u.status='approved';u.partnerId='partner-1';});
  const login=await fetch(origin+'/partner/api/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username:'restartuser',password:'Password123'})});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];assert.equal((await fetch(origin+'/partner/api/me',{headers:{Cookie:cookie}})).status,200);
  await stop();origin=await start();assert.equal((await fetch(origin+'/partner/api/me',{headers:{Cookie:cookie}})).status,200);
 }finally{if(server)await stop();if(path.dirname(dir)!==os.tmpdir()||!path.basename(dir).startsWith('kebpro-session-restart-'))throw Error('Invalid test directory');await fs.rm(dir,{recursive:true,force:true});}
});

test('closed complaints and photos expire only after four weeks and a fresh backup; reopened and legacy complaints are retained',()=>{
 const now=new Date('2026-10-29T10:00:00Z'),day=86400000,s=d.seed();s.operations={backupAt:now.toISOString()};
 s.partners[0].complaints=[{id:'expired',status:'resolved',resolvedAt:new Date(now-28*day).toISOString(),photoId:'photo-a',labelPhotoId:'photo-b'},{id:'recent',status:'resolved',resolvedAt:new Date(now-27*day).toISOString(),photoId:'photo-c'},{id:'open',status:'open',resolvedAt:new Date(now-50*day).toISOString(),photoId:'photo-d'},{id:'legacy',status:'resolved',updatedAt:new Date(now-100*day).toISOString(),photoId:'photo-e'}];
 s.complaintPhotos=['a','b','c','d','e'].map(x=>({id:'photo-'+x}));const withoutBackup=structuredClone(s);withoutBackup.operations={};require('../portal/retention').purge(withoutBackup,now);assert.equal(withoutBackup.partners[0].complaints.length,4);
 require('../portal/retention').purge(s,now);assert.deepEqual(s.partners[0].complaints.map(c=>c.id),['recent','open','legacy']);assert.deepEqual(s.complaintPhotos.map(p=>p.id),['photo-c','photo-d','photo-e']);assert.equal(s.partners[0].complaints[2].resolvedAt,now.toISOString());assert.equal(s.retention.complaintsDeleted,1);
});
test('staff renewal is offered only in the final two days and extends seven days',()=>{
 const {info,extend,STAFF_DURATION,STAFF_WARNING}=require('../portal/sessions'),now=Date.now();const state={users:[{id:'admin',status:'approved'}],sessions:[{hash:'staff-token',userId:'admin',role:'staff',expires:now+STAFF_WARNING+1}]};
 assert.equal(info(state.sessions[0],now).canExtend,false);state.sessions[0].expires=now+STAFF_WARNING;const old=state.sessions[0].expires;assert.equal(info(state.sessions[0],now).canExtend,true);assert.equal(extend(state,'staff-token',old,now).expiresAt,now+STAFF_DURATION);assert.equal(extend(state,'staff-token',old,now+1000).expiresAt,now+STAFF_DURATION);
});
test('reopening a complaint cancels the deletion date; resolving again starts a fresh period',()=>{
 const s=d.seed(),p=s.partners[0],now=new Date('2026-10-29T10:00:00Z');p.complaints=[{id:'c',status:'resolved',resolvedAt:'2026-10-01T10:00:00Z',revision:1}];
 d.updateComplaint(s,{id:'c',status:'open',reply:'',expectedRevision:1},'admin',now);assert.equal(p.complaints[0].resolvedAt,undefined);
 d.updateComplaint(s,{id:'c',status:'resolved',reply:'Rendezve',expectedRevision:2},'admin',now);assert.equal(p.complaints[0].resolvedAt,now.toISOString());
});

test('admin renewal endpoint requires its own session and CSRF and sets a seven-day cookie',async()=>{
 const portal=createPortalApp({filename:':memory:',adminCredentials:{username:'admin',password:'Password123'}});await portal.ready;const server=portal.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 const post=(url,body,cookie='',csrf='')=>fetch(origin+url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':csrf},body:JSON.stringify(body)});
 try{const login=await post('/partner-admin/api/login',{username:'admin',password:'Password123'});const cookie=login.headers.get('set-cookie').split(';')[0];const html=await(await fetch(origin+'/partner-admin/',{headers:{Cookie:cookie}})).text(),csrf=html.match(/name="csrf-token" content="([^"]+)"/)[1];const expiresAt=Date.now()+86400000;await portal.store.change(s=>{s.sessions.find(x=>x.role==='staff').expires=expiresAt;});
  const me=await(await fetch(origin+'/partner-admin/api/admin',{headers:{Cookie:cookie}})).json();assert.equal(me.loginSession.canExtend,true);
  assert.equal((await post('/partner-admin/api/extend-session',{expiresAt},cookie,'wrong')).status,403);const extended=await post('/partner-admin/api/extend-session',{expiresAt},cookie,csrf);assert.equal(extended.status,200);assert.match(extended.headers.get('set-cookie'),/Max-Age=6047/);assert.ok((await extended.json()).loginSession.expiresAt>Date.now()+6*86400000);
 }finally{await new Promise(r=>server.close(r));await portal.store.close();}
});

test('daily backups retain five recent snapshots by default',async()=>{
 const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),dir=await fs.mkdtemp(path.join(os.tmpdir(),'kebpro-five-backups-'));const state=d.seed();state.users=[];const store=createStore(':memory:',()=>state);await store.ready;
 try{for(let i=0;i<6;i++)await require('../portal/backup').backup(store,dir,{now:new Date(Date.UTC(2026,9,10+i))});assert.equal((await fs.readdir(dir)).filter(f=>f.endsWith('.json')).length,5);}finally{await store.close();if(path.dirname(dir)!==os.tmpdir()||!path.basename(dir).startsWith('kebpro-five-backups-'))throw Error('Invalid test directory');await fs.rm(dir,{recursive:true,force:true});}
});
