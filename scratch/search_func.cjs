const fs = require('fs');

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

const funcName = 'startGuestJourney';
console.log(`=== SEARCHING FOR FUNCTION: ${funcName} ===`);

let printBuffer = [];
let insideBlock = false;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!insideBlock) {
        if (line.includes(`const ${funcName}`) || line.includes(`function ${funcName}`)) {
            insideBlock = true;
            braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
            printBuffer.push(`Line ${i + 1}: ${line}`);
        }
    } else {
        braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        printBuffer.push(line);
        if (braceCount <= 0) {
            insideBlock = false;
            console.log(printBuffer.join('\n'));
            console.log("------------------------");
            printBuffer = [];
        }
    }
}
