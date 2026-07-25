const fs = require('fs');

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

console.log("=== STEPPER CLASS SEARCH ===");
lines.forEach((line, idx) => {
    if (line.includes('header') || line.includes('stepper') || line.includes('step-node') || line.includes('step-item')) {
        if (line.includes('className') || line.includes('div') || line.includes('nav')) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
    }
});
