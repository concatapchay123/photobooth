const fs = require('fs');
const path = require('path');

const srcDir = 'src';
const searchStr = 'pink-guest-header';

function searchDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            searchDir(filePath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes(searchStr)) {
                console.log(`Found "${searchStr}" in file: ${filePath}`);
                // Print matching lines
                const lines = content.split('\n');
                lines.forEach((line, idx) => {
                    if (line.includes(searchStr)) {
                        console.log(`  Line ${idx + 1}: ${line.trim()}`);
                    }
                });
            }
        }
    });
}

searchDir(srcDir);
