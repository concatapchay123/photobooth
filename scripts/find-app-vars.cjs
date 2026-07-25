const fs = require('fs');

const code = fs.readFileSync('src/App.jsx', 'utf8');

// Find export default function App() { ... }
const appStartIndex = code.indexOf('export default function App()');
if (appStartIndex === -1) {
    console.error("App function not found");
    process.exit(1);
}

// Very simple regex to find top-level variables inside App
const lines = code.slice(appStartIndex).split('\n');
const variables = new Set();

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Stop if we reach the return statement
    if (line.trim().startsWith('if (isDashboardMode) {') || line.trim().startsWith('if (!isPartnerMode) {')) {
        break;
    }

    // Match const [a, b] = useState
    let match = line.match(/const\s+\[\s*([a-zA-Z0-9_$]+)\s*,\s*([a-zA-Z0-9_$]+)\s*\]\s*=/);
    if (match) {
        variables.add(match[1]);
        variables.add(match[2]);
        continue;
    }

    // Match const a = useMemo
    match = line.match(/const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:useMemo|useCallback|useRef|useState)/);
    if (match) {
        variables.add(match[1]);
        continue;
    }
    
    // Match const a = () =>
    match = line.match(/const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/);
    if (match) {
        variables.add(match[1]);
        continue;
    }
    
    // Match function a(...)
    match = line.match(/function\s+([a-zA-Z0-9_$]+)\s*\(/);
    if (match) {
        variables.add(match[1]);
        continue;
    }
    
    // Match simple const a = ...
    match = line.match(/const\s+([a-zA-Z0-9_$]+)\s*=[^=]/);
    if (match && !line.includes('require(')) {
        variables.add(match[1]);
    }
}

const varsArray = Array.from(variables);
console.log(`Found ${varsArray.length} variables.`);
fs.writeFileSync('scripts/app-vars.txt', 'const guestAppProps = {\n  ' + varsArray.join(',\n  ') + '\n};\n');
