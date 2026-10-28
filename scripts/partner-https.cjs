// Dedicated local HTTPS fixture. Never imports preview credentials or SMTP configuration.
const https=require('node:https'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {certificate}=require('./testing/certificate.cjs');
const {createPortalApp}=require('../portal/app');
const password=crypto.randomBytes(18).toString('base64url');
const portal=createPortalApp({filename:':memory:',publicOrigin:'https://localhost:3443',adminCredentials:{username:'https-admin',password}});
portal.ready.then(()=>{
 const dir=path.resolve(__dirname,'../.local-tests');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'https-access.json'),JSON.stringify({url:'https://localhost:3443/partner-admin/',username:'https-admin',password},null,2),{mode:0o600});
 const server=https.createServer(certificate(),portal.app).listen(3443,'127.0.0.1',()=>console.log('Isolated HTTPS preview: https://localhost:3443/partner-admin/\nCredentials: .local-tests/https-access.json. Browser trust is not installed; data is temporary.'));
 server.on('error',()=>{console.error('HTTPS listener failed');portal.store.close().finally(()=>process.exit(1));});
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>portal.store.close().then(()=>process.exit(0))));
}).catch(()=>{console.error('HTTPS fixture failed');process.exitCode=1;});
