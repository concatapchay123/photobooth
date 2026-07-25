import { readFileSync } from 'node:fs';

const content = readFileSync('D:\\my-photobooth\\src\\App.jsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('5000') || line.includes('seconds === 5') || line.includes('secondsLeft === 5')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
