const fs = require('fs');

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('id="guest-adjust"')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
        for (let j = idx; j < idx + 10; j++) {
            console.log(`  ${j + 1}: ${lines[j]}`);
        }
    }
});
