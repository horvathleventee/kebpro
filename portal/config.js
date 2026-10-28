const fs=require('node:fs'),path=require('node:path');
const keys=['PORTAL_DATABASE_URL','PORTAL_DB_PATH','PORTAL_PORT','PORTAL_PUBLIC_ORIGIN','PORTAL_BACKUP_DIR','PORTAL_PUSH_LIVE','PORTAL_VAPID_SUBJECT','PORTAL_ALERT_EMAIL','PORTAL_ALERTS_ENABLED','PORTAL_MONITOR_TOKEN','PORTAL_MONITOR_URL','PORTAL_MONITOR_STATE','PORTAL_TEST_DATABASE_URL'];
function loadPortalConfig({env=process.env,file=path.join(__dirname,'../.env.portal.local')}={}){
 const saved=fs.existsSync(file)?require('dotenv').parse(fs.readFileSync(file)):{};
 return Object.fromEntries(keys.filter(k=>env[k]!==undefined||saved[k]!==undefined).map(k=>[k,env[k]??saved[k]]));
}
module.exports={loadPortalConfig};
