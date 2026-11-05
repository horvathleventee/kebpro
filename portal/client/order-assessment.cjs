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

// portal/client/ts/order-assessment.ts
var order_assessment_exports = {};
__export(order_assessment_exports, {
  assessOrder: () => assessOrder,
  assessmentMessage: () => assessmentMessage,
  isSpit: () => isSpit,
  spitPriceKey: () => spitPriceKey,
  spitSizes: () => spitSizes
});
module.exports = __toCommonJS(order_assessment_exports);
var spitSizes = [5, 10, 15, 20, 30, 40, 50, 60];
var isSpit = (id) => ["product-1", "product-2", "product-3"].includes(id);
var spitPriceKey = (weight) => `nyars-${weight}`;
var cartonProducts = /* @__PURE__ */ new Set([
  "product-8",
  "product-9",
  "product-10",
  "product-11",
  "frozen-chicken-1kg",
  "frozen-chicken-1_5kg"
]);
function assessOrder(items) {
  let cartons = 0, kilograms = 0, unknown = false;
  for (const item of items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      unknown = true;
      continue;
    }
    if (isSpit(item.productId) && item.unit === "db" && spitSizes.some((size) => size === item.spitWeight))
      kilograms += item.quantity * item.spitWeight;
    else if (cartonProducts.has(item.productId) && item.unit === "karton") cartons += item.quantity;
    else if (item.productId === "product-32" && item.unit === "kg") kilograms += item.quantity;
    else unknown = true;
  }
  if (cartons >= 2 || kilograms >= 20) return "ok";
  return unknown ? "unknown" : "below";
}
function assessmentMessage(status) {
  if (status === "below")
    return "A rendelt mennyis\xE9g v\xE1rhat\xF3an nem elegend\u0151 a kisz\xE1ll\xEDt\xE1shoz. Rendel\xE9sedet elk\xFCldheted, de el\u0151fordulhat, hogy a Kebpro munkat\xE1rsa telefonon felkeres egyeztet\xE9s c\xE9lj\xE1b\xF3l.";
  if (status === "unknown")
    return "A rendelt mennyis\xE9g ellen\u0151rz\xE9st ig\xE9nyel. Rendel\xE9sedet elk\xFCldheted, de el\u0151fordulhat, hogy a Kebpro munkat\xE1rsa telefonon felkeres egyeztet\xE9s c\xE9lj\xE1b\xF3l.";
  return "";
}
