import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('=== UI LAYOUT VERIFICATION ORACLE ===');

// Paths to files
const adjustScreenPath = path.resolve('src/components/GuestAdjustScreen.jsx');
const resultScreenPath = path.resolve('src/components/GuestResultScreen.jsx');
const stylesCssPath = path.resolve('src/styles.css');

let errors = [];

function checkFileContains(filePath, regex, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (regex.test(content)) {
      console.log(`[PASS] ${description}`);
    } else {
      console.log(`[FAIL] ${description}`);
      errors.push(`${description} in ${filePath}`);
    }
  } catch (err) {
    console.log(`[ERROR] Failed to read ${filePath}: ${err.message}`);
    errors.push(`Read error: ${filePath}`);
  }
}

// 1. Verify slot adjustment zoom container on Screen 4 aspect ratio styles
checkFileContains(
  adjustScreenPath,
  /['"]--slot-ratio['"]:\s*zone\.width\s*\/\s*Math\.max\(\s*1,\s*zone\.height\s*\)/,
  'GuestAdjustScreen contains inline variable setting --slot-ratio based on zone dimensions'
);

checkFileContains(
  adjustScreenPath,
  /aspectRatio:\s*['"]var\(--slot-ratio\)['"]/,
  'GuestAdjustScreen contains inline aspectRatio: "var(--slot-ratio)"'
);

checkFileContains(
  stylesCssPath,
  /\.pink-adjust-zoom-preview\s*\{[^}]*aspect-ratio:\s*var\(--slot-ratio,\s*1\)\s*!important/i,
  'styles.css binds .pink-adjust-zoom-preview aspect-ratio to var(--slot-ratio, 1) !important'
);

checkFileContains(
  stylesCssPath,
  /\.pink-adjust-zoom-preview\s*\{[^}]*width:\s*min\(100%,\s*280px,\s*calc\(20vh\s*\*\s*var\(--slot-ratio,\s*1\)\)\)\s*!important/i,
  'styles.css limits .pink-adjust-zoom-preview width to fit vertical height safely'
);

// 2. Verify frame preview on Screen 4 bounds and collision avoidance
checkFileContains(
  stylesCssPath,
  /\.pink-adjust-stage\s*\{[^}]*position:\s*relative/i,
  'styles.css sets .pink-adjust-stage to position: relative to bound absolute children'
);

checkFileContains(
  stylesCssPath,
  /\.pink-adjust-frame-preview\s*\{[^}]*max-height:\s*calc\(100%\s*-\s*3\.5rem\)\s*!important/i,
  'styles.css caps .pink-adjust-frame-preview max-height to stage bounds minus head'
);

checkFileContains(
  stylesCssPath,
  /\.pink-adjust-frame-preview\s*\{[^}]*flex:\s*1\s+1\s+auto/i,
  'styles.css enables .pink-adjust-frame-preview flex shrinking'
);

checkFileContains(
  stylesCssPath,
  /\.pink-adjust-frame-preview\s*\{[^}]*min-height:\s*0/i,
  'styles.css sets .pink-adjust-frame-preview min-height: 0 to allow scaling down'
);

// 3. Verify result sheet mockup on Screen 5 viewport bounds fitting
checkFileContains(
  stylesCssPath,
  /\.pink-result-box\s*\{[^}]*min-height:\s*0/i,
  'styles.css sets .pink-result-box min-height to 0 to remove fixed constraints'
);

checkFileContains(
  stylesCssPath,
  /\.pink-result-paper-mockup\s*\{[^}]*min-height:\s*0\s*!important/i,
  'styles.css sets .pink-result-paper-mockup min-height: 0 !important'
);

checkFileContains(
  stylesCssPath,
  /\.pink-result-paper-mockup\s*\{[^}]*height:\s*100%\s*!important/i,
  'styles.css sets .pink-result-paper-mockup height: 100% !important'
);

checkFileContains(
  stylesCssPath,
  /\.pink-result-paper-mockup\s*\{[^}]*max-height:\s*100%\s*!important/i,
  'styles.css sets .pink-result-paper-mockup max-height: 100% !important'
);

checkFileContains(
  stylesCssPath,
  /\.pink-result-paper-mockup\s+\.pink-result-image\s*\{[^}]*max-height:\s*100%\s*!important/i,
  'styles.css caps .pink-result-image inside mockup to max-height: 100% !important'
);

checkFileContains(
  stylesCssPath,
  /\.pink-result-paper-mockup\s+\.pink-result-image\s*\{[^}]*object-fit:\s*contain\s*!important/i,
  'styles.css applies object-fit: contain !important to prevent distortion'
);

if (errors.length === 0) {
  console.log('\n>>> SUCCESS: All layout and aspect ratio constraints verified successfully. <<<');
  process.exit(0);
} else {
  console.log(`\n>>> FAILURE: ${errors.length} verification checks failed. <<<`);
  errors.forEach(e => console.log(`  - ${e}`));
  process.exit(1);
}
