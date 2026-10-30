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

// portal/client/ts/loader.ts
var loader_exports = {};
__export(loader_exports, {
  createPortalLoader: () => createPortalLoader
});
module.exports = __toCommonJS(loader_exports);
function createPortalLoader(ctx) {
  const dirtySelector = 'form[data-dirty="true"]';
  const editing = () => ctx.content.contains(ctx.document.activeElement) && ctx.document.activeElement?.matches("input,textarea,select");
  return async function load(automatic = false) {
    let state = ctx.getState();
    if (automatic && (ctx.content.querySelector(dirtySelector) || state.automaticLoadPending || ctx.navigator.onLine === false || ctx.document.hidden || state.mutations || ctx.document.querySelector("dialog[open]") || editing())) return;
    if (automatic) ctx.setState({ automaticLoadPending: true });
    const sequence = state.loadSequence + 1;
    ctx.setState({ loadSequence: sequence });
    const query = new URLSearchParams({ page: String(state.role === "staff" ? state.ordersPage : state.historyPage) });
    if (state.role === "staff") {
      query.set("view", state.orderView);
      query.set("sort", state.archiveSort);
      query.set("day", state.archiveDate);
      query.set("search", state.orderSearch);
    }
    if (state.selectedDate) query.set("date", state.selectedDate);
    if (state.selectedRoute) query.set("route", state.selectedRoute);
    try {
      const next = await ctx.api(state.role === "staff" ? "admin?" + query : "me?" + query);
      state = ctx.getState();
      if (sequence !== state.loadSequence) return;
      if (automatic && (ctx.content.querySelector(dirtySelector) || state.mutations || ctx.document.querySelector("dialog[open]") || editing())) return;
      const data = state.data, changed = JSON.stringify(next) !== JSON.stringify(data);
      const searchSelection = ctx.document.activeElement?.id === "order-search" ? ctx.document.activeElement.selectionStart : null;
      const oldIds = new Set(data?.allOrders?.map((r) => r.id) || []);
      const modified = automatic && state.role === "staff" && data ? next.allOrders.filter((r) => data.allOrders.some((old) => old.id === r.id && (old.revision || 1) < (r.revision || 1))).length : 0;
      const added = automatic && state.role === "staff" && data ? next.allOrders.filter((r) => !oldIds.has(r.id)).length : 0;
      const updates = state.role === "partner" && data ? next.history.filter((r) => r.kind === "order" && data.history.some((old) => old.id === r.id && old.status !== r.status)) : [];
      const changes = { data: next };
      if (state.role === "staff") {
        changes.ordersPage = next.orderPage?.page || 1;
        changes.selectedDate = next.date;
      } else changes.historyPage = next.historyPage?.page || 1;
      ctx.setState(changes);
      ctx.restoreDraft();
      if (state.role !== "staff") ctx.document.getElementById("identity").textContent = next.name;
      if (!automatic || changed) {
        const y = ctx.window.scrollY;
        ctx.render();
        if (automatic) ctx.window.scrollTo(0, y);
      }
      if (searchSelection !== null) {
        const input = ctx.document.getElementById("order-search");
        if (input) {
          input.focus();
          input.setSelectionRange(searchSelection, searchSelection);
        }
      }
      ctx.syncStatus("Automatikus friss\xEDt\xE9s \xB7 " + (/* @__PURE__ */ new Date()).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Budapest" }));
      ctx.offerSessionRenewal();
      if (!automatic) ctx.offerPushSetup();
      if (updates.length) ctx.toast(updates.length === 1 ? "Rendel\xE9sed \xE1llapota: " + (ctx.statusLabel[updates[0].status] || updates[0].status) + ". R\xE9szletek a Rendel\xE9seim oldalon." : updates.length + " rendel\xE9sed \xE1llapota friss\xFClt. R\xE9szletek a Rendel\xE9seim oldalon.");
      if (added || modified) ctx.toast((added ? added + " \xFAj rendel\xE9s. " : "") + (modified ? modified + " rendel\xE9st m\xF3dos\xEDtottak." : ""));
    } catch (error) {
      ctx.syncStatus("Kapcsol\xF3d\xE1s \xFAjra\u2026");
      if (!automatic) throw error;
    } finally {
      if (automatic) ctx.setState({ automaticLoadPending: false });
    }
  };
}
