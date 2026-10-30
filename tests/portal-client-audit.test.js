const test = require('node:test');
const assert = require('node:assert/strict');
const { createAuditFormatter } = require('../portal/client/audit.cjs');

test('audit formatter labels changed fields and resolves related names', () => {
  const data = {
    products: [{ id: 'p', name: 'Gyros' }],
    routes: [{ id: 'r', name: 'Hétfő' }],
    auditLog: [
      {
        id: 'event',
        action: 'prices',
        changes: [
          {
            collection: 'products',
            id: 'p',
            before: { id: 'p', active: true, prices: { kg: 100 } },
            after: { id: 'p', active: false, prices: { kg: 200 } },
          },
        ],
      },
    ],
  };
  const [event] = createAuditFormatter(() => data).reactAuditEvents();
  assert.equal(event.label, 'Ár módosítása');
  assert.equal(event.changes[0].label, 'Termék · Gyros');
  const fields = event.changes[0].fields;
  assert.equal(fields.find((f) => f.key === 'active').before, 'Igen');
  assert.equal(fields.find((f) => f.key === 'active').after, 'Nem');
  assert.equal(fields.find((f) => f.key === 'prices').after, 'kg: 200');
  assert.equal(
    fields.some((f) => f.key === 'id'),
    false,
  );
});
