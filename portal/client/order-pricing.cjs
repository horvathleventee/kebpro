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

// portal/client/ts/order-pricing.ts
var order_pricing_exports = {};
__export(order_pricing_exports, {
  formatMoney: () => formatMoney,
  getLinePrice: () => getLinePrice,
  getUnitPrice: () => getUnitPrice,
  summarizeCart: () => summarizeCart
});
module.exports = __toCommonJS(order_pricing_exports);
var formatMoney = (value) => value === null || value === void 0 ? "\xC1r egyeztetend\u0151" : new Intl.NumberFormat("hu-HU").format(value) + " Ft";
var getUnitPrice = (products, item) => products.find((product) => product.id === item.productId)?.prices?.[item.unit] ?? null;
function getLinePrice(products, item) {
  const price = getUnitPrice(products, item);
  return price === null ? null : Math.round(price * Math.round(item.quantity * 100) / 100);
}
function summarizeCart(products, cart) {
  if (!cart.length) return "";
  const lines = cart.map((item) => getLinePrice(products, item));
  if (lines.some((value) => value === null))
    return "Hi\xE1nyz\xF3 \xE1r: k\xE9rj\xFCk, fordulj az \xE9rt\xE9kes\xEDt\u0151 koll\xE9g\xE1khoz.";
  return "Nett\xF3 \xF6sszesen: " + formatMoney(lines.reduce((sum, value) => sum + (value ?? 0), 0));
}
