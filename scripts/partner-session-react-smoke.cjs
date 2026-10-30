const {chromium}=require('../.local-tests/browser/node_modules/playwright-core');
const {createPortalApp}=require('../portal/app'),auth=require('../portal/auth'),assert=require('node:assert/strict');
(async()=>{
 const portal=createPortalApp({filename:':memory:',adminCredentials:{username:'admin',password:'Password123'},sendEmail:async()=>{}});await portal.ready;
 await auth.register(portal.store,{email:'session@example.invalid',username:'sessionpartner',password:'Password123',company:'Partner',contact:'Teszt',phone:'123456789',address:'Teszt'});
 await portal.store.change(s=>{const u=s.users.find(u=>u.username==='sessionpartner');u.status='approved';u.partnerId='partner-1';});
 const server=portal.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin='http://127.0.0.1:'+server.address().port;let browser;
 try{browser=await chromium.launch({executablePath:process.env.PORTAL_TEST_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  for(const [role,username,days] of [['partner-admin','admin',7],['partner','sessionpartner',90]]){
   const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/'+role+'/login');await page.locator('#login-form [name=username]').fill(username);await page.locator('#login-form [name=password]').fill('Password123');await page.locator('#login-form button').click();await page.waitForURL('**/'+role+'/');
   if(role==='partner'&&await page.locator('#push-later').isVisible().catch(()=>false))await page.locator('#push-later').click();
   const user=(await portal.store.read()).users.find(u=>u.username===username),warning=days===7?1:6;
   await portal.store.change(s=>{const session=s.sessions.find(x=>x.userId===user.id);session.expires=Date.now()+warning*86400000;});
   await page.reload();await page.locator('#renew-accept').waitFor();assert.equal(await page.locator('#renew-title').isVisible(),true);assert.equal(await page.locator('#push-welcome-title').count(),0);await page.locator('#renew-accept').click();await page.getByText(/Meghosszabbítottuk a belépésedet/).waitFor();const session=(await portal.store.read()).sessions.find(x=>x.userId===user.id);assert.ok(session.expires>Date.now()+(days-1)*86400000);assert.deepEqual(errors,[]);await context.close();
  }
  console.log('React session renewal: partner 90 days and admin 7 days passed');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));await portal.store.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
