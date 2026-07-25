const fs = require('fs');

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

console.log("=== SEARCHING FOR HEADLINES ===");
lines.forEach((line, idx) => {
    if (line.includes('pink-step-headline')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
        
        // Print 5 lines around
        for (let j = Math.max(0, idx - 2); j <= Math.min(lines.length - 1, idx + 5); j++) {
            console.log(`  ${j + 1}: ${lines[j]}`);
        }
        console.log("---");
    }
});
