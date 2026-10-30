const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
function exportComplaint(state, id) {
  const partner = (state.partners || []).find((p) => (p.complaints || []).some((c) => c.id === id));
  const c = partner?.complaints.find((x) => x.id === id);
  if (!c) return null;
  const photos = [
    [c.photoId, 'Termék vagy probléma'],
    [c.labelPhotoId, 'Termékjelölő címke'],
  ]
    .filter(([key]) => key)
    .map(([key, label]) => {
      const photo = (state.complaintPhotos || []).find(
        (p) => p.id === key && p.partnerId === partner.id,
      );
      if (!photo)
        return '<section><h2>' + esc(label) + '</h2><p>A csatolt kép nem érhető el.</p></section>';
      return (
        '<section><h2>' +
        esc(label) +
        '</h2><img alt="' +
        esc(label) +
        '" src="data:image/jpeg;base64,' +
        esc(photo.data) +
        '"></section>'
      );
    })
    .join('');
  return (
    '<!doctype html><html lang="hu"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kebpro bejelentés</title><style>body{font:16px/1.5 sans-serif;max-width:840px;margin:32px auto;padding:0 16px;color:#172c44}h1,h2{color:#10243f}section{margin:24px 0}p{white-space:pre-wrap;overflow-wrap:anywhere}img{display:block;max-width:100%;max-height:80vh;object-fit:contain}</style><h1>Kebpro · Bejelentés</h1><p>Partner: ' +
    esc(c.partnerName) +
    '<br>Azonosító: ' +
    esc(c.id) +
    '<br>Rendelés: ' +
    esc(c.orderDate || 'Általános visszajelzés') +
    '<br>Beküldve: ' +
    esc(c.createdAt) +
    '<br>Lezárva: ' +
    esc(c.resolvedAt || '–') +
    '</p><section><h2>Bejelentés</h2><p>' +
    esc(c.message) +
    '</p></section><section><h2>Válasz</h2><p>' +
    esc(c.reply || 'Még nincs válasz.') +
    '</p></section>' +
    photos +
    '</html>'
  );
}
module.exports = { exportComplaint };
