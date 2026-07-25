import { createServer, request as httpRequest } from 'node:http';
import { existsSync, mkdirSync } from 'node:fs';
import { unlink, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const port = Number(process.env.KIOSK_EDGE_PORT || 8787);
const allowedOrigins = new Set(
  String(process.env.EDGE_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean),
);
const printerName = String(process.env.PRINTER_NAME || '').trim();

const sendJson = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
};

const getAllowedOrigin = (req) => {
  const origin = String(req.headers.origin || '').replace(/\/+$/, '');
  if (!origin) return '';
  return allowedOrigins.has(origin) ? origin : null;
};

const applyCors = (req, res) => {
  const origin = getAllowedOrigin(req);
  if (origin === null) return false;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  return true;
};

const readBody = (req) => new Promise((resolve, reject) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 180 * 1024 * 1024) {
      req.destroy();
      reject(new Error('Body too large'));
    }
  });
  req.on('end', () => resolve(body));
  req.on('error', reject);
});

const rawGet = (target) => new Promise((resolve, reject) => {
  const targetUrl = new URL(target);
  const request = httpRequest({
    hostname: targetUrl.hostname,
    port: targetUrl.port || 80,
    path: `${targetUrl.pathname}${targetUrl.search}`,
    method: 'GET',
    timeout: 12_000,
  }, (response) => {
    const chunks = [];
    response.on('data', (chunk) => chunks.push(chunk));
    response.on('end', () => resolve({ statusCode: response.statusCode || 500, body: Buffer.concat(chunks) }));
  });
  request.on('timeout', () => request.destroy(new Error('digiCamControl timeout')));
  request.on('error', reject);
  request.end();
});

const printImage = async (imagePath) => new Promise((resolve, reject) => {
  if (process.platform !== 'win32') {
    reject(new Error('Silent printing through kiosk-edge currently requires Windows'));
    return;
  }
  const args = ['-ExecutionPolicy', 'Bypass', '-File', path.join(rootDir, 'scripts', 'print-image.ps1'), '-ImagePath', imagePath];
  if (printerName) args.push('-PrinterName', printerName);
  const child = spawn('powershell.exe', args, { windowsHide: true });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  child.on('error', reject);
  child.on('close', (code) => {
    if (code === 0) resolve();
    else reject(new Error(stderr.trim() || `PowerShell printer exited with code ${code}`));
  });
});

const handlePrint = async (req, res) => {
  const payload = JSON.parse(await readBody(req));
  const match = /^data:(image\/(?:png|jpeg));base64,([a-z0-9+/=\r\n]+)$/i.exec(payload?.dataUrl || '');
  if (!match) {
    sendJson(res, 400, { error: 'Invalid print payload' });
    return;
  }
  const tempDir = path.join(rootDir, 'data', 'temp');
  mkdirSync(tempDir, { recursive: true });
  const tempPath = path.join(tempDir, `edge-print-${Date.now()}.${match[1].toLowerCase() === 'image/jpeg' ? 'jpg' : 'png'}`);
  await writeFile(tempPath, Buffer.from(match[2], 'base64'));
  try {
    await printImage(tempPath);
    sendJson(res, 200, { ok: true, message: 'Print job sent from local kiosk edge' });
  } finally {
    await unlink(tempPath).catch(() => {});
  }
};

const server = createServer(async (req, res) => {
  if (!applyCors(req, res)) {
    sendJson(res, 403, { error: 'Origin is not allowed by this kiosk edge' });
    return;
  }
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, { ok: true, service: 'photobooth-kiosk-edge', printerConfigured: Boolean(printerName) });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/print') {
      await handlePrint(req, res);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/dslr/capture') {
      const result = await rawGet('http://127.0.0.1:5513/?CMD=Capture');
      sendJson(res, 200, { ok: true, response: result.body.toString('utf8').trim() });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/dslr/last-captured') {
      const result = await rawGet('http://127.0.0.1:5513/?slc=get&param1=lastcaptured');
      sendJson(res, 200, { ok: true, filename: result.body.toString('utf8').trim() });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/dslr/image') {
      const file = url.searchParams.get('file') || '';
      if (!file || /[\\/]/.test(file)) {
        sendJson(res, 400, { error: 'Invalid capture filename' });
        return;
      }
      const result = await rawGet(`http://127.0.0.1:5513/image/${encodeURIComponent(file)}`);
      if (result.statusCode !== 200) {
        sendJson(res, result.statusCode, { error: 'Failed to fetch image from digiCamControl' });
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'image/jpeg');
      res.end(result.body);
      return;
    }
    sendJson(res, 404, { error: 'Route not found' });
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Kiosk edge failed' });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Photobooth kiosk edge listening at http://127.0.0.1:${port}`);
  console.log(allowedOrigins.size
    ? `Allowed hosted origins: ${[...allowedOrigins].join(', ')}`
    : 'No hosted origin is allowed yet. Set EDGE_ALLOWED_ORIGINS before using this with a remote host.');
});

server.on('error', (error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
