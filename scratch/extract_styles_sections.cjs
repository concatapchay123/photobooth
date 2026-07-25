const fs = require('fs');

const css = fs.readFileSync('src/styles.css', 'utf8');
const lines = css.split('\n');

const keywords = ['.pink-pop-app', '.pink-step', '.pink-btn', '.pink-hero', '.pink-adjust-panel'];
console.log("=== KEY CSS RULES ===");

let printBuffer = [];
let insideBlock = false;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimLine = line.trim();
    
    if (!insideBlock) {
        // Check if line matches any keyword
        const matchesKeyword = keywords.some(kw => line.includes(kw));
        if (matchesKeyword && line.includes('{')) {
            insideBlock = true;
            braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
            printBuffer.push(`Line ${i + 1}: ${line}`);
        }
    } else {
        braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        printBuffer.push(line);
        if (braceCount <= 0) {
            insideBlock = false;
            // Print buffer if it's not too long
            if (printBuffer.length < 50) {
                console.log(printBuffer.join('\n'));
                console.log("------------------------");
            } else {
                console.log(printBuffer.slice(0, 10).join('\n'));
                console.log(`... [truncated ${printBuffer.length - 20} lines] ...`);
                console.log(printBuffer.slice(-10).join('\n'));
                console.log("------------------------");
            }
            printBuffer = [];
        }
    }
}
