const {Pool}=require('pg');
const audit=require('../audit');
const {collections,split,emptyState}=require('./model');
const {migrate}=require('./schema');
// Transitional repository: domain callbacks see a snapshot; SQL writes only changed rows.
// Transaction lock protects cross-record business invariants across all app/worker processes.
const LOCK=721934681;
function createPostgresStore({connectionString,pool:providedPool,initialState=emptyState,initialize=true,onPoolError=()=>{}}={}){
 if(!providedPool&&!connectionString)throw Error('PORTAL_DATABASE_URL is required');
 const pool=providedPool||new Pool({connectionString,max:5,connectionTimeoutMillis:5000,idleTimeoutMillis:30000,statement_timeout:15000,application_name:'kebpro-portal'});
 pool.on?.('error',()=>{try{onPoolError();}catch{}});
 async function transaction(fn,{write=false}={}){
  const client=await pool.connect();try{
   await client.query(write?'BEGIN':'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
   if(write)await client.query('SELECT pg_advisory_xact_lock($1)',[LOCK]);
   const result=await fn(client);await client.query('COMMIT');return result;
  }catch(error){try{await client.query('ROLLBACK');}catch{}throw error;}finally{client.release();}
 }
 async function readState(client,omitOrders=false){
  const meta=await client.query('SELECT key,body FROM kebpro_portal.metadata');
  const state=Object.fromEntries(meta.rows.filter(r=>r.key!=='_initialized').map(r=>[r.key,r.body]));
  for(const [name,table]of Object.entries(collections)){if(omitOrders&&(name==='responses'||name==='complaintPhotos')){state[name]=[];continue;}const result=await client.query(`SELECT body FROM kebpro_portal.${table} ORDER BY position,id`);state[name]=result.rows.map(r=>r.body);}
  return state;
 }
 async function save(client,before,after){
  const a=split(before),b=split(after);
  for(const table of Object.values(collections)){
   for(const id of a.records[table].keys())if(!b.records[table].has(id))await client.query(`DELETE FROM kebpro_portal.${table} WHERE id=$1`,[id]);
   for(const [id,row]of b.records[table]){const old=a.records[table].get(id);if(old?.body===row.body&&old.position===row.position)continue;await client.query(`INSERT INTO kebpro_portal.${table}(id,position,body) VALUES($1,$2,$3::jsonb) ON CONFLICT(id) DO UPDATE SET position=EXCLUDED.position,body=EXCLUDED.body`,[id,row.position,row.body]);}
  }
  for(const key of Object.keys(a.metadata))if(!(key in b.metadata))await client.query('DELETE FROM kebpro_portal.metadata WHERE key=$1',[key]);
  for(const [key,value]of Object.entries(b.metadata))if(JSON.stringify(a.metadata[key])!==JSON.stringify(value))await client.query('INSERT INTO kebpro_portal.metadata(key,body) VALUES($1,$2::jsonb) ON CONFLICT(key) DO UPDATE SET body=EXCLUDED.body',[key,JSON.stringify(value)]);
 }
 async function importEmpty(client,state){
  const existing=await client.query('SELECT key FROM kebpro_portal.metadata LIMIT 1');if(existing.rows.length)throw Error('Import target must be empty');
  for(const table of Object.values(collections)){const r=await client.query(`SELECT id FROM kebpro_portal.${table} LIMIT 1`);if(r.rows.length)throw Error('Import target must be empty');}
  await save(client,{},state);await client.query("INSERT INTO kebpro_portal.metadata(key,body) VALUES('_initialized','true'::jsonb)");
 }
 const ready=transaction(async client=>{await migrate(client);if(initialize){const result=await client.query("SELECT key FROM kebpro_portal.metadata WHERE key='_initialized'");if(!result.rows.length)await importEmpty(client,initialState());}},{write:true});
 return {kind:'postgres',ready,
  read:async()=>{await ready;return transaction(readState);},
  lookupSession:async(hash,role,now)=>{await ready;const result=await pool.query("SELECT s.body FROM kebpro_portal.sessions s JOIN kebpro_portal.users u ON u.id=s.body->>'userId' WHERE s.id=$1 AND s.body->>'role'=$2 AND (s.body->>'expires')::bigint>$3 AND u.body->>'status'='approved'",[hash,role,now]);return result.rows[0]?.body;},
  lookupUser:async id=>{await ready;const result=await pool.query('SELECT body FROM kebpro_portal.users WHERE id=$1',[id]);return result.rows[0]?.body;},
  lookupComplaintPhoto:async id=>{await ready;const result=await pool.query('SELECT body FROM kebpro_portal.complaint_photos WHERE id=$1',[id]);return result.rows[0]?.body;},
  readPartner:async (partnerId,listing,now=new Date())=>{await ready;return transaction(async client=>{
    const state={};
    for(const [name,table]of Object.entries({routes:'routes',products:'products',news:'news'})){const rows=await client.query(`SELECT body FROM kebpro_portal.${table} ORDER BY position,id`);state[name]=rows.rows.map(r=>r.body);}
    const partners=await client.query('SELECT body FROM kebpro_portal.partners WHERE id=$1',[partnerId]);state.partners=partners.rows.map(r=>r.body);
    for(const [name,table]of Object.entries({outbox:'notifications',subscriptions:'subscriptions'})){const rows=await client.query(`SELECT body FROM kebpro_portal.${table} WHERE body->>'partnerId'=$1 ORDER BY position,id`,[partnerId]);state[name]=rows.rows.map(r=>r.body);}
    if(listing){state._history=await require('../listing').sqlPage(client,listing,partnerId);const current=await client.query("SELECT body FROM kebpro_portal.orders WHERE body->>'partnerId'=$1 AND body->>'date'>=$2 ORDER BY body->>'date',id",[partnerId,require('../domain').localTime(now).date]);state.responses=current.rows.map(r=>r.body);}
    else{const rows=await client.query("SELECT body FROM kebpro_portal.orders WHERE body->>'partnerId'=$1 ORDER BY position,id",[partnerId]);state.responses=rows.rows.map(r=>r.body);}
    const vapid=await client.query("SELECT body->>'publicKey' AS key FROM kebpro_portal.metadata WHERE key='vapid'");state.vapid={publicKey:vapid.rows[0]?.key};return state;
  });},
  readAdmin:async(date,tomorrow,listing)=>{await ready;return transaction(async client=>{
   const state=await readState(client,true);state._orders=await require('../listing').sqlPage(client,listing);
   const rows=await client.query("SELECT body FROM kebpro_portal.orders WHERE body->>'date' IN ($1,$2)",[date,tomorrow]);state.responses=rows.rows.map(r=>r.body);return state;
  });},
  change:async fn=>{await ready;return transaction(async client=>{
   const state=await readState(client),before=structuredClone(state),actor=audit.context.getStore();
   if(actor&&!state.users.some(u=>u.id===actor.id&&u.status==='approved'&&u.role===(actor.role||'staff')))throw new (require('../domain').InputError)('A fiók már nem aktív.',403);
   const logBefore=actor&&(actor.role||'staff')==='staff'?audit.snapshot(state):null;
   const result=fn(state);if(result&&typeof result.then==='function')throw Error('Store mutations must be synchronous');
   if(logBefore)audit.record(state,logBefore,actor);await save(client,before,state);return result;
  },{write:true});},
  importEmpty:async state=>{await ready;return transaction(client=>importEmpty(client,state),{write:true});},
  health:async()=>{await ready;await pool.query('SELECT 1');return true;},
  close:async()=>{try{await ready;}catch{}await pool.end();}
 };
}
module.exports={createPostgresStore};
