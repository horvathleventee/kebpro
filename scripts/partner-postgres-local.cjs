// Windows local integration runner. All data lives in an ignored, unique test folder.
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  { execFile, spawn } = require('node:child_process'),
  { promisify } = require('node:util');
const root = path.resolve(__dirname, '..');
function exec(file, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-2000);
    });
    const timer = setTimeout(() => {
      child.kill();
      reject(Error(path.basename(file) + ' timed out'));
    }, options.timeout || 60000);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      code === 0
        ? resolve()
        : reject(
            Error(path.basename(file) + ' exited ' + code + (stderr ? ': ' + stderr.trim() : '')),
          );
    });
  });
}
async function main() {
  const bin = path.join(
    root,
    '.local-tests/runtime/node_modules/@embedded-postgres/windows-x64/native/bin',
  );
  if (!fs.existsSync(path.join(bin, 'initdb.exe')))
    throw Error(
      'Install the isolated Windows test runtime as documented in docs/LOCAL-VALIDATION.md',
    );
  const dir = path.join(root, '.local-tests/postgres-' + crypto.randomUUID());
  fs.mkdirSync(dir, { recursive: true });
  const password = crypto.randomBytes(24).toString('hex'),
    pwfile = path.join(dir, 'password');
  fs.writeFileSync(pwfile, password, { mode: 0o600 });
  const net = require('node:net'),
    probe = net.createServer();
  await new Promise((r) => probe.listen(0, '127.0.0.1', r));
  const port = probe.address().port;
  await new Promise((r) => probe.close(r));
  let started = false;
  try {
    await exec(
      path.join(bin, 'initdb.exe'),
      [
        '-D',
        path.join(dir, 'data'),
        '-U',
        'portaltest',
        '--pwfile',
        pwfile,
        '--auth=scram-sha-256',
        '--encoding=UTF8',
        '--locale=C',
      ],
      { windowsHide: true, timeout: 60000 },
    );
    await exec(
      path.join(bin, 'pg_ctl.exe'),
      [
        '-D',
        path.join(dir, 'data'),
        '-l',
        path.join(dir, 'postgres.log'),
        '-o',
        '-h 127.0.0.1 -p ' + port,
        '-w',
        'start',
      ],
      { windowsHide: true, timeout: 60000 },
    );
    started = true;
    const { Client } = require('pg'),
      client = new Client({
        host: '127.0.0.1',
        port,
        user: 'portaltest',
        password,
        database: 'postgres',
      });
    await client.connect();
    try {
      await client.query('CREATE DATABASE kebpro_test_validation');
      console.log(
        'Local PostgreSQL:',
        (await client.query('SELECT version()')).rows[0].version.split(',')[0],
      );
    } finally {
      await client.end();
    }
    const env = {
      ...process.env,
      PORTAL_TEST_DATABASE_URL:
        'postgresql://portaltest:' + password + '@127.0.0.1:' + port + '/kebpro_test_validation',
    };
    async function run(args) {
      await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, args, {
          cwd: root,
          env,
          stdio: 'inherit',
          windowsHide: true,
        });
        child.on('error', reject);
        child.on('exit', (code) =>
          code === 0 ? resolve() : reject(Error('Test process failed: ' + code)),
        );
      });
    }
    await run([
      '--test',
      'tests/partner.test.js',
      'tests/drafts.test.js',
      'tests/operations.test.js',
      'tests/postgres.test.js',
      'tests/staging.test.js',
      'tests/portal-updates.test.js',
    ]);
    await run(['scripts/partner-load-test.cjs']);
  } finally {
    try {
      if (started)
        await exec(
          path.join(bin, 'pg_ctl.exe'),
          ['-D', path.join(dir, 'data'), '-m', 'fast', '-w', 'stop'],
          { windowsHide: true, timeout: 30000 },
        );
    } finally {
      fs.rmSync(pwfile, { force: true });
    }
  }
}
main().catch((error) => {
  console.error(
    'Local PostgreSQL validation failed:',
    error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[database URL]'),
  );
  process.exitCode = 1;
});
