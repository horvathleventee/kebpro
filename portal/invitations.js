const crypto=require('crypto');
const auth=require('./auth');
const {assert,id}=require('./domain');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
function createInvitations({store,sendEmail,origin,clock=()=>Date.now()}) {
 const site=new URL(origin);
 assert(site.protocol==='https:' || (site.protocol==='http:' && ['localhost','127.0.0.1'].includes(site.hostname)),'Érvénytelen alkalmazáscím.');
 function requireStaff(s,userId){assert(s.users.some(u=>u.id===userId && u.role==='staff' && u.status==='approved'),'Nincs céges jogosultság.',403);}
 async function invite(input,userId){
  const email=auth.emailAddress(input.email), token=crypto.randomBytes(32).toString('hex');
  const record=await store.change(s=>{
   requireStaff(s,userId);s.staffInvitations ||= [];
   assert(!s.users.some(u=>u.email===email && u.role==='staff'),'Ehhez a címhez már tartozik céges fiók.',409);
   assert(!s.staffInvitations.some(i=>i.email===email && ['pending','sending'].includes(i.status) && i.expires>clock()),'Erre a címre már van aktív meghívó. Előbb vond vissza.',409);
   const record={id:id(),email,hash:digest(token),invitedBy:userId,createdAt:clock(),expires:clock()+24*60*60000,status:'sending'};
   s.staffInvitations.push(record);return record;
  });
  try{
   const url=new URL('/partner-admin/accept-invitation',site.origin);url.hash=token;
   await sendEmail({to:email,subject:'Kebpro · Meghívó a céges felületre',text:'Meghívást kaptál a Kebpro céges kezelőfelületére. A fiókkal rendelések, partnerek, hírek és munkatársi meghívások kezelhetők.\n\nSaját felhasználónév és jelszó beállítása:\n'+url.href+'\n\nA link 24 óráig, egyszer használható. Ne továbbítsd másnak. Ha nem számítottál erre a meghívóra, hagyd figyelmen kívül.\n\nHelyi bemutató esetén a localhost link csak a bemutatót futtató számítógépen működik.'});
   await store.change(s=>{const item=s.staffInvitations.find(i=>i.id===record.id);if(item.status==='sending')item.status='pending';});
   return {ok:true};
  }catch(error){
   await store.change(s=>{const item=s.staffInvitations.find(i=>i.id===record.id);if(item.status==='sending')item.status='failed';});
   assert(false,'A meghívó e-mail küldése nem sikerült. Próbáld újra később.',502);
  }
 }
 function usable(s,token){
  assert(typeof token==='string' && /^[a-f0-9]{64}$/.test(token),'A meghívó érvénytelen, lejárt vagy visszavont.',400);
  const item=(s.staffInvitations||[]).find(i=>i.hash===digest(token) && i.status==='pending' && i.expires>clock());
  assert(item,'A meghívó érvénytelen, lejárt vagy visszavont.',400);requireStaff(s,item.invitedBy);return item;
 }
 async function accept(input){
  const username=auth.username(input.username);auth.validatePassword(input.password);
  usable(await store.read(),input.token);
  const passwordHash=await auth.passwordHash(input.password);
  await store.change(s=>{
   const item=usable(s,input.token);
   assert(!s.users.some(u=>u.username===username),'Ez a felhasználónév már foglalt.',409);
   assert(!s.users.some(u=>u.email===item.email && u.role==='staff'),'Ehhez a címhez már tartozik céges fiók.',409);
   s.users.push({id:id(),username,email:item.email,passwordHash,role:'staff',status:'approved',emailVerifiedAt:new Date(clock()).toISOString(),createdAt:new Date(clock()).toISOString(),invitedBy:item.invitedBy});
   item.status='accepted';item.acceptedAt=clock();delete item.hash;
  });return {ok:true};
 }
 async function revoke(input,userId){await store.change(s=>{requireStaff(s,userId);const item=(s.staffInvitations||[]).find(i=>i.id===input.id);assert(item && ['pending','sending'].includes(item.status),'Ez a meghívó már nem vonható vissza.',409);item.status='revoked';delete item.hash;});return {ok:true};}
 function list(s){return {staffAccounts:s.users.filter(u=>u.role==='staff').map(u=>({id:u.id,username:u.username,email:u.email||'',emailVerified:Boolean(u.emailVerifiedAt)})),invitations:(s.staffInvitations||[]).map(({hash,...item})=>({...item,status:['pending','sending'].includes(item.status)&&item.expires<=clock()?'expired':item.status})).reverse()};}
 return {invite,accept,revoke,list};
}
module.exports={createInvitations};
