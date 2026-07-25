const fs = require('fs');

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

console.log("=== SEARCHING LINES 7984 to 8720 ===");
for (let i = 7983; i < 8720; i++) {
    const line = lines[i];
    if (line.includes('logo') || line.includes('brand') || line.includes('header') || line.includes('stepper') || line.includes('Back') || line.includes('Exit')) {
        console.log(`Line ${i + 1}: ${line.trim()}`);
    }
}
