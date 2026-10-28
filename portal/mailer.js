// Uses the website's existing SMTP settings, without loading database credentials into process.env.
const fs=require('fs');
const path=require('path');
function createPortalMailer({env=process.env, transport}={}) {
 const file=path.join(__dirname,'../.env');
 const saved=fs.existsSync(file)?require('dotenv').parse(fs.readFileSync(file)):{};
 const keys=['SMTP_HOST','SMTP_PORT','SMTP_SECURE','SMTP_USER','SMTP_PASS','MAIL_FROM'];
 const config=Object.fromEntries(keys.map(k=>[k,env[k] ?? saved[k]]));
 const configured=Boolean(config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS);
 const client=transport || (configured?require('nodemailer').createTransport({host:config.SMTP_HOST,port:Number(config.SMTP_PORT||587),secure:config.SMTP_SECURE==='true',auth:{user:config.SMTP_USER,pass:config.SMTP_PASS},dnsTimeout:10000,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000}):null);
 const bounded = operation => new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{client?.close?.();reject(Object.assign(new Error('Mail operation timed out'),{code:'ETIMEDOUT'}));},20000);
  Promise.resolve().then(operation).then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
 });
 return {configured:configured||Boolean(transport),verify:async()=>{if(!client)throw new Error("SMTP missing");return bounded(()=>client.verify());},send:async message=>{
  if(!client)throw new Error('SMTP is not configured');
  await bounded(()=>client.sendMail({from:config.MAIL_FROM||config.SMTP_USER,...message}));
 }};
}
module.exports={createPortalMailer};



