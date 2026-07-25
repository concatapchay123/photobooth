import { readFileSync } from 'node:fs';

const content = readFileSync('D:\\my-photobooth\\src\\App.jsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('const normalizeSlotEditTransform') || line.includes('function normalizeSlotEditTransform')) {
    console.log(`Found normalizeSlotEditTransform around line ${idx + 1}`);
    for (let i = Math.max(0, idx - 5); i < Math.min(lines.length, idx + 45); i++) {
      console.log(`${i + 1}: ${lines[i]}`);
    }
  }
});
