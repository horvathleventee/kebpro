'use strict';
const role = document.body.dataset.role;
const base = role === 'staff' ? '/partner-admin' : '/partner';
const csrf = document.querySelector('meta[name="csrf-token"]').content;
const content = document.getElementById('content');
let data,
  cart = [],
  note = '',
  requestId = crypto.randomUUID(),
  newsRequestId = crypto.randomUUID();
let automaticLoadPending = false;
let ordersPage = 1,
  historyPage = 1,
  searchTimer;
let productSearch = '',
  partnerSearch = '',
  pricePartner = '',
  complaintRequests = {};
let orderView = 'new',
  archiveSort = 'createdAt',
  archiveDate = '',
  orderSearch = '',
  loadSequence = 0,
  mutations = 0,
  routeSettingsOpen = false,
  partnerDaysOpen = false;
let orderDate = '',
  editing = null;
let draftStore,
  draftReady = false,
  draftError = '',
  draftFingerprint = '';
function draftState() {
  return { cart, note, orderDate: chosenDelivery().date, editing, requestId };
}
let reactDraft;
function getReactDraft() {
  return (reactDraft ||= window.KebproReactScreens.createDraftController({
    role,
    getStorage: () => localStorage,
    createStore: KebproDrafts.create,
    getState: () => ({ data, cart, note, editing, requestId }),
    setState: (changes) => {
      if ('cart' in changes) cart = changes.cart;
      if ('note' in changes) note = changes.note;
      if ('orderDate' in changes) orderDate = changes.orderDate;
      if ('editing' in changes) editing = changes.editing;
      if ('requestId' in changes) requestId = changes.requestId;
    },
    setError: (value) => {
      draftError = value;
    },
    chosenDelivery,
    toast,
    showStatus: showDraftStatus,
  }));
}
function restoreDraft() {
  if (typeof window !== 'undefined' && window.KebproReactScreens?.createDraftController) {
    getReactDraft().restore();
    return;
  }
  if (role !== 'partner' || draftReady) return;
  draftReady = true;
  try {
    draftStore = KebproDrafts.create(localStorage, data.id);
    const saved = draftStore.read();
    if (saved) {
      if (
        [...data.history, ...(data.currentResponses || [])].some(
          (r) => r.requestId === saved.requestId || (r.changeIds || []).includes(saved.requestId),
        )
      ) {
        draftStore.clear();
        return;
      }
      cart = saved.cart;
      note = saved.note;
      orderDate = saved.orderDate;
      editing = saved.editing;
      requestId = saved.requestId;
      draftFingerprint = JSON.stringify(draftState());
      toast('Visszatöltöttük a rendelési piszkozatodat. Még nincs beküldve.');
    }
  } catch {
    draftError =
      'A helyi piszkozatot nem sikerült betölteni vagy elérni. A tartós mentés nem garantált.';
  }
}
function saveDraft() {
  if (typeof window !== 'undefined' && window.KebproReactScreens?.createDraftController) {
    getReactDraft().save();
    return;
  }
  if (role !== 'partner' || !draftReady) return;
  try {
    const value = draftState(),
      fingerprint = JSON.stringify(value);
    if (fingerprint !== draftFingerprint) {
      if (!draftStore) throw Error('Storage unavailable');
      draftStore.save(value);
      draftFingerprint = fingerprint;
      draftError = '';
    }
  } catch {
    draftError = 'Nem sikerült menteni ezen az eszközön. Bezáráskor a kosár elveszhet.';
  }
  showDraftStatus();
}
function showDraftStatus() {
  const host = document.getElementById('draft-status');
  if (!host) return;
  const exists = cart.length || note || editing;
  host.hidden = !exists && !draftError;
  if (window.KebproReactScreens) {
    const delivery = chosenDelivery();
    window.KebproReactScreens.renderDraft(host, {
      error: draftError,
      exists,
      date: dateLabel(delivery.date),
      count: cart.length,
      open: delivery.open,
      onDiscard: discardDraft,
    });
    return;
  }
  host.innerHTML =
    '<strong>' +
    (draftError ? 'Piszkozatmentési hiba' : 'Piszkozat – még nincs beküldve') +
    '</strong><p>' +
    esc(draftError || 'Ezen az eszközön megőrizve. A cég csak sikeres beküldés után látja.') +
    '</p>' +
    (exists
      ? '<p>' +
        esc(dateLabel(chosenDelivery().date)) +
        ' · ' +
        cart.length +
        ' tétel' +
        (!chosenDelivery().open ? ' · A rendelési határidő lejárt.' : '') +
        '</p><a class="button secondary" href="#order">Kosár megnyitása</a> <button class="button text-button" data-action="discard-draft">Piszkozat törlése</button>'
      : '');
}

let selectedDate = '',
  selectedRoute = '',
  deferredInstall,
  confirmAction,
  toastTimer,
  callMode = 'today';
const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
async function compressComplaintPhoto(file) {
  if (!file || !file.size) return null;
  if (!file.type.startsWith('image/') || file.size > 20 * 1024 * 1024)
    throw Error('Válassz egy legfeljebb 20 MB-os képet.');
  const url = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('A képet nem sikerült beolvasni.'));
      reader.readAsDataURL(file);
    }),
    img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error('A kép nem nyitható meg. Próbálj másik képet.'));
    img.src = url;
  });
  const scale = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw Error('A képet nem sikerült előkészíteni.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.78, 0.65, 0.5, 0.35]) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (blob?.type === 'image/jpeg' && blob.size <= 300000) {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('A képet nem sikerült beolvasni.'));
        reader.readAsDataURL(blob);
      });
    }
  }
  throw Error('A képet nem sikerült eléggé tömöríteni. Próbálj másik képet.');
}
function openComplaintPhoto(id, label) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw Error('A kép nem található.');
  if (window.KebproReactScreens) {
    window.KebproReactScreens.openPhoto({ id, label, base });
    return;
  }
  const dialog = document.createElement('dialog');
  dialog.className = 'complaint-photo-viewer';
  dialog.setAttribute('aria-labelledby', 'photo-viewer-title');
  const heading = document.createElement('h2');
  heading.id = 'photo-viewer-title';
  heading.textContent = label;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'button secondary';
  close.textContent = 'Bezárás';
  close.addEventListener('click', () => dialog.close());
  const img = document.createElement('img');
  img.src = base + '/api/complaint-photo/' + encodeURIComponent(id);
  img.alt = label;
  dialog.append(heading, close, img);
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
  close.focus();
}

async function openComplaintExport(id) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw Error('A bejelentés nem található.');
  const response = await fetch(
    '/partner-admin/api/complaints/' + encodeURIComponent(id) + '/export',
  );
  if (!response.ok) throw Error('A bejelentést nem sikerült előkészíteni. Próbáld újra.');
  const blob = await response.blob(),
    file = new File([blob], 'kebpro-bejelentes.html', { type: 'text/html' }),
    url = URL.createObjectURL(blob);
  if (window.KebproReactScreens) {
    window.KebproReactScreens.openExport({
      file,
      url,
      onClose: () => setTimeout(() => URL.revokeObjectURL(url), 60000),
    });
    return;
  }
  const dialog = document.createElement('dialog');
  dialog.className = 'export-dialog';
  dialog.setAttribute('aria-labelledby', 'export-title');
  dialog.innerHTML =
    '<h2 id="export-title">Bejelentés mentése</h2><p>A fájl tartalmazza a bejelentést, a választ és a csatolt képeket. A mentett fájl személyes adatokat is tartalmazhat.</p><div class="dialog-actions"><button type="button" class="button secondary" id="export-close">Vissza a bejelentésekhez</button></div><p class="small muted">A mentést a telefon saját mentési vagy megosztási felületén fejezheted be.</p><p id="export-error" role="alert"></p>';
  const actions = dialog.querySelector('.dialog-actions'),
    shareData = { files: [file], title: 'Kebpro bejelentés' };
  let canShare = false;
  try {
    canShare = Boolean(navigator.share && navigator.canShare?.(shareData));
  } catch {}
  if (canShare) {
    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'button primary';
    save.textContent = 'Mentés / megosztás';
    save.addEventListener('click', async () => {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if (error.name !== 'AbortError')
          dialog.querySelector('#export-error').textContent =
            'A mentés nem sikerült. Próbáld újra.';
      }
    });
    actions.append(save);
  } else {
    const link = document.createElement('a');
    link.className = 'button primary';
    link.href = url;
    link.download = 'kebpro-bejelentes.html';
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Fájl letöltése';
    actions.append(link);
  }
  dialog.querySelector('#export-close').onclick = () => dialog.close();
  dialog.addEventListener('close', () => {
    dialog.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });
  document.body.append(dialog);
  dialog.showModal();
  dialog.querySelector('#export-close').focus();
}
const dateLabel = (value) =>
  new Intl.DateTimeFormat('hu-HU', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: 'Europe/Budapest',
  }).format(new Date(value + 'T12:00:00Z'));
const dateShort = (value) =>
  new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Europe/Budapest',
  }).format(new Date(value.length === 10 ? value + 'T12:00:00Z' : value));
const quantity = (n) => new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 2 }).format(n);
const statusLabel = { received: 'Beérkezett', archived: 'Feldolgozva', skip: 'Nem kér szállítást' };
const badge = (status) =>
  '<span class="badge ' +
  ({ received: 'blue', confirmed: 'amber', ready: 'green', archived: 'green', skip: 'gray' }[
    status
  ] || 'gray') +
  '">' +
  esc(statusLabel[status] || status) +
  '</span>';
const timeLabel = (value) =>
  new Date(value).toLocaleString('hu-HU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Budapest',
  });
function toast(message) {
  const element = document.getElementById('toast');
  element.textContent = message;
  element.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (element.hidden = true), 6500);
}
let reactApi;
async function api(path, body, method = 'POST') {
  if (window.KebproReactScreens?.createPortalApi) {
    reactApi ||= window.KebproReactScreens.createPortalApi({
      base,
      csrf,
      fetchImpl: window.fetch.bind(window),
      isOnline: () => navigator.onLine,
      saveDraft,
      onMutationStart: () => {
        mutations++;
        loadSequence++;
      },
      onMutationEnd: () => {
        mutations--;
      },
      onUnauthorized: () => {
        location.href = base + '/login';
      },
    });
    return reactApi(path, body, method);
  }
  return legacyApi(path, body, method);
}
function discardDraft() {
  confirm(
    'Piszkozat törlése',
    '<p>A nem beküldött kosár és megjegyzés törlődik ezen az eszközön. A már leadott rendelések megmaradnak.</p>',
    () => {
      cart = [];
      note = '';
      editing = null;
      requestId = crypto.randomUUID();
      render();
    },
  );
}
function currentTab() {
  const allowed =
    role === 'staff'
      ? [
          'dashboard',
          'packing',
          'complaints',
          'news',
          'settings',
          'notifications',
          'applications',
          'calls',
          'products',
        ]
      : ['home', 'order', 'news', 'history', 'reports', 'settings'];
  const tab = location.hash.slice(1);
  return allowed.includes(tab) ? tab : allowed[0];
}
function syncStatus(message) {
  document.getElementById('sync-status').textContent = message;
}
function formState() {
  return [...content.querySelectorAll('form[data-dirty="true"]')].map((form) => ({
    key: form.id ? '#' + form.id : '[data-route-form="' + form.dataset.routeForm + '"]',
    fields: [...form.elements]
      .filter((e) => e.name)
      .map((e) => ({
        name: e.name,
        index: [...form.elements].indexOf(e),
        value: e.value,
        checked: e.checked,
      })),
  }));
}
function restoreForms(saved) {
  for (const item of saved) {
    const form = content.querySelector(item.key);
    if (!form) continue;
    form.dataset.dirty = 'true';
    for (const field of item.fields) {
      const element = form.elements[field.index];
      if (element) {
        element.value = field.value;
        if (field.checked !== undefined) element.checked = field.checked;
      }
    }
  }
}
let reactLoader;
async function load(automatic = false) {
  if (window.KebproReactScreens?.createPortalLoader) {
    reactLoader ||= window.KebproReactScreens.createPortalLoader({
      content,
      document,
      window,
      navigator,
      api,
      formState,
      restoreForms,
      restoreDraft,
      render,
      syncStatus,
      offerSessionRenewal,
      offerPushSetup,
      toast,
      statusLabel,
      getState: () => ({
        role,
        data,
        automaticLoadPending,
        mutations,
        loadSequence,
        ordersPage,
        historyPage,
        orderView,
        archiveSort,
        archiveDate,
        orderSearch,
        selectedDate,
        selectedRoute,
      }),
      setState: (changes) => {
        if ('data' in changes) data = changes.data;
        if ('automaticLoadPending' in changes) automaticLoadPending = changes.automaticLoadPending;
        if ('loadSequence' in changes) loadSequence = changes.loadSequence;
        if ('ordersPage' in changes) ordersPage = changes.ordersPage;
        if ('historyPage' in changes) historyPage = changes.historyPage;
        if ('selectedDate' in changes) selectedDate = changes.selectedDate;
      },
    });
    return reactLoader(automatic);
  }

  return legacyLoad(automatic);
}
function chosenDelivery() {
  if (!orderDate) orderDate = data.nextDelivery.date;
  return (
    data.deliveryOptions.find((d) => d.date === orderDate) || {
      date: orderDate,
      cutoffDate: orderDate,
      cutoff: '—',
      open: false,
      route: 'Lejárt időpont',
    }
  );
}
function currentResponse() {
  return (data.currentResponses || data.history).find((r) => r.date === chosenDelivery().date);
}
function startEdit(response) {
  editing = { id: response.id, revision: response.revision || 1 };
  orderDate = response.date;
  cart = response.items.map((i) => ({ ...i }));
  note = response.note || '';
  requestId = crypto.randomUUID();
  location.hash = 'order';
  render();
}

function money(value) {
  return value === null || value === undefined
    ? 'Ár egyeztetendő'
    : new Intl.NumberFormat('hu-HU').format(value) + ' Ft';
}
function currentPrice(item) {
  return (
    window.KebproReactScreens?.orderPricing?.getUnitPrice(data.products, item) ??
    data.products.find((p) => p.id === item.productId)?.prices?.[item.unit] ??
    null
  );
}
function currentLine(item) {
  if (window.KebproReactScreens?.orderPricing)
    return window.KebproReactScreens.orderPricing.getLinePrice(data.products, item);
  const price = currentPrice(item);
  return price === null ? null : Math.round((price * Math.round(item.quantity * 100)) / 100);
}
function cartSummary() {
  if (window.KebproReactScreens?.orderPricing)
    return window.KebproReactScreens.orderPricing.summarizeCart(data.products, cart);
  if (!cart.length) return '';
  const lines = cart.map(currentLine);
  return lines.some((v) => v === null)
    ? 'Hiányzó ár: kérjük, fordulj az értékesítő kollégákhoz.'
    : 'Nettó összesen: ' + money(lines.reduce((a, b) => a + b, 0));
}
function searchMatch(value, query) {
  return String(value)
    .toLocaleLowerCase('hu-HU')
    .includes(String(query).trim().toLocaleLowerCase('hu-HU'));
}
function filterPricePartners() {
  const select = document.getElementById('price-partner-filter');
  if (!select) return;
  const partners = [...data.allPartners]
    .filter((p) => searchMatch(p.name, partnerSearch) || p.id === pricePartner)
    .sort((a, b) => a.name.localeCompare(b.name, 'hu'));
  select.replaceChildren(
    new Option('Alapárak', ''),
    ...partners.map((p) => new Option(p.name, p.id)),
  );
  select.value = pricePartner;
}
function fillPriceForm(form) {
  const product = data.products.find((p) => p.id === form.dataset.priceProduct),
    partner = data.allPartners.find((p) => p.id === form.elements.partnerId.value),
    unit = form.elements.unit.value;
  const value = partner ? partner.prices?.[product.id]?.[unit] : product.prices?.[unit];
  form.elements.price.value = value ?? '';
}

const expandedAccountLists = new Set();
const accountNameOrder = new Intl.Collator('hu', { sensitivity: 'base', numeric: true });
function operationTime(value) {
  return new Date(value).toLocaleString('hu-HU', { timeZone: 'Europe/Budapest' });
}
const openAuditGroups = new Set(['0']);
const auditNames = {
  products: 'Termék',
  routes: 'Túra',
  partners: 'Partner',
  responses: 'Rendelés',
  news: 'Hír',
  users: 'Fiók',
  staffInvitations: 'Meghívás',
  complaints: 'Bejelentés',
};
const auditFields = {
  name: 'Név',
  username: 'Felhasználónév',
  role: 'Szerepkör',
  status: 'Állapot',
  active: 'Rendelhető',
  prices: 'Árak',
  promotions: 'Akciók',
  days: 'Napok',
  routeId: 'Túra',
  routeIds: 'Túrák',
  reminder: 'Emlékeztető',
  cutoff: 'Határidő',
  title: 'Cím',
  body: 'Szöveg',
  kind: 'Típus',
  email: 'E-mail',
  revision: 'Változat',
  archivedAt: 'Archiválva',
  archivedBy: 'Archiválta',
  updatedAt: 'Frissítve',
  updatedBy: 'Frissítette',
  partnerId: 'Partner',
  hasReply: 'Van válasz',
  invitedBy: 'Meghívta',
  value: 'Érték',
  kg: 'kg',
  db: 'db',
  karton: 'karton',
};
const auditActions = {
  prices: 'Ár módosítása',
  promotions: 'Akció módosítása',
  products: 'Termék módosítása',
  routes: 'Túra módosítása',
  partners: 'Partner beosztása',
  archive: 'Rendelés kezelése',
  news: 'Hír közzététele',
  accounts: 'Fiók kezelése',
  complaints: 'Bejelentés kezelése',
  applications: 'Regisztráció elbírálása',
  invitations: 'Meghívás',
  'revoke-invitation': 'Meghívás visszavonása',
};
function auditLabel(key) {
  return (
    auditFields[key] ||
    data.products?.find((p) => p.id === key)?.name ||
    data.allPartners?.find((p) => p.id === key)?.name ||
    data.routes?.find((r) => r.id === key)?.name ||
    key
  );
}
function auditValue(value, key) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Igen' : 'Nem';
  if (Array.isArray(value))
    return value.length ? value.map((v) => auditValue(v, key)).join(', ') : '—';
  if (typeof value === 'object')
    return (
      Object.entries(value)
        .map(([k, v]) => auditLabel(k) + ': ' + auditValue(v, k))
        .join(' · ') || '—'
    );
  if (key === 'days' && Number.isInteger(value) && value >= 0 && value <= 6)
    return ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'][value];
  if (typeof value === 'string') {
    const labels = {
      approved: 'Aktív / jóváhagyva',
      disabled: 'Letiltva',
      pending: 'Függőben',
      rejected: 'Elutasítva',
      open: 'Nyitott',
      resolved: 'Lezárt',
      archived: 'Archivált',
      received: 'Beérkezett',
      staff: 'Munkatárs',
      partner: 'Partner',
      discount: 'Kedvezmény',
      fixed: 'Egységes akciós ár',
    };
    return (
      labels[value] ||
      data.routes?.find((r) => r.id === value)?.name ||
      data.allPartners?.find((p) => p.id === value)?.name ||
      data.products?.find((p) => p.id === value)?.name ||
      value
    );
  }
  return String(value);
}
function reactAuditEvents() {
  return (data.auditLog || []).map((e) => ({
    ...e,
    label: auditActions[e.action] || 'Módosítás',
    changes: e.changes.map((change) => {
      const before = change.before || {},
        after = change.after || {},
        keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
          (k) => k !== 'id' && JSON.stringify(before[k]) !== JSON.stringify(after[k]),
        );
      const name =
        after.name ||
        before.name ||
        after.title ||
        before.title ||
        data.products?.find((p) => p.id === change.id)?.name ||
        data.allPartners?.find((p) => p.id === change.id)?.name ||
        data.routes?.find((r) => r.id === change.id)?.name ||
        '';
      return {
        label: (auditNames[change.collection] || change.collection) + (name ? ' · ' + name : ''),
        fields: keys.map((key) => ({
          key,
          label: auditLabel(key),
          before: auditValue(before[key], key),
          after: auditValue(after[key], key),
        })),
      };
    }),
  }));
}
function editHistoryOrder(id) {
  const response = [...data.history, ...(data.currentResponses || [])].find((r) => r.id === id);
  if (!response?.canEdit) throw new Error('A határidő lejárt.');
  if (cart.length)
    confirm(
      'Rendelés módosítása',
      '<p>A jelenlegi kosár helyére a kiválasztott rendelés kerül.</p>',
      () => startEdit(response),
    );
  else startEdit(response);
}
function repeatHistoryOrder(id) {
  if (currentResponse() || !chosenDelivery().open)
    throw new Error('A következő kiszállításra most nem adhatsz le új rendelést.');
  const old = data.history.find((r) => r.id === id);
  cart = old.items
    .filter((i) => data.products.some((p) => p.id === i.productId))
    .map((i) => ({ ...i }));
  requestId = crypto.randomUUID();
  location.hash = 'order';
  render();
  toast('A korábbi tételeket betöltöttük. Ellenőrizd a mennyiségeket beküldés előtt.');
}
function skipDelivery() {
  if (currentTab() === 'home' && (cart.length || note || editing)) {
    location.hash = 'order';
    toast('Előbb fejezd be vagy töröld a meglévő piszkozatot.');
    return;
  }
  if (currentTab() === 'home') {
    orderDate = data.nextDelivery.date;
    editing = null;
  }
  confirm(
    'Most nem kérsz szállítást?',
    '<p>' +
      esc(dateLabel(chosenDelivery().date)) +
      ' napjára rögzítjük, hogy nem kérsz árut. Így a munkatársaknak nem kell telefonon rákérdezniük.</p>',
    async () => {
      await api('responses', {
        kind: 'skip',
        date: chosenDelivery().date,
        requestId,
        responseId: editing?.id,
        revision: editing?.revision,
      });
      editing = null;
      cart = [];
      note = '';
      requestId = crypto.randomUUID();
      saveDraft();
      await load();
      location.hash = 'history';
      toast('Válaszod rögzítettük.');
    },
  );
}
const orderActions = window.KebproReactScreens?.createOrderActions({
  getState: () => ({ data, cart, note, orderDate, editing, requestId }),
  setState: (changes) => {
    if ('cart' in changes) cart = changes.cart;
    if ('note' in changes) note = changes.note;
    if ('orderDate' in changes) orderDate = changes.orderDate;
    if ('editing' in changes) editing = changes.editing;
    if ('requestId' in changes) requestId = changes.requestId;
    if ('historyPage' in changes) historyPage = changes.historyPage;
  },
  render,
  saveDraft,
  confirm,
  openProductPicker,
  editHistoryOrder,
  toast,
  api,
  load,
  currentResponse,
  chosenDelivery,
  esc,
  dateLabel,
  quantity,
  money,
  currentPrice,
  currentLine,
  cartSummary,
  skipDelivery,
  navigate: (tab) => {
    location.hash = tab;
  },
});
const staffSettingsActions = window.KebproReactScreens?.createStaffSettingsActions({
  getData: () => data,
  expanded: expandedAccountLists,
  api,
  load,
  toast,
  confirm,
  esc,
  openSessionRenewal,
});
function render() {
  const tab = currentTab();
  if (window.KebproReactScreens) {
    const complaints = (data.allPartners || []).reduce(
      (count, p) => count + (p.complaints || []).filter((c) => c.status === 'open').length,
      0,
    );
    window.KebproReactScreens.renderNavigation({
      role,
      active: tab,
      complaints,
      applications: data.todo?.pending || 0,
    });
  } else {
    document.querySelectorAll('[data-nav]').forEach((a) => {
      a.classList.toggle('active', a.dataset.nav === tab);
      if (a.dataset.nav === tab) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    if (role === 'staff') {
      const more = document.getElementById('mobile-more'),
        summary = more?.querySelector('summary');
      const complaints = (data.allPartners || []).reduce(
          (count, p) => count + (p.complaints || []).filter((c) => c.status === 'open').length,
          0,
        ),
        applications = data.todo?.pending || 0,
        total = complaints + applications;
      if (summary) {
        summary.classList.toggle('active', !['dashboard', 'packing', 'calls'].includes(tab));
        summary.setAttribute(
          'aria-label',
          'További menüpontok' +
            (total
              ? ' · ' +
                complaints +
                ' nyitott bejelentés, ' +
                applications +
                ' várakozó regisztráció'
              : ''),
        );
      }
      for (const [id, count] of [
        ['mobile-more-count', total],
        ['mobile-complaints-count', complaints],
        ['mobile-applications-count', applications],
      ]) {
        const badge = document.getElementById(id);
        if (badge) {
          badge.hidden = count === 0;
          badge.textContent = count > 99 ? '99+' : String(count);
        }
      }
    }
  }
  const reactScreen =
    window.KebproReactScreens &&
    (role === 'staff' && tab === 'calls'
      ? 'calls'
      : role === 'staff' && tab === 'settings'
        ? 'staff-settings'
        : role === 'staff' && tab === 'products'
          ? 'products'
          : role === 'staff' && tab === 'notifications'
            ? 'notifications'
            : role === 'staff' && tab === 'dashboard'
              ? 'dashboard'
              : role === 'staff' && tab === 'complaints'
                ? 'complaints'
                : role === 'staff' && tab === 'applications'
                  ? 'applications'
                  : role === 'staff' && tab === 'packing'
                    ? 'packing'
                    : role === 'partner' && tab === 'news'
                      ? 'news'
                      : role === 'partner' && tab === 'home'
                        ? 'home'
                        : role === 'partner' && tab === 'settings'
                          ? 'partner-settings'
                          : role === 'partner' && tab === 'order'
                            ? 'order'
                            : role === 'partner' && tab === 'history'
                              ? 'history'
                              : role === 'partner' && tab === 'reports'
                                ? 'reports'
                                : role === 'staff' && tab === 'news'
                                  ? 'staff-news'
                                  : null);
  if (reactScreen) {
    if (!document.getElementById('react-app-root'))
      content.innerHTML = '<div id="react-app-root"></div>';
  } else if (window.KebproReactScreens) window.KebproReactScreens.unmount();
  if (role === 'staff' && tab === 'dashboard' && window.KebproReactScreens) {
    window.KebproReactScreens.mountDashboard(document.getElementById('react-app-root'), {
      data,
      orderView,
      archiveSort,
      archiveDate,
      orderSearch,
      onCalls: () => {
        callMode = 'today';
        location.hash = 'calls';
        render();
      },
      onView: (view) => {
        orderView = view;
        orderSearch = '';
        ordersPage = 1;
        load().catch((error) => toast(error.message));
      },
      onSort: (value) => {
        archiveSort = value;
        ordersPage = 1;
        load().catch((error) => toast(error.message));
      },
      onDate: (value) => {
        archiveDate = value;
        ordersPage = 1;
        load().catch((error) => toast(error.message));
      },
      onSearch: (value) => {
        orderSearch = value;
        ordersPage = 1;
        loadSequence++;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => load().catch((error) => toast(error.message)), 350);
      },
      onPage: (page) => {
        ordersPage = page;
        load()
          .then(() => window.scrollTo(0, 0))
          .catch((error) => toast(error.message));
      },
      onArchive: async (order, archived) => {
        try {
          await api('archive', { id: order.id, archived, revision: order.revision || 1 });
          await load();
          toast(
            archived
              ? 'Rendelés archiválva. Az Archívumból visszaállítható.'
              : 'Rendelés visszaállítva az újak közé.',
          );
        } catch (error) {
          toast(error.message);
        }
      },
    });
  } else if (role === 'staff' && tab === 'calls' && window.KebproReactScreens) {
    window.KebproReactScreens.mountCalls(document.getElementById('react-app-root'), {
      data,
      mode: callMode,
      date: selectedDate,
      route: selectedRoute,
      onMode: (mode) => {
        callMode = mode;
        queueMicrotask(() => render());
      },
      onFilter: (date, route) => {
        selectedDate = date;
        selectedRoute = route;
        load().catch((error) => toast(error.message));
      },
    });
  } else if (role === 'staff' && tab === 'settings' && window.KebproReactScreens) {
    window.KebproReactScreens.mountStaffSettings(document.getElementById('react-app-root'), {
      data,
      expanded: [...expandedAccountLists],
      routeOpen: routeSettingsOpen,
      daysOpen: partnerDaysOpen,
      actions: staffSettingsActions,
    });
  } else if (role === 'staff' && tab === 'products' && window.KebproReactScreens) {
    window.KebproReactScreens.mountProducts(document.getElementById('react-app-root'), {
      data,
      productSearch,
      partnerSearch,
      pricePartner,
      onProductSearch: (value) => {
        productSearch = value;
      },
      onPartnerSearch: (value) => {
        partnerSearch = value;
      },
      onPartnerSelect: (value) => {
        if (content.querySelector('form[data-price-product][data-dirty="true"]')) {
          toast('Előbb mentsd az elkezdett ármódosítást.');
          return;
        }
        pricePartner = value;
        render();
      },
      onError: (error) => toast(error.message),
      onPrice: async (values) => {
        await api('prices', values);
        await load();
        toast('Ár elmentve.');
      },
      onPromotion: async (values) => {
        await api('promotions', values);
        await load();
        toast('Általános akció elmentve.');
      },
      onAvailability: async (id, active) => {
        await api('products', { id, active });
        await load();
        toast('Termék elérhetősége mentve.');
      },
      onRemove: (product, unit) =>
        confirm(
          'Akció levétele',
          '<p>Biztosan megszünteted a(z) <strong>' +
            esc(product.name) +
            '</strong> ' +
            esc(unit) +
            ' egységre szóló akcióját?</p><p>Az egyedi vagy alapár lesz újra érvényes. A korábbi rendelések ára nem változik.</p>',
          async () => {
            await api('promotions', { productId: product.id, unit, kind: 'none', value: null });
            await load();
            toast('Akció megszüntetve.');
          },
          { product: product.name, unit },
        ),
    });
  } else if (role === 'staff' && tab === 'notifications' && window.KebproReactScreens) {
    window.KebproReactScreens.mountNotifications(document.getElementById('react-app-root'), {
      data,
      audit: reactAuditEvents(),
      openGroups: [...openAuditGroups],
      onGroup: (group, open) => {
        if (open) openAuditGroups.add(group);
        else openAuditGroups.delete(group);
      },
      onReminder: async () => {
        try {
          const result = await api('reminders', {});
          await load();
          toast(result.created + ' új emlékeztető került a naplóba.');
        } catch (error) {
          toast(error.message);
        }
      },
      onEnable: async () => {
        try {
          if (
            !('Notification' in window) ||
            !('PushManager' in window) ||
            !('serviceWorker' in navigator)
          )
            throw Error(
              'iPhone-on előbb add a főképernyőhöz és onnan nyisd meg az adminfelületet.',
            );
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') throw Error('Az értesítéseket nem engedélyezted.');
          const reg = await registration(),
            subscription =
              (await reg.pushManager.getSubscription()) ||
              (await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: keyBytes(data.publicKey),
              }));
          const result = await api('subscription', subscription.toJSON());
          toast(
            result.mode === 'live'
              ? 'Rendelési értesítések bekapcsolva.'
              : 'Az eszköz feliratkozott; a távoli küldés még nem aktív.',
          );
          await load();
        } catch (error) {
          toast(error.message);
        }
      },
      onDisable: async () => {
        try {
          const reg = await registration(),
            subscription = await reg.pushManager.getSubscription();
          if (subscription) {
            await api('subscription', { endpoint: subscription.endpoint }, 'DELETE');
            await subscription.unsubscribe();
          }
          toast('Az eszköz leiratkozott.');
          await load();
        } catch (error) {
          toast(error.message);
        }
      },
    });
  } else if (role === 'staff' && tab === 'complaints' && window.KebproReactScreens) {
    window.KebproReactScreens.mountStaffComplaints(document.getElementById('react-app-root'), {
      data,
      onPhoto: openComplaintPhoto,
      onExport: openComplaintExport,
      onError: (error) => toast(error.message),
      onReply: async (values) => {
        await api('complaints', values);
        await load();
        toast('Válasz és állapot mentve.');
      },
    });
  } else if (role === 'staff' && tab === 'applications' && window.KebproReactScreens) {
    window.KebproReactScreens.mountApplications(document.getElementById('react-app-root'), {
      data,
      onError: (error) => toast(error.message),
      onApprove: async (id, routeIds) => {
        const result = await api('applications', { id, status: 'approved', routeIds });
        await load();
        toast(
          result.emailSent
            ? 'Partner jóváhagyva; az értesítést átadtuk a levelezőszervernek.'
            : 'Partner jóváhagyva, de az értesítő e-mail küldése sikertelen. Értesítsd a partnert más módon.',
        );
      },
      onReject: (id) =>
        confirm(
          'Regisztráció elutasítása',
          '<p>A partner nem kap hozzáférést. Biztosan elutasítod a kérelmet?</p>',
          async () => {
            await api('applications', { id, status: 'rejected' });
            await load();
            toast('Kérelem elutasítva.');
          },
        ),
    });
  } else if (role === 'staff' && tab === 'packing' && window.KebproReactScreens) {
    window.KebproReactScreens.mountPacking(document.getElementById('react-app-root'), {
      data,
      date: selectedDate,
      route: selectedRoute,
      onFilter: (date, route) => {
        selectedDate = date;
        selectedRoute = route;
        load().catch((error) => toast(error.message));
      },
    });
  } else if (role === 'staff' && tab === 'news' && window.KebproReactScreens) {
    window.KebproReactScreens.mountStaffNews(document.getElementById('react-app-root'), {
      data,
      onError: (error) => toast(error.message),
      onPublish: async (values) => {
        await api('news', { ...values, requestId: newsRequestId });
        newsRequestId = crypto.randomUUID();
        toast('A hír megjelent.');
        try {
          await load();
        } catch (error) {
          toast(error.message);
        }
      },
    });
  } else if (role === 'partner' && tab === 'settings' && window.KebproReactScreens) {
    window.KebproReactScreens.mountPartnerSettings(document.getElementById('react-app-root'), {
      data,
      onError: (error) => toast(error.message),
      onExtend: openSessionRenewal,
      onPreferences: async (values) => {
        await api('preferences', values);
        toast('Beállítások elmentve.');
        await load();
      },
      onEnable: enablePartnerPush,
      onDisable: async () => {
        const reg = await registration(),
          subscription = await reg.pushManager.getSubscription();
        if (subscription) {
          await api('subscription', { endpoint: subscription.endpoint }, 'DELETE');
          await subscription.unsubscribe();
        }
        toast('Ez az eszköz leiratkozott.');
        await load();
      },
      onTest: async () => {
        const reg = await registration();
        if (Notification.permission !== 'granted')
          throw Error('Előbb engedélyezd az értesítéseket.');
        await reg.showNotification('Kebpro · Helyi próba', {
          body: 'Így jelenhet meg a rendelési emlékeztetőd. Ez csak ezen az eszközön indított teszt.',
          icon: '/partner/assets/partner-v2-192.png',
          data: { url: '/partner/' },
        });
        toast('Helyi próbaértesítés megjelenítve.');
      },
    });
  } else if (role === 'partner' && tab === 'order' && window.KebproReactScreens) {
    window.KebproReactScreens.mountOrder(document.getElementById('react-app-root'), {
      data,
      next: chosenDelivery(),
      response: currentResponse(),
      cart,
      note,
      editing,
      actions: orderActions,
      cartRevision: requestId,
    });
  } else if (role === 'partner' && tab === 'history' && window.KebproReactScreens) {
    window.KebproReactScreens.mountHistory(document.getElementById('react-app-root'), {
      data,
      onError: (error) => toast(error.message),
      onPhoto: openComplaintPhoto,
      onEdit: (id) => {
        try {
          editHistoryOrder(id);
        } catch (error) {
          toast(error.message);
        }
      },
      onRepeat: (id) => {
        try {
          repeatHistoryOrder(id);
        } catch (error) {
          toast(error.message);
        }
      },
      onPage: async (page) => {
        try {
          historyPage = page;
          await load();
          window.scrollTo(0, 0);
        } catch (error) {
          toast(error.message);
        }
      },
      onSend: async (id, values) => {
        complaintRequests[id] ||= crypto.randomUUID();
        const photo = await compressComplaintPhoto(values.get('photo')),
          labelPhoto = await compressComplaintPhoto(values.get('labelPhoto'));
        await api('complaints', {
          orderId: id,
          kind: 'complaint',
          message: values.get('message'),
          requestId: complaintRequests[id],
          photo,
          labelPhoto,
        });
        delete complaintRequests[id];
      },
      onRefresh: async () => {
        toast('Bejelentés elküldve.');
        try {
          await load();
        } catch (error) {
          toast(error.message);
        }
      },
    });
  } else if (role === 'partner' && tab === 'reports' && window.KebproReactScreens) {
    window.KebproReactScreens.mountReports(document.getElementById('react-app-root'), {
      data,
      onPhoto: openComplaintPhoto,
      onError: (error) => toast(error.message),
      onSend: async (values) => {
        complaintRequests.general ||= crypto.randomUUID();
        const photo = await compressComplaintPhoto(values.get('photo'));
        await api('complaints', {
          kind: 'general',
          message: values.get('message'),
          requestId: complaintRequests.general,
          photo,
          labelPhoto: null,
        });
        delete complaintRequests.general;
      },
      onRefresh: async () => {
        toast('Bejelentés elküldve.');
        try {
          await load();
        } catch (error) {
          toast(error.message);
        }
      },
    });
  } else if (role === 'partner' && tab === 'home' && window.KebproReactScreens) {
    window.KebproReactScreens.mountHome(document.getElementById('react-app-root'), {
      data,
      onSkip: skipDelivery,
      onRepeat: (id) => {
        try {
          repeatHistoryOrder(id);
        } catch (error) {
          toast(error.message);
        }
      },
    });
  } else if (role === 'partner' && tab === 'news' && window.KebproReactScreens) {
    window.KebproReactScreens.mountNews(document.getElementById('react-app-root'), {
      news: data.news,
      onRefresh: () => load().catch((error) => toast(error.message)),
    });
  } else if (role === 'staff')
    content.innerHTML = {
      dashboard: staffDashboard,
      packing: staffPacking,
      complaints: staffComplaints,
      products: staffProducts,
      news: staffNews,
      settings: staffSettings,
      notifications,
      applications,
      calls,
    }[tab]();
  else
    content.innerHTML = {
      home,
      order,
      history,
      reports: partnerReports,
      settings: partnerSettings,
      news: () =>
        heading(
          'HÍREK ÉS AJÁNLATOK',
          'Frissen a Kebprótól',
          'Akciók, újdonságok és fontos tudnivalók.',
          '<button class="button secondary" data-action="refresh">Frissítés</button>',
        ) +
        '<div class="news-list">' +
        data.news.map(newsCard).join('') +
        '</div>',
    }[tab]();
  if (role === 'partner') {
    if (!document.getElementById('draft-status'))
      content.insertAdjacentHTML(
        'afterbegin',
        '<section id="draft-status" class="notice warning" aria-live="polite" hidden></section>',
      );
    saveDraft();
  }
}
function confirmationModel(title, context = {}) {
  const staticText = {
    'Rendelés módosítása': 'A jelenlegi kosár helyére a kiválasztott rendelés kerül.',
    'Másik kiszállítás kiválasztása': 'A kosár nem mentett változtatásai elvesznek. Folytatod?',
    'Kosár cseréje': 'A kosár helyére a mentett lista kerül.',
    'Mentett lista törlése': 'A korábbi rendeléseid megmaradnak.',
    'Meghívó visszavonása': 'A kiküldött linkkel ezután már nem hozható létre céges fiók.',
    'Regisztráció elutasítása': 'A partner nem kap hozzáférést. Biztosan elutasítod a kérelmet?',
    'Piszkozat törlése':
      'A nem beküldött kosár és megjegyzés törlődik ezen az eszközön. A már leadott rendelések megmaradnak.',
  };
  if (title in staticText) return { type: 'text', paragraphs: [staticText[title]] };
  if (title === 'Most nem kérsz szállítást?')
    return {
      type: 'text',
      paragraphs: [
        dateLabel(chosenDelivery().date) +
          ' napjára rögzítjük, hogy nem kérsz árut. Így a munkatársaknak nem kell telefonon rákérdezniük.',
      ],
    };
  if (title === 'Szokásos rendelési lista mentése')
    return { type: 'template', templates: data.templates.map(({ id, name }) => ({ id, name })) };
  if (title === 'Ellenőrizd a rendelésed')
    return {
      type: 'review',
      date: dateLabel(chosenDelivery().date),
      lines: cart.map(
        (i) =>
          i.name +
          ' · ' +
          quantity(i.quantity) +
          ' ' +
          i.unit +
          ' · ' +
          money(currentPrice(i)) +
          ' / ' +
          i.unit +
          ' · ' +
          money(currentLine(i)),
      ),
      total: cartSummary(),
      note,
    };
  if (title === 'Akció levétele') return { type: 'promotion', ...context };
  if (title === 'Céges munkatárs meghívása')
    return {
      type: 'invite',
      email: context.email ?? document.getElementById('staff-email')?.value ?? '',
    };
  if (title === 'Fiók letiltása' || title === 'Hozzáférés visszaállítása')
    return { type: 'account', name: context.name || '', disabled: title === 'Fiók letiltása' };
  throw Error('Ismeretlen megerősítő ablak.');
}
function confirm(title, html, action, context) {
  if (window.KebproReactScreens) {
    window.KebproReactScreens.openConfirmation({
      title,
      model: confirmationModel(title, context),
      action,
    });
    return;
  }
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-content').innerHTML = html;
  document.getElementById('confirm-error').textContent = '';
  confirmAction = action;
  document.getElementById('confirm-dialog').showModal();
}
document
  .getElementById('cancel-confirm')
  .addEventListener('click', () => document.getElementById('confirm-dialog').close());
document.getElementById('submit-confirm').addEventListener('click', async (event) => {
  event.target.disabled = true;
  document.getElementById('cancel-confirm').disabled = true;
  try {
    await confirmAction();
    document.getElementById('confirm-dialog').close();
  } catch (err) {
    document.getElementById('confirm-error').textContent = err.message;
  } finally {
    event.target.disabled = false;
    document.getElementById('cancel-confirm').disabled = false;
  }
});
async function registration() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window))
    throw new Error(
      'Ez a böngésző most nem támogatja a push értesítést. iPhone-on a főképernyőre telepített appból próbáld.',
    );
  return navigator.serviceWorker.ready;
}
function keyBytes(value) {
  const raw = atob(
    value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4),
  );
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
content.addEventListener(
  'toggle',
  (event) => {
    if (event.target.id === 'route-settings') routeSettingsOpen = event.target.open;
    if (event.target.id === 'partner-days-settings') partnerDaysOpen = event.target.open;
    if (
      !event.target.closest('#react-notifications-root') &&
      event.target.dataset.auditGroup !== undefined
    ) {
      if (event.target.open) openAuditGroups.add(event.target.dataset.auditGroup);
      else openAuditGroups.delete(event.target.dataset.auditGroup);
    }
  },
  true,
);
if (!window.KebproReactScreens) installLegacyHandlers();
document.getElementById('logout').addEventListener('click', async () => {
  try {
    let endpoint;
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration(
        role === 'partner' ? '/partner/' : '/partner-admin/',
      );
      const subscription = await reg?.pushManager?.getSubscription();
      if (subscription) {
        endpoint = subscription.endpoint;
        await subscription.unsubscribe();
      }
    }
    await api('logout', { endpoint });
    location.href = base + '/login';
  } catch (err) {
    toast(err.message);
  }
});
if (role === 'staff') {
  const more = document.getElementById('mobile-more');
  more?.addEventListener('click', (event) => {
    if (event.target.closest('a')) more.open = false;
  });
  document.addEventListener('click', (event) => {
    if (more?.open && !more.contains(event.target)) more.open = false;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && more?.open) {
      more.open = false;
      more.querySelector('summary')?.focus();
    }
  });
  window.addEventListener('hashchange', () => {
    if (more) more.open = false;
  });
}
window.addEventListener('hashchange', () => {
  if (data) {
    if (role === 'partner' && ['home', 'order'].includes(currentTab()) && historyPage !== 1) {
      historyPage = 1;
      load().catch((e) => toast(e.message));
    } else render();
    window.scrollTo(0, 0);
  }
});
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstall = event;
  document.getElementById('install-app').hidden = false;
});
document.getElementById('install-app').addEventListener('click', async () => {
  if (deferredInstall) {
    await deferredInstall.prompt();
    deferredInstall = null;
    document.getElementById('install-app').hidden = true;
  }
});
if ('serviceWorker' in navigator)
  navigator.serviceWorker
    .register(base + '/sw.js', { scope: base + '/' })
    .catch(() => toast('A telepíthető mód nem indult el; az oldal böngészőből használható.'));
load().catch((err) => {
  content.innerHTML =
    '<div class="notice warning">' +
    esc(err.message) +
    '</div><button class="button secondary" id="retry-load">Újrapróbálom</button>';
  document.getElementById('retry-load').addEventListener('click', () => location.reload());
});

function openProductPicker(onSelect) {
  if (window.KebproReactScreens) {
    window.KebproReactScreens.openProductPicker({
      products: data.products,
      favoriteProductIds: data.favoriteProductIds || [],
      onFavorite: async (productId, active) => {
        await api('favorites', { productId, favorite: active });
        data.favoriteProductIds = (data.favoriteProductIds || []).filter((id) => id !== productId);
        if (active) data.favoriteProductIds.push(productId);
      },
      onSelect: (product) => {
        if (onSelect) {
          onSelect(product);
          return;
        }
        document.getElementById('product').value = product.id;
        document.getElementById('add-product').dataset.dirty = 'true';
        document.getElementById('product-label').textContent = product.name;
      },
      onClose: () => document.getElementById('quantity')?.focus(),
      onError: (error) => toast(error.message),
    });
    return;
  }
  const dialog = document.createElement('dialog');
  dialog.className = 'product-picker';
  dialog.setAttribute('aria-labelledby', 'picker-title');
  dialog.innerHTML =
    '<div class="card-header"><h2 id="picker-title">Válassz terméket</h2><button class="button secondary" type="button" id="close-picker" aria-label="Termékválasztó bezárása">Bezárás</button></div><label for="product-search">Keresés a termékek között</label><input id="product-search" type="search" placeholder="Például: csirke" autocomplete="off"><p id="product-count" class="muted small" role="status"></p><div id="product-options" class="product-options"></div>';
  document.body.append(dialog);
  const list = dialog.querySelector('#product-options'),
    search = dialog.querySelector('input');
  const draw = () => {
    const results = [...data.products]
      .sort(
        (a, b) =>
          Number((data.favoriteProductIds || []).includes(b.id)) -
          Number((data.favoriteProductIds || []).includes(a.id)),
      )
      .filter((p) =>
        p.name.toLocaleLowerCase('hu').includes(search.value.trim().toLocaleLowerCase('hu')),
      );
    dialog.querySelector('#product-count').textContent = results.length + ' termék';
    list.innerHTML =
      results
        .map(
          (p) =>
            '<div class="product-choice"><button type="button" data-product="' +
            esc(p.id) +
            '">' +
            esc(p.name) +
            '<span aria-hidden="true">＋</span></button><button type="button" data-favorite="' +
            esc(p.id) +
            '" aria-label="' +
            esc(p.name) +
            ' kedvenc" aria-pressed="' +
            (data.favoriteProductIds || []).includes(p.id) +
            '">' +
            ((data.favoriteProductIds || []).includes(p.id) ? '★' : '☆') +
            '</button></div>',
        )
        .join('') || '<p>Nincs ilyen termék. Próbálj másik keresést.</p>';
  };
  search.addEventListener('input', draw);
  list.addEventListener('click', async (event) => {
    const favorite = event.target.closest('[data-favorite]');
    if (favorite) {
      favorite.disabled = true;
      try {
        const productId = favorite.dataset.favorite;
        const active = !(data.favoriteProductIds || []).includes(productId);
        await api('favorites', { productId, favorite: active });
        data.favoriteProductIds = (data.favoriteProductIds || []).filter((id) => id !== productId);
        if (active) data.favoriteProductIds.push(productId);
        draw();
      } catch (error) {
        toast(error.message);
        favorite.disabled = false;
      }
      return;
    }
    const b = event.target.closest('[data-product]');
    if (!b) return;
    document.getElementById('product').value = b.dataset.product;
    document.getElementById('add-product').dataset.dirty = 'true';
    document.getElementById('product-label').textContent = data.products.find(
      (p) => p.id === b.dataset.product,
    ).name;
    dialog.close();
    document.getElementById('quantity').focus();
  });
  dialog.querySelector('#close-picker').onclick = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove());
  draw();
  dialog.showModal();
}

setInterval(() => load(true), 5000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) load(true);
});
window.addEventListener('online', () => load(true));

let pushOfferShown = false;
function pushSetupKey() {
  return 'kebpro-push-intro-v1:' + data.id;
}
function rememberPushOffer() {
  try {
    localStorage.setItem(pushSetupKey(), 'seen');
  } catch {}
}
async function enablePartnerPush() {
  if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator))
    throw new Error(
      'Ezen a böngészőn nem érhető el. iPhone-on előbb add a Főképernyőhöz, majd onnan nyisd meg az appot.',
    );
  // Called directly by a click handler, before any await, to preserve user activation.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted')
    throw new Error(
      'Az értesítéseket nem engedélyezted. A böngésző vagy a telefon beállításaiban később bekapcsolhatod.',
    );
  const reg = await registration();
  const subscription =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(data.publicKey),
    }));
  const result = await api('subscription', { ...subscription.toJSON(), enableNews: true });
  rememberPushOffer();
  toast(
    result.mode === 'live'
      ? 'Értesítések és hírek bekapcsolva. A hírek a Beállításokban kikapcsolhatók.'
      : 'Értesítések és hírek beállítva. A távoli küldés jelenleg nem aktív.',
  );
  await load();
}
function offerPushSetup() {
  if (role !== 'partner' || pushOfferShown || document.querySelector('dialog[open]')) return;
  try {
    if (localStorage.getItem(pushSetupKey()) === 'seen') return;
  } catch {}
  pushOfferShown = true;
  const supported =
    'Notification' in window && 'PushManager' in window && 'serviceWorker' in navigator;
  const denied = supported && Notification.permission === 'denied';
  if (window.KebproReactScreens) {
    window.KebproReactScreens.openPushWelcome({
      supported,
      denied,
      onEnable: enablePartnerPush,
      onLater: rememberPushOffer,
    });
    return;
  }
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-labelledby', 'push-welcome-title');
  dialog.innerHTML =
    '<h2 id="push-welcome-title">Szeretnél értesítéseket kapni?</h2><p>Az engedélyezéssel a rendelési emlékeztetők mellett a hírekről és akciókról szóló értesítéseket is bekapcsolod. Ezeket később külön kikapcsolhatod a Beállításokban.</p><p>' +
    (denied
      ? 'Az értesítéseket korábban letiltottad. Engedélyezd őket a böngésző vagy telefon beállításaiban.'
      : !supported
        ? 'iPhone-on először a Megosztás → Főképernyőhöz adás menüvel telepítsd az appot, majd onnan nyisd meg. Ha ott sem elérhető, ellenőrizd a böngésző támogatását.'
        : 'A következő lépésben a böngésző engedélyét is meg kell adnod.') +
    '</p><p class="small muted">A kézbesítés az eszköz és a háttérszolgáltatás működésétől is függ.</p><p role="alert" id="push-welcome-error"></p><div class="dialog-actions"><button class="button secondary" id="push-later">Most nem</button>' +
    (supported && !denied
      ? '<button class="button primary" id="push-accept">Értesítések bekapcsolása</button>'
      : '') +
    '</div>';
  document.body.append(dialog);
  dialog.querySelector('#push-later').onclick = () => {
    rememberPushOffer();
    dialog.close();
  };
  dialog.addEventListener('cancel', () => rememberPushOffer());
  dialog.addEventListener('close', () => dialog.remove());
  const button = dialog.querySelector('#push-accept');
  if (button)
    button.onclick = async () => {
      button.disabled = true;
      try {
        await enablePartnerPush();
        dialog.close();
      } catch (e) {
        dialog.querySelector('#push-welcome-error').textContent = e.message;
      } finally {
        button.disabled = false;
      }
    };
  dialog.showModal();
}

let sessionReminderShown = '',
  sessionSnoozedUntil = 0;
function sessionReminderKey() {
  return (
    'kebpro-session-reminder:' +
    role +
    ':' +
    (data.id || data.currentUserId) +
    ':' +
    data.loginSession.expiresAt
  );
}
function offerSessionRenewal() {
  if (!data.loginSession?.canExtend || document.querySelector('dialog[open]')) return;
  const key = sessionReminderKey();
  if (sessionReminderShown === key || Date.now() < sessionSnoozedUntil) return;
  try {
    if (Number(localStorage.getItem(key)) > Date.now()) return;
  } catch {}
  openSessionRenewal();
}
function openSessionRenewal() {
  if (!data.loginSession?.canExtend || document.querySelector('dialog[open]')) return;
  const expiresAt = data.loginSession.expiresAt,
    key = sessionReminderKey();
  sessionReminderShown = key;
  if (window.KebproReactScreens) {
    const snooze = () => {
      sessionSnoozedUntil = Date.now() + 86400000;
      sessionReminderShown = '';
      try {
        localStorage.setItem(key, String(sessionSnoozedUntil));
      } catch {}
    };
    window.KebproReactScreens.openSessionRenewal({
      staff: role === 'staff',
      expiresAt,
      onLater: snooze,
      onRenew: async () => {
        const result = await api('extend-session', { expiresAt });
        data.loginSession = result.loginSession;
        render();
        toast(
          'Meghosszabbítottuk a belépésedet eddig: ' + operationTime(result.loginSession.expiresAt),
        );
      },
    });
    return;
  }
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-labelledby', 'renew-title');
  dialog.innerHTML =
    '<h2 id="renew-title">Hamarosan lejár a belépésed</h2><p>A belépésed lejárata: <strong>' +
    esc(operationTime(expiresAt)) +
    '</strong>.</p><p>Szeretnél ezen az eszközön a megerősítéstől számított további ' +
    (role === 'staff' ? 7 : 90) +
    ' napig bejelentkezve maradni?</p>' +
    sessionExplanation() +
    '<p role="alert" id="renew-error"></p><div class="dialog-actions"><button class="button secondary" id="renew-later">Most nem</button><button class="button primary" id="renew-accept">Igen, maradjak bejelentkezve</button></div>';
  document.body.append(dialog);
  const snooze = () => {
    sessionSnoozedUntil = Date.now() + 86400000;
    sessionReminderShown = '';
    try {
      localStorage.setItem(key, String(sessionSnoozedUntil));
    } catch {}
  };
  dialog.querySelector('#renew-later').onclick = () => {
    snooze();
    dialog.close();
  };
  dialog.addEventListener('cancel', snooze);
  dialog.addEventListener('close', () => dialog.remove());
  const accept = dialog.querySelector('#renew-accept'),
    later = dialog.querySelector('#renew-later');
  let pending = false;
  dialog.addEventListener('cancel', (event) => {
    if (pending) event.preventDefault();
  });
  accept.onclick = async () => {
    pending = true;
    accept.disabled = true;
    later.disabled = true;
    try {
      const result = await api('extend-session', { expiresAt });
      data.loginSession = result.loginSession;
      dialog.close();
      render();
      toast(
        'Meghosszabbítottuk a belépésedet eddig: ' + operationTime(result.loginSession.expiresAt),
      );
    } catch (error) {
      dialog.querySelector('#renew-error').textContent = error.message;
    } finally {
      pending = false;
      accept.disabled = false;
      later.disabled = false;
    }
  };
  dialog.showModal();
}
