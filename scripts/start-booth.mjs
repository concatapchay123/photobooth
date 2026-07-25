import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { chmod, rm, writeFile } from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const port = String(process.env.PORT || process.env.VITE_PORT || 5173);
const toolsDir = path.join(rootDir, '.tools');
const publicShareOriginPath = path.join(rootDir, 'data', 'public-share-origin.json');
let publicOriginHeartbeat = null;

const commandExists = (command) => {
  const lookup = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(lookup, [command], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.split(/\r?\n/).find(Boolean) : '';
};

const getCloudflaredDownload = () => {
  const arch = process.arch === 'x64' ? 'amd64' : process.arch;
  if (process.platform === 'win32' && arch === 'amd64') {
    return {
      fileName: 'cloudflared.exe',
      url: 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe',
    };
  }
  if (process.platform === 'linux' && ['amd64', 'arm64'].includes(arch)) {
    return {
      fileName: `cloudflared-linux-${arch}`,
      url: `https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${arch}`,
    };
  }
  return null;
};

const downloadFile = (url, destination, redirects = 0) => new Promise((resolve, reject) => {
  if (redirects > 5) {
    reject(new Error('Too many redirects while downloading cloudflared'));
    return;
  }

  https.get(url, (response) => {
    if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
      const nextUrl = new URL(response.headers.location, url).toString();
      response.resume();
      downloadFile(nextUrl, destination, redirects + 1).then(resolve, reject);
      return;
    }

    if (response.statusCode !== 200) {
      response.resume();
      reject(new Error(`Download failed with HTTP ${response.statusCode}`));
      return;
    }

    const file = createWriteStream(destination);
    response.pipe(file);
    file.on('finish', () => file.close(resolve));
    file.on('error', reject);
  }).on('error', reject);
});

const ensureCloudflared = async () => {
  if (process.env.CLOUDFLARED_PATH && existsSync(process.env.CLOUDFLARED_PATH)) {
    return process.env.CLOUDFLARED_PATH;
  }

  const existing = commandExists('cloudflared');
  if (existing) return existing;

  const stdPaths = [
    'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
    'C:\\Program Files\\cloudflared\\cloudflared.exe',
  ];
  for (const stdPath of stdPaths) {
    if (existsSync(stdPath)) return stdPath;
  }

  const download = getCloudflaredDownload();
  if (!download) {
    throw new Error(`Unsupported platform for automatic cloudflared download: ${process.platform}/${process.arch}`);
  }

  mkdirSync(toolsDir, { recursive: true });
  const binaryPath = path.join(toolsDir, download.fileName);
  if (!existsSync(binaryPath)) {
    console.log('Downloading cloudflared for HTTPS QR sharing...');
    await downloadFile(download.url, binaryPath);
  }
  if (process.platform !== 'win32') await chmod(binaryPath, 0o755);
  return binaryPath;
};

const startVite = (publicOrigin) => {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const vite = spawn(npmCommand, ['run', 'dev', '--', '--host', '0.0.0.0', '--port', port, '--open'], {
    cwd: rootDir,
    env: {
      ...process.env,
      PUBLIC_SHARE_ORIGIN: publicOrigin,
      VITE_PUBLIC_SHARE_ORIGIN: publicOrigin,
    },
    stdio: 'inherit',
    shell: true,
  });

  vite.on('exit', (code, signal) => {
    clearPublicShareOrigin().catch(() => {});
    if (signal) process.exit(0);
    process.exit(code || 0);
  });

  return vite;
};

const writePublicShareOrigin = async (origin) => {
  if (!origin) return;
  mkdirSync(path.dirname(publicShareOriginPath), { recursive: true });
  await writeFile(publicShareOriginPath, JSON.stringify({
    origin,
    updatedAt: new Date().toISOString(),
    pid: process.pid,
  }, null, 2), 'utf8');
};

const clearPublicShareOrigin = async () => {
  if (publicOriginHeartbeat) {
    clearInterval(publicOriginHeartbeat);
    publicOriginHeartbeat = null;
  }
  await rm(publicShareOriginPath, { force: true }).catch(() => {});
};

const startPublicOriginHeartbeat = async (origin) => {
  if (publicOriginHeartbeat) clearInterval(publicOriginHeartbeat);
  await writePublicShareOrigin(origin);
  publicOriginHeartbeat = setInterval(() => {
    writePublicShareOrigin(origin).catch(() => {});
  }, 30_000);
};

const main = async () => {
  const localUrl = `http://127.0.0.1:${port}`;
  let cloudflaredPath = null;
  try {
    cloudflaredPath = await ensureCloudflared();
  } catch (error) {
    console.warn('');
    console.warn('================================================================');
    console.warn(`WARNING: Không thể tải/khởi động Cloudflare Tunnel (${error.message || error}).`);
    console.warn('Cách khắc phục để có link HTTPS quét từ xa:');
    console.warn('1. Tải file cloudflared.exe thủ công từ link:');
    console.warn('   https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe');
    console.warn('2. Tạo thư mục tên ".tools" ở thư mục dự án và copy file vừa tải vào đó.');
    console.warn('Hiện tại, hệ thống sẽ tự động chạy ở chế độ mạng nội bộ (Wi-Fi chung).');
    console.warn('================================================================');
    console.warn('');
  }

  let viteProcess = null;

  if (cloudflaredPath) {
    console.log(`Starting HTTPS tunnel for ${localUrl}...`);
    const tunnel = spawn(cloudflaredPath, ['tunnel', '--url', localUrl, '--no-autoupdate'], {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const stopAll = () => {
      if (viteProcess && !viteProcess.killed) viteProcess.kill();
      if (!tunnel.killed) tunnel.kill();
      clearPublicShareOrigin().catch(() => {});
    };

    process.on('SIGINT', () => {
      stopAll();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      stopAll();
      process.exit(0);
    });

    const handleTunnelOutput = (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (!match || viteProcess) return;

      const publicOrigin = match[0].replace(/\/+$/, '');
      startPublicOriginHeartbeat(publicOrigin).catch(() => {});
      console.log('');
      console.log(`Public QR link origin: ${publicOrigin}`);
      console.log(`Open booth on this computer: ${localUrl}`);
      console.log('Guests scan QR from the result screen and open the HTTPS page directly.');
      console.log('');
      viteProcess = startVite(publicOrigin);
    };

    tunnel.stdout.on('data', handleTunnelOutput);
    tunnel.stderr.on('data', handleTunnelOutput);
    tunnel.on('exit', (code) => {
      clearPublicShareOrigin().catch(() => {});
      if (viteProcess) viteProcess.kill();
      process.exit(code || 0);
    });
  } else {
    await clearPublicShareOrigin();
    console.log(`Khởi động Vite trực tiếp tại: ${localUrl}...`);
    viteProcess = startVite('');
  }
};

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
