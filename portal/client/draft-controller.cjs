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

// portal/client/ts/draft-controller.ts
var draft_controller_exports = {};
__export(draft_controller_exports, {
  createDraftController: () => createDraftController
});
module.exports = __toCommonJS(draft_controller_exports);
function createDraftController(ctx) {
  let store, ready = false, fingerprint = "";
  function snapshot() {
    const { cart, note, editing, requestId } = ctx.getState();
    return { cart, note, orderDate: ctx.chosenDelivery().date, editing, requestId };
  }
  function restore() {
    if (ctx.role !== "partner" || ready) return;
    ready = true;
    try {
      const { data } = ctx.getState();
      store = ctx.createStore(ctx.getStorage(), data.id);
      const saved = store.read();
      if (saved) {
        if ([...data.history, ...data.currentResponses || []].some((r) => r.requestId === saved.requestId || (r.changeIds || []).includes(saved.requestId))) {
          store.clear();
          return;
        }
        ctx.setState({ cart: saved.cart, note: saved.note, orderDate: saved.orderDate, editing: saved.editing, requestId: saved.requestId });
        fingerprint = JSON.stringify(snapshot());
        ctx.toast("Visszat\xF6lt\xF6tt\xFCk a rendel\xE9si piszkozatodat. M\xE9g nincs bek\xFCldve.");
      }
    } catch {
      ctx.setError("A helyi piszkozatot nem siker\xFClt bet\xF6lteni vagy el\xE9rni. A tart\xF3s ment\xE9s nem garant\xE1lt.");
    }
  }
  function save() {
    if (ctx.role !== "partner" || !ready) return;
    try {
      const value = snapshot(), next = JSON.stringify(value);
      if (next !== fingerprint) {
        if (!store) throw Error("Storage unavailable");
        store.save(value);
        fingerprint = next;
        ctx.setError("");
      }
    } catch {
      ctx.setError("Nem siker\xFClt menteni ezen az eszk\xF6z\xF6n. Bez\xE1r\xE1skor a kos\xE1r elveszhet.");
    }
    ctx.showStatus();
  }
  return { restore, save };
}
