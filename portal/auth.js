const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);
const { assert, id } = require('./domain');
async function passwordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + (await scrypt(password, salt, 64)).toString('hex');
}
async function verify(password, stored) {
  if (typeof password !== 'string' || password.length > 128) return false;
  const [salt, expected] = stored.split(':');
  const actual = await scrypt(password, salt, 64);
  return crypto.timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}
function username(value) {
  assert(typeof value === 'string' && /^[a-zA-Z0-9@._+-]{3,100}$/.test(value.trim()), 'A felhasználónév 3–100 karakter: betű, szám, pont, @, _, + vagy - lehet.');
  return value.trim().toLowerCase();
}
async function initialize(store, credentials, { requireExplicit = false } = {}) {
  await store.ready;
  const state = await store.read();
  if (state.authVersion === 1) return null;
  if (requireExplicit && !credentials) throw Error('Portal bootstrap credentials are required for the first start');
  const login = credentials || { username: 'admin', password: crypto.randomBytes(18).toString('base64url') };
  const digest = await passwordHash(login.password);
  const created=await store.change(s => {
    if(s.authVersion===1)return false;
    s.users = [{ id: id(), username: login.username, passwordHash: digest, role: 'staff', status: 'approved', ...(login.email ? {email: login.email} : {}) }];
    s.sessions = []; s.authVersion = 1; return true;
  });
  return created?login:null;
}
function emailAddress(value) {
 assert(typeof value==='string' && value.length<=254 && /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value.trim()), 'Adj meg egy érvényes e-mail-címet.');
 return value.trim().toLowerCase();
}
function validatePassword(value) {
 assert(typeof value==='string' && value.length>=8 && value.length<=128,'A jelszó 8–128 karakter legyen.');
}
async function register(store, input, termsAcceptance) {
  const name = username(input.username);
  validatePassword(input.password);
  const email = emailAddress(input.email);
  const fields = {};
  for (const key of ['company','contact','phone','address']) {
    assert(typeof input[key] === 'string' && input[key].trim().length > 0 && input[key].length <= 250, 'Tölts ki minden partneradatot (legfeljebb 250 karakter).');
    fields[key] = input[key].trim();
  }
  const digest = await passwordHash(input.password);
  await store.change(s => {
    assert(!s.users.some(u => u.username === name), 'Ez a felhasználónév már foglalt.', 409);
    assert(!s.users.some(u=>u.email===email && u.role==='partner'), 'Ehhez az e-mail-címhez már tartozik regisztráció.', 409);
    const user={ id:id(), email, username:name, passwordHash:digest, role:'partner', status:'pending', ...fields, ...(termsAcceptance?{termsAcceptance}:{}), createdAt:new Date().toISOString() };
    s.users.push(user);
    require('./domain').queueStaffNotification(s,'staff-registration',user.id,'Új partnerregisztráció','Új partnerregisztráció vár jóváhagyásra.','/partner-admin/#applications');
  });
  return { email, username:name, company:fields.company, contact:fields.contact, address:fields.address, phone:fields.phone };
}
function applications(state) {
  return state.users.filter(u => u.role === 'partner').map(({passwordHash, ...user}) => user);
}
function review(state, input) {
  const user = state.users.find(u => u.id === input.id && u.role === 'partner');
  assert(user && user.status === 'pending', 'Ez a kérelem már nem vár jóváhagyásra.', 409);
  assert(['approved','rejected'].includes(input.status), 'Érvénytelen döntés.');
  if (input.status === 'approved') {
    const routeIds=input.routeIds||[input.routeId];assert(Array.isArray(routeIds)&&routeIds.length>0&&routeIds.length<=7&&new Set(routeIds).size===routeIds.length&&routeIds.every(id=>state.routes.some(r=>r.id===id)),'Válassz kiszállítási túrát.');
    const partner = { id:id(), name:user.company, address:user.address, phone:user.phone,contact:user.contact,routeId:routeIds[0],routeIds, preferences:{reminders:true,news:false} };
    state.partners.push(partner); user.partnerId = partner.id;
  }
  user.status = input.status; user.reviewedAt = new Date().toISOString();
  if (input.status === 'approved') return {email:user.email, username:user.username, company:user.company};
}
module.exports = { initialize, register, review, applications, verify, username, emailAddress, validatePassword, passwordHash };

