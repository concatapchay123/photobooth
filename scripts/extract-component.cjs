const fs = require('fs');
const path = require('path');

// Simple script to extract a section of App.jsx into a new component
function extractComponent(sourcePath, destPath, componentName, startLine, endLine) {
    const lines = fs.readFileSync(sourcePath, 'utf8').split('\n');
    const jsxLines = lines.slice(startLine - 1, endLine);
    
    // Find all potential variables used in JSX
    const jsxCode = jsxLines.join('\n');
    const variableRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
    const allWords = new Set();
    let match;
    while ((match = variableRegex.exec(jsxCode)) !== null) {
        allWords.add(match[1]);
    }

    // Common HTML/React/JS keywords to ignore
    const ignoreList = new Set(['className', 'div', 'button', 'span', 'img', 'p', 'h1', 'h2', 'h3', 'h4', 'section', 'onClick', 'onPointerEnter', 'onPointerLeave', 'onFocus', 'onBlur', 'onKeyDown', 'type', 'src', 'alt', 'style', 'id', 'hidden', 'title', 'aria-label', 'tabIndex', 'disabled', 'true', 'false', 'null', 'undefined', 'Array', 'String', 'Math', 'console', 'window', 'document', 'event', 'Object', 'Map', 'Set', 'key', 'map', 'filter', 'reduce', 'length', 'includes', 'typeof', 'return', 'if', 'else', 'const', 'let', 'var', 'React', 'ref', 'd', 'fill', 'viewBox', 'xmlns', 'cx', 'cy', 'r', 'stroke', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin', 'width', 'height', 'data', 'from', 'to', 'step', 'value', 'onChange', 'max', 'min']);

    const usedVariables = Array.from(allWords).filter(w => !ignoreList.has(w) && !/^[A-Z0-9_]+$/.test(w) && !/^[0-9]/.test(w));
    
    const propsDestructuring = `  const {\n    ${usedVariables.join(',\n    ')}\n  } = props;\n`;
    
    const componentCode = `import React from 'react';\nimport { Camera, Sparkles, Heart } from 'lucide-react';\n\nexport default function ${componentName}(props) {\n${propsDestructuring}\n  return (\n${jsxLines.join('\n')}\n  );\n}\n`;
    
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, componentCode);
    console.log(`Created ${destPath} with ${usedVariables.length} potential props.`);
    return usedVariables;
}

const args = process.argv.slice(2);
if (args.length === 5) {
    extractComponent(args[0], args[1], args[2], parseInt(args[3]), parseInt(args[4]));
} else {
    console.log("Usage: node extract-component.js <source> <dest> <name> <startLine> <endLine>");
}
