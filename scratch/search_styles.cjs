const fs = require('fs');

const css = fs.readFileSync('src/styles.css', 'utf8');
const lines = css.split('\n');

const pinkClasses = new Set();
const classRegex = /\.pink-[\w-]+/g;

lines.forEach(line => {
    let match;
    while ((match = classRegex.exec(line)) !== null) {
        pinkClasses.add(match[0]);
    }
});

console.log("=== PINK CLASSES FOUND ===");
console.log(Array.from(pinkClasses).sort().join('\n'));

console.log("\n=== SIZE INFO ===");
console.log(`Total CSS Lines: ${lines.length}`);
console.log(`Total CSS Characters: ${css.length}`);
