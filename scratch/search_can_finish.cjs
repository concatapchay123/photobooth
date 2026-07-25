const fs = require('fs');

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

console.log("=== SEARCHING FOR canFinishCaptureEarly ===");
lines.forEach((line, idx) => {
    if (line.includes('canFinishCaptureEarly')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
