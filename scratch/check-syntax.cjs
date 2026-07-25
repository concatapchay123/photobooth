const esbuild = require('esbuild');
esbuild.build({
  entryPoints: ['src/App.jsx'],
  bundle: false,
  write: false,
  logLevel: 'info'
}).catch(() => process.exit(1));
