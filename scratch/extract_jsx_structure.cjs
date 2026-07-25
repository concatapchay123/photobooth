const fs = require('fs');

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

// Find all lines containing "visibleGuestStep" or "guestStep" within the JSX block
console.log("=== GUEST STEPS JSX USAGE ===");
lines.forEach((line, idx) => {
    if (idx >= 7600 && idx <= 10800) {
        if (line.includes('visibleGuestStep') || line.includes('guestStep') || line.includes('boothMode')) {
            if (line.includes('===') || line.includes('!==') || line.includes('{') || line.includes('?')) {
                console.log(`Line ${idx + 1}: ${line.trim()}`);
            }
        }
    }
});
