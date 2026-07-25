const fs = require('fs');

const css = fs.readFileSync('src/styles.css', 'utf8');
const lines = css.split('\n');

console.log("=== FONT RULES ===");
lines.forEach((line, idx) => {
    if (line.includes('@font-face') || line.includes('font-family:') || line.includes('@import url')) {
        if (idx < 500) { // check the beginning of the file
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
    }
});
