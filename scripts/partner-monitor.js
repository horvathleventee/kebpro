// Supervise this independently from the app, ideally on a different host.
const path=require('node:path');
const {createAlerts}=require('../portal/alerts');
const {createMonitor}=require('../portal/monitor');
const {loadPortalConfig}=require('../portal/config');
const env=loadPortalConfig(),dryRun=process.argv.includes('--dry-run'),once=process.argv.includes('--once');
async function main(){
 if(!env.PORTAL_MONITOR_TOKEN||!env.PORTAL_MONITOR_URL)throw Error('Set monitor URL and token');
 const target=new URL(env.PORTAL_MONITOR_URL);
 if(target.username||target.password||!(target.protocol==='https:'||(target.protocol==='http:'&&['localhost','127.0.0.1'].includes(target.hostname))))throw Error('Monitor URL requires HTTPS except localhost');
 let alerts;
 if(dryRun)alerts={check:async()=>{}};
 else{
  const mailer=require('../portal/mailer').createPortalMailer();
  if(env.PORTAL_ALERTS_ENABLED!=='true'||!env.PORTAL_ALERT_EMAIL||!mailer.configured)throw Error('Enable alerts explicitly and configure recipient/SMTP');
  alerts=createAlerts({recipient:env.PORTAL_ALERT_EMAIL,sendEmail:mailer.send,stateFile:env.PORTAL_MONITOR_STATE||path.join(__dirname,'../data/monitor-state.json')});
 }
 const monitor=createMonitor({url:target.href,token:env.PORTAL_MONITOR_TOKEN,alerts});
 const check=async()=>{try{const result=await monitor.check();if(dryRun||once)console.log(JSON.stringify({mode:dryRun?'dry-run':'live',...result}));return result.healthy;}catch{console.error('[portal monitor] Check or alert persistence failed');return false;}};
 const ok=await check();if(once){process.exitCode=ok?0:1;return;}
 const timer=setInterval(check,60000);for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>clearInterval(timer));
}
main().catch(()=>{console.error('[portal monitor] Startup failed. Check private portal configuration; no secrets printed.');process.exitCode=1;});
