const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const path = require("path");
const domain = require("./domain");
const auth = require("./auth");
const legal = require("./legal");

const hash = value => crypto.createHash("sha256").update(value).digest("hex");
function createPortalApp({ testRateLimits, databaseUrl, storage, alerts, monitorToken, filename, adminCredentials, sendEmail = async()=>{throw new Error("Email not configured");}, publicOrigin = "http://localhost:3002", now = () => new Date(), staging = null } = {}) {
  if (process.env.NODE_ENV === "production" && !staging) throw new Error("The demo portal must not run in production.");
  const store = storage || (databaseUrl ? require('./postgres/store').createPostgresStore({connectionString:databaseUrl}) : require('./store').createStore(filename || path.join(__dirname, '../data/partner-demo.sqlite'), domain.seed));
  const ready = auth.initialize(store, adminCredentials, {requireExplicit: Boolean(staging)}).then(async credentials=>{await store.change(state=>require("./migrations").migrateDailyRoutes(state,now()));return credentials;});
  const recovery = require("./recovery").createRecovery({store,sendEmail,origin:publicOrigin});
  const invitations = require("./invitations").createInvitations({store,sendEmail,origin:publicOrigin});
  const app = express();
  let lastServerErrorAt=0;
  app.disable("x-powered-by");
  app.enable("strict routing");
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));
  if (staging) app.set('trust proxy', 'loopback');
  // Deliberately local-only until production account lifecycle and storage are provided.
  app.use((req, res, next) => {
    if (staging) {
      if (!req.secure || req.get('host') !== new URL(publicOrigin).host) return res.status(403).send('HTTPS required.');
      return next();
    }
    const address = req.socket.remoteAddress;
    if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address) ||
      !["localhost", "127.0.0.1", "::1"].includes(req.hostname)) return res.status(403).send("Local preview only.");
    next();
  });
  app.use(helmet({ contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"],
    imgSrc: ["'self'", "data:"], connectSrc: ["'self'"], objectSrc: ["'none'"],
  } }, strictTransportSecurity: false }));
  app.use(rateLimit({ windowMs: 60000, limit: testRateLimits?.global || 240 }));
  // iOS may fetch home-screen artwork without the browser's staging login.
  // These two fixed, non-sensitive files never expose partner data.
  app.get(['/partner/apple-touch-icon.png', '/partner-admin/apple-touch-icon.png'], (req, res) => {
    const filename = req.path.startsWith('/partner-admin/') ? 'admin-v2-180.png' : 'partner-v2-180.png';
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.type('png').sendFile(path.join(__dirname, 'public', filename));
  });
  if (staging && !staging.gateDisabled) {
    app.use(rateLimit({windowMs: 60000, limit: 120}));
    const expected = hash(staging.username + ':' + staging.password);
    app.use((req,res,next)=>{
      const header=req.get('authorization')||'';
      let actual='';
      if(header.startsWith('Basic ')) { try { actual=Buffer.from(header.slice(6),'base64').toString('utf8'); } catch {} }
      if(!crypto.timingSafeEqual(Buffer.from(hash(actual)),Buffer.from(expected))){res.set('WWW-Authenticate','Basic realm="Kebpro test", charset="UTF-8"');return res.status(401).send('Test access required.');}
      next();
    });
  }
  const jsonDefault = express.json({ limit: "30kb" });
  const jsonPhoto = express.json({ limit: "850kb" });
  app.use((req,res,next)=>(req.path==='/partner/api/complaints' ? jsonPhoto : jsonDefault)(req,res,next));
  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.locals.portalStaging = Boolean(staging);
    next();
  });
  app.get('/partner/health',async(req,res)=>{
    const provided=String(req.get('X-Portal-Monitor')||'');
    if(!monitorToken||provided.length!==monitorToken.length||!crypto.timingSafeEqual(Buffer.from(hash(provided)),Buffer.from(hash(monitorToken))))return res.sendStatus(404);
    try{await ready;const checks={...require('./health').inspect(await store.read()),server:Date.now()-lastServerErrorAt>300000};res.status(Object.values(checks).every(Boolean)?200:503).json({checks});}
    catch{res.status(503).json({checks:{database:false}});}
  });
  app.use("/partner/assets", express.static(path.join(__dirname, "public"), { maxAge: 0, setHeaders:res=>res.setHeader("Cache-Control","public, max-age=0, must-revalidate") }));
  app.get("/partner-admin/sw.js", (req,res)=>res.type("application/javascript").sendFile(path.join(__dirname,"public/admin-sw.js")));
  app.get("/partner-admin/manifest.webmanifest", (req,res)=>res.type("application/manifest+json").sendFile(path.join(__dirname,"public/admin.webmanifest")));
  app.get("/partner/sw.js", (req, res) => res.sendFile(path.join(__dirname, "public/sw.js")));
  app.get("/partner/manifest.webmanifest", (req, res) => res.type("application/manifest+json").sendFile(path.join(__dirname, "public/manifest.webmanifest")));
  app.get("/partner/logo.png", (req,res) => res.sendFile(path.join(__dirname, "../public/images/optimized/logo-170.png")));
  app.get("/", (req,res) => res.redirect("/partner/"));
  app.get("/partner", (req,res) => res.redirect("/partner/"));
  app.use(async (req,res,next) => {
    await ready;
    req.adminArea = req.path.startsWith("/partner-admin");
    req.cookieName = req.adminArea ? "kbp_admin" : "kbp_portal";
    req.base = req.adminArea ? "/partner-admin" : "/partner";
    const cookie = String(req.headers.cookie || "").split(";").map(c => c.trim()).find(c => c.startsWith(req.cookieName + "="));
    const token = cookie ? cookie.slice(req.cookieName.length + 1) : "";
    req.portalToken=token;
    if(!/^[a-f0-9]{64}$/.test(token))return next();
    if(store.lookupSession){req.portalSession=await store.lookupSession(hash(token),req.adminArea?'staff':'partner',Date.now());return next();}
    const state = await store.read();
    req.portalSession = state.sessions.find(s => s.hash === hash(token) && s.expires > Date.now() && s.role === (req.adminArea ? "staff" : "partner"));
    if(req.portalSession && !state.users.some(u=>u.id===req.portalSession.userId&&u.status==='approved'))req.portalSession=undefined;
    next();
  });
  app.use((req,res,next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      if (req.get("origin") !== req.protocol + "://" + req.get("host") || !req.is("application/json")) {
        return res.status(403).json({ error: "Érvénytelen kérésforrás." });
      }
      if (!["/partner/api/login","/partner/api/register","/partner-admin/api/login","/partner/api/forgot-password","/partner-admin/api/forgot-password","/partner/api/reset-password","/partner-admin/api/reset-password","/partner-admin/api/accept-invitation"].includes(req.path) &&
        (!req.portalSession || req.get("x-csrf-token") !== req.portalSession.csrf)) {
        return res.status(403).json({ error: "A munkamenet lejárt. Jelentkezz be újra." });
      }
    }
    next();
  });
  app.use(async(req,res,next)=>{
    if(req.method!=='GET'&&req.portalSession){
      const actor=store.lookupUser?await store.lookupUser(req.portalSession.userId):(await store.read()).users.find(u=>u.id===req.portalSession.userId);
      if(!actor || actor.status!=='approved')return res.status(401).json({error:'Jelentkezz be újra.'});
      return require('./audit').context.run({id:actor.id,username:actor.username,role:actor.role,action:req.path.split('/').pop()},next);
    }
    next();
  });
  function requireSession(req,res,next) {
    if (req.portalSession) return next();
    if (req.path.includes("/api/")) return res.status(401).json({ error: "Jelentkezz be a folytatáshoz." });
    return res.redirect(req.base + "/login");
  }
  function staff(req,res,next) {
    if (req.portalSession?.role === "staff") return next();
    return res.status(403).json({ error: "Csak a céges munkatársak számára elérhető." });
  }
  function partner(req,res,next) {
    if (req.portalSession?.role === "partner") return next();
    return res.status(403).json({ error: "Ehhez partnerként kell belépned." });
  }
  app.get(["/partner/login", "/partner-admin/login"], (req,res) => res.render("login", {admin:req.adminArea, base:req.base,terms:legal.snapshot('terms'),privacy:legal.snapshot('privacy')}));
  app.get('/partner/legal/:kind/:version',(req,res)=>{const doc=legal.resolve(req.params.kind,req.params.version);if(!doc)return res.status(404).send('A dokumentum nem található.');res.render('legal',{doc});});
  const authLimit = rateLimit({windowMs:60000, limit:testRateLimits?.auth || 15});
  app.get(["/partner/reset-password","/partner-admin/reset-password"],(req,res)=>res.render("reset",{base:req.base}));
  app.post(["/partner/api/forgot-password","/partner-admin/api/forgot-password"],authLimit,async(req,res)=>res.json(await recovery.request(req.body,req.adminArea?'staff':'partner')));
  app.post(["/partner/api/reset-password","/partner-admin/api/reset-password"],authLimit,async(req,res)=>res.json(await recovery.reset(req.body,req.adminArea?'staff':'partner')));
  app.get("/partner-admin/accept-invitation",(req,res)=>res.render("invitation"));
  app.post("/partner-admin/api/accept-invitation",authLimit,async(req,res)=>res.json(await invitations.accept(req.body)));
  app.post("/partner-admin/api/invitations",requireSession,staff,rateLimit({windowMs:3600000,limit:10}),async(req,res)=>res.json(await invitations.invite(req.body,req.portalSession.userId)));
  app.post("/partner-admin/api/revoke-invitation",requireSession,staff,async(req,res)=>res.json(await invitations.revoke(req.body,req.portalSession.userId)));
  app.post("/partner/api/register", authLimit, async (req,res) => {
    const acceptance=legal.verifyAcceptance(req.body);
    const account = await auth.register(store, req.body, acceptance);
    let emailSent = false;
    try {
      await sendEmail(require('./registration-email').registrationEmail(account));
      emailSent = true;
    } catch {
      // The account remains registered even if SMTP is temporarily unavailable.
      console.error('[partner mail] Registration confirmation delivery failed.');
    }
    res.status(201).json({ok:true, emailSent});
  });
  app.post(["/partner/api/login", "/partner-admin/api/login"], authLimit, async (req,res) => {
    const state = await store.read();
    const name = typeof req.body.username === "string" ? req.body.username.trim().toLowerCase() : "";
    const user = state.users.find(u => u.username === name && u.role === (req.adminArea ? "staff" : "partner"));
    const valid = await auth.verify(req.body.password, user?.passwordHash || state.users.find(u=>u.role==="staff").passwordHash);
    domain.assert(user && valid, "Hibás felhasználónév vagy jelszó.", 401);
    domain.assert(user.status === "approved", user.status === "pending" ? "A regisztrációd még céges jóváhagyásra vár." : "A regisztrációdat nem hagyták jóvá. Keresd a Kebpro munkatársait.", 403);
    const token = crypto.randomBytes(32).toString("hex");
    const sessionDuration = (user.role === 'partner' ? 90 : 1) * 86400000;
    const session = {hash:hash(token), csrf:crypto.randomBytes(32).toString("hex"), expires:Date.now()+sessionDuration, role:user.role, partnerId:user.partnerId, userId:user.id};
    await store.change(s => { domain.assert(s.users.find(u=>u.id===user.id)?.passwordHash===user.passwordHash && s.users.find(u=>u.id===user.id)?.status==='approved',"A jelszó időközben megváltozott. Jelentkezz be újra.",401); s.sessions=s.sessions.filter(x=>x.expires>Date.now()); s.sessions.push(session); });
    res.cookie(req.cookieName, token, {httpOnly:true,secure:req.secure,sameSite:"strict",path:req.base,maxAge:sessionDuration});
    res.json({next:req.base+"/"});
  });
  app.post(["/partner/api/logout", "/partner-admin/api/logout"], requireSession, async (req,res) => {
    await store.change(state => {
      state.sessions = state.sessions.filter(s => s.hash !== req.portalSession.hash);
      if (typeof req.body.endpoint === "string") {
        state.subscriptions = state.subscriptions.filter(s => !(s.endpoint === req.body.endpoint && (req.portalSession.role==='staff' ? s.staffUserId===req.portalSession.userId : s.partnerId===req.portalSession.partnerId)));
      }
    });
    res.clearCookie(req.cookieName, { path: req.base, httpOnly: true, secure:req.secure, sameSite: "strict" });
    res.json({ next: req.base + "/login" });
  });
  app.get("/partner/", requireSession, (req,res) => {
    if (req.portalSession.role === "staff") return res.redirect("/partner/admin");
    res.render("portal", { role: "partner", csrf: req.portalSession.csrf, terms:legal.snapshot('terms'), privacy:legal.snapshot('privacy') });
  });
  app.get("/partner/admin", (req,res)=>res.redirect("/partner-admin/"));
  app.get("/partner-admin", (req,res)=>res.redirect("/partner-admin/"));
  app.get("/partner-admin/", requireSession, staff, (req,res) =>
    res.render("portal", { role: "staff", csrf: req.portalSession.csrf, terms:legal.snapshot('terms'), privacy:legal.snapshot('privacy') }));
  app.get("/partner/api/me", requireSession, partner, async (req,res) => {
    const listing=require('./listing').options(req.query,true);
    const state = store.readPartner ? await store.readPartner(req.portalSession.partnerId,listing,now()) : await store.read();
    res.json({...domain.safePartner(state, state.partners.find(p => p.id === req.portalSession.partnerId), now(),listing),loginSession:require('./sessions').info(state.sessions?.find(s=>s.hash===req.portalSession.hash)||req.portalSession)});
  });
  app.post('/partner/api/extend-session',requireSession,partner,async(req,res)=>{
    const loginSession=await store.change(s=>require('./sessions').extend(s,req.portalSession.hash,req.body.expiresAt));
    res.cookie(req.cookieName,req.portalToken,{httpOnly:true,secure:req.secure,sameSite:'strict',path:req.base,maxAge:Math.max(0,loginSession.expiresAt-Date.now())});
    res.json({loginSession});
  });
  app.post("/partner/api/responses", requireSession, partner, async (req,res) => {
    const result = await store.change(state => domain.submitResponse(state, req.portalSession.partnerId, req.body, now()));
    res.json({ response: result });
  });
  app.post('/partner/api/complaints',requireSession,partner,rateLimit({windowMs:3600000,limit:20}),async(req,res)=>{
    const complaint=await store.change(s=>domain.submitComplaint(s,req.portalSession.partnerId,req.body,now()));res.json({complaint});
  });
  app.get(['/partner/api/complaint-photo/:id','/partner-admin/api/complaint-photo/:id'],requireSession,async(req,res)=>{
    const photo = store.lookupComplaintPhoto ? await store.lookupComplaintPhoto(req.params.id) : (await store.read()).complaintPhotos?.find(p=>p.id===req.params.id);
    if(!photo || (req.portalSession.role==='partner' && photo.partnerId!==req.portalSession.partnerId) || !['partner','staff'].includes(req.portalSession.role))return res.sendStatus(404);
    res.set('Cache-Control','private, no-store');res.type('image/jpeg').send(Buffer.from(photo.data,'base64'));
  });
  app.post("/partner/api/favorites",requireSession,partner,async(req,res)=>{
    await store.change(s=>{domain.assert(s.products.some(p=>p.id===req.body.productId&&p.active)&&typeof req.body.favorite==='boolean','Érvénytelen kedvenc.');const p=s.partners.find(p=>p.id===req.portalSession.partnerId);p.favoriteProductIds=(p.favoriteProductIds||[]).filter(id=>id!==req.body.productId);if(req.body.favorite)p.favoriteProductIds.push(req.body.productId);});res.json({ok:true});
  });
  app.post("/partner/api/templates",requireSession,partner,async(req,res)=>{
    const template=await store.change(s=>domain.saveTemplate(s,req.portalSession.partnerId,req.body));res.json({ok:true,template});
  });
  app.post("/partner/api/preferences", requireSession, partner, async (req,res) => {
    domain.assert(typeof req.body.news === "boolean" && typeof req.body.reminders === "boolean", "Érvénytelen beállítások.");
    await store.change(state => {
      const person = state.partners.find(p => p.id === req.portalSession.partnerId);
      person.preferences = { news: req.body.news, reminders: req.body.reminders };
    });
    res.json({ ok: true });
  });
  app.post("/partner/api/subscription", requireSession, partner, async (req,res) => {
    const subscription = domain.validateSubscription(req.body);
    await store.change(state => {
      state.subscriptions = state.subscriptions.filter(s => s.endpoint !== subscription.endpoint);
      state.subscriptions.push({ ...subscription, partnerId: req.portalSession.partnerId, createdAt: new Date().toISOString() });
      if (req.body.enableNews === true) {
        const person = state.partners.find(p => p.id === req.portalSession.partnerId);
        if (person) person.preferences = { ...person.preferences, news: true };
      }
    });
    res.json({ ok: true, mode: (await store.read()).pushMode || 'simulation' });
  });
  app.delete("/partner/api/subscription", requireSession, partner, async (req,res) => {
    await store.change(state => {
      state.subscriptions = state.subscriptions.filter(s => !(s.partnerId === req.portalSession.partnerId && s.endpoint === req.body.endpoint));
    });
    res.json({ ok: true });
  });
  app.post('/partner-admin/api/subscription',requireSession,staff,async(req,res)=>{
    const subscription=domain.validateSubscription(req.body);
    await store.change(state=>{state.subscriptions=state.subscriptions.filter(s=>s.endpoint!==subscription.endpoint);state.subscriptions.push({...subscription,staffUserId:req.portalSession.userId,createdAt:new Date().toISOString()});});
    res.json({ok:true,mode:(await store.read()).pushMode||'simulation'});
  });
  app.delete('/partner-admin/api/subscription',requireSession,staff,async(req,res)=>{
    await store.change(state=>{state.subscriptions=state.subscriptions.filter(s=>!(s.staffUserId===req.portalSession.userId&&s.endpoint===req.body.endpoint));});res.json({ok:true});
  });
  app.get("/partner-admin/api/admin", requireSession, staff, async (req,res) => {
    const date = req.query.date || domain.addDays(domain.localTime(now()).date, 1);
    const listing=require('./listing').options(req.query),tomorrow=domain.addDays(domain.localTime(now()).date,1);
    const state = store.readAdmin?await store.readAdmin(date,tomorrow,listing):await store.read();
    const tomorrowView=domain.adminView(state,tomorrow,''),active=p=>!state.users.some(u=>u.partnerId===p.id&&u.status==='disabled');
    const todo={date:tomorrow,missing:tomorrowView.partners.filter(p=>active(p)&&!p.response).length,pending:state.users.filter(u=>u.role==='partner'&&u.status==='pending').length};
    res.json({ retention:state.retention||{months:3},todo,date, currentUserId:req.portalSession.userId,publicKey:state.vapid.publicKey,pushMode:state.pushMode||'simulation', accounts:state.users.filter(u=>['approved','disabled'].includes(u.status)).map(u=>({id:u.id,username:u.username,company:u.company,role:u.role,status:u.status})), auditLog:(state.auditLog||[]).slice(-100).reverse(), operations:state.operations||{}, applications:auth.applications(state), ...invitations.list(state), ...domain.adminView(state, date, req.query.route || "",listing) });
  });
  app.post('/partner-admin/api/products',requireSession,staff,async(req,res)=>{
    await store.change(s=>{const p=s.products.find(p=>p.id===req.body.id);domain.assert(p&&typeof req.body.active==='boolean','Érvénytelen termék.');p.active=req.body.active;});res.json({ok:true});
  });
  app.post('/partner-admin/api/prices',requireSession,staff,async(req,res)=>{await store.change(s=>domain.updatePrice(s,req.body));res.json({ok:true});});
  app.post('/partner-admin/api/promotions',requireSession,staff,async(req,res)=>{await store.change(s=>domain.updatePromotion(s,req.body));res.json({ok:true});});
  app.post('/partner-admin/api/complaints',requireSession,staff,async(req,res)=>{
    const complaint=await store.change(s=>domain.updateComplaint(s,req.body,req.portalSession.userId,now()));res.json({complaint});
  });
  app.post('/partner-admin/api/accounts',requireSession,staff,async(req,res)=>{
    await store.change(s=>require('./audit').setAccountStatus(s,req.body,req.portalSession.userId));res.json({ok:true});
  });
  app.post("/partner-admin/api/news", requireSession, staff, async (req,res) =>
    res.json({ news: await store.change(state => domain.publishNews(state, req.body)) }));
  app.post("/partner-admin/api/routes", requireSession, staff, async (req,res) => {
    await store.change(state => domain.updateRoute(state, req.body));
    res.json({ ok: true });
  });
  app.post("/partner-admin/api/partners", requireSession, staff, async (req,res) => {
    await store.change(state => domain.updatePartner(state, req.body));
    res.json({ ok: true });
  });
  app.post("/partner-admin/api/archive", requireSession, staff, async(req,res)=>{
    const response=await store.change(s=>domain.archiveOrder(s,req.body,req.portalSession.userId,now()));
    res.json({response});
  });
  app.post("/partner-admin/api/reminders", requireSession, staff, async (req,res) => {
    const created = await store.change(state => domain.runReminders(state, now()));
    res.json({ created });
  });
  app.post("/partner-admin/api/applications", requireSession, staff, async (req,res) => {
    const account=await store.change(s=>auth.review(s,req.body));
    let emailSent=null;
    if(account){
      try { await sendEmail(require('./registration-email').approvalEmail(account,publicOrigin)); emailSent=true; }
      catch { emailSent=false; }
    }
    res.json({ok:true,emailSent});
  });
  app.use((err,req,res,next) => {
    if (!(err instanceof domain.InputError)) {console.error('[partner] Unexpected server error');lastServerErrorAt=Date.now();}
    res.status(err.status || 500).json({ error: err instanceof domain.InputError ? err.message : "A művelet nem sikerült. Próbáld újra." });
  });
  return { app, store, ready, tick: () => store.change(state => domain.runReminders(state, now())) };
}
module.exports = { createPortalApp };

