const esbuild = require('esbuild');
for (const name of [
  'order-pricing',
  'navigation',
  'api',
  'application-state',
  'draft-controller',
  'session-controller',
  'push-controller',
  'staff-settings-actions',
  'order-actions',
  'loader',
  'photo',
  'audit',
]) {
  esbuild.buildSync({
    entryPoints: [`portal/client/ts/${name}.ts`],
    outfile: `portal/client/${name}.cjs`,
    bundle: true,
    platform: 'neutral',
    format: 'cjs',
    target: ['es2020'],
    legalComments: 'none',
  });
}
esbuild.buildSync({
  entryPoints: ['portal/react/screens.tsx'],
  outfile: 'portal/public/react-screens.js',
  bundle: true,
  minify: true,
  platform: 'browser',
  format: 'iife',
  target: ['es2020'],
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'inline',
});

esbuild.buildSync({
  entryPoints: ['portal/react/auth.tsx'],
  outfile: 'portal/public/react-auth.js',
  bundle: true,
  minify: true,
  platform: 'browser',
  format: 'iife',
  target: ['es2020'],
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'inline',
});
