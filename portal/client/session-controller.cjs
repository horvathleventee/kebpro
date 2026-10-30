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

// portal/client/ts/session-controller.ts
var session_controller_exports = {};
__export(session_controller_exports, {
  createSessionController: () => createSessionController
});
module.exports = __toCommonJS(session_controller_exports);
function createSessionController(ctx) {
  const { role, appState, screens, api, render, toast, operationTime, document, localStorage } = ctx;
  let sessionReminderShown = "", sessionSnoozedUntil = 0;
  function sessionReminderKey() {
    return "kebpro-session-reminder:" + role + ":" + (appState.state.data.id || appState.state.data.currentUserId) + ":" + appState.state.data.loginSession.expiresAt;
  }
  function offerSessionRenewal() {
    if (!appState.state.data.loginSession?.canExtend || document.querySelector("dialog[open]"))
      return;
    const key = sessionReminderKey();
    if (sessionReminderShown === key || Date.now() < sessionSnoozedUntil) return;
    try {
      if (Number(localStorage.getItem(key)) > Date.now()) return;
    } catch {
    }
    openSessionRenewal();
  }
  function openSessionRenewal() {
    if (!appState.state.data.loginSession?.canExtend || document.querySelector("dialog[open]"))
      return;
    const expiresAt = appState.state.data.loginSession.expiresAt, key = sessionReminderKey();
    sessionReminderShown = key;
    const snooze = () => {
      sessionSnoozedUntil = Date.now() + 864e5;
      sessionReminderShown = "";
      try {
        localStorage.setItem(key, String(sessionSnoozedUntil));
      } catch {
      }
    };
    screens.openSessionRenewal({
      staff: role === "staff",
      expiresAt,
      onLater: snooze,
      onRenew: async () => {
        const result = await api("extend-session", { expiresAt });
        appState.state.data.loginSession = result.loginSession;
        render();
        toast(
          "Meghosszabb\xEDtottuk a bel\xE9p\xE9sedet eddig: " + operationTime(result.loginSession.expiresAt)
        );
      }
    });
  }
  return { offerSessionRenewal, openSessionRenewal };
}
