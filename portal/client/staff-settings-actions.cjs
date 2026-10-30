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

// portal/client/ts/staff-settings-actions.ts
var staff_settings_actions_exports = {};
__export(staff_settings_actions_exports, {
  createStaffSettingsActions: () => createStaffSettingsActions
});
module.exports = __toCommonJS(staff_settings_actions_exports);
function createStaffSettingsActions(ctx) {
  return {
    error: (error) => ctx.toast(error.message),
    setExpanded(key, expanded) {
      if (expanded) ctx.expanded.add(key);
      else ctx.expanded.delete(key);
    },
    async saveRoute(id, values, form) {
      await ctx.api("routes", {
        id,
        name: values.get("name"),
        days: values.getAll("days").map(Number),
        reminder: values.get("reminder"),
        cutoff: values.get("cutoff")
      });
      delete form.dataset.dirty;
      ctx.toast("T\xFAra be\xE1ll\xEDt\xE1sai elmentve.");
      await ctx.load();
    },
    async savePartnerDays(id, values, form) {
      await ctx.api("partners", { id, routeIds: values.getAll("routeIds") });
      delete form.dataset.dirty;
      ctx.toast("Kisz\xE1ll\xEDt\xE1si napok mentve.");
      await ctx.load();
    },
    invite(email) {
      ctx.confirm(
        "C\xE9ges munkat\xE1rs megh\xEDv\xE1sa",
        async () => {
          await ctx.api("invitations", { email });
          await ctx.load();
          ctx.toast("A megh\xEDv\xF3t \xE1tadtuk a levelez\u0151szervernek.");
        },
        { email }
      );
    },
    revoke(id) {
      ctx.confirm("Megh\xEDv\xF3 visszavon\xE1sa", async () => {
        await ctx.api("revoke-invitation", { id });
        await ctx.load();
        ctx.toast("Megh\xEDv\xF3 visszavonva.");
      });
    },
    accountStatus(id) {
      const user = ctx.getData().accounts.find((u) => u.id === id), status = user.status === "disabled" ? "approved" : "disabled";
      ctx.confirm(
        status === "disabled" ? "Fi\xF3k letilt\xE1sa" : "Hozz\xE1f\xE9r\xE9s vissza\xE1ll\xEDt\xE1sa",
        async () => {
          await ctx.api("accounts", { id: user.id, status });
          await ctx.load();
          ctx.toast("Hozz\xE1f\xE9r\xE9s m\xF3dos\xEDtva.");
        },
        { name: user.company || user.username }
      );
    },
    extend: ctx.openSessionRenewal
  };
}
