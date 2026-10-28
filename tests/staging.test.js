const test = require('node:test');
const assert = require('node:assert/strict');
const { stagingConfig, stagingDatabaseConfig, diagnoseStagingError, stagingErrorDetails } = require('../portal/staging');
const { createPortalApp } = require('../portal/app');
const { createStore } = require('../portal/store');
const { emptyState } = require('../portal/postgres/model');
const http = require('node:http');
const { spawnSync } = require('node:child_process');
function request(url,{method='GET',headers={},body}={}) { return new Promise((resolve,reject)=>{const req=http.request(url,{method,headers},res=>{res.resume();res.on('end',()=>resolve({status:res.statusCode,headers:{get:key=>res.headers[key]?.toString()}}));});req.on('error',reject);req.end(body);}); }

const cfg = {
  PORTAL_STAGING_ENABLED:'true', PORTAL_DATABASE_URL:'postgresql://u:p@localhost/test_portal',
  DATABASE_URL:'postgresql://other:p@localhost/website', PORTAL_PUBLIC_ORIGIN:'https://example.invalid',
  PORTAL_TEST_USER:'preview', PORTAL_TEST_PASSWORD:'test-access-password-for-private-preview',
  PORTAL_BOOTSTRAP_USER:'stafftest', PORTAL_BOOTSTRAP_PASSWORD:'bootstrap-test-password-123', PORTAL_BOOTSTRAP_EMAIL:'staff@example.invalid',
};

test('staging is opt-in and refuses unsafe or shared configuration',()=>{
  assert.equal(stagingConfig({}),null);
  assert.throws(()=>stagingConfig({...cfg,PORTAL_DATABASE_URL:'postgresql://other:different@localhost/website'}));
  assert.throws(()=>stagingConfig({...cfg,PORTAL_PUBLIC_ORIGIN:'http://example.invalid'}));
  assert.throws(()=>stagingConfig({...cfg,PORTAL_TEST_PASSWORD:'short'}));
  assert.equal(stagingConfig({...cfg,PORTAL_TEST_PASSWORD:'test1234'}).staging.password,'test1234');
  assert.throws(()=>stagingConfig({...cfg,PORTAL_BOOTSTRAP_EMAIL:''}));
  assert.throws(()=>stagingConfig({...cfg,PORTAL_BOOTSTRAP_PASSWORD:'123456789'}));
  assert.equal(stagingConfig({...cfg,PORTAL_BOOTSTRAP_PASSWORD:'1234567890'}).adminCredentials.password,'1234567890');
  assert.equal(stagingConfig(cfg).adminCredentials.email,'staff@example.invalid');
  assert.equal(stagingDatabaseConfig({PORTAL_STAGING_ENABLED:'true',PORTAL_DATABASE_URL:cfg.PORTAL_DATABASE_URL,PORTAL_PUBLIC_ORIGIN:cfg.PORTAL_PUBLIC_ORIGIN}).publicOrigin,'https://example.invalid');
});

test('diagnostics use fixed codes and never expose error text',()=>{
  assert.equal(diagnoseStagingError({code:'28P01',message:'secret'}),'DB_AUTH');
  assert.equal(diagnoseStagingError({code:'42501'}),'DB_PERMISSION');
  assert.equal(diagnoseStagingError(new Error('secret connection string')),'UNKNOWN');
  const error=new Error('secret connection string');error.code='ECONNRESET';error.cause=Object.assign(new Error('password'),{code:'42501'});
  assert.deepEqual(stagingErrorDetails(error),[{name:'Error',code:'ECONNRESET'},{name:'Error',code:'42501'}]);
  assert.deepEqual(stagingErrorDetails({name:'secret',code:'secret connection string'}),[{name:'OtherError'}]);
});

test('loading the PostgreSQL portal does not load the native SQLite addon',()=>{
  const source = `const Module=require('node:module');const original=Module._load;Module._load=function(name,...args){if(name==='sqlite3')throw Error('SQLite must not load');return original.call(this,name,...args)};require('./portal/staging');require('./portal/app');require('./portal/postgres/store');`;
  const result=spawnSync(process.execPath,['-e',source],{cwd:require('node:path').join(__dirname,'..'),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});

test('private HTTPS staging requires Basic auth, origin and secure session',async()=>{
  const config=stagingConfig(cfg),storage=createStore(':memory:',emptyState);
  const portal=createPortalApp({...config,storage,sendEmail:async()=>{}});await portal.ready;
  const server=portal.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const url='http://127.0.0.1:'+server.address().port;
  const headers={host:'example.invalid','x-forwarded-proto':'https',authorization:'Basic '+Buffer.from(config.staging.username+':'+config.staging.password).toString('base64')};
  try {
    let r=await request(url+'/partner/login',{headers:{host:'example.invalid','x-forwarded-proto':'https'}});assert.equal(r.status,401);
    for (const appPath of ['/partner/apple-touch-icon.png?v=3','/partner-admin/apple-touch-icon.png?v=3']) {
      r=await request(url+appPath,{headers:{host:'example.invalid','x-forwarded-proto':'https'}});
      assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/^image\/png/);
    }
    r=await request(url+'/partner/assets/portal.js',{headers:{host:'example.invalid','x-forwarded-proto':'https'}});assert.equal(r.status,401);
    r=await request(url+'/partner/login',{headers:{...headers,'x-forwarded-proto':'http'}});assert.equal(r.status,403);
    r=await request(url+'/partner/login',{headers:{...headers,host:'wrong.invalid'}});assert.equal(r.status,403);
    r=await request(url+'/partner-admin/api/login',{method:'POST',headers:{...headers,origin:'https://evil.invalid','content-type':'application/json'},body:JSON.stringify({username:'stafftest',password:'bootstrap-test-password-123'})});assert.equal(r.status,403);
    r=await request(url+'/partner-admin/api/login',{method:'POST',headers:{...headers,origin:'https://example.invalid','content-type':'application/json'},body:JSON.stringify({username:'stafftest',password:'bootstrap-test-password-123'})});assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/HttpOnly.*Secure.*SameSite=Strict/i);
    const state=await storage.read();assert.equal(state.users[0].email,'staff@example.invalid');
  } finally {await new Promise(r=>server.close(r));await storage.close();}
});

test('website routes and isolated portal coexist without mounting path changes',async()=>{
  const config=stagingConfig(cfg),storage=createStore(':memory:',emptyState);
  const portal=createPortalApp({...config,storage,sendEmail:async()=>{}});await portal.ready;
  const staging=require('../portal/staging'), original=staging.createStaging, originalConfig=staging.stagingConfig;
  const previous={PORTAL_STAGING_ENABLED:process.env.PORTAL_STAGING_ENABLED,DB_ADAPTER:process.env.DB_ADAPTER};
  staging.createStaging=()=>portal;staging.stagingConfig=()=>config;process.env.PORTAL_STAGING_ENABLED='true';process.env.DB_ADAPTER='memory';
  let server;
  try {
    const website=require('../server');await website.dbReady;
    server=website.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
    await new Promise(r=>setImmediate(r));
    const url='http://127.0.0.1:'+server.address().port;
    const headers={host:'example.invalid','x-forwarded-proto':'https',authorization:'Basic '+Buffer.from(config.staging.username+':'+config.staging.password).toString('base64')};
    assert.equal((await request(url+'/',{headers})).status,200);
    assert.equal((await request(url+'/partner/login',{headers})).status,200);
    assert.equal((await request(url+'/partner/assets/portal.css',{headers})).status,200);
    assert.equal((await request(url+'/partner-admin/login',{headers})).status,200);
  } finally {
    if(server)await new Promise(r=>server.close(r));await storage.close();staging.createStaging=original;staging.stagingConfig=originalConfig;
    for(const [key,value] of Object.entries(previous)) if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
});
