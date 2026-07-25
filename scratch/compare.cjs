const fs = require('fs');

const file1 = fs.readFileSync('D:/my-photobooth/backup/src/App.jsx', 'utf8');
const file2 = fs.readFileSync('D:/my-photobooth/src/App.jsx', 'utf8');

function getFunctionBody(content, funcName) {
  const index = content.indexOf(funcName);
  if (index === -1) return null;
  // Let's find the closing brace by counting braces
  let braces = 0;
  let started = false;
  let pos = index;
  while (pos < content.length) {
    if (content[pos] === '{') {
      braces++;
      started = true;
    } else if (content[pos] === '}') {
      braces--;
      if (started && braces === 0) {
        return content.substring(index, pos + 1);
      }
    }
    pos++;
  }
  return null;
}

const body1 = getFunctionBody(file1, 'const renderGuestFrameDraftVideoComposition =');
const body2 = getFunctionBody(file2, 'const renderGuestFrameDraftVideoComposition =');

fs.writeFileSync('D:/my-photobooth/scratch/body1.txt', body1 || 'not found');
fs.writeFileSync('D:/my-photobooth/scratch/body2.txt', body2 || 'not found');

console.log('body1 length:', body1 ? body1.length : 0);
console.log('body2 length:', body2 ? body2.length : 0);
