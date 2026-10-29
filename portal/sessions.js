const {assert}=require('./domain');
const DAY=86400000, DURATION=90*DAY, WARNING=7*DAY;
const STAFF_DURATION=7*DAY,STAFF_WARNING=2*DAY;
function info(session,now=Date.now()) {const warning=session.role==='staff'?STAFF_WARNING:WARNING;return {expiresAt:session.expires,canExtend:session.expires>now&&session.expires-now<=warning};}
function extend(state,sessionHash,expectedExpiry,now=Date.now()){
 const session=state.sessions.find(s=>s.hash===sessionHash&&['partner','staff'].includes(s.role)&&s.expires>now);
 assert(session&&state.users.some(u=>u.id===session.userId&&u.status==='approved'),'A belépés lejárt. Jelentkezz be újra.',401);
 assert(Number.isFinite(expectedExpiry),'Érvénytelen hosszabbítási kérés.');
 // A duplicate confirmation must not repeatedly add time.
 if(session.renewedFrom===expectedExpiry)return info(session,now);
 assert(session.expires===expectedExpiry,'A belépés időközben változott. Frissítsd az oldalt.',409);
 assert(info(session,now).canExtend,'A hosszabbítás a lejárat előtti időszakban érhető el.',409);
 session.renewedFrom=session.expires;session.expires=now+(session.role==='staff'?STAFF_DURATION:DURATION);session.renewedAt=now;
 return info(session,now);
}
module.exports={info,extend,DURATION,WARNING,STAFF_DURATION,STAFF_WARNING};
