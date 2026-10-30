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

// portal/client/ts/navigation.ts
var navigation_exports = {};
__export(navigation_exports, {
  currentTab: () => currentTab
});
module.exports = __toCommonJS(navigation_exports);
function currentTab(role, location) {
  const allowed = role === "staff" ? [
    "dashboard",
    "packing",
    "complaints",
    "news",
    "settings",
    "notifications",
    "applications",
    "calls",
    "products"
  ] : ["home", "order", "news", "history", "reports", "settings"];
  const tab = location.hash.slice(1);
  return allowed.includes(tab) ? tab : allowed[0];
}
