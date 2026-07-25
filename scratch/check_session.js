import { execSync } from 'child_process';
import ffmpeg from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';

const sessionDir = 'E:\\my-photobooth\\data\\saved-sessions\\20260606_095138_03-Banh-Quy-Tim_55214';

console.log('FFmpeg binary path:', ffmpeg);

if (!fs.existsSync(sessionDir)) {
  console.error('Session directory not found!');
  process.exit(1);
}

const files = fs.readdirSync(sessionDir);
console.log('Files in session directory:', files);

for (const file of files) {
  if (file.endsWith('.webm') || file.endsWith('.mp4')) {
    const filePath = path.join(sessionDir, file);
    const stats = fs.statSync(filePath);
    console.log(`\n--- Inspecting ${file} (${stats.size} bytes) ---`);
    try {
      const output = execSync(`"${ffmpeg}" -i "${filePath}"`, { stdio: 'pipe' });
      console.log(output.toString());
    } catch (e) {
      // FFmpeg prints info to stderr, so it will throw an error even on successful execution without other command options.
      const stderr = e.stderr ? e.stderr.toString() : '';
      console.log(stderr || e.message);
    }
  }
}
