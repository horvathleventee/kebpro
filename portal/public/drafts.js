/* Local device drafts, scoped to the authenticated partner. No credentials stored. */
(function (root) {
  function create(storage, partnerId) {
    const key = 'kebpro-order-draft-v1:' + partnerId;
    return {
      read() {
        const raw = storage.getItem(key);
        if (!raw) return null;
        const d = JSON.parse(raw);
        if (
          d.version !== 1 ||
          d.partnerId !== partnerId ||
          !Array.isArray(d.cart) ||
          d.cart.length > 50 ||
          typeof d.note !== 'string' ||
          d.note.length > 1000 ||
          !/^\d{4}-\d{2}-\d{2}$/.test(d.orderDate) ||
          typeof d.requestId !== 'string'
        )
          throw Error('Invalid draft');
        for (const i of d.cart)
          if (
            typeof i.productId !== 'string' ||
            typeof i.name !== 'string' ||
            !['kg', 'db', 'karton'].includes(i.unit) ||
            (i.quantity !== null && !Number.isFinite(i.quantity))
          )
            throw Error('Invalid draft item');
        if (
          d.editing &&
          (typeof d.editing.id !== 'string' || !Number.isInteger(d.editing.revision))
        )
          throw Error('Invalid draft revision');
        return d;
      },
      save(d) {
        if (!d.cart.length && !d.note && !d.editing) {
          storage.removeItem(key);
          return;
        }
        storage.setItem(
          key,
          JSON.stringify({ ...d, version: 1, partnerId, savedAt: new Date().toISOString() }),
        );
      },
      clear() {
        storage.removeItem(key);
      },
    };
  }
  const api = { create };
  if (typeof module !== 'undefined') module.exports = api;
  else root.KebproDrafts = api;
})(typeof window !== 'undefined' ? window : this);
