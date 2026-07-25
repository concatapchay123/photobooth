const fs = require('fs');

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

const startLine = 9750;
const endLine = 9850;

console.log(`=== PRINTING APP.JSX LINES ${startLine} to ${endLine} ===`);
for (let i = startLine - 1; i < endLine; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
}
