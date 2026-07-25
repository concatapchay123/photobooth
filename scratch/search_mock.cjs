const fs = require('fs');

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

console.log("=== SEARCHING FOR MOCK/DEBUG/TEST IN APP.JSX ===");
lines.forEach((line, idx) => {
    if (line.includes('mock') || line.includes('debug') || line.includes('test') || line.includes('test_')) {
        if (!line.trim().startsWith('//') && line.length < 120) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
    }
});
