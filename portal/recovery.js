const crypto = require('crypto');
const auth = require('./auth');
const { assert } = require('./domain');
const digest = (token) => crypto.createHash('sha256').update(token).digest('hex');
const generic =
  'Ha ehhez az e-mail-címhez tartozik fiók, elküldjük a jelszó-visszaállító linket. Ellenőrizd a levélszemét mappát is.';
function createRecovery({ store, sendEmail, origin, clock = () => Date.now() }) {
  const site = new URL(origin);
  assert(
    site.protocol === 'https:' ||
      (site.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(site.hostname)),
    'Érvénytelen alkalmazáscím.',
  );
  async function request(input, role) {
    const email = auth.emailAddress(input.email);
    const token = crypto.randomBytes(32).toString('hex');
    const record = await store.change((s) => {
      s.passwordResets = (s.passwordResets || []).filter((r) => r.expires > clock());
      const user = s.users.find(
        (u) => u.email === email && u.role === role && !['rejected', 'disabled'].includes(u.status),
      );
      if (
        !user ||
        s.passwordResets.some((r) => r.userId === user.id && r.createdAt > clock() - 60000)
      )
        return null;
      s.passwordResets = s.passwordResets.filter((r) => r.userId !== user.id);
      const record = {
        hash: digest(token),
        userId: user.id,
        role,
        expires: clock() + 30 * 60000,
        createdAt: clock(),
      };
      s.passwordResets.push(record);
      return record;
    });
    if (record) {
      const url = new URL(
        (role === 'staff' ? '/partner-admin' : '/partner') + '/reset-password',
        site.origin,
      );
      url.hash = token;
      try {
        await sendEmail({
          to: email,
          subject: 'Kebpro · Jelszó visszaállítása',
          text:
            'Jelszó-visszaállítást kértek a Kebpro fiókodhoz.\n\nÚj jelszó megadása: ' +
            url.href +
            '\n\nA link 30 percig, egyszer használható. A korábbi jelszavadat is megadhatod. Ha nem te kérted, hagyd figyelmen kívül ezt a levelet; a jelszavad nem változik meg.' +
            (['localhost', '127.0.0.1'].includes(site.hostname)
              ? '\n\nA helyi bemutató localhost linkje csak a bemutatót futtató számítógépen működik.'
              : ''),
        });
      } catch (error) {
        await store.change((s) => {
          s.passwordResets = s.passwordResets.filter((r) => r.hash !== record.hash);
        });
        console.error('[partner mail] Password reset delivery failed.');
      }
    }
    return { message: generic };
  }
  async function reset(input, role) {
    assert(
      typeof input.token === 'string' && /^[a-f0-9]{64}$/.test(input.token),
      'A link érvénytelen vagy lejárt. Kérj újat.',
      400,
    );
    auth.validatePassword(input.password);
    const hash = digest(input.token);
    const valid = (s) =>
      (s.passwordResets || []).find(
        (r) => r.hash === hash && r.role === role && r.expires > clock(),
      );
    assert(valid(await store.read()), 'A link érvénytelen vagy lejárt. Kérj újat.', 400);
    const passwordHash = await auth.passwordHash(input.password);
    await store.change((s) => {
      const record = valid(s);
      assert(record, 'A link érvénytelen vagy lejárt. Kérj újat.', 400);
      const user = s.users.find(
        (u) =>
          u.id === record.userId && u.role === role && !['rejected', 'disabled'].includes(u.status),
      );
      assert(user, 'A link már nem használható.', 400);
      user.passwordHash = passwordHash;
      user.emailVerifiedAt = new Date(clock()).toISOString();
      s.passwordResets = s.passwordResets.filter((r) => r.userId !== user.id);
      s.sessions = s.sessions.filter((r) => r.userId !== user.id);
    });
    return { ok: true };
  }
  return { request, reset };
}
module.exports = { createRecovery };
