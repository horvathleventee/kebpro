function inspect(state,now=Date.now()){
 const op=state.operations||{};
 const recent=state.outbox.filter(n=>Date.parse(n.createdAt)>now-86400000&&n.status!=='simulation');
 return {database:true,worker:Number.isFinite(Date.parse(op.lastTick))&&now-Date.parse(op.lastTick)<180000&&!op.lastError,
 backup:Number.isFinite(Date.parse(op.backupAt))&&now-Date.parse(op.backupAt)<26*3600000,
 push:!recent.some(n=>Object.values(n.deliveries||{}).some(d=>d.status==='failed'))};
}
module.exports={inspect};
