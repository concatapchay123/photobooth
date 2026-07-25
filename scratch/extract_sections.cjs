const fs = require('fs');

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

// Find all lines containing "<section" or "</section" or "className="pink-step""
console.log("=== SECTION TAGS IN APP.JSX ===");
lines.forEach((line, idx) => {
    if (idx >= 8200 && idx <= 10100) {
        if (line.includes('<section') || line.includes('className="pink-step') || line.includes('className={pink-step') || line.includes('id="guest-')) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
    }
});
