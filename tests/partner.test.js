const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const d = require("../portal/domain");
const { createStore } = require("../portal/store");
const { createPortalApp } = require("../portal/app");
const legal=require('../portal/legal');
const legalInput=()=>{const t=legal.snapshot('terms'),p=legal.snapshot('privacy');return {termsAccepted:true,termsVersion:t.version,termsHash:t.hash,privacyVersion:p.version,privacyHash:p.hash};};
const morning = new Date("2026-10-14T08:00:00Z"); // Wednesday 10:00 Budapest
const payload = state => { state.products[0].prices ||= {}; if(state.products[0].prices.kg===undefined) state.products[0].prices.kg=1000; return ({
  expectedPrices:[state.products[0].prices.kg], kind:"order",date:"2026-10-15",requestId:d.id(),
  items:[{productId:state.products[0].id,quantity:2.5,unit:"kg"}],note:"Kérem külön csomagolni.",
});};

test("Budapest schedule uses the previous day cutoff and handles DST/weekends",()=>{
  const state=d.seed(), partner=state.partners[0];
  assert.deepEqual(d.localTime(new Date("2026-10-14T12:00:00Z")),{date:"2026-10-14",time:"14:00"});
  assert.equal(d.nextDelivery(state,partner,morning).date,"2026-10-15");
  assert.equal(d.nextDelivery(state,partner,new Date("2026-10-14T12:00:00Z")).open,false);
  assert.equal(d.nextDelivery(state,partner,new Date("2026-10-16T08:00:00Z")).date,"2026-10-20");
  assert.equal(d.localTime(new Date("2026-10-26T08:00:00Z")).time,"09:00");
  assert.equal(d.validDate("2026-02-30"),false);
});
test("Responses are price-free, server-named, idempotent and limited to one delivery response",()=>{
  const state=d.seed(), input=payload(state);
  input.items[0].name="tampered";
  input.items[0].price=1;
  const a=d.submitResponse(state,"partner-1",input,morning);
  assert.equal(d.submitResponse(state,"partner-1",input,morning).id,a.id);
  assert.equal(state.responses.length,1);
  assert.equal(a.items[0].name,state.products[0].name);
  assert.equal("price" in a.items[0],false);
  assert.throws(()=>d.submitResponse(state,"partner-1",{...input,requestId:d.id()},morning),/már válaszoltál/);
  assert.equal(d.safePartner(state,state.partners[1],morning).history.length,0);
});
test("Invalid quantities, product ids, units and late orders fail",()=>{
  const state=d.seed();
  for(const item of [
    {productId:state.products[0].id,quantity:0,unit:"kg"},
    {productId:state.products[0].id,quantity:1.5,unit:"db"},
    {productId:"missing",quantity:1,unit:"kg"},
    {productId:state.products[0].id,quantity:2,unit:"money"},
  ])assert.throws(()=>d.submitResponse(state,"partner-1",{...payload(state),items:[item]},morning),d.InputError);
  assert.throws(()=>d.submitResponse(state,"partner-1",payload(state),new Date("2026-10-14T12:00:00Z")),/határidő/);
  assert.equal(state.responses.length,0);
});
test("Skip removes a partner from pending; totals never mix units",()=>{
  const state=d.seed();
  d.submitResponse(state,"partner-1",payload(state),morning);
  d.submitResponse(state,"partner-2",{kind:"skip",date:"2026-10-15",requestId:d.id()},morning);
  const view=d.adminView(state,"2026-10-15","route-2");
  assert.equal(view.partners.filter(p=>!p.response).length,0);
  assert.equal(view.responses.length,2);
  assert.deepEqual(view.totals,[{name:state.products[0].name,quantity:2.5,unit:"kg"}]);
  assert.equal(d.adminView(state,"2026-10-15","route-1").responses.length,0);
});
test("News notifications respect explicit preferences and publishing retries are idempotent",()=>{
  const state=d.seed();
  state.partners[1].preferences.news=true;
  const input={title:"Minta akció",body:"1 kg-os gyros: 2000 helyett 1500 Ft. Bemutató.",kind:"Akció",requestId:d.id()};
  d.publishNews(state,input);d.publishNews(state,input);
  assert.equal(state.news.filter(n=>n.title===input.title).length,1);
  assert.deepEqual(state.outbox.map(n=>n.partnerId),["partner-2"]);
  assert.equal(state.outbox[0].status,"simulation");
});
test("Reminders run only in the window, once, for tomorrow's unanswered partners",()=>{
  const state=d.seed();
  assert.equal(d.runReminders(state,new Date("2026-10-14T06:00:00Z")),0);
  d.submitResponse(state,"partner-1",{kind:"skip",date:"2026-10-15",requestId:d.id()},morning);
  assert.equal(d.runReminders(state,morning),1);
  assert.equal(d.runReminders(state,morning),0);
  assert.equal(state.outbox.filter(n=>n.category==="reminder")[0].partnerId,"partner-2");
  assert.equal(d.runReminders(d.seed(),new Date("2026-10-14T12:00:00Z")),0);
  const optedOut=d.seed();optedOut.partners.forEach(p=>p.preferences.reminders=false);
  assert.equal(d.runReminders(optedOut,morning),0);
});
test("Route settings reject reversed times; subscription cannot target arbitrary servers",()=>{
  const state=d.seed();
  assert.throws(()=>d.updateRoute(state,{id:"route-1",days:[1],reminder:"15:00",cutoff:"14:00"}),/határidő/);
  assert.throws(()=>d.updateRoute(state,{id:"route-1",days:[],reminder:"09:00",cutoff:"14:00"}),/napot/);
  assert.throws(()=>d.validateSubscription({endpoint:"https://127.0.0.1/admin",keys:{auth:"a".repeat(22),p256dh:"b".repeat(87)}}),/szolgáltató/);
});
test("Storage survives reopening and rolls back a failed change",async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),"kebpro-portal-test-"));
  const filename=path.join(dir,"test.sqlite");
  let store=createStore(filename,d.seed);
  try{
    await store.ready;
    await store.change(state=>state.partners[0].name="Persistent partner");
    await assert.rejects(store.change(state=>{state.partners[0].name="Broken";throw new Error("rollback");}),/rollback/);
    await store.close();
    store=createStore(filename,d.seed);await store.ready;
    assert.equal((await store.read()).partners[0].name,"Persistent partner");
    await Promise.all([1,2,3].map(i=>store.change(state=>state.news.push({id:String(i)}))));
    assert.equal((await store.read()).news.length,4);
  }finally{await store.close();await fs.rm(dir,{recursive:true,force:true});}
});
test("HTTP authorization, CSRF, partner isolation, order->admin flow and news publication",async()=>{
  const {app,store,ready}=createPortalApp({filename:":memory:",now:()=>morning,adminCredentials:{username:"admin",password:"test-admin-password"}}); await ready;
  await store.ready;
  const server=app.listen(0,"127.0.0.1");
  await new Promise(resolve=>server.on("listening",resolve));
  const base="http://127.0.0.1:"+server.address().port;
  async function login(body){
    const area=body.role==="staff"?"/partner-admin":"/partner";
    if(body.role!=="staff"){const auth=require("../portal/auth");await auth.register(store,{email:body.partnerId+"@example.com",username:body.partnerId,password:"test-partner-password",company:"Test",contact:"Test",phone:"123",address:"Test"});await store.change(s=>{const u=s.users.find(u=>u.username===body.partnerId);u.status="approved";u.partnerId=body.partnerId;});}
    body={username:body.role==="staff"?"admin":body.partnerId,password:body.role==="staff"?"test-admin-password":"test-partner-password"};
    const r=await fetch(base+area+"/api/login",{method:"POST",headers:{"Content-Type":"application/json",Origin:base},body:JSON.stringify(body)});
    assert.equal(r.status,200);
    const cookie=r.headers.get("set-cookie").split(";")[0];
    const page=await fetch(base+area+"/",{headers:{Cookie:cookie}});
    const html=await page.text();
    const csrf=html.match(/name="csrf-token" content="([^"]+)"/)[1];
    return {cookie,csrf,area};
  }
  async function call(url,session,body,origin=base,csrf=session.csrf){
    return fetch(base+(["admin","news"].includes(url.split("?")[0])?"/partner-admin":session.area)+"/api/"+url,{method:body?"POST":"GET",headers:{
      Cookie:session.cookie,Origin:origin,"Content-Type":"application/json","X-CSRF-Token":csrf,
    },...(body?{body:JSON.stringify(body)}:{})});
  }
  try{
    assert.equal((await fetch(base+"/partner/api/me")).status,401);
    const one=await login({role:"partner",partnerId:"partner-1"});
    const two=await login({role:"partner",partnerId:"partner-2"});
    const admin=await login({role:"staff"});
    assert.equal((await call("admin",one)).status,401);
    assert.equal((await call("news",one,{title:"Bad"})).status,403);
    assert.equal((await call("preferences",one,{news:true,reminders:true}, "https://evil.example")).status,403);
    assert.equal((await call("preferences",one,{news:true,reminders:true}, base,"bad")).status,403);
    await store.change(s=>{s.products[0].prices={kg:1000};});
    let state=await store.read();
    const input=payload(state);
    const order=await call("responses",one,input);
    assert.equal(order.status,200);
    assert.equal((await call("responses",one,input)).status,200);
    assert.equal((await (await call("me",two)).json()).history.length,0);
    const createdOrder=(await order.json()).response;
    const complaintInput={orderId:createdOrder.id,message:'Hiányzott egy tétel.',requestId:d.id(),photo:'data:image/jpeg;base64,/9j/2Q==',labelPhoto:'data:image/jpeg;base64,/9j/2Q=='};
    assert.equal((await call('complaints',two,complaintInput)).status,404);
    assert.equal((await call('complaints',one,complaintInput,base,'bad')).status,403);
    const complaintResult=await call('complaints',one,complaintInput);assert.equal(complaintResult.status,200);
    const complaint=(await complaintResult.json()).complaint;
    assert.equal((await (await call('complaints',one,complaintInput)).json()).complaint.id,complaint.id);
    assert.equal(((await (await call('me',two)).json()).complaints||[]).length,0);
    assert.equal((await call('complaints',one,{id:complaint.id,status:'resolved',reply:'Nem jogosult'})).status,400);
    assert.equal((await call('complaints',admin,{id:complaint.id,status:'resolved',reply:'Köszönjük, javítjuk.',expectedRevision:1})).status,200);
    assert.equal((await call('complaints',admin,{id:complaint.id,status:'open',reply:'Régi adat',expectedRevision:1})).status,409);
    const own=await (await call('me',one)).json();assert.equal(own.complaints[0].reply,'Köszönjük, javítjuk.');assert.equal(own.complaints[0].status,'resolved');
    const audit=await store.read();assert.ok(audit.auditLog.at(-1).changes.some(c=>c.collection==='complaints'));

    assert.equal((await call("preferences",one,{news:true,reminders:true})).status,200);
    const post=await call("news",admin,{title:"Minta akció",body:"1 kg-os gyros, 2000 helyett 1500 Ft.",kind:"Akció",requestId:d.id()});
    assert.equal(post.status,200);
    const adminData=await (await call("admin?date=2026-10-15&route=route-4",admin)).json();
    assert.equal(adminData.responses.length,1);
    assert.equal(adminData.totals[0].quantity,2.5);
    assert.equal(adminData.outbox.filter(n=>n.category==="news").length,1);
    const partnerData=await (await call("me",one)).json();
    assert.equal(partnerData.news[0].title,"Minta akció");
    assert.equal("vapid" in partnerData,false);
    assert.equal("sessions" in partnerData,false);
    assert.equal((await call("admin?date=bad",admin)).status,400);
    const sw=await fetch(base+"/partner/sw.js");
    assert.equal(sw.status,200);assert.equal(sw.headers.get("cache-control"),"no-store");
    assert.equal((await fetch(base+"/partner/manifest.webmanifest")).status,200);
    assert.equal((await call("logout",one,{})).status,200);
    assert.equal((await call("me",one)).status,401);
  }finally{await new Promise(resolve=>server.close(resolve));await store.close();}
});

const {dispatchNotifications}=require("../portal/notifications");
function pushFixture(){
  const state=d.seed();
  state.partners[0].preferences.news=true;
  state.subscriptions=[{partnerId:"partner-1",endpoint:"https://fcm.googleapis.com/fcm/send/test",keys:{auth:"a".repeat(22),p256dh:"b".repeat(87)},createdAt:"2026-10-14T07:00:00Z"}];
  state.outbox=[{id:"notice",partnerId:"partner-1",key:"news:test",category:"news",title:"Minta",body:"Minta szöveg",url:"/partner/#news",status:"pending",createdAt:"2026-10-14T07:30:00Z"}];
  return state;
}
test("Push dispatcher defaults to no external sending; live mode is idempotent",async()=>{
  const store=createStore(":memory:",pushFixture);await store.ready;
  let calls=0;
  const options={subject:"mailto:preview@example.com",now:()=>morning,send:async()=>{calls++;}};
  try{
    const dry=await dispatchNotifications(store,options);
    assert.equal(dry.sent,0);assert.equal(calls,0);
    assert.equal((await store.read()).outbox[0].status,"pending");
    assert.equal((await dispatchNotifications(store,{...options,dryRun:false})).sent,1);
    assert.equal((await dispatchNotifications(store,{...options,dryRun:false})).sent,0);
    assert.equal(calls,1);
  }finally{await store.close();}
});
test("Push respects revoked consent and never sends old simulation messages",async()=>{
  const fixture=pushFixture();fixture.partners[0].preferences.news=false;
  fixture.outbox.push({...fixture.outbox[0],id:"simulation",status:"simulation"});
  const store=createStore(":memory:",()=>fixture);await store.ready;
  try{
    await dispatchNotifications(store,{dryRun:false,subject:"mailto:preview@example.com",now:()=>morning,send:async()=>assert.fail("Must not send")});
    const state=await store.read();
    assert.equal(state.outbox[0].status,"cancelled");
    assert.equal(state.outbox[1].status,"simulation");
  }finally{await store.close();}
});
test("Push retries a temporary failure later and removes expired subscriptions",async()=>{
  const store=createStore(":memory:",pushFixture);await store.ready;
  let clock=morning,calls=0;
  const options={dryRun:false,subject:"mailto:preview@example.com",now:()=>clock,send:async()=>{
    calls++;throw Object.assign(new Error("test"),{statusCode:calls===1?503:410});
  }};
  try{
    await dispatchNotifications(store,options);
    await dispatchNotifications(store,options);assert.equal(calls,1);
    clock=new Date(morning.getTime()+60001);
    await dispatchNotifications(store,options);assert.equal(calls,2);
    assert.equal((await store.read()).subscriptions.length,0);
    assert.equal((await store.read()).outbox[0].status,"complete");
  }finally{await store.close();}
});
test("Concurrent push workers claim each device once",async()=>{
  const store=createStore(":memory:",pushFixture);await store.ready;
  let calls=0;
  const options={dryRun:false,subject:"mailto:preview@example.com",now:()=>morning,send:async()=>{calls++;}};
  try{
    await Promise.all([dispatchNotifications(store,options),dispatchNotifications(store,options)]);
    assert.equal(calls,1);
  }finally{await store.close();}
});


test('Registration requires approval; staff and partner sessions are separate; PWA scopes differ',async()=>{
 const sent=[];const {app,store,ready}=createPortalApp({filename:':memory:',sendEmail:async mail=>sent.push(mail),publicOrigin:'https://kebpro.hu',adminCredentials:{username:'admin',password:'local-admin-test-password'}});
 await ready;const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const post=(path,body,cookie='',csrf='')=>fetch(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':csrf},body:JSON.stringify(body)});
 const applicant={...legalInput(),email:'newpartner@example.com',username:'newpartner',password:'long-partner-test-password',company:'Teszt üzlet',contact:'Teszt Elek',phone:'123',address:'Teszt cím',role:'staff',status:'approved'};
 try {
  assert.equal((await post('/partner/api/login',{role:'staff'})).status,401);
  const loginPage=await (await fetch(base+'/partner/login')).text();assert.match(loginPage,/name="termsAccepted" required/);assert.match(loginPage,/adatkezelési tájékoztató tervezetét/);
  const termsDoc=await fetch(base+'/partner/legal/terms/'+applicant.termsVersion);assert.equal(termsDoc.status,200);assert.match(await termsDoc.text(),/tervezet/i);
  assert.equal((await fetch(base+'/partner/legal/terms/invalid')).status,404);
  const {termsAccepted,...unchecked}=applicant;
  assert.equal((await post('/partner/api/register',unchecked)).status,400);
  assert.equal((await post('/partner/api/register',{...applicant,termsAccepted:'true'})).status,400);
  assert.equal((await post('/partner/api/register',{...applicant,termsHash:'stale'})).status,409);
  assert.equal((await post('/partner/api/register',applicant)).status,201);
  assert.equal((await post('/partner/api/register',applicant)).status,409);
  assert.equal((await post('/partner/api/login',applicant)).status,403);
  const state=await store.read(),user=state.users.find(u=>u.username==='newpartner');assert.equal(user.role,'partner');assert.equal(user.status,'pending');assert.notEqual(user.passwordHash,applicant.password);assert.equal(user.termsAcceptance.terms.hash,applicant.termsHash);assert.ok(user.termsAcceptance.acceptedAt);assert.equal(JSON.parse(user.termsAcceptance.termsDocument).version,applicant.termsVersion);assert.equal(require('node:crypto').createHash('sha256').update(user.termsAcceptance.termsDocument).digest('hex'),applicant.termsHash);
  const login=await post('/partner-admin/api/login',{username:'admin',password:'local-admin-test-password'});assert.equal(login.status,200);
  const cookie=login.headers.get('set-cookie').split(';')[0];assert.match(login.headers.get('set-cookie'),/Path=\/partner-admin/);
  const html=await (await fetch(base+'/partner-admin/',{headers:{Cookie:cookie}})).text();const csrf=html.match(/name="csrf-token" content="([^"]+)"/)[1];
  assert.equal((await fetch(base+'/partner/api/me',{headers:{Cookie:cookie}})).status,401);
  const adminData=await (await fetch(base+'/partner-admin/api/admin',{headers:{Cookie:cookie}})).json();assert.equal(JSON.stringify(adminData).includes(user.passwordHash),false);
  assert.equal((await post('/partner-admin/api/applications',{id:user.id,status:'approved',routeId:'fake'},cookie,csrf)).status,400);
  const approval=await post('/partner-admin/api/applications',{id:user.id,status:'approved',routeId:'route-1'},cookie,csrf);assert.equal(approval.status,200);assert.equal((await approval.json()).emailSent,true);assert.equal(sent.length,2);assert.equal(sent[1].to,applicant.email);assert.match(sent[1].text,/https:\/\/kebpro.hu\/partner\/login/);assert.ok(!sent[1].text.includes(applicant.password));
  assert.equal((await post('/partner-admin/api/applications',{id:user.id,status:'approved',routeId:'route-1'},cookie,csrf)).status,409);
  const partnerLogin=await post('/partner/api/login',applicant);assert.equal(partnerLogin.status,200);const partnerCookie=partnerLogin.headers.get('set-cookie').split(';')[0];
  assert.equal((await fetch(base+'/partner-admin/api/admin',{headers:{Cookie:partnerCookie}})).status,401);
  assert.equal((await fetch(base+'/partner/api/me',{headers:{Cookie:partnerCookie}})).status,200);
  const publicPage=await (await fetch(base+'/partner/login')).text();assert.equal(publicPage.includes('/partner-admin'),false);
  for(const area of ['partner','partner-admin']){const manifest=await (await fetch(base+'/'+area+'/manifest.webmanifest')).json();assert.equal(manifest.scope,'/'+area+'/');assert.equal((await fetch(base+'/'+area+'/sw.js')).status,200);}
 } finally {await new Promise(r=>server.close(r));await store.close();}
});

test('Password recovery: 8 characters, email isolation, expiry, one use and session revocation',async()=>{
 const auth=require('../portal/auth'),{createRecovery}=require('../portal/recovery');
 const store=createStore(':memory:',d.seed);await auth.initialize(store,{username:'admin',password:'admin-test-password'});
 let time=Date.now();const sent=[];const service=createRecovery({store,origin:'http://localhost:3002',clock:()=>time,sendEmail:async mail=>sent.push(mail)});
 const input={username:'resetpartner',email:'Reset@Example.com',password:'12345678',company:'Test',contact:'Test',phone:'123',address:'Test'};
 try{
  await assert.rejects(auth.register(store,{...input,password:'1234567'}));
  await auth.register(store,input);const user=(await store.read()).users.find(u=>u.username===input.username);
  await store.change(s=>s.sessions.push({userId:user.id,hash:'oldsession',role:'partner'}));
  const unknown=await service.request({email:'absent@example.com'},'partner');assert.equal(sent.length,0);
  assert.deepEqual(await service.request({email:input.email},'partner'),unknown);assert.equal(sent.length,1);assert.equal(sent[0].to,'reset@example.com');
  const token=sent[0].text.match(/#([a-f0-9]{64})/)[1];assert.equal(JSON.stringify(await store.read()).includes(token),false);
  await service.request({email:input.email},'partner');assert.equal(sent.length,1);
  await assert.rejects(service.reset({token,password:'12345678'},'staff'));
  await assert.rejects(service.reset({token,password:'1234567'},'partner'));
  await service.reset({token,password:input.password},'partner');
  const state=await store.read();assert.equal(state.sessions.length,0);assert.equal(state.users.find(u=>u.id===user.id).status,'pending');assert.ok(await auth.verify(input.password,state.users.find(u=>u.id===user.id).passwordHash));
  await assert.rejects(service.reset({token,password:'newpassword'},'partner'));
  time+=61000;await service.request({email:input.email},'partner');const expired=sent[1].text.match(/#([a-f0-9]{64})/)[1];time+=30*60000;
  await assert.rejects(service.reset({token:expired,password:'newpassword'},'partner'));
  await service.request({email:input.email},'partner');const concurrent=sent[2].text.match(/#([a-f0-9]{64})/)[1];
  const results=await Promise.allSettled([service.reset({token:concurrent,password:'newpassword1'},'partner'),service.reset({token:concurrent,password:'newpassword2'},'partner')]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 }finally{await store.close();}
});

test('Recovery HTTP endpoints work without login and enforce origin; SMTP errors do not reveal accounts',async()=>{
 const messages=[];const {app,store,ready}=createPortalApp({filename:':memory:',sendEmail:async m=>{if(m.subject==='Kebpro · Jelszó visszaállítása')messages.push(m);}});await ready;
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 const post=(path,body,source=origin)=>fetch(origin+'/partner/api/'+path,{method:'POST',headers:{Origin:source,'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
  const body={...legalInput(),username:'httpreset',email:'httpreset@example.com',password:'12345678',company:'Test',contact:'Test',phone:'123',address:'Test'};
  assert.equal((await post('register',body)).status,201);
  assert.equal((await post('forgot-password',{email:body.email},'https://untrusted.example')).status,403);
  assert.equal((await post('forgot-password',{email:body.email})).status,200);assert.equal(messages.length,1);
  const token=messages[0].text.match(/#([a-f0-9]{64})/)[1];
  assert.equal((await post('reset-password',{token,password:body.password})).status,200);
  assert.equal((await post('reset-password',{token,password:body.password})).status,400);
  const failed=require('../portal/recovery').createRecovery({store,origin,sendEmail:async()=>{throw new Error('SMTP unavailable');}});
  const response=await failed.request({email:body.email},'partner');assert.ok(response.message);assert.equal((await store.read()).passwordResets.length,0);
 }finally{await new Promise(r=>server.close(r));await store.close();}
});

test('SMTP adapter sends only to the requested registered address with the existing website mail settings',async()=>{
 const sent=[];const mailer=require('../portal/mailer').createPortalMailer({env:{SMTP_HOST:'smtp.example.com',SMTP_USER:'sender@example.com',SMTP_PASS:'test',MAIL_FROM:'Kebpro <sender@example.com>'},transport:{sendMail:async m=>sent.push(m)}});
 await mailer.send({to:'partner@example.com',subject:'Reset',text:'Test link'});
 assert.equal(sent[0].to,'partner@example.com');assert.equal(sent[0].from,'Kebpro <sender@example.com>');assert.equal('auth' in sent[0],false);
});

test('Staff invitations: verified email, atomic one-use acceptance, expiry, revocation and safe listing',async()=>{
 const auth=require('../portal/auth'),{createInvitations}=require('../portal/invitations');
 const store=createStore(':memory:',d.seed);await auth.initialize(store,{username:'admin',password:'admin-password'});
 const owner=(await store.read()).users[0];let time=Date.now();const messages=[];
 const service=createInvitations({store,origin:'http://localhost:3002',clock:()=>time,sendEmail:async m=>messages.push(m)});
 const token=()=>messages.at(-1).text.match(/#([a-f0-9]{64})/)[1];
 try{
  await assert.rejects(service.invite({email:'staff@example.com'},'not-staff'));
  await service.invite({email:'Staff@example.com'},owner.id);const first=token();
  assert.equal(messages[0].to,'staff@example.com');assert.equal(JSON.stringify(await store.read()).includes(first),false);
  assert.equal(JSON.stringify(service.list(await store.read())).includes('hash'),false);
  await assert.rejects(service.invite({email:'staff@example.com'},owner.id));
  await assert.rejects(service.accept({token:first,username:'admin',password:'12345678'}));
  const results=await Promise.allSettled([service.accept({token:first,username:'colleague',password:'12345678',email:'attacker@example.com'}),service.accept({token:first,username:'other',password:'12345678'})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const user=(await store.read()).users.find(u=>u.email==='staff@example.com');assert.ok(user.emailVerifiedAt);assert.equal(user.role,'staff');assert.equal(user.status,'approved');
  await assert.rejects(service.accept({token:first,username:'reuse',password:'12345678'}));
  await assert.rejects(service.invite({email:'staff@example.com'},owner.id));
  await service.invite({email:'revoke@example.com'},owner.id);const revoked=token();await service.revoke({id:(await store.read()).staffInvitations.at(-1).id},owner.id);await assert.rejects(service.accept({token:revoked,username:'revoked',password:'12345678'}));
  await service.invite({email:'expiry@example.com'},owner.id);const expired=token();time+=24*60*60000;await assert.rejects(service.accept({token:expired,username:'expired',password:'12345678'}));
  const failure=createInvitations({store,origin:'http://localhost:3002',sendEmail:async()=>{throw Error('SMTP');}});await assert.rejects(failure.invite({email:'failure@example.com'},owner.id));assert.equal((await store.read()).staffInvitations.at(-1).status,'failed');
 }finally{await store.close();}
});

test('Invitation HTTP flow requires staff and CSRF; invited staff can log in',async()=>{
 const messages=[];const {app,store,ready}=createPortalApp({filename:':memory:',adminCredentials:{username:'admin',password:'admin-password'},sendEmail:async m=>messages.push(m)});await ready;
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 const post=(path,body,cookie='',csrf='')=>fetch(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':csrf},body:JSON.stringify(body)});
 try{
  assert.equal((await post('/partner-admin/api/invitations',{email:'staff@example.com'})).status,403);
  const login=await post('/partner-admin/api/login',{username:'admin',password:'admin-password'});const cookie=login.headers.get('set-cookie').split(';')[0];
  const html=await (await fetch(origin+'/partner-admin/',{headers:{Cookie:cookie}})).text(),csrf=html.match(/name="csrf-token" content="([^"]+)"/)[1];
  assert.equal((await post('/partner-admin/api/invitations',{email:'staff@example.com'},cookie,'bad')).status,403);
  assert.equal((await post('/partner-admin/api/invitations',{email:'staff@example.com'},cookie,csrf)).status,200);
  const token=messages[0].text.match(/#([a-f0-9]{64})/)[1];
  assert.equal((await post('/partner-admin/api/accept-invitation',{token,username:'NewStaff',password:'12345678'})).status,200);
  assert.equal((await post('/partner-admin/api/login',{username:'NewStaff',password:'12345678'})).status,200);
  assert.equal((await post('/partner/api/login',{username:'NewStaff',password:'12345678'})).status,401);
  assert.equal((await fetch(origin+'/partner-admin/accept-invitation')).status,200);
 }finally{await new Promise(r=>server.close(r));await store.close();}
});

test('Seven daily routes migrate once, retain deliveries and support validated names',()=>{
 const {migrateDailyRoutes}=require('../portal/migrations');const state=d.seed();
 const before=state.partners.map(p=>d.nextDelivery(state,p,morning).date);
 d.submitResponse(state,'partner-1',payload(state),morning);
 migrateDailyRoutes(state,morning);
 assert.equal(state.routes.length,7);assert.equal(new Set(state.routes.flatMap(r=>r.days)).size,7);
 assert.deepEqual(state.partners.map(p=>d.nextDelivery(state,p,morning).date),before);
 assert.equal(state.responses[0].routeId,'route-4');assert.equal(state.responses[0].previousRouteId,'route-2');
 const route=state.routes[0];d.updateRoute(state,{...route,name:'Budapest hétfő'});assert.equal(route.name,'Budapest hétfő');
 assert.throws(()=>d.updateRoute(state,{...route,name:' '}));assert.throws(()=>d.updateRoute(state,{...route,days:[2]}));
 const snapshot=JSON.stringify(state);migrateDailyRoutes(state,new Date('2026-11-01T12:00:00Z'));assert.equal(JSON.stringify(state),snapshot);
});

test('Registration emails contain saved public fields only; duplicates and invalid requests send nothing',async()=>{
 const sent=[];const {app,store,ready}=createPortalApp({filename:':memory:',sendEmail:async mail=>sent.push(mail)});await ready;
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 const register=body=>fetch(origin+'/partner/api/register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const body={...legalInput(),username:'  MailPartner  ',email:'MailPartner@Example.com',password:'private-password-123',company:'  Teszt Cég  ',contact:'Teszt Elek',phone:'+36 30 1234567',address:'Teszt utca 1.',passwordHash:'injected-secret',role:'staff',to:'other@example.com'};
 try{
  assert.equal((await register({...body,password:'short'})).status,400);assert.equal(sent.length,0);
  const response=await register(body);assert.equal(response.status,201);assert.deepEqual(await response.json(),{ok:true,emailSent:true});assert.equal(sent.length,1);
  const mail=sent[0];assert.equal(mail.to,'mailpartner@example.com');
  for(const value of ['Teszt Cég','Teszt Elek','+36 30 1234567','Teszt utca 1.','mailpartner','céges jóváhagyásra vár'])assert.ok(mail.text.includes(value));
  const state=await store.read(),user=state.users.find(u=>u.username==='mailpartner');assert.equal(user.status,'pending');assert.equal(user.role,'partner');
  for(const secret of [body.password,body.passwordHash,user.passwordHash,body.to])assert.equal(JSON.stringify(mail).includes(secret),false);
  assert.equal((await register(body)).status,409);assert.equal(sent.length,1);
 }finally{await new Promise(r=>server.close(r));await store.close();}
});

test('SMTP failure does not roll back registration or invite the user to register twice',async()=>{
 const {app,store,ready}=createPortalApp({filename:':memory:',sendEmail:async()=>{throw Error('SMTP unavailable');}});await ready;
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 try{
  const response=await fetch(origin+'/partner/api/register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({...legalInput(),username:'mailfailure',email:'mailfailure@example.com',password:'12345678',company:'Test',contact:'Test',phone:'123',address:'Test'})});
  assert.equal(response.status,201);assert.deepEqual(await response.json(),{ok:true,emailSent:false});assert.equal((await store.read()).users.find(u=>u.username==='mailfailure').status,'pending');
 }finally{await new Promise(r=>server.close(r));await store.close();}
});

test('Archive timestamps are server-owned, idempotent and independent of delivery date; restore keeps order',()=>{
 const s=d.seed();const order=d.submitResponse(s,'partner-1',payload(s),morning);
 const archivedAt=new Date('2026-10-16T09:00:00Z');
 d.archiveOrder(s,{id:order.id,archived:true,archivedAt:'fake'},'staff-1',archivedAt);
 assert.equal(order.archivedAt,archivedAt.toISOString());assert.equal(order.archivedBy,'staff-1');assert.equal(order.status,'archived');
 d.archiveOrder(s,{id:order.id,archived:true},'staff-2',new Date('2026-10-17T09:00:00Z'));assert.equal(order.archivedAt,archivedAt.toISOString());
 assert.equal(d.adminView(s,'2026-11-01','').allOrders.length,1);assert.equal(d.adminView(s,'2026-11-01','').responses.length,0);
 d.archiveOrder(s,{id:order.id,archived:false},'staff-1');assert.equal(order.archivedAt,undefined);assert.equal(order.status,'received');assert.equal(order.items.length,1);
 assert.throws(()=>d.archiveOrder(s,{id:order.id,archived:'true'},'staff-1'));
});

test('Archive endpoint requires staff session and CSRF',async()=>{
 const {app,store,ready}=createPortalApp({filename:':memory:',now:()=>morning,adminCredentials:{username:'admin',password:'admin-password'}});await ready;
 const order=await store.change(s=>d.submitResponse(s,'partner-1',payload(s),morning));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 const post=(path,body,cookie='',csrf='')=>fetch(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':csrf},body:JSON.stringify(body)});
 try{
  assert.equal((await post('/partner-admin/api/archive',{id:order.id,archived:true})).status,403);
  const login=await post('/partner-admin/api/login',{username:'admin',password:'admin-password'}),cookie=login.headers.get('set-cookie').split(';')[0];
  const page=await (await fetch(origin+'/partner-admin/',{headers:{Cookie:cookie}})).text(),csrf=page.match(/name="csrf-token" content="([^"]+)"/)[1];
  assert.equal((await post('/partner-admin/api/archive',{id:order.id,archived:true},cookie,'bad')).status,403);
  assert.equal((await post('/partner-admin/api/archive',{id:order.id,archived:true},cookie,csrf)).status,200);
  assert.equal((await post('/partner-admin/api/status',{id:order.id,status:'ready'},cookie,csrf)).status,404);
  assert.equal((await post('/partner-admin/api/archive',{id:order.id,archived:false},cookie,csrf)).status,200);
 }finally{await new Promise(r=>server.close(r));await store.close();}
});

test('Multi-day partners can order on each assigned date; reminders and call lists follow each day',()=>{
 const s=d.seed();require('../portal/migrations').migrateDailyRoutes(s,morning);
 d.updatePartner(s,{id:'partner-1',routeIds:['route-4','route-5']});const p=s.partners[0];
 assert.deepEqual(d.deliveries(s,p,morning).slice(0,2).map(d=>d.date),['2026-10-15','2026-10-16']);
 d.submitResponse(s,p.id,payload(s),morning);d.submitResponse(s,p.id,{...payload(s),date:'2026-10-16'},morning);assert.equal(s.responses.length,2);
 assert.throws(()=>d.submitResponse(s,p.id,{...payload(s),date:'2026-10-17'},morning));
 assert.equal(d.adminView(s,'2026-10-16','route-5').partners.some(x=>x.id===p.id),true);
 assert.equal(d.adminView(s,'2026-10-17','').partners.some(x=>x.id===p.id),false);
 assert.throws(()=>d.updatePartner(s,{id:p.id,routeIds:[]}));
 const fresh=d.seed();fresh.partners[0].routeIds=['route-1','route-2'];assert.equal(d.runReminders(fresh,morning),2);assert.equal(d.runReminders(fresh,morning),0);
});

test('Partner edits reopen archived orders, keep audit history and reject stale, foreign or late changes',()=>{
 const s=d.seed(),input=payload(s),r=d.submitResponse(s,'partner-1',input,morning);d.archiveOrder(s,{id:r.id,archived:true},'admin',morning);
 const edit={...input,responseId:r.id,revision:1,requestId:d.id(),items:[{...input.items[0],quantity:7}],note:'Módosítás'};
 d.submitResponse(s,'partner-1',edit,morning);assert.equal(r.revision,2);assert.equal(r.archivedAt,undefined);assert.equal(r.status,'received');assert.equal(r.items[0].quantity,7);assert.equal(r.changes[0].items[0].quantity,2.5);
 d.submitResponse(s,'partner-1',edit,morning);assert.equal(r.revision,2);
 assert.throws(()=>d.submitResponse(s,'partner-1',{...edit,requestId:d.id()},morning));
 assert.throws(()=>d.submitResponse(s,'partner-2',{...edit,requestId:d.id()},morning));
 assert.throws(()=>d.submitResponse(s,'partner-1',{...edit,revision:2,requestId:d.id()},new Date('2026-10-14T12:00:00Z')));
 assert.throws(()=>d.archiveOrder(s,{id:r.id,archived:true,revision:1},'admin',morning));
 d.submitResponse(s,'partner-1',{...edit,kind:'skip',revision:2,requestId:d.id()},morning);assert.equal(r.kind,'skip');assert.ok(d.adminView(s,'2026-10-15','').allOrders.find(o=>o.id===r.id));
});

test('Saved order lists are validated and private to a partner; saving does not submit an order',()=>{
 const s=d.seed();const list=d.saveTemplate(s,'partner-1',{name:'Heti lista',items:payload(s).items});assert.equal(s.responses.length,0);
 assert.equal(d.safePartner(s,s.partners[0],morning).templates.length,1);assert.equal(d.safePartner(s,s.partners[1],morning).templates.length,0);
 assert.throws(()=>d.saveTemplate(s,'partner-2',{id:list.id,remove:true}));assert.throws(()=>d.saveTemplate(s,'partner-1',{name:'Hibás',items:[{productId:'fake',quantity:1,unit:'kg'}]}));
 d.saveTemplate(s,'partner-1',{id:list.id,name:'Heti javítva',items:payload(s).items});assert.equal(s.partners[0].templates.length,1);
 d.saveTemplate(s,'partner-1',{id:list.id,remove:true});assert.equal(s.partners[0].templates.length,0);
});

test('Favorite and template endpoints are session-scoped and reject other partner list IDs',async()=>{
 const auth=require('../portal/auth');const {app,store,ready}=createPortalApp({filename:':memory:',now:()=>morning});await ready;
 for(const n of [1,2]){await auth.register(store,{username:'feature'+n,email:'feature'+n+'@example.com',password:'12345678',company:'Test',contact:'Test',phone:'123',address:'Test'});await store.change(s=>{const u=s.users.find(u=>u.username==='feature'+n);u.status='approved';u.partnerId='partner-'+n;});}
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 const post=(name,body,cookie='',csrf='')=>fetch(origin+'/partner/api/'+name,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':csrf},body:JSON.stringify(body)});
 async function login(n){const r=await post('login',{username:'feature'+n,password:'12345678'}),cookie=r.headers.get('set-cookie').split(';')[0],html=await(await fetch(origin+'/partner/',{headers:{Cookie:cookie}})).text();return {cookie,csrf:html.match(/name="csrf-token" content="([^"]+)"/)[1]};}
 try{
  const one=await login(1),two=await login(2),s=await store.read();
  assert.equal((await post('favorites',{productId:s.products[0].id,favorite:true,partnerId:'partner-2'},one.cookie,one.csrf)).status,200);
  assert.equal((await store.read()).partners[0].favoriteProductIds.length,1);assert.equal((await store.read()).partners[1].favoriteProductIds,undefined);
  const result=await(await post('templates',{name:'Mentett',items:payload(s).items},one.cookie,one.csrf)).json();
  assert.equal((await post('templates',{id:result.template.id,remove:true},two.cookie,two.csrf)).status,404);
  assert.equal((await post('templates',{name:'Hibás',items:[]},one.cookie,one.csrf)).status,400);
  assert.equal((await store.read()).responses.length,0);
 }finally{await new Promise(r=>server.close(r));await store.close();}
});

test('Account disable revokes sessions, reset tokens, devices and pending invitations; self-disable is forbidden',()=>{
 const {setAccountStatus}=require('../portal/audit');const s=d.seed();
 s.users=[{id:'a',username:'admin',role:'staff',status:'approved'},{id:'b',role:'staff',status:'approved'},{id:'p',role:'partner',status:'approved',partnerId:'partner-1'}];
 s.sessions=[{userId:'p'},{userId:'a'}];s.passwordResets=[{userId:'p'}];s.subscriptions=[{partnerId:'partner-1'}];
 s.staffInvitations=[{invitedBy:'b',status:'pending',hash:'secret'}];
 assert.throws(()=>setAccountStatus(s,{id:'a',status:'disabled'},'a'));
 setAccountStatus(s,{id:'p',status:'disabled'},'a');assert.equal(s.sessions.length,1);assert.equal(s.passwordResets.length,0);assert.equal(s.subscriptions.length,0);
 setAccountStatus(s,{id:'b',status:'disabled'},'a');assert.equal(s.staffInvitations[0].status,'revoked');assert.equal(s.staffInvitations[0].hash,undefined);
 assert.throws(()=>setAccountStatus(s,{id:'a',status:'disabled'},'b'));
 setAccountStatus(s,{id:'p',status:'approved'},'a');assert.equal(s.users[2].status,'approved');assert.equal(s.sessions.length,1);
});

test('Audit is atomic, attributed and excludes secrets; rejected mutations leave no log',async()=>{
 const audit=require('../portal/audit'),store=createStore(':memory:',d.seed);await store.ready;
 await store.change(s=>{s.users=[{id:'a',role:'staff',status:'approved',username:'Admin',passwordHash:'private'}];});
 const actor={id:'a',username:'Admin',action:'routes'};
 try{
  await audit.context.run(actor,()=>store.change(s=>{s.routes[0].name='New route';s.users[0].passwordHash='new-secret';}));
  let s=await store.read();assert.equal(s.auditLog.length,1);assert.equal(s.auditLog[0].actorName,'Admin');assert.equal(s.auditLog[0].changes[0].after.name,'New route');assert.ok(!JSON.stringify(s.auditLog).includes('secret'));assert.ok(!JSON.stringify(s.auditLog).includes('passwordHash'));
  await assert.rejects(audit.context.run(actor,()=>store.change(s=>{s.routes[0].name='Rollback';throw Error('Fail');})));
  s=await store.read();assert.equal(s.auditLog.length,1);assert.equal(s.routes[0].name,'New route');
  await store.change(s=>s.users[0].status='disabled');await assert.rejects(audit.context.run(actor,()=>store.change(s=>s.routes[0].name='Forbidden')));
 }finally{await store.close();}
});

test('Backups roundtrip into a new database, detect corruption and retain only configured snapshots',async()=>{
 const {backup,decodeBackup}=require('../portal/backup');const directory=await fs.mkdtemp(path.join(os.tmpdir(),'kb-backup-'));const store=createStore(':memory:',d.seed);await store.ready;
 try{
  await store.change(s=>{s.users=[];s.responses.push({id:'preserved-order'});});
  let last;for(let i=0;i<3;i++)last=await backup(store,directory,{now:new Date(2026,9,15+i),keep:2});
  assert.equal((await fs.readdir(directory)).length,2);
  const text=await fs.readFile(last.file,'utf8'),state=decodeBackup(text);assert.equal(state.responses[0].id,'preserved-order');
  const altered=JSON.parse(text);altered.body+=' ';assert.throws(()=>decodeBackup(JSON.stringify(altered)));
  const restored=createStore(path.join(directory,'restored.sqlite'),()=>state);await restored.ready;assert.equal((await restored.read()).responses[0].id,'preserved-order');await restored.close();
 }finally{await store.close();await fs.rm(directory,{recursive:true,force:true});}
});

test('Worker requires explicit live settings, coalesces overlapping ticks and keeps simulations unsent',async()=>{
 const {createWorker}=require('../portal/worker');const store=createStore(':memory:',d.seed);await store.ready;
 try{
  assert.throws(()=>createWorker({store,live:true,origin:'http://localhost',subject:'mailto:test@example.com'}));
  const worker=createWorker({store,now:()=>morning});const one=worker.tick(),two=worker.tick();assert.equal(one,two);await one;
  const s=await store.read();assert.equal(s.operations.pushMode,'simulation');assert.equal(s.operations.lastTick,morning.toISOString());assert.ok(s.outbox.every(n=>n.status==='simulation'));
 }finally{await store.close();}
});

test('Disabled HTTP account loses existing session and cannot log in; staff action is audited',async()=>{
 const {app,store,ready}=createPortalApp({filename:':memory:'});const creds=await ready;
 const auth=require('../portal/auth');await auth.register(store,{username:'blocktest',email:'block@example.com',password:'12345678',company:'Test',contact:'Test',phone:'123',address:'Test'});
 await store.change(s=>{const u=s.users.find(u=>u.username==='blocktest');u.status='approved';u.partnerId='partner-1';});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 const post=(base,name,body,cookie='',csrf='')=>fetch(origin+base+'/api/'+name,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':csrf},body:JSON.stringify(body)});
 try{
  const a=await post('/partner-admin','login',creds),ac=a.headers.get('set-cookie').split(';')[0];const html=await(await fetch(origin+'/partner-admin/',{headers:{Cookie:ac}})).text(),csrf=html.match(/name="csrf-token" content="([^"]+)"/)[1];
  const p=await post('/partner','login',{username:'blocktest',password:'12345678'}),pc=p.headers.get('set-cookie').split(';')[0];const id=(await store.read()).users.find(u=>u.username==='blocktest').id;
  assert.equal((await post('/partner-admin','accounts',{id,status:'disabled'},ac,csrf)).status,200);
  assert.equal((await fetch(origin+'/partner/api/me',{headers:{Cookie:pc}})).status,401);
  assert.equal((await post('/partner','login',{username:'blocktest',password:'12345678'})).status,403);
  const s=await store.read();assert.equal(s.auditLog.at(-1).action,'accounts');assert.equal(s.auditLog.at(-1).changes[0].after.status,'disabled');
 }finally{await new Promise(r=>server.close(r));await store.close();}
});

test('Live worker dispatches eligible messages once through injected transport, leaving simulations untouched',async()=>{
 const fixture=pushFixture();fixture.outbox.push({...fixture.outbox[0],id:'old-simulation',status:'simulation'});
 const store=createStore(':memory:',()=>fixture);await store.ready;let sent=0;
 const worker=require('../portal/worker').createWorker({store,live:true,origin:'https://portal.example.com',subject:'mailto:test@example.com',now:()=>morning,send:async()=>{sent++;}});
 try{await worker.tick();const count=sent;assert.ok(count>0);await worker.tick();assert.equal(sent,count);assert.equal((await store.read()).outbox.find(n=>n.id==='old-simulation').status,'simulation');}finally{await store.close();}
});

test('Partner login persists 90 days while staff login remains one day',async()=>{
 const {app,store,ready}=createPortalApp({filename:':memory:'});const admin=await ready;const auth=require('../portal/auth');
 await auth.register(store,{username:'longlogin',email:'long@example.com',password:'12345678',company:'Test',contact:'Test',phone:'123',address:'Test'});
 await store.change(s=>{const u=s.users.find(u=>u.username==='longlogin');u.status='approved';u.partnerId='partner-1';});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 try{for(const [base,credentials,days] of [['/partner',{username:'longlogin',password:'12345678'},90],['/partner-admin',admin,1]]){
  const before=Date.now();const res=await fetch(origin+base+'/api/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(credentials)});
  assert.equal(res.status,200);assert.match(res.headers.get('set-cookie'),new RegExp('Max-Age='+days*86400+';'));assert.match(res.headers.get('set-cookie'),/HttpOnly/);
  const session=(await store.read()).sessions.at(-1);assert.ok(session.expires>=before+days*86400000);assert.ok(session.expires<=Date.now()+days*86400000);
 }}finally{await new Promise(r=>server.close(r));await store.close();}
});

test('Session renewal starts at seven days, grants 90 days from confirmation and is idempotent',()=>{
 const {info,extend,DURATION,WARNING}=require('../portal/sessions'),now=Date.now();
 const s={users:[{id:'p',status:'approved'}],sessions:[{hash:'token',userId:'p',role:'partner',expires:now+WARNING+1}]};
 assert.equal(info(s.sessions[0],now).canExtend,false);assert.throws(()=>extend(s,'token',s.sessions[0].expires,now));
 s.sessions[0].expires=now+WARNING;const old=s.sessions[0].expires;assert.equal(info(s.sessions[0],now).canExtend,true);
 const result=extend(s,'token',old,now);assert.equal(result.expiresAt,now+DURATION);assert.equal(result.canExtend,false);
 assert.equal(extend(s,'token',old,now+1000).expiresAt,result.expiresAt);assert.throws(()=>extend(s,'token',old-1,now));
 s.users[0].status='disabled';assert.throws(()=>extend(s,'token',old,now));s.users[0].status='approved';s.sessions[0].expires=now;assert.throws(()=>extend(s,'token',old,now));
});

test('Renewal HTTP endpoint requires partner CSRF and extends only this session and its cookie',async()=>{
 const {app,store,ready}=createPortalApp({filename:':memory:'});await ready;const auth=require('../portal/auth');
 await auth.register(store,{username:'renewtest',email:'renew@example.com',password:'12345678',company:'Test',contact:'Test',phone:'123',address:'Test'});
 await store.change(s=>{const u=s.users.find(u=>u.username==='renewtest');u.status='approved';u.partnerId='partner-1';});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 const post=(name,body,cookie='',csrf='')=>fetch(origin+'/partner/api/'+name,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':csrf},body:JSON.stringify(body)});
 try{
  const r=await post('login',{username:'renewtest',password:'12345678'}),cookie=r.headers.get('set-cookie').split(';')[0];
  const html=await(await fetch(origin+'/partner/',{headers:{Cookie:cookie}})).text(),csrf=html.match(/name="csrf-token" content="([^"]+)"/)[1];
  const expiresAt=Date.now()+6*86400000;
  await store.change(s=>{s.sessions[0].expires=expiresAt;s.sessions.push({...s.sessions[0],hash:'other-device'});});
  assert.equal((await post('extend-session',{expiresAt},cookie)).status,403);
  const me=await(await fetch(origin+'/partner/api/me',{headers:{Cookie:cookie}})).json();assert.equal(me.loginSession.canExtend,true);
  const extended=await post('extend-session',{expiresAt},cookie,csrf);assert.equal(extended.status,200);assert.match(extended.headers.get('set-cookie'),/HttpOnly/);
  const result=await extended.json();assert.ok(result.loginSession.expiresAt>Date.now()+89*86400000);
  assert.equal((await store.read()).sessions.find(s=>s.hash==='other-device').expires,expiresAt);
  assert.equal((await(await post('extend-session',{expiresAt},cookie,csrf)).json()).loginSession.expiresAt,result.loginSession.expiresAt);
  await store.change(s=>{s.sessions=s.sessions.map(x=>({...x,expires:Date.now()-1}));});assert.notEqual((await post('extend-session',{expiresAt},cookie,csrf)).status,200);
 }finally{await new Promise(r=>server.close(r));await store.close();}
});


test('Partners see only received or processed, including legacy records and restored orders',()=>{
 const s=d.seed(),order=d.submitResponse(s,'partner-1',payload(s),morning),outbox=s.outbox.length;
 const view=()=>d.safePartner(s,s.partners[0],morning).history[0];
 for(const legacy of ['confirmed','ready']){order.status=legacy;assert.equal(view().status,'received');}
 assert.throws(()=>d.archiveOrder(s,{id:order.id,archived:true,revision:2},'admin',morning));
 d.archiveOrder(s,{id:order.id,archived:true,revision:1},'admin',morning);
 assert.equal(view().status,'archived');assert.equal(view().statusUpdatedAt,morning.toISOString());assert.equal(s.outbox.length,outbox);
 assert.equal(d.safePartner(s,s.partners[1],morning).history.length,0);
 d.archiveOrder(s,{id:order.id,archived:false},'admin',morning);assert.equal(view().status,'received');
 d.archiveOrder(s,{id:order.id,archived:true},'admin',morning);
 d.submitResponse(s,'partner-1',{...payload(s),responseId:order.id,revision:1},morning);assert.equal(view().status,'received');
});
test('Unauthenticated requests avoid storage reads; private APIs stay uncached and static files revalidate',async()=>{
 const portal=createPortalApp({filename:':memory:'});await portal.ready;
 let reads=0;const read=portal.store.read.bind(portal.store);portal.store.read=async()=>{reads++;return read();};
 const server=portal.app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  const login=await fetch(base+'/partner/login');assert.equal(login.status,200);assert.equal(reads,0);
  const denied=await fetch(base+'/partner/api/me',{headers:{Cookie:'kbp_portal=invalid'}});assert.equal(denied.status,401);assert.equal(reads,0);assert.equal(denied.headers.get('cache-control'),'no-store');
  assert.match(login.headers.get('content-security-policy'),/script-src 'self'/);assert.equal(login.headers.get('x-content-type-options'),'nosniff');
  const asset=await fetch(base+'/partner/assets/portal.js');assert.equal(asset.status,200);assert.equal(asset.headers.get('cache-control'),'public, max-age=0, must-revalidate');
  const status=await new Promise((resolve,reject)=>require('http').get(base+'/partner/assets/portal.js',{headers:{'If-None-Match':asset.headers.get('etag')}},res=>{res.resume();resolve(res.statusCode);}).on('error',reject));assert.equal(status,304);
 }finally{await new Promise(r=>server.close(r));await portal.store.close();}
});

test('Order pages filter before slicing, retain current deliveries and clamp removed last pages',()=>{
 const listing=require('../portal/listing'),s=d.seed();
 s.responses=Array.from({length:61},(_,i)=>({id:String(i).padStart(3,'0'),partnerId:'partner-1',partnerName:i===0?'Keresett':'Test',kind:'order',items:[],date:i===0?'2026-10-15':'2025-01-01',createdAt:'2026-10-01T10:00:00Z',...(i<30?{archivedAt:'2026-10-02T22:30:00Z'}:{})}));
 const first=listing.select(s.responses,listing.options({view:'archived'}));assert.equal(first.rows.length,25);assert.equal(first.pagination.total,30);
 assert.equal(listing.select(s.responses,listing.options({view:'archived',page:99})).pagination.page,2);
 assert.equal(listing.select(s.responses,listing.options({view:'archived',search:'Keresett',sort:'archivedAt',day:'2026-10-03'})).pagination.total,1);
 const view=d.safePartner(s,s.partners[0],morning,listing.options({page:2},true));assert.equal(view.history.length,25);assert.equal(view.historyPage.total,61);assert.equal(view.currentResponses[0].id,'000');
 assert.throws(()=>listing.options({page:-1}));assert.throws(()=>listing.options({day:'2026-02-30'}));
});
test('Retention removes only old archived past deliveries after backup, never templates or unhandled orders',()=>{
 const {purge,cutoff}=require('../portal/retention'),now=new Date('2026-10-20T10:00:00Z'),s=d.seed();
 assert.equal(cutoff(new Date('2026-05-31T10:00:00Z')).toISOString(),'2026-02-28T10:00:00.000Z');
 s.partners[0].templates=[{id:'saved',name:'Permanent',items:[{name:'Saved item',quantity:2}]}];const saved=structuredClone(s.partners[0].templates);
 s.responses=[{id:'old',date:'2026-06-01',archivedAt:'2026-07-19T10:00:00Z'},{id:'recent',date:'2026-06-01',archivedAt:'2026-07-21T10:00:00Z'},{id:'boundary',date:'2026-06-01',archivedAt:'2026-07-20T10:00:00Z'},{id:'future',date:'2026-11-01',archivedAt:'2026-06-01T10:00:00Z'},{id:'new',date:'2025-01-01'},{id:'skip',kind:'skip',date:'2025-01-01'}];
 assert.equal(purge(s,now),0);assert.equal(s.responses.length,6);
 s.operations={backupAt:now.toISOString()};assert.equal(purge(s,now),1);assert.equal(s.responses.some(r=>r.id==='old'),false);assert.equal(s.responses.length,5);assert.deepEqual(s.partners[0].templates,saved);assert.equal(purge(s,now),0);
});
test('Product availability is staff-only, audited and enforced for existing carts',async()=>{
 const portal=createPortalApp({filename:':memory:',now:()=>morning,adminCredentials:{username:'admin',password:'12345678'}});await portal.ready;await portal.store.change(s=>{s.products[0].prices={kg:1000};});
 const server=portal.app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 const post=(route,body,cookie='',csrf='')=>fetch(origin+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':csrf},body:JSON.stringify(body)});
 try{
  const login=await post('/partner-admin/api/login',{username:'admin',password:'12345678'}),cookie=login.headers.get('set-cookie').split(';')[0];
  const html=await(await fetch(origin+'/partner-admin/',{headers:{Cookie:cookie}})).text(),csrf=html.match(/name="csrf-token" content="([^"]+)"/)[1];
  let state=await portal.store.read();const id=state.products[0].id,input=payload(state);
  assert.equal((await post('/partner-admin/api/products',{id,active:false},cookie,'bad')).status,403);
  assert.equal((await post('/partner-admin/api/products',{id,active:false},cookie,csrf)).status,200);
  state=await portal.store.read();assert.equal(state.auditLog.at(-1).changes[0].collection,'products');
  assert.equal(d.safePartner(state,state.partners[0],morning).products.some(p=>p.id===id),false);assert.throws(()=>d.submitResponse(state,'partner-1',input,morning));
  assert.equal((await post('/partner-admin/api/products',{id,active:true},cookie,csrf)).status,200);state=await portal.store.read();assert.equal(d.submitResponse(state,'partner-1',input,morning).items[0].productId,id);
  const price={productId:id,unit:'kg',price:2200};
  assert.equal((await post('/partner-admin/api/prices',price)).status,403);
  assert.equal((await post('/partner-admin/api/prices',price,cookie,'bad')).status,403);
  assert.equal((await post('/partner-admin/api/prices',price,cookie,csrf)).status,200);
  state=await portal.store.read();assert.equal(state.products[0].prices.kg,2200);assert.equal(state.auditLog.at(-1).changes[0].collection,'products');
  const view=await(await fetch(origin+'/partner-admin/api/admin?page=1',{headers:{Cookie:cookie}})).json();assert.equal(view.orderPage.size,25);assert.ok(Number.isInteger(view.todo.missing));assert.equal(view.todo.date,'2026-10-15');assert.equal(view.products.length,state.products.length);
 }finally{await new Promise(r=>server.close(r));await portal.store.close();}
});

test('Worker backs up before retention and preserves saved lists through restart',async()=>{
 const {createWorker}=require('../portal/worker'),{decodeBackup}=require('../portal/backup');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'kb-retention-')),clock=new Date('2026-10-21T08:00:00Z');
 const store=createStore(path.join(dir,'test.sqlite'),()=>{const s=d.seed();s.users=[];s.responses=[{id:'expired',kind:'order',partnerId:'partner-1',date:'2025-01-01',createdAt:'2025-01-01T10:00:00Z',archivedAt:'2025-01-02T10:00:00Z',items:[]}];s.partners[0].templates=[{id:'forever',name:'Saved',items:[]}];return s;});
 await store.ready;
 try{
  await createWorker({store,backupDirectory:path.join(dir,'backups'),now:()=>clock}).tick();
  const state=await store.read();assert.equal(state.responses.length,0);assert.equal(state.partners[0].templates.length,1);assert.equal(state.retention.deleted,1);
  const files=await fs.readdir(path.join(dir,'backups'));const saved=decodeBackup(await fs.readFile(path.join(dir,'backups',files[0]),'utf8'));assert.equal(saved.responses[0].id,'expired');
 }finally{await store.close();assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(dir,{recursive:true,force:true});}
});

test('Partner pricing uses unit-specific overrides, protects historical totals and rejects stale confirmation',()=>{
 const state=d.seed(), product=state.products[0], partner=state.partners[0], other=state.partners[1];
 d.updatePrice(state,{productId:product.id,unit:'kg',price:2000});
 d.updatePrice(state,{productId:product.id,unit:'kg',partnerId:partner.id,price:1500});
 d.updatePrice(state,{productId:product.id,unit:'db',price:300});
 assert.equal(d.safePartner(state,partner,morning).products[0].prices.kg,1500);
 assert.equal(d.safePartner(state,other,morning).products[0].prices.kg,2000);
 assert.equal(d.safePartner(state,other,morning).products[0].prices.db,300);
 assert.equal(JSON.stringify(d.safePartner(state,other,morning)).includes('1500'),false);
 const input={...payload(state),expectedPrices:[1500]};
 const order=d.submitResponse(state,partner.id,input,morning);
 assert.equal(order.items[0].unitPrice,1500);assert.equal(order.items[0].lineTotal,3750);assert.equal(order.total,3750);
 d.updatePrice(state,{productId:product.id,unit:'kg',partnerId:partner.id,price:1600});
 assert.equal(order.total,3750);
 assert.throws(()=>d.submitResponse(state,partner.id,{...input,requestId:d.id(),responseId:order.id,revision:1},morning),/árak megváltoztak/);
 const changed=d.submitResponse(state,partner.id,{...input,requestId:d.id(),responseId:order.id,revision:1,expectedPrices:[1600]},morning);
 assert.equal(changed.total,4000);assert.equal(changed.changes[0].total,3750);
 d.updatePrice(state,{productId:product.id,unit:'kg',partnerId:partner.id,price:null});
 assert.equal(d.priceFor(product,partner,'kg'),2000);
 assert.throws(()=>d.updatePrice(state,{productId:product.id,unit:'kg',price:-1}),d.InputError);
 assert.throws(()=>d.updatePrice(state,{productId:product.id,unit:'kg',price:1.2}),d.InputError);
 d.updatePrice(state,{productId:product.id,unit:'kg',price:null});
 assert.throws(()=>d.submitResponse(state,other.id,{...input,requestId:d.id(),expectedPrices:[2000]},morning),/nincs megadva ár/);
});


test('Complaint survives removal of the linked archived order and remains private to its partner',()=>{
 const state=d.seed(),order=d.submitResponse(state,'partner-1',payload(state),morning);
 const complaint=d.submitComplaint(state,'partner-1',{orderId:order.id,message:'Kérek segítséget.',requestId:d.id(),photo:'data:image/jpeg;base64,/9j/2Q==',labelPhoto:'data:image/jpeg;base64,/9j/2Q=='},morning);
 state.responses=[];
 assert.equal(d.safePartner(state,state.partners[0],morning).complaints[0].id,complaint.id);
 assert.equal((d.safePartner(state,state.partners[1],morning).complaints||[]).length,0);
 const updated=d.updateComplaint(state,{id:complaint.id,reply:'Foglalkozunk vele.',status:'open',expectedRevision:1},'admin',morning);
 assert.equal(updated.revision,2);
 assert.throws(()=>d.updateComplaint(state,{id:complaint.id,reply:'Régi',status:'resolved',expectedRevision:1},'admin',morning),/módosult/);
});
