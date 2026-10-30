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

// portal/client/ts/api.ts
var api_exports = {};
__export(api_exports, {
  createPortalApi: () => createPortalApi
});
module.exports = __toCommonJS(api_exports);
function createPortalApi({
  base,
  csrf,
  fetchImpl,
  isOnline,
  saveDraft,
  onMutationStart,
  onMutationEnd,
  onUnauthorized
}) {
  return async function request(path, body, method = "POST") {
    if (path === "responses") saveDraft();
    const mutating = body !== void 0;
    if (mutating) onMutationStart();
    let response;
    try {
      response = await fetchImpl(
        base + "/api/" + path,
        mutating ? {
          method,
          headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
          body: JSON.stringify(body)
        } : {}
      );
    } catch {
      if (path === "responses") {
        saveDraft();
        throw new Error(
          "Nem kaptunk visszaigazol\xE1st. A piszkozat megmaradt. Kapcsol\xF3dj \xFAjra, majd ellen\u0151rizd a Rendel\xE9seim oldalt, miel\u0151tt \xFAjrapr\xF3b\xE1lod."
        );
      }
      throw new Error(
        isOnline() === false ? "Nincs internetkapcsolat. Ellen\u0151rizd a kapcsolatot, majd pr\xF3b\xE1ld \xFAjra." : "Nem siker\xFClt el\xE9rni a kiszolg\xE1l\xF3t. Pr\xF3b\xE1ld \xFAjra k\xE9s\u0151bb."
      );
    } finally {
      if (mutating) onMutationEnd();
    }
    if (response.status === 401) {
      onUnauthorized();
      throw new Error("Jelentkezz be \xFAjra.");
    }
    if (response.status >= 500) {
      if (path === "responses") saveDraft();
      throw new Error(
        "Az alkalmaz\xE1s kiszolg\xE1l\xF3ja \xE1tmenetileg nem el\xE9rhet\u0151. Pr\xF3b\xE1ld \xFAjra k\xE9s\u0151bb." + (path === "responses" ? " A piszkozat megmaradt; ellen\u0151rizd a Rendel\xE9seim oldalt az \xFAjrapr\xF3b\xE1l\xE1s el\u0151tt." : "")
      );
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Nem siker\xFClt menteni.");
    return result;
  };
}
