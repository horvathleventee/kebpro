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

// portal/client/ts/order-actions.ts
var order_actions_exports = {};
__export(order_actions_exports, {
  createOrderActions: () => createOrderActions
});
module.exports = __toCommonJS(order_actions_exports);
function createOrderActions(ctx) {
  const state = () => ctx.getState();
  const update = (changes) => ctx.setState(changes);
  const newRequest = () => crypto.randomUUID();
  return {
    add(values) {
      try {
        const { data, cart } = state(), product = data.products.find((p) => p.id === values.get("productId")), amount = Number(values.get("quantity")), unit = values.get("unit");
        if (!product || unit !== "kg" && unit !== "db" && unit !== "karton" || !Number.isFinite(amount) || amount <= 0 || amount > 1e4 || unit !== "kg" && !Number.isInteger(amount))
          throw Error(
            "Ellen\u0151rizd a term\xE9ket \xE9s a mennyis\xE9get. Darab \xE9s karton csak eg\xE9sz sz\xE1m lehet."
          );
        const existing = cart.find((i) => i.productId === product.id);
        if (existing) {
          if (existing.unit !== unit)
            throw Error("Ez a term\xE9k m\xE1r szerepel m\xE1s m\xE9rt\xE9kegys\xE9ggel. El\u0151bb t\xE1vol\xEDtsd el.");
          if (existing.quantity + amount > 1e4) throw Error("T\xFAl nagy mennyis\xE9g.");
          existing.quantity = Math.round((existing.quantity + amount) * 100) / 100;
        } else cart.push({ productId: product.id, name: product.name, quantity: amount, unit });
        update({ requestId: newRequest() });
        ctx.render();
        return true;
      } catch (error) {
        ctx.toast(error.message);
        return false;
      }
    },
    quantity(index, value) {
      const { cart } = state();
      cart[index].quantity = Number(value);
      update({ requestId: newRequest() });
      ctx.saveDraft();
    },
    note(value) {
      update({ note: value, requestId: newRequest() });
      ctx.saveDraft();
    },
    selectDelivery(date, element) {
      const change = () => {
        update({ orderDate: date, cart: [], note: "", editing: null, requestId: newRequest() });
        ctx.render();
      };
      const { cart, note, editing, orderDate } = state();
      if (cart.length || note || editing) {
        element.value = orderDate;
        ctx.confirm("M\xE1sik kisz\xE1ll\xEDt\xE1s kiv\xE1laszt\xE1sa", change);
      } else change();
    },
    chooseProduct: ctx.openProductPicker,
    edit(id) {
      try {
        ctx.editHistoryOrder(id);
      } catch (error) {
        ctx.toast(error.message);
      }
    },
    cancelEdit() {
      update({ editing: null, cart: [], note: "" });
      ctx.render();
    },
    remove(index) {
      const { cart } = state();
      cart.splice(index, 1);
      update({ requestId: newRequest() });
      ctx.render();
    },
    saveTemplate() {
      ctx.confirm("Szok\xE1sos rendel\xE9si lista ment\xE9se", async () => {
        await ctx.api("templates", {
          id: document.getElementById("template-target").value || void 0,
          name: document.getElementById("template-name").value,
          items: state().cart
        });
        await ctx.load();
        ctx.toast("Rendel\xE9si lista mentve.");
      });
    },
    loadTemplate(id) {
      try {
        const { data, cart, editing } = state();
        if (ctx.currentResponse() && !editing)
          throw Error("Erre a napra m\xE1r v\xE1laszolt\xE1l. El\u0151bb nyisd meg a rendel\xE9s m\xF3dos\xEDt\xE1s\xE1t.");
        const template = data.templates.find((t) => t.id === id);
        const use = () => {
          const items = template.items.filter((i) => state().data.products.some((p) => p.id === i.productId)).map((i) => ({ ...i }));
          update({ cart: items, requestId: newRequest() });
          ctx.render();
          ctx.toast(
            items.length < template.items.length ? "Lista bet\xF6ltve; a m\xE1r nem rendelhet\u0151 term\xE9keket kihagytuk. Ellen\u0151rizd a kosarat." : "Lista bet\xF6ltve. Ellen\u0151rizd a t\xE9teleket; m\xE9g nem adt\xE1l le rendel\xE9st."
          );
        };
        if (cart.length) ctx.confirm("Kos\xE1r cser\xE9je", use);
        else use();
      } catch (error) {
        ctx.toast(error.message);
      }
    },
    deleteTemplate(id) {
      ctx.confirm("Mentett lista t\xF6rl\xE9se", async () => {
        await ctx.api("templates", { id, remove: true });
        await ctx.load();
      });
    },
    review() {
      try {
        const { data, cart, note } = state(), unavailable = cart.filter((i) => !data.products.some((p) => p.id === i.productId));
        if (unavailable.length)
          throw Error(
            "Ezek most nem rendelhet\u0151k: " + unavailable.map((i) => i.name).join(", ") + ". T\xE1vol\xEDtsd el \u0151ket a kos\xE1rb\xF3l."
          );
        const expectedPrices = cart.map(ctx.currentPrice);
        if (expectedPrices.some((p) => p === null))
          throw Error(
            "Az egyik term\xE9khez nincs megadva \xE1r. K\xE9rj\xFCk, fordulj az \xE9rt\xE9kes\xEDt\u0151 koll\xE9g\xE1khoz az \xE1r be\xE1ll\xEDt\xE1s\xE1hoz."
          );
        ctx.confirm("Ellen\u0151rizd a rendel\xE9sed", async () => {
          const current = state();
          update({ historyPage: 1 });
          const result = await ctx.api("responses", {
            kind: "order",
            date: ctx.chosenDelivery().date,
            items: current.cart,
            expectedPrices,
            note: current.note,
            requestId: current.requestId,
            responseId: current.editing?.id,
            revision: current.editing?.revision
          });
          update({ cart: [], note: "", editing: null, requestId: newRequest() });
          ctx.saveDraft();
          await ctx.load();
          ctx.navigate("history");
          ctx.toast("Rendel\xE9s r\xF6gz\xEDtve: " + result.response.id.slice(0, 8).toUpperCase());
        });
      } catch (error) {
        ctx.toast(error.message);
      }
    },
    skip: ctx.skipDelivery
  };
}
