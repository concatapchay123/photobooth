import { readFileSync } from 'node:fs';

const content = readFileSync('D:\\my-photobooth\\src\\App.jsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('GUEST_CAPTURE_INTERVAL_SECONDS')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
