import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const filePath = path.join(rootDir, 'data', 'rental', 'kiosks.json');
const schema = 'photobooth-rental-kiosks:v1';

const args = process.argv.slice(2);
const command = args[0];
const getOption = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? String(args[index + 1] || '').trim() : '';
};
const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const createToken = () => randomBytes(32).toString('base64url');

const usage = () => {
  console.log(`
Usage:
  npm run rentals -- create --id <kiosk-id> --tenant <tenant-id> --name <display-name> --origin <https://booth.example.com> [--expires <ISO date>]
  npm run rentals -- revoke --id <kiosk-id>
  npm run rentals -- list

The create command prints the only copy of the kiosk and dashboard links. Keep them in a password manager; only token hashes are saved on the server.
`);
};

const readStore = async () => {
  try {
    const payload = JSON.parse(await readFile(filePath, 'utf8'));
    if (payload?.schema === schema && Array.isArray(payload.kiosks)) return payload;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return { schema, updatedAt: null, kiosks: [] };
};

const writeStore = async (store) => {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const nextStore = { ...store, schema, updatedAt: new Date().toISOString() };
  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(nextStore, null, 2)}\n`, 'utf8');
  renameSync(tempPath, filePath);
};

if (!command || ['-h', '--help', 'help'].includes(command)) {
  usage();
  process.exit(0);
}

const store = await readStore();

if (command === 'list') {
  if (!store.kiosks.length) {
    console.log('No rental kiosks have been provisioned.');
  } else {
    console.table(store.kiosks.map(({ id, tenantId, name, status, expiresAt, createdAt }) => ({ id, tenantId, name, status, expiresAt: expiresAt || 'never', createdAt })));
  }
  process.exit(0);
}

const id = getOption('id').toLowerCase();
if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(id)) {
  console.error('A kiosk id is required and must contain only lowercase letters, digits, and hyphens.');
  process.exit(1);
}

if (command === 'revoke') {
  const kiosk = store.kiosks.find((item) => item.id === id);
  if (!kiosk) {
    console.error(`Kiosk "${id}" was not found.`);
    process.exit(1);
  }
  kiosk.status = 'revoked';
  kiosk.revokedAt = new Date().toISOString();
  await writeStore(store);
  console.log(`Kiosk "${id}" has been revoked. Its kiosk and dashboard links no longer work.`);
  process.exit(0);
}

if (command !== 'create') {
  usage();
  process.exit(1);
}

const tenantId = getOption('tenant').toLowerCase();
const name = getOption('name');
const origin = getOption('origin').replace(/\/+$/, '');
const expiresAt = getOption('expires');
if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(tenantId)) {
  console.error('A tenant id is required and must contain only lowercase letters, digits, and hyphens.');
  process.exit(1);
}
if (!name || !origin.startsWith('https://')) {
  console.error('Name and an HTTPS --origin are required. Example: --origin https://booth.example.com');
  process.exit(1);
}
if (expiresAt && !Number.isFinite(Date.parse(expiresAt))) {
  console.error('--expires must be a valid ISO date, for example 2026-08-01T23:59:59+07:00');
  process.exit(1);
}
if (store.kiosks.some((item) => item.id === id)) {
  console.error(`Kiosk id "${id}" already exists. Revoke it first or use another id.`);
  process.exit(1);
}

const kioskToken = createToken();
const dashboardToken = createToken();
store.kiosks.push({
  id,
  tenantId,
  name,
  status: 'active',
  createdAt: new Date().toISOString(),
  expiresAt: expiresAt || null,
  kioskTokenHash: hashToken(kioskToken),
  dashboardTokenHash: hashToken(dashboardToken),
});
await writeStore(store);

console.log(`
Provisioned kiosk: ${name} (${id})

Kiosk link (open only on the computer connected to the camera/printer):
${origin}/kiosk/${id}#access=${kioskToken}

Customer dashboard link:
${origin}/dashboard/${id}?mode=dashboard#access=${dashboardToken}

These secrets are shown once. If either link is leaked, revoke this kiosk and create it again.
`);
