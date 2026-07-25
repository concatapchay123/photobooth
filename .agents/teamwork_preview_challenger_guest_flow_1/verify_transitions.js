import fs from 'fs';
import path from 'path';

// Paths
const ANIMATION_HOOK_PATH = 'src/useGuestAnimations.js';
const STYLE_CSS_PATH = 'src/styles.css';
const THEME_GSAP_CSS_PATH = 'src/theme-gsap.css';
const COMPONENTS_DIR = 'src/components';
const APP_JSX_PATH = 'src/App.jsx';

console.log('=== Photobooth Transition Verification Script ===\n');

// 1. Parse GSAP targets from useGuestAnimations.js
console.log('1. Analyzing useGuestAnimations.js...');
const animHookCode = fs.readFileSync(ANIMATION_HOOK_PATH, 'utf8');

// Regex to find gsap selectors (e.g. '.pink-card', etc.)
const gsapSelectorRegex = /(?:gsap\.fromTo|gsap\.set|gsap\.to)\(\s*['"`]([^'"`]+)['"`]/g;
const targetedSelectors = new Set();
let match;
while ((match = gsapSelectorRegex.exec(animHookCode)) !== null) {
  // Selectors might be comma-separated like '.pink-card, .pink-hero-stage'
  const subSelectors = match[1].split(',').map(s => s.trim());
  subSelectors.forEach(s => targetedSelectors.add(s));
}

console.log(`Found targeted selectors in GSAP calls:`, Array.from(targetedSelectors));

// 2. Scan all JSX files for class names matching the selectors
console.log('\n2. Scanning JSX/JSX files for corresponding class names...');
const components = fs.readdirSync(COMPONENTS_DIR)
  .filter(f => f.endsWith('.jsx'))
  .map(f => path.join(COMPONENTS_DIR, f));
components.push(APP_JSX_PATH);

const foundClasses = new Set();
// Search for classNames or classes in files
components.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  // Simple regex to match class or className content
  const classMatches = content.match(/(?:className|class)\s*=\s*[{`"']([^`"'}]+)[`"']/g) || [];
  classMatches.forEach(m => {
    // Extract actual class names
    const names = m.replace(/(?:className|class)\s*=\s*[{`"']/, '').replace(/[`"']/, '').split(/\s+/);
    names.forEach(n => {
      if (n && !n.includes('{') && !n.includes('}')) {
        foundClasses.add(`.${n.trim()}`);
      }
    });
  });
  
  // Also look for hardcoded strings in template literals or conditional classes
  const rawWordMatches = content.match(/['"`]pink-[a-zA-Z0-9_-]+['"`]/g) || [];
  rawWordMatches.forEach(m => {
    const className = m.replace(/['"`]/g, '');
    foundClasses.add(`.${className}`);
  });
});

console.log(`\nVerification of GSAP Target Existence:`);
let targetsMissing = false;
targetedSelectors.forEach(selector => {
  const isFound = foundClasses.has(selector);
  console.log(`- ${selector}: ${isFound ? '✅ FOUND' : '❌ NOT FOUND in JSX markup!'}`);
  if (!isFound) {
    targetsMissing = true;
  }
});

// 3. Scan styles.css and theme-gsap.css for transition rules and .gsap-animating overrides
console.log('\n3. Analyzing CSS transition conflicts...');
const stylesContent = fs.readFileSync(STYLE_CSS_PATH, 'utf8');
const themeGsapContent = fs.readFileSync(THEME_GSAP_CSS_PATH, 'utf8');
const combinedCss = stylesContent + '\n' + themeGsapContent;

// We also want to check the actual classes that represent these elements in markup
const actualClasses = ['.pink-camera', '.pink-frame-choice'];
const selectorsToCheck = new Set([...targetedSelectors, ...actualClasses]);

// Extract all rules that define transitions for our selectors
selectorsToCheck.forEach(selector => {
  console.log(`\nAnalyzing selector: ${selector}`);
  
  // Find if selector has normal transition
  const escSelector = selector.replace('.', '\\.');
  const normalTransitionRegex = new RegExp(`${escSelector}[^{}]*\\{[^{}]*transition:[^;}]+`, 'gi');
  const hasNormalTransition = normalTransitionRegex.test(combinedCss);
  
  // Find if it has a .gsap-animating transition none override
  const overrideRegex = new RegExp(`\\.gsap-animating[^^{}]*${escSelector}[^{}]*\\{[^{}]*transition:\\s*none\\s*!important`, 'gi');
  const hasOverride = overrideRegex.test(combinedCss);
  
  if (hasNormalTransition) {
    console.log(`  - Has active CSS transition: Yes`);
    console.log(`  - Has .gsap-animating transition override: ${hasOverride ? '✅ Yes' : '❌ No (TRANSITION CONFLICT RISK)'}`);
  } else {
    console.log(`  - Has active CSS transition: No (safe from conflicts)`);
  }
});

// 4. Verify Mascot scale inline style conflict
console.log('\n4. Verifying inline style transform conflicts...');
const appContent = fs.readFileSync(APP_JSX_PATH, 'utf8');
const mascotInlineStyleRegex = /className="mascot-container"\s+style=\{\{\s*margin:\s*'0\s+auto',\s*transform:\s*'scale\(1\.15\)'\s*\}\}/;
const hasMascotInlineConflict = mascotInlineStyleRegex.test(appContent);
console.log(`Mascot inline style transform conflict check: ${hasMascotInlineConflict ? '❌ CONFLICT FOUND' : '✅ Clean'}`);
if (hasMascotInlineConflict) {
  console.log(`  Reason: 'mascot-container' has a React inline transform style of scale(1.15).`);
  console.log(`  GSAP has clearProps: 'transform' on mascot-container, which deletes the inline transform.`);
  console.log(`  Upon animation completion, the inline transform is removed, forcing a visual jump back to scale 1.0.`);
}

console.log('\n=== Analysis Completed ===');
if (targetsMissing || hasMascotInlineConflict) {
  process.exit(1);
} else {
  process.exit(0);
}
