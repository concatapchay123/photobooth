import { readFileSync } from 'node:fs';

const content = readFileSync('D:\\my-photobooth\\src\\App.jsx', 'utf8');
const lines = content.split('\n');

const keywords = ['setSlotEdits', 'videoBlob:'];

keywords.forEach((keyword) => {
  console.log(`=== Matches for "${keyword}" ===`);
  lines.forEach((line, idx) => {
    if (line.includes(keyword)) {
      console.log(`${idx + 1}: ${line.trim().slice(0, 120)}`);
    }
  });
});
