const fs = require('fs');
const file = process.argv[2];
const startLine = parseInt(process.argv[3]) - 1;
const endLine = parseInt(process.argv[4]);
const replacementFile = process.argv[5];
const replacement = replacementFile ? fs.readFileSync(replacementFile, 'utf8') : '';

const lines = fs.readFileSync(file, 'utf8').split('\n');
lines.splice(startLine, endLine - startLine, replacement);
fs.writeFileSync(file, lines.join('\n'));
console.log(`Replaced lines ${startLine + 1} to ${endLine} in ${file}.`);
