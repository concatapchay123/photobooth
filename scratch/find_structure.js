const fs = require('fs');

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

console.log("=== IMPORTS ===");
lines.slice(0, 40).forEach((line, index) => {
    if (line.includes('import')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});

console.log("\n=== STATE VARIABLES ===");
lines.forEach((line, index) => {
    if (line.includes('useState') && !line.trim().startsWith('//')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});

console.log("\n=== SCREEN / STEP SWITCH CASE / IF STATEMENTS ===");
lines.forEach((line, index) => {
    if ((line.includes('case') || line.includes('step ===') || line.includes('currentStep')) && (line.includes('frame') || line.includes('select') || line.includes('layout') || line.includes('print') || line.includes('download') || line.includes('photo') || line.includes('camera') || line.includes('start'))) {
        if (line.trim().length < 80) {
            console.log(`${index + 1}: ${line.trim()}`);
        }
    }
});

console.log("\n=== OTHER INTERESTING CONSTS / VARS ===");
lines.forEach((line, index) => {
    if (line.includes('const ') && (line.includes('STEPS') || line.includes('screens') || line.includes('steps'))) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});

console.log("\n=== SIZE INFO ===");
console.log(`Total Lines: ${lines.length}`);
console.log(`Total Characters: ${content.length}`);
