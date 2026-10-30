var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// portal/client/ts/audit.ts
var audit_exports = {};
__export(audit_exports, {
  createAuditFormatter: () => createAuditFormatter
});
module.exports = __toCommonJS(audit_exports);
function createAuditFormatter(getData) {
  const auditNames = { products: "Term\xE9k", routes: "T\xFAra", partners: "Partner", responses: "Rendel\xE9s", news: "H\xEDr", users: "Fi\xF3k", staffInvitations: "Megh\xEDv\xE1s", complaints: "Bejelent\xE9s" };
  const auditFields = { name: "N\xE9v", username: "Felhaszn\xE1l\xF3n\xE9v", role: "Szerepk\xF6r", status: "\xC1llapot", active: "Rendelhet\u0151", prices: "\xC1rak", promotions: "Akci\xF3k", days: "Napok", routeId: "T\xFAra", routeIds: "T\xFAr\xE1k", reminder: "Eml\xE9keztet\u0151", cutoff: "Hat\xE1rid\u0151", title: "C\xEDm", body: "Sz\xF6veg", kind: "T\xEDpus", email: "E-mail", revision: "V\xE1ltozat", archivedAt: "Archiv\xE1lva", archivedBy: "Archiv\xE1lta", updatedAt: "Friss\xEDtve", updatedBy: "Friss\xEDtette", partnerId: "Partner", hasReply: "Van v\xE1lasz", invitedBy: "Megh\xEDvta", value: "\xC9rt\xE9k", kg: "kg", db: "db", karton: "karton" };
  const auditActions = { prices: "\xC1r m\xF3dos\xEDt\xE1sa", promotions: "Akci\xF3 m\xF3dos\xEDt\xE1sa", products: "Term\xE9k m\xF3dos\xEDt\xE1sa", routes: "T\xFAra m\xF3dos\xEDt\xE1sa", partners: "Partner beoszt\xE1sa", archive: "Rendel\xE9s kezel\xE9se", news: "H\xEDr k\xF6zz\xE9t\xE9tele", accounts: "Fi\xF3k kezel\xE9se", complaints: "Bejelent\xE9s kezel\xE9se", applications: "Regisztr\xE1ci\xF3 elb\xEDr\xE1l\xE1sa", invitations: "Megh\xEDv\xE1s", "revoke-invitation": "Megh\xEDv\xE1s visszavon\xE1sa" };
  function auditLabel(key) {
    return auditFields[key] || getData().products?.find((p) => p.id === key)?.name || getData().allPartners?.find((p) => p.id === key)?.name || getData().routes?.find((r) => r.id === key)?.name || key;
  }
  function auditValue(value, key) {
    if (value === null || value === void 0) return "\u2014";
    if (typeof value === "boolean") return value ? "Igen" : "Nem";
    if (Array.isArray(value)) return value.length ? value.map((v) => auditValue(v, key)).join(", ") : "\u2014";
    if (typeof value === "object") return Object.entries(value).map(([k, v]) => auditLabel(k) + ": " + auditValue(v, k)).join(" \xB7 ") || "\u2014";
    if (key === "days" && typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6) return ["Vas\xE1rnap", "H\xE9tf\u0151", "Kedd", "Szerda", "Cs\xFCt\xF6rt\xF6k", "P\xE9ntek", "Szombat"][value];
    if (typeof value === "string") {
      const labels = { approved: "Akt\xEDv / j\xF3v\xE1hagyva", disabled: "Letiltva", pending: "F\xFCgg\u0151ben", rejected: "Elutas\xEDtva", open: "Nyitott", resolved: "Lez\xE1rt", archived: "Archiv\xE1lt", received: "Be\xE9rkezett", staff: "Munkat\xE1rs", partner: "Partner", discount: "Kedvezm\xE9ny", fixed: "Egys\xE9ges akci\xF3s \xE1r" };
      return labels[value] || getData().routes?.find((r) => r.id === value)?.name || getData().allPartners?.find((p) => p.id === value)?.name || getData().products?.find((p) => p.id === value)?.name || value;
    }
    return String(value);
  }
  function reactAuditEvents() {
    return (getData().auditLog || []).map((e) => ({ ...e, label: auditActions[e.action] || "M\xF3dos\xEDt\xE1s", changes: e.changes.map((change) => {
      const before = change.before || {}, after = change.after || {}, keys = [.../* @__PURE__ */ new Set([...Object.keys(before), ...Object.keys(after)])].filter((k) => k !== "id" && JSON.stringify(before[k]) !== JSON.stringify(after[k]));
      const name = after.name || before.name || after.title || before.title || getData().products?.find((p) => p.id === change.id)?.name || getData().allPartners?.find((p) => p.id === change.id)?.name || getData().routes?.find((r) => r.id === change.id)?.name || "";
      return { label: (auditNames[change.collection] || change.collection) + (name ? " \xB7 " + name : ""), fields: keys.map((key) => ({ key, label: auditLabel(key), before: auditValue(before[key], key), after: auditValue(after[key], key) })) };
    }) }));
  }
  return { reactAuditEvents };
}
