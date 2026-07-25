const fs = require('fs');

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

// Find occurrences of guestStep === '...'
const steps = ['hero', 'capture', 'frame', 'select', 'adjust', 'result'];
steps.forEach(step => {
    console.log(`\n=== SEARCHING FOR STEP: ${step} ===`);
    lines.forEach((line, idx) => {
        if (line.includes(`'${step}'`) && (line.includes('guestStep ===') || line.includes('visibleGuestStep ===') || line.includes('case'))) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
    });
});

console.log("\n=== RENDER FUNCTION START ===");
// Search for return of main App component (where we return JSX)
// Let's look for things like "return (" or similar around the end of the file.
// Or search for the main return statement of App.
let renderLines = [];
let braceCount = 0;
let foundReturn = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('return (') && i > 5000) {
        console.log(`Possible main return statement start at line ${i + 1}: ${line.trim()}`);
    }
}
