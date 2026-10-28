const {localTime}=require('./domain');
function cutoff(now){const d=new Date(now),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-3);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d;}
function eligible(r,now){return Boolean(r.archivedAt)&&Number.isFinite(Date.parse(r.archivedAt))&&Date.parse(r.archivedAt)<cutoff(now).getTime()&&r.date<localTime(now).date;}
function purge(state,now=new Date()){
 const day=localTime(now).date;
 if(state.retention?.checkedDay===day)return 0;
 const backup=Date.parse(state.operations?.backupAt||'');
 if(!Number.isFinite(backup)||now.getTime()-backup>86400000||backup>now.getTime())return 0;
 const threshold=cutoff(now).getTime(),before=state.responses.length;state.responses=state.responses.filter(r=>!(r.archivedAt&&Date.parse(r.archivedAt)<threshold&&r.date<day));const deleted=before-state.responses.length;
 state.retention={months:3,checkedDay:day,lastRun:now.toISOString(),deleted,totalDeleted:(state.retention?.totalDeleted||0)+deleted};
 return deleted;
}
module.exports={cutoff,eligible,purge};
