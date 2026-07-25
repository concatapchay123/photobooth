import { spawn } from 'node:child_process';

const origin = String(process.env.PUBLIC_SHARE_ORIGIN || process.env.VITE_PUBLIC_SHARE_ORIGIN || '').trim().replace(/\/+$/, '');
const rentalMode = String(process.env.PHOTOBOOTH_RENTAL_MODE || '').trim().toLowerCase() === 'true';
const allowBrowserAi = String(process.env.PHOTOBOOTH_ALLOW_BROWSER_AI || '').trim().toLowerCase() === 'true';
const port = String(process.env.PORT || 4173);
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

if (!origin.startsWith('https://')) {
  console.error('PUBLIC_SHARE_ORIGIN must be your stable HTTPS address, for example https://booth.example.com');
  process.exit(1);
}
if (!rentalMode) {
  console.warn('PHOTOBOOTH_RENTAL_MODE is not enabled. The app will start, but its rental API protection is OFF.');
}
if (rentalMode && !process.env.PHOTOBOOTH_RENTAL_ADMIN_TOKEN) {
  console.error('PHOTOBOOTH_RENTAL_MODE=true requires PHOTOBOOTH_RENTAL_ADMIN_TOKEN.');
  process.exit(1);
}

// VITE_ values are embedded in the browser bundle. A rental host must not ship
// a personal AI key to every kiosk unless the owner explicitly accepts that risk.
const hostEnvironment = {
  ...process.env,
  PUBLIC_SHARE_ORIGIN: origin,
  VITE_PUBLIC_SHARE_ORIGIN: origin,
};
if (rentalMode && !allowBrowserAi) {
  console.log('Browser AI credentials are excluded from the rental build. Set PHOTOBOOTH_ALLOW_BROWSER_AI=true only with a safe, restricted key.');
}

const run = (args) => new Promise((resolve, reject) => {
  const child = spawn(npmCommand, args, {
    cwd: process.cwd(),
    env: hostEnvironment,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  child.on('error', reject);
  child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`npm ${args.join(' ')} exited with code ${code}`)));
});

const viteMode = rentalMode && !allowBrowserAi ? 'rental' : 'production';
await run(['run', 'build', '--', '--mode', viteMode]);
console.log(`Starting home host on http://127.0.0.1:${port}`);
console.log(`Publish that loopback address through your named Cloudflare Tunnel: ${origin}`);

const preview = spawn(npmCommand, ['run', 'preview', '--', '--host', '127.0.0.1', '--port', port, '--mode', viteMode], {
  cwd: process.cwd(),
  env: hostEnvironment,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
preview.on('exit', (code) => process.exit(code || 0));
preview.on('error', (error) => {
  console.error(error.message || error);
  process.exit(1);
});
