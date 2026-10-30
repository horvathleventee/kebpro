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

// portal/client/ts/push-controller.ts
var push_controller_exports = {};
__export(push_controller_exports, {
  createPushController: () => createPushController
});
module.exports = __toCommonJS(push_controller_exports);
function createPushController(ctx) {
  const { role, appState, screens, api, load, toast, window, document, navigator, localStorage } = ctx;
  const Notification = window.Notification;
  const atob = window.atob.bind(window);
  async function registration() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
      throw new Error(
        "Ez a b\xF6ng\xE9sz\u0151 most nem t\xE1mogatja a push \xE9rtes\xEDt\xE9st. iPhone-on a f\u0151k\xE9perny\u0151re telep\xEDtett appb\xF3l pr\xF3b\xE1ld."
      );
    return navigator.serviceWorker.ready;
  }
  function keyBytes(value) {
    const raw = atob(
      value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4)
    );
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
  }
  let pushOfferShown = false;
  function pushSetupKey() {
    return "kebpro-push-intro-v1:" + appState.state.data.id;
  }
  function rememberPushOffer() {
    try {
      localStorage.setItem(pushSetupKey(), "seen");
    } catch {
    }
  }
  async function enablePartnerPush() {
    if (!("Notification" in window) || !("PushManager" in window) || !("serviceWorker" in navigator))
      throw new Error(
        "Ezen a b\xF6ng\xE9sz\u0151n nem \xE9rhet\u0151 el. iPhone-on el\u0151bb add a F\u0151k\xE9perny\u0151h\xF6z, majd onnan nyisd meg az appot."
      );
    const permission = await Notification.requestPermission();
    if (permission !== "granted")
      throw new Error(
        "Az \xE9rtes\xEDt\xE9seket nem enged\xE9lyezted. A b\xF6ng\xE9sz\u0151 vagy a telefon be\xE1ll\xEDt\xE1saiban k\xE9s\u0151bb bekapcsolhatod."
      );
    const reg = await registration();
    const subscription = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(appState.state.data.publicKey)
    });
    const result = await api("subscription", { ...subscription.toJSON(), enableNews: true });
    rememberPushOffer();
    toast(
      result.mode === "live" ? "\xC9rtes\xEDt\xE9sek \xE9s h\xEDrek bekapcsolva. A h\xEDrek a Be\xE1ll\xEDt\xE1sokban kikapcsolhat\xF3k." : "\xC9rtes\xEDt\xE9sek \xE9s h\xEDrek be\xE1ll\xEDtva. A t\xE1voli k\xFCld\xE9s jelenleg nem akt\xEDv."
    );
    await load();
  }
  function offerPushSetup() {
    if (role !== "partner" || pushOfferShown || document.querySelector("dialog[open]")) return;
    try {
      if (localStorage.getItem(pushSetupKey()) === "seen") return;
    } catch {
    }
    pushOfferShown = true;
    const supported = "Notification" in window && "PushManager" in window && "serviceWorker" in navigator;
    const denied = supported && Notification.permission === "denied";
    screens.openPushWelcome({
      supported,
      denied,
      onEnable: enablePartnerPush,
      onLater: rememberPushOffer
    });
  }
  return { registration, keyBytes, enablePartnerPush, offerPushSetup };
}
