const {assert}=require('./domain');
const DAY=86400000, DURATION=90*DAY, WARNING=7*DAY;
function info(session,now=Date.now()) {return {expiresAt:session.expires,canExtend:session.expires>now&&session.expires-now<=WARNING};}
function extend(state,sessionHash,expectedExpiry,now=Date.now()){
 const session=state.sessions.find(s=>s.hash===sessionHash&&s.role==='partner'&&s.expires>now);
 assert(session&&state.users.some(u=>u.id===session.userId&&u.status==='approved'),'A belépés lejárt. Jelentkezz be újra.',401);
 assert(Number.isFinite(expectedExpiry),'Érvénytelen hosszabbítási kérés.');
 // A duplicate confirmation must not repeatedly add time.
 if(session.renewedFrom===expectedExpiry)return info(session,now);
 assert(session.expires===expectedExpiry,'A belépés időközben változott. Frissítsd az oldalt.',409);
 assert(info(session,now).canExtend,'A hosszabbítás a lejárat előtti 7 napban érhető el.',409);
 session.renewedFrom=session.expires;session.expires=now+DURATION;session.renewedAt=now;
 return info(session,now);
}
module.exports={info,extend,DURATION,WARNING};
