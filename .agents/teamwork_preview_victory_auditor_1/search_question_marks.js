import fs from 'fs';

const content = fs.readFileSync('src/App.jsx', 'utf8');

const occurrences = [];
let index = content.indexOf('??');
while (index !== -1) {
  // Get line number and context
  const linesBefore = content.substring(0, index).split('\n');
  const lineNum = linesBefore.length;
  const lineContent = content.split('\n')[lineNum - 1];
  occurrences.push({ index, lineNum, lineContent });
  index = content.indexOf('??', index + 2);
}

console.log(`Found ${occurrences.length} occurrences of '??':`);
occurrences.forEach(o => {
  console.log(`Line ${o.lineNum}: ${o.lineContent.trim()}`);
});
