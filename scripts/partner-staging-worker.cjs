// Run as a single cPanel cron, never within a Passenger web process.
const path=require('node:path');
const {loadPortalConfig}=require('../portal/config');
const {stagingConfig}=require('../portal/staging');
const {createPostgresStore}=require('../portal/postgres/store');
const {createWorker}=require('../portal/worker');

async function main(){
 const env={...process.env,...loadPortalConfig()};
 const config=stagingConfig(env);
 if(!config)throw Error('Staging is not enabled');
 const backupDir=env.PORTAL_BACKUP_DIR;
 if(!backupDir||!path.isAbsolute(backupDir))throw Error('An absolute private backup directory is required');
 const resolved=path.resolve(backupDir),repo=path.resolve(__dirname,'..');
 if(resolved===repo||resolved.startsWith(repo+path.sep)||resolved.split(path.sep).includes('public_html'))throw Error('Backup must be outside web and project directories');
 const store=createPostgresStore({connectionString:config.databaseUrl});
 try{
  await store.ready;
  const state=await store.read();
  if(state.authVersion!==1)throw Error('Start the staging application before running the worker');
  const worker=createWorker({store,backupDirectory:resolved,live:env.PORTAL_PUSH_LIVE==='true',subject:env.PORTAL_VAPID_SUBJECT,origin:config.publicOrigin});
  const result=await worker.tick();
  console.log('[partner staging worker] completed; mode='+result.mode);
 }finally{await store.close();}
}
main().catch(()=>{console.error('[partner staging worker] failed; inspect private configuration and service health');process.exitCode=1;});
