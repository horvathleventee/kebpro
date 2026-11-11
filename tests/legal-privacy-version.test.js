const test = require('node:test');
const assert = require('node:assert/strict');
const legal = require('../portal/legal');

test('new preview privacy draft preserves old linked policy and records exact document versions', () => {
  const previous = legal.resolve('privacy', '2026-10-29-v4');
  assert.equal(previous.version, '2026-10-29-v4');
  const privacy = legal.snapshot('privacy');
  const terms = legal.snapshot('terms');
  assert.equal(privacy.version, 'draft-2026-11-10-v6');
  assert.equal(legal.resolve('privacy', 'draft-2026-11-10-v5').version, 'draft-2026-11-10-v5');
  const draft = legal.resolve('privacy', privacy.version);
  assert.match(JSON.stringify(draft), /Geoapify/);
  assert.match(JSON.stringify(draft), /HolAzAutó/);
  assert.doesNotMatch(
    JSON.stringify(draft),
    /véglegesítésre vár|élesítés előtt ellenőriz|adatkezelőnek célonként/,
  );
  const acceptance = legal.verifyAcceptance({
    termsAccepted: true,
    termsVersion: terms.version,
    termsHash: terms.hash,
    privacyVersion: privacy.version,
    privacyHash: privacy.hash,
  });
  assert.equal(JSON.parse(acceptance.privacyDocument).version, privacy.version);
  assert.throws(() =>
    legal.verifyAcceptance({
      termsAccepted: true,
      termsVersion: terms.version,
      termsHash: terms.hash,
      privacyVersion: previous.version,
      privacyHash: privacy.hash,
    }),
  );
});
