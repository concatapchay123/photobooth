const fs = require('fs');

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

console.log("=== SEARCHING FOR HEADER ===");
lines.forEach((line, idx) => {
    if (line.includes('pink-guest-header') || line.includes('pink-header-stepper')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
        
        // Print 30 lines before and after
        const start = Math.max(0, idx - 10);
        const end = Math.min(lines.length - 1, idx + 40);
        console.log("--- CONTEXT ---");
        for (let j = start; j <= end; j++) {
            console.log(`${j + 1}: ${lines[j]}`);
        }
        console.log("----------------");
    }
});
