const { assert } = require('./domain');

function normalizeMobilePhone(value) {
  assert(typeof value === 'string' && value.length <= 40, 'Adj meg érvényes magyar mobilszámot.');
  const normalized = value.replace(/[ ()\-.]/g, '');
  assert(
    /^\+36(?:20|30|31|50|70)\d{7}$/.test(normalized),
    'Adj meg érvényes magyar mobilszámot: +36, előhívó és 7 számjegy.',
  );
  return normalized;
}

module.exports = { normalizeMobilePhone };
