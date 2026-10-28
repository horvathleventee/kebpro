const crypto = require("crypto");
const webpush = require("web-push");
const { localTime, addDays, routeFor, validateSubscription } = require("./domain");
const terminal = new Set(["sent", "expired", "failed", "cancelled"]);
const MAX_ATTEMPTS = 5;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const endpointKey = endpoint => crypto.createHash("sha256").update(endpoint).digest("hex");

function eligible(state, message, now) {
  if (message.category === 'staff-order') return Boolean(state.users?.some(u=>u.id===message.staffUserId&&u.role==='staff'&&u.status==='approved')) && now.getTime() - Date.parse(message.createdAt) < MAX_AGE_MS;
  const partner = state.partners.find(p => p.id === message.partnerId);
  if (state.users?.some(u=>u.partnerId===message.partnerId&&u.status==='disabled'))return false;
  if (!partner || now.getTime() - Date.parse(message.createdAt) >= MAX_AGE_MS) return false;
  if (message.category === "news") return partner.preferences.news;
  if (message.category === "reminder") {
    const date = message.key.slice("reminder:".length);
    const current = localTime(now);
    const route = routeFor(state,partner,date);
    return partner.preferences.reminders && route &&
      current.date === addDays(date, -1) && current.time < route.cutoff &&
      !state.responses.some(r => r.partnerId === partner.id && r.date === date);
  }
  return message.category === "order";
}
function finish(message) {
  const deliveries = Object.values(message.deliveries || {});
  message.status = deliveries.length && deliveries.every(d => terminal.has(d.status)) ? "complete" : "pending";
}
// No external requests in the default mode. Production must supply a real VAPID
// contact and explicitly enqueue "pending" messages; old simulations never send.
async function dispatchNotifications(store, { dryRun = true, subject, send = webpush.sendNotification, now = () => new Date() } = {}) {
  if (dryRun) {
    const state = await store.read();
    return { mode: "simulation", queued: state.outbox.filter(n => ["pending","simulation"].includes(n.status)).length, sent: 0 };
  }
  if (typeof subject !== "string" || !/^(mailto:|https:\/\/)/.test(subject)) throw new Error("VAPID contact is required for live delivery.");
  const clock = now();
  const claims = await store.change(state => {
    const tasks = [];
    for (const message of state.outbox.filter(m => m.status === "pending")) {
      if (!eligible(state,message,clock)) { message.status = "cancelled"; continue; }
      const subscriptions = state.subscriptions.filter(s => (message.category==='staff-order' ? s.staffUserId===message.staffUserId : s.partnerId === message.partnerId) &&
        Date.parse(s.createdAt) <= Date.parse(message.createdAt));
      if (!subscriptions.length) { message.status = "no_devices"; continue; }
      message.deliveries ||= {};
      for (const subscription of subscriptions) {
        message.deliveries[endpointKey(subscription.endpoint)] ||= { status: "pending", attempts: 0 };
      }
      for (const subscription of subscriptions) {
        if (tasks.length >= 20) break;
        const key = endpointKey(subscription.endpoint);
        const delivery = message.deliveries[key] ||= { status: "pending", attempts: 0 };
        if (terminal.has(delivery.status) || delivery.leaseUntil > clock.getTime() || delivery.retryAt > clock.getTime()) continue;
        if (delivery.attempts >= MAX_ATTEMPTS) { delivery.status = "failed"; continue; }
        try { validateSubscription(subscription); }
        catch { delivery.status = "failed"; delivery.reason = "invalid_subscription"; continue; }
        Object.assign(delivery, { status: "sending", attempts: delivery.attempts + 1, leaseUntil: clock.getTime() + 120000 });
        let ttl = Math.max(1,Math.floor((MAX_AGE_MS-(clock.getTime()-Date.parse(message.createdAt)))/1000));
        if (message.category === "reminder") {
          const person = state.partners.find(p => p.id === message.partnerId);
          const route = routeFor(state,person,message.key.slice("reminder:".length));
          const minutes = value => Number(value.slice(0,2))*60+Number(value.slice(3,5));
          ttl = Math.min(ttl,Math.max(1,(minutes(route.cutoff)-minutes(localTime(clock).time))*60-clock.getUTCSeconds()));
        }
        tasks.push({ id:message.id, key, partnerId:message.partnerId, staffUserId:message.staffUserId, subscription,
          attempt:delivery.attempts, vapid:state.vapid,
          payload:JSON.stringify({id:message.id,title:message.title,body:message.body,url:message.url}),
          ttl });
      }
      finish(message);
    }
    return tasks;
  });
  let sent = 0;
  for (const task of claims) {
    // Recheck preferences and response status just before sending queued messages.
    const current = await store.read();
    const message = current.outbox.find(m => m.id === task.id);
    let outcome = "sent", code, retryAfter = 0;
    if (!message || !eligible(current,message,now()) ||
      !current.subscriptions.some(s => (message.category==='staff-order' ? s.staffUserId===task.staffUserId : s.partnerId === task.partnerId) && s.endpoint === task.subscription.endpoint)) outcome = "cancelled";
    else {
      try {
        await send({endpoint:task.subscription.endpoint,keys:task.subscription.keys},task.payload,{
          TTL:task.ttl,timeout:15000,
          vapidDetails:{subject,publicKey:task.vapid.publicKey,privateKey:task.vapid.privateKey},
        });
        sent++;
      } catch (error) {
        code = error.statusCode;
        if ([404,410].includes(code)) outcome = "expired";
        else if (task.attempt >= MAX_ATTEMPTS || (code >= 400 && code < 500 && ![408,429].includes(code))) outcome = "failed";
        else outcome = "pending";
        const seconds = Number(error.headers?.["retry-after"]);
        if (Number.isFinite(seconds) && seconds > 0) retryAfter = Math.min(seconds * 1000,3600000);
      }
    }
    await store.change(state => {
      const notification = state.outbox.find(m => m.id === task.id);
      if (!notification) return;
      const delivery = notification.deliveries[task.key];
      // Ignore a result from an expired lease reclaimed by another worker.
      if (delivery.attempts !== task.attempt || delivery.status !== "sending") return;
      Object.assign(delivery,{status:outcome,leaseUntil:0,updatedAt:now().toISOString()});
      if(code)delivery.httpStatus=code;
      if(outcome==="pending")delivery.retryAt=now().getTime()+Math.max(retryAfter,Math.min(60000*2**(task.attempt-1),3600000));
      if(outcome==="expired")state.subscriptions=state.subscriptions.filter(s=>s.endpoint!==task.subscription.endpoint);
      finish(notification);
    });
  }
  return { mode: "live", attempted: claims.length, sent };
}
module.exports = { dispatchNotifications };
