const fs = require('fs');

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

console.log("=== SEARCHING FOR ALL REFS ===");
lines.forEach((line, idx) => {
    if (line.includes('useRef(') && !line.trim().startsWith('//')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
