const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

try {
  const cmd = `"${ffmpeg}" -i "D:\\my-photobooth\\data\\saved-sessions\\20260602_103725_03-Banh-Quy-Tim_2b5d4\\video-capture-01.mp4" -vf showinfo -f null - 2>&1`;
  const result = execSync(cmd);
  const output = result.toString();
  
  // Let's parse showinfo lines: e.g. "n:   0 pts:      0 ..."
  const lines = output.split('\n').filter(line => line.includes('showinfo'));
  console.log(`Total showinfo lines: ${lines.length}`);
  console.log("First 10 frames:");
  console.log(lines.slice(0, 10).join('\n'));
  console.log("Last 10 frames:");
  console.log(lines.slice(-10).join('\n'));
} catch (e) {
  console.log("Error:", e.message);
}
