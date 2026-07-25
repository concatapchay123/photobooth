const fs = require('fs');

const content = fs.readFileSync('src/App.jsx', 'utf8');
const regex = /className="([^"]+)"|className={([^}]+)}/g;

const classes = new Set();
let match;
while ((match = regex.exec(content)) !== null) {
    const classStr = match[1] || match[2] || '';
    classStr.split(/\s+/).forEach(cls => {
        if (cls.includes('pink-')) {
            classes.add(cls.replace(/[^a-zA-Z0-9-]/g, '')); // clean up variable/template interpolation characters
        }
    });
}

console.log("=== PINK CLASSES USED IN APP.JSX ===");
console.log(Array.from(classes).sort().join('\n'));
