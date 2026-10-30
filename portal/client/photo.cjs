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

// portal/client/ts/photo.ts
var photo_exports = {};
__export(photo_exports, {
  compressComplaintPhoto: () => compressComplaintPhoto
});
module.exports = __toCommonJS(photo_exports);
async function compressComplaintPhoto(file) {
  if (!file || !file.size) return null;
  if (!file.type.startsWith("image/") || file.size > 20 * 1024 * 1024)
    throw Error("V\xE1lassz egy legfeljebb 20 MB-os k\xE9pet.");
  const url = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("A k\xE9pet nem siker\xFClt beolvasni."));
    reader.readAsDataURL(file);
  }), img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("A k\xE9p nem nyithat\xF3 meg. Pr\xF3b\xE1lj m\xE1sik k\xE9pet."));
    img.src = url;
  });
  const scale = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("A k\xE9pet nem siker\xFClt el\u0151k\xE9sz\xEDteni.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.78, 0.65, 0.5, 0.35]) {
    const blob = await new Promise(
      (resolve) => canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (blob?.type === "image/jpeg" && blob.size <= 3e5) {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("A k\xE9pet nem siker\xFClt beolvasni."));
        reader.readAsDataURL(blob);
      });
    }
  }
  throw Error("A k\xE9pet nem siker\xFClt el\xE9gg\xE9 t\xF6m\xF6r\xEDteni. Pr\xF3b\xE1lj m\xE1sik k\xE9pet.");
}
