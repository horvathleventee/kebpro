const crypto = require("crypto");
const webpush = require("web-push");
const { getOrderProductOptions } = require("../utils/i18n");
const id = () => crypto.randomUUID();
class InputError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
function assert(condition, message, status) { if (!condition) throw new InputError(message, status); }
function text(value, max, label) {
  assert(typeof value === "string" && value.trim().length > 0 && value.trim().length <= max, label + " megadása szükséges (max. " + max + " karakter).");
  return value.trim();
}
function localTime(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Budapest", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now).map(p => [p.type, p.value]));
  return { date: parts.year + "-" + parts.month + "-" + parts.day, time: parts.hour + ":" + parts.minute };
}
function addDays(date, amount) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}
function validDate(date) {
  return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !isNaN(Date.parse(date)) && new Date(date + "T12:00:00Z").toISOString().slice(0, 10) === date;
}
function partnerRoutes(state,partner){return state.routes.filter(r=>(partner.routeIds||[partner.routeId]).includes(r.id));}
function routeFor(state,partner,date){return partnerRoutes(state,partner).find(r=>!date||deliveryOn(r,date));}
function deliveries(state,partner,now=new Date()){
 const current=localTime(now), result=[];
 for(let day=1;day<=14;day++){
  const date=addDays(current.date,day),route=routeFor(state,partner,date);if(!route)continue;
  const cutoffDate=orderCutoffDate(date),cutoff='14:00';
  result.push({date,routeId:route.id,route:route.name,cutoffDate,cutoff,open:current.date<cutoffDate || (current.date===cutoffDate && current.time<cutoff)});
 }
 return result;
}
function orderCutoffDate(date){return addDays(date,new Date(date+'T12:00:00Z').getUTCDay()===1?-3:-1);}
function deliveryOn(route, date) {
  return validDate(date) && route.days.includes(new Date(date + "T12:00:00Z").getUTCDay());
}
function nextDelivery(state,partner,now=new Date()) {const next=deliveries(state,partner,now)[0];assert(next,'Nincs beállított kiszállítási nap.');return next;}
function seed() {
  const products = [...new Set(getOrderProductOptions("hu").map(p => p.value))].map((name, index) => ({
    id: "product-" + (index + 1), name, active: true,
  }));
  return {
    version: 1,
    routes: [
      { id: "route-1", name: "Budapest és környéke", days: [1, 3, 5], reminder: "09:00", cutoff: "14:00" },
      { id: "route-2", name: "Kecskemét és környéke", days: [2, 4], reminder: "09:00", cutoff: "14:00" },
    ],
    partners: [
      { id: "partner-1", name: "Minta Gyros Büfé", address: "Kecskemét · bemutató partner", routeId: "route-2", preferences: { reminders: true, news: false } },
      { id: "partner-2", name: "Főtér Bisztró (minta)", address: "Kecskemét · bemutató partner", routeId: "route-2", preferences: { reminders: true, news: false } },
      { id: "partner-3", name: "Duna Kebab (minta)", address: "Budapest · bemutató partner", routeId: "route-1", preferences: { reminders: true, news: false } },
    ],
    products, responses: [], sessions: [], subscriptions: [], outbox: [],
    vapid: webpush.generateVAPIDKeys(),
    news: [{
      id: "welcome", title: "Üdvözlünk a Kebpro partnerfelületén!",
      body: "Itt adhatod le a következő rendelésedet, és itt találod majd a friss híreket, akciókat. Ez egy helyi bemutató, mintapartnerekkel.",
      kind: "Hír", createdAt: new Date().toISOString(), sample: true,
    }],
  };
}
function queueMessage(state, partnerId, key, title, body, url, category) {
  if (state.users?.some(u=>u.partnerId===partnerId&&u.status==='disabled'))return false;
  if (state.outbox.some(n => n.key === key && n.partnerId === partnerId)) return false;
  state.outbox.push({ id: id(), partnerId, key, title, body, url, category,
    createdAt: new Date().toISOString(), status: state.pushMode === "live" ? "pending" : "simulation", attempts: 0 });
  return true;
}
function queueStaffNotification(state,category,eventId,title,body,url){
 for(const user of (state.users||[]).filter(u=>u.role==='staff'&&u.status==='approved')){
  const key=category+':'+eventId;
  if(state.outbox.some(n=>n.key===key&&n.staffUserId===user.id))continue;
  state.outbox.push({id:id(),staffUserId:user.id,key,title,body,url,category,createdAt:new Date().toISOString(),status:state.pushMode==='live'?'pending':'simulation',attempts:0});
 }
}
function queueStaffOrder(state,response){queueStaffNotification(state,'staff-order',response.id,'Új rendelés érkezett','Új partneri rendelés vár feldolgozásra.','/partner-admin/#dashboard');}
function validateItems(state,items){
 const input={items};
    assert(Array.isArray(input.items) && input.items.length > 0 && input.items.length <= 50, "Válassz legalább egy terméket (legfeljebb 50 tétel).");
    const used = new Set();
    return input.items.map(item => {
      const product = state.products.find(p => p.id === item.productId);
      assert(product && !used.has(item.productId), "Ismeretlen vagy ismétlődő termék.");
      assert(product.active, product.name + " átmenetileg nem rendelhető. Távolítsd el a kosárból.");
      used.add(item.productId);
      assert(typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0 && item.quantity <= 10000 &&
        Math.abs(item.quantity * 100 - Math.round(item.quantity * 100)) < 0.000001, "Hibás mennyiség (0,01–10 000).");
      assert(["kg", "db", "karton"].includes(item.unit), "Válassz mértékegységet.");
      assert(item.unit === "kg" || Number.isInteger(item.quantity), "Darab és karton csak egész mennyiség lehet.");
      return { productId: product.id, name: product.name, quantity: item.quantity, unit: item.unit };
    });
}
const priceUnits=['kg','db','karton'];
function updatePrice(state,input){
 const product=state.products.find(p=>p.id===input.productId);
 assert(product && priceUnits.includes(input.unit),'Ismeretlen termék vagy mértékegység.');
 const partner=input.partnerId ? state.partners.find(p=>p.id===input.partnerId) : null;
 assert(!input.partnerId||partner,'Ismeretlen partner.');
 assert(input.price===null || (Number.isSafeInteger(input.price)&&input.price>=0&&input.price<=100000000),'Az ár 0 és 100 000 000 közötti egész forint lehet.');
 if(partner){partner.prices ||= {};partner.prices[product.id] ||= {};if(input.price===null)delete partner.prices[product.id][input.unit];else partner.prices[product.id][input.unit]=input.price;if(!Object.keys(partner.prices[product.id]).length)delete partner.prices[product.id];}
 else{product.prices ||= {};if(input.price===null)delete product.prices[input.unit];else product.prices[input.unit]=input.price;}
}
function updatePromotion(state,input){
 const product=state.products.find(p=>p.id===input.productId);
 assert(product && ['kg','db'].includes(input.unit),'Ismeretlen termék vagy mértékegység.');
 assert(['none','discount','fixed'].includes(input.kind),'Érvénytelen akciótípus.');
 product.promotions ||= {};
 if(input.kind==='none'){delete product.promotions[input.unit];return;}
 assert(Number.isSafeInteger(input.value)&&input.value>=0&&input.value<=100000000,'Az akció értéke 0 és 100 000 000 közötti egész forint lehet.');
 product.promotions[input.unit]={kind:input.kind,value:input.value};
}
function priceFor(product,partner,unit){
 const price=partner.prices?.[product.id]?.[unit] ?? product.prices?.[unit] ?? null;
 if(price===null)return null;
 const promotion=product.promotions?.[unit];
 return promotion?.kind==='discount'?Math.max(0,price-promotion.value):promotion?.kind==='fixed'?promotion.value:price;
}
function pricedItems(state,partner,items){return items.map(item=>{const price=priceFor(state.products.find(p=>p.id===item.productId),partner,item.unit);return {...item,unitPrice:price,lineTotal:price===null?null:Math.round(price*Math.round(item.quantity*100)/100)};});}
function submitResponse(state, partnerId, input, now = new Date()) {
  const partner = state.partners.find(p => p.id === partnerId);
  assert(partner, "Ismeretlen partner.", 403);
  const delivery = deliveries(state,partner,now).find(d=>d.date===input.date);
  assert(delivery,"Erre a napra nem rendelhetsz.",409);
  assert(input.date === delivery.date, "A kiszállítás időpontja megváltozott. Frissítsd az oldalt.", 409);
  assert(delivery.open, "A rendelési határidő lejárt. Kérjük, egyeztess telefonon.", 409);
  assert(input.kind === "order" || input.kind === "skip", "Érvénytelen válasz.");
  const existing = state.responses.find(r => r.partnerId === partnerId && r.date === delivery.date);
  // One response per partner and delivery. A repeat request cannot create duplicates.
  if (existing && (existing.requestId === input.requestId || existing.changeIds?.includes(input.requestId))) return existing;
  assert(!existing || (input.responseId===existing.id && input.revision===(existing.revision||1)), "A rendelés időközben változott, vagy már válaszoltál. Nyisd meg újra a módosítást.",409);
  assert(!input.responseId || existing?.id===input.responseId,'Ismeretlen saját rendelés.',404);
  assert(typeof input.requestId === "string" && /^[a-f0-9-]{36}$/.test(input.requestId), "Érvénytelen kérésazonosító.");
  const items=input.kind==='order'?pricedItems(state,partner,validateItems(state,input.items)):[];
  assert(items.every(item=>item.unitPrice!==null),'Az egyik termékhez nincs megadva ár. Kérjük, fordulj az értékesítő kollégákhoz az ár beállításához.',409);
  if(input.kind==='order')assert(Array.isArray(input.expectedPrices)&&input.expectedPrices.length===items.length&&items.every((item,i)=>input.expectedPrices[i]===item.unitPrice),'Az árak megváltoztak, vagy még nem erősítetted meg őket. Frissítsd az oldalt és ellenőrizd újra a rendelést.',409);
  const total=items.length&&items.every(i=>i.lineTotal!==null)?items.reduce((sum,i)=>sum+i.lineTotal,0):null;
  assert(input.note === undefined || (typeof input.note === "string" && input.note.length <= 1000), "A megjegyzés legfeljebb 1000 karakter lehet.");
  if(existing){
    existing.changes ||= [];existing.changes.push({revision:existing.revision||1,items:existing.items,total:existing.total??null,note:existing.note,kind:existing.kind,status:existing.status,archivedAt:existing.archivedAt||null,changedAt:now.toISOString()});
    existing.changeIds ||= [existing.requestId];existing.changeIds.push(input.requestId);
    const wasSkip=existing.kind==='skip';
    Object.assign(existing,{items,total,note:(input.note||'').trim(),kind:input.kind,revision:(existing.revision||1)+1,modifiedAt:now.toISOString(),status:input.kind==='skip'?'skip':'received'});
    delete existing.archivedAt;delete existing.archivedBy;existing.statusUpdatedAt=now.toISOString();
    queueMessage(state,partnerId,'modified:'+existing.id+':'+existing.revision,'Rendelésed módosult',delivery.date+' · A módosítást rögzítettük.','/partner/#history','order');
    if(wasSkip&&input.kind==='order')queueStaffOrder(state,existing);
    return existing;
  }
  const response = { revision:1,id: id(), requestId: input.requestId, partnerId, partnerName: partner.name,
    address: partner.address, routeId: delivery.routeId, date: delivery.date, kind: input.kind, items, total,
    note: (input.note || "").trim(), status: input.kind === "skip" ? "skip" : "received", createdAt: now.toISOString() };
  state.responses.push(response);
  if(input.kind==='order')queueStaffOrder(state,response);
  queueMessage(state, partnerId, "response:" + response.id, input.kind === "order" ? "Rendelésed beérkezett" : "Válaszod rögzítve",
    delivery.date + " · " + (input.kind === "order" ? "A Kebpro munkatársai feldolgozzák a rendelésedet." : "Most nem kérsz szállítást."),
    "/partner/#history", "order");
  return response;
}
function submitComplaint(state,partnerId,input,now=new Date()){
 const partner=state.partners.find(p=>p.id===partnerId);assert(partner,'Ismeretlen partner.',403);
 assert(typeof input.requestId==='string' && /^[a-f0-9-]{36}$/.test(input.requestId),'Érvénytelen kérésazonosító.');
 const existing=(partner.complaints||[]).find(c=>c.requestId===input.requestId);if(existing)return existing;
 const general=input.kind==='general';
 const order=general?null:state.responses.find(r=>r.id===input.orderId&&r.partnerId===partnerId&&r.kind==='order');assert(general||order,'A rendelés nem található.',404);
 const message=text(input.message,2000,'A probléma leírása');
 if(!general)assert(input.photo&&input.labelPhoto,'Reklamációhoz a problémáról és a termékjelölő címkéről is szükséges egy kép.');
 const photos=[input.photo,input.labelPhoto].map(photo=>{
  if(photo===undefined||photo===null||photo==='')return null;
  assert(typeof photo==='string'&&photo.length<=410000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo),'A kép formátuma vagy mérete érvénytelen.');
  const bytes=Buffer.from(photo.slice('data:image/jpeg;base64,'.length),'base64');
  assert(bytes.length<=300000&&bytes.length>=4&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[bytes.length-2]===0xff&&bytes[bytes.length-1]===0xd9,'Csak tömörített JPEG kép tölthető fel (legfeljebb 300 KB).');
  return bytes;
 });
 const ids=photos.map(bytes=>{if(!bytes)return null;const photoId=id();(state.complaintPhotos||=[]).push({id:photoId,partnerId,data:bytes.toString('base64'),createdAt:now.toISOString()});return photoId;});
 const complaint={id:id(),requestId:input.requestId,kind:general?'general':'complaint',orderId:order?.id||null,orderDate:order?.date||null,partnerId,partnerName:partner.name,message,status:'open',revision:1,createdAt:now.toISOString(),reply:null};
 if(ids[0])complaint.photoId=ids[0];if(ids[1])complaint.labelPhotoId=ids[1];
 (partner.complaints||=[]).push(complaint);
 queueStaffNotification(state,'staff-complaint',complaint.id,general?'Új partneri visszajelzés':'🚨 Új reklamáció érkezett',general?'Új partneri üzenet vár megtekintésre.':'Egy rendeléshez új reklamáció érkezett.','/partner-admin/#complaints');
 return complaint;
}
function updateComplaint(state,input,actorId,now=new Date()){
 const partner=state.partners.find(p=>(p.complaints||[]).some(c=>c.id===input.id));const complaint=partner?.complaints.find(c=>c.id===input.id);
 assert(complaint,'A bejelentés nem található.',404);assert(input.expectedRevision===(complaint.revision||1),'A bejelentés időközben módosult. Frissítsd és ellenőrizd újra.',409);assert(['open','resolved'].includes(input.status),'Érvénytelen állapot.');
 assert(typeof input.reply==='string'&&input.reply.length<=2000,'A válasz legfeljebb 2000 karakter lehet.');
 if(input.status==='resolved'&&complaint.status!=='resolved')complaint.resolvedAt=now.toISOString();
 if(input.status==='open')delete complaint.resolvedAt;
 Object.assign(complaint,{status:input.status,reply:input.reply.trim()||null,revision:(complaint.revision||1)+1,updatedAt:now.toISOString(),updatedBy:actorId});return complaint;
}
function publishNews(state, input) {
  const title = text(input.title, 140, "Cím");
  const body = text(input.body, 4000, "Szöveg");
  assert(["Hír", "Akció", "Tájékoztató"].includes(input.kind), "Érvénytelen hírtípus.");
  assert(typeof input.requestId === "string" && /^[a-f0-9-]{36}$/.test(input.requestId), "Érvénytelen kérésazonosító.");
  const existing = state.news.find(n => n.requestId === input.requestId);
  if (existing) return existing;
  const news = { id: id(), title, body, kind: input.kind, requestId: input.requestId, createdAt: new Date().toISOString() };
  state.news.unshift(news);
  for (const partner of state.partners.filter(p => p.preferences.news)) {
    queueMessage(state, partner.id, "news:" + news.id, title, body.slice(0, 180), "/partner/#news", "news");
  }
  return news;
}
function runReminders(state, now = new Date()) {
  const current = localTime(now);
  let created = 0;
  for (const partner of state.partners) {
    if (!partner.preferences.reminders) continue;
    for (const delivery of deliveries(state,partner,now)) {
      if (!delivery.open || state.responses.some(r => r.partnerId === partner.id && r.date === delivery.date)) continue;
      const firstDay=addDays(delivery.cutoffDate,-1);
      const first=current.date===firstDay && current.time>='17:00';
      const second=current.date===delivery.cutoffDate && current.time>='10:00' && current.time<'14:00';
      if (!first && !second) continue;
      if(second && state.outbox.some(n=>n.partnerId===partner.id && n.key==='reminder:'+delivery.date))continue;
      const body=first?'A rendelést már most leadhatod, vagy holnap 14:00-ig az alkalmazásban. Ha nem válaszolsz, munkatársaink kereshetnek.':'Add le a rendelésedet ma 14:00-ig, vagy jelezd, ha most nem kérsz szállítást.';
      if (queueMessage(state, partner.id, 'reminder:'+delivery.date+':'+(first?'evening':'morning'), 'Rendelési emlékeztető · '+delivery.date, body, '/partner/#order', 'reminder')) created++;
    }
  }
  return created;
}
function updateRoute(state, input) {
  const route = state.routes.find(r => r.id === input.id);
  assert(route, "Ismeretlen túra.");
  assert(Array.isArray(input.days) && input.days.length > 0 && input.days.length <= 7 &&
    input.days.every(d => Number.isInteger(d) && d >= 0 && d <= 6), "Válassz legalább egy kiszállítási napot.");
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  assert(time.test(input.reminder) && time.test(input.cutoff) && input.reminder < input.cutoff,
    "Az emlékeztető időpontja legyen a rendelési határidő előtt.");
  const name=input.name===undefined ? route.name : text(input.name,100,"Túra neve");
  assert(name.length>0,'Add meg a túra nevét.');
  if(route.fixedDay!==undefined)assert(input.days.length===1 && input.days[0]===route.fixedDay,'A napi túra napja nem változtatható meg.');
  Object.assign(route, { name, days: [...new Set(input.days)], reminder: input.reminder, cutoff: input.cutoff });
}
function updatePartner(state,input){
 const partner=state.partners.find(p=>p.id===input.id);const routeIds=input.routeIds||[input.routeId];
 assert(partner && Array.isArray(routeIds) && routeIds.length>0 && routeIds.length<=7 && new Set(routeIds).size===routeIds.length && routeIds.every(id=>state.routes.some(r=>r.id===id)),'Válassz legalább egy érvényes túrát.');
 const removed=(partner.routeIds||[partner.routeId]).filter(id=>!routeIds.includes(id));
 assert(!state.responses.some(r=>r.partnerId===partner.id && r.date>=localTime().date && removed.includes(r.routeId)),'Jövőbeli visszajelzéssel rendelkező túranap nem távolítható el. Új napokat hozzáadhatsz.',409);
 partner.routeIds=routeIds;partner.routeId=routeIds[0];
}
function saveTemplate(state,partnerId,input){
 const partner=state.partners.find(p=>p.id===partnerId);assert(partner,'Ismeretlen partner.',403);
 partner.templates ||= [];
 if(input.remove){const index=partner.templates.findIndex(t=>t.id===input.id);assert(index>=0,'Ismeretlen saját lista.',404);partner.templates.splice(index,1);return;}
 const name=text(input.name,80,'Lista neve'),items=validateItems(state,input.items);
 const existing=partner.templates.find(t=>t.id===input.id);assert(!input.id||existing,'Ismeretlen saját lista.',404);
 assert(existing||partner.templates.length<20,'Legfeljebb 20 listát menthetsz.');
 const template={id:existing?.id||id(),name,items};if(existing)Object.assign(existing,template);else partner.templates.push(template);return template;
}
function safePartner(state, partner, now, listing) {
  const deliveryOptions=deliveries(state,partner,now), openDates=new Set(deliveryOptions.filter(d=>d.open).map(d=>d.date));
  assert(deliveryOptions.length, "Nincs beállított kiszállítási nap.");
  const today=localTime(now).date,own=state.responses.filter(r=>r.partnerId===partner.id);
  const page=state._history||(listing?require('./listing').select(own,listing):null);
  const present=r=>({...r,status:r.kind==='skip'?'skip':r.archivedAt?'archived':'received',canEdit:openDates.has(r.date)});
  return { historyPage:page?.pagination, currentResponses:own.filter(r=>r.date>=today).map(present), ...partner, routeIds:partner.routeIds||[partner.routeId], deliveryOptions, templates:partner.templates||[], nextDelivery: deliveryOptions[0],
    products: state.products.filter(p => p.active).map(p=>({id:p.id,name:p.name,active:p.active,prices:Object.fromEntries(priceUnits.map(unit=>[unit,priceFor(p,partner,unit)]))})),
    history: (page?page.rows:own.sort((a,b)=>b.createdAt.localeCompare(a.createdAt))).map(present),
    news: state.news,
    messages: state.outbox.filter(n => n.partnerId === partner.id).slice(-30).reverse(),
    subscriptionCount: state.subscriptions.filter(s => s.partnerId === partner.id).length,
    publicKey: state.vapid.publicKey };
}
function adminView(state, date, routeId, listing) {
  assert(validDate(date), "Érvénytelen dátum.");
  const relevant = state.routes.filter(r => !routeId || r.id === routeId);
  const partners = state.partners.filter(p => relevant.some(r => (p.routeIds||[p.routeId]).includes(r.id) && deliveryOn(r, date)));
  // Retain already submitted orders on their original route when schedules later change.
  const responses = state.responses.filter(r => r.date === date && (!routeId || r.routeId === routeId));
  const totals = new Map();
  for (const response of responses.filter(r => r.kind === "order")) for (const item of response.items) {
    const key = item.productId + ":" + item.unit;
    const old = totals.get(key) || { name: item.name, quantity: 0, unit: item.unit };
    old.quantity = Math.round((old.quantity + item.quantity) * 100) / 100;
    totals.set(key, old);
  }
  const page=state._orders||(listing?require('./listing').select(state.responses,listing):null);
  return { orderPage:page?.pagination, orderCounts:page?.counts, products:state.products, routes: state.routes, allPartners: state.partners, news: state.news,
    partners: partners.map(p => ({ ...p, disabled:state.users?.some(u=>u.partnerId===p.id&&u.status==='disabled')||false, phone:p.phone||state.users?.find(u=>u.partnerId===p.id)?.phone||'', response: responses.find(r => r.partnerId === p.id) || null })),
    allOrders: page?page.rows:state.responses.filter(r=>r.kind === "order" || (r.modifiedAt && r.changes?.some(c=>c.kind=== "order"))), responses, totals: [...totals.values()], outbox: state.outbox.slice(-100).reverse(),
    subscribedPartners: state.partners.filter(p => p.preferences.news).length };
}
function archiveOrder(state,input,actorId,now=new Date()) {
 const order=state.responses.find(r=>r.id===input.id && (r.kind==='order'||(r.modifiedAt&&r.changes?.some(c=>c.kind==='order'))));
 assert(order,'Ismeretlen rendelés.',404);
 assert(input.revision===undefined || input.revision===(order.revision||1),'A rendelés módosult. Ellenőrizd az új tartalmat.',409);
 assert(typeof input.archived==='boolean','Érvénytelen archiválási kérés.');
 if(input.archived){if(!order.archivedAt){order.archivedAt=now.toISOString();order.archivedBy=actorId;order.status='archived';order.statusUpdatedAt=now.toISOString();}}
 else if(order.archivedAt){delete order.archivedAt;delete order.archivedBy;order.status=order.kind==='skip'?'skip':'received';order.statusUpdatedAt=now.toISOString();}
 return order;
}
function validateSubscription(subscription) {
  assert(subscription && typeof subscription.endpoint === "string" && subscription.endpoint.length <= 2048, "Hibás push-feliratkozás.");
  let url;
  try { url = new URL(subscription.endpoint); } catch { throw new InputError("Érvénytelen push-cím."); }
  const allowed = ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"];
  assert(url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443") &&
    (allowed.includes(url.hostname) || url.hostname.endsWith(".push.apple.com") || url.hostname.endsWith(".notify.windows.com")),
    "Nem támogatott push-szolgáltató.");
  const keys = subscription.keys;
  assert(keys && typeof keys.auth === "string" && typeof keys.p256dh === "string" &&
    /^[\w-]{22}$/.test(keys.auth) && /^[\w-]{87}$/.test(keys.p256dh), "Érvénytelen push-kulcsok.");
  return { endpoint: url.href, keys: { auth: keys.auth, p256dh: keys.p256dh } };
}
module.exports = { InputError, assert, id, seed, text, localTime, addDays, validDate, nextDelivery, orderCutoffDate,
  partnerRoutes, routeFor, deliveries, updatePrice, updatePromotion, priceFor, queueStaffNotification, submitComplaint, updateComplaint, saveTemplate, submitResponse, publishNews, runReminders, updateRoute, updatePartner, archiveOrder, safePartner, adminView, validateSubscription };
