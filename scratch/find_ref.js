import fs from 'fs';
import path from 'path';

const directory = 'E:\\my-photobooth';
const query = process.argv[2] || 'MediaRecorder';
const regex = new RegExp(query, 'i');

function searchFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === '.codegraph' || file === '.tools') continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(searchFiles(fullPath));
    } else {
      if (!file.endsWith('.js') && !file.endsWith('.jsx') && !file.endsWith('.html') && !file.endsWith('.css') && !file.endsWith('.py') && !file.endsWith('.mjs') && !file.endsWith('.ps1')) continue;
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            results.push({ path: fullPath, line: i + 1, content: lines[i].trim() });
          }
        }
      } catch (err) {}
    }
  }
  return results;
}

const matches = searchFiles(directory);
console.log(`Found ${matches.length} matches for '${query}':`);
for (const m of matches.slice(0, 100)) {
  console.log(`${m.path}:${m.line}: ${m.content}`);
}
