const fs = require('fs');

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

console.log("=== SEARCHING FOR REF DECLARATIONS ===");
lines.forEach((line, idx) => {
    if (line.includes('useRef') && idx > 2000 && idx < 2250) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
