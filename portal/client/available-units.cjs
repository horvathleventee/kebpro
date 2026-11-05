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

// portal/client/ts/available-units.ts
var available_units_exports = {};
__export(available_units_exports, {
  availableUnits: () => availableUnits
});
module.exports = __toCommonJS(available_units_exports);

// portal/client/ts/order-assessment.ts
var spitSizes = [5, 10, 15, 20, 30, 40, 50, 60];
var isSpit = (id) => ["product-1", "product-2", "product-3"].includes(id);
var spitPriceKey = (weight) => `nyars-${weight}`;

// portal/client/ts/available-units.ts
var catalogUnits = {
  "Csirke kebab": "db",
  "Csirke kebab f\xE9lb\u0151r\xF6s": "db",
  "Marha kebab EU": "db",
  "Csirke saslik combfil\xE9b\u0151l": "karton",
  "Csirke saslik combfil\xE9b\u0151l szalonn\xE1val": "karton",
  "Csirke saslik combfil\xE9b\u0151l trikolor": "karton",
  "Csirke saslik mellfil\xE9b\u0151l szalonn\xE1val": "karton",
  "E.h. s\xFClt csirke comb kebab": "karton",
  "Gy.f. s\xFClt csirke comb kebab": "karton",
  "Gy.f. s\xFClt marhah\xFAsos kebab": "karton",
  "Gy.f. pulled pork - t\xE9pett sert\xE9sh\xFAs": "karton",
  "Kakas taraj": "karton",
  "Kakas here": "karton",
  "Haydi t\xF6r\xF6k joghurt": "db",
  "Paltsidis g\xF6r\xF6g joghurt": "db",
  "Laban joghurt": "db",
  "Haydi ayran iv\xF3joghurt": "karton",
  "Pita 70": "karton",
  "Pita 80": "karton",
  "Pita 90": "karton",
  "Pita 100": "karton",
  "Pita 80 teljes ki\u0151rl\xE9s\u0171": "zacsk\xF3",
  "G\xF6r\xF6g pita": "karton",
  "G\xF6r\xF6g pita teljes ki\u0151rl\xE9s\u0171": "karton",
  "D\xFCr\xFCm tortilla 25 cm": "csomag",
  "D\xFCr\xFCm tortilla 30 cm": "csomag",
  "D\xFCr\xFCm tortilla 30 cm tk": "csomag",
  "Mexifoods tortilla - gm, 15 cm": "csomag",
  "Marlenka (csokis, di\xF3s)": "db",
  "Marlenka (glut\xE9nmentes)": "db",
  "Baklava (csokis, di\xF3s, vegyes)": "karton",
  Falafel: "kg",
  "Hutesa olajbogy\xF3 fekete szeletelt": "db",
  "Hutesa olajbogy\xF3 z\xF6ld szeletelt": "db",
  "Pita tasak pap\xEDr": "csomag",
  "Pita tasak nylon": "csomag"
};
function availableUnits(product) {
  if (Array.isArray(product.availablePriceUnits) && product.availablePriceUnits.length)
    return product.availablePriceUnits;
  if (isSpit(product.id)) return spitSizes.map(spitPriceKey);
  const unit = product.orderUnit || catalogUnits[product.name];
  return unit ? [unit] : [];
}
