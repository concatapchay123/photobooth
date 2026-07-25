const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

try {
  const result = execSync(`"${ffmpeg}" -i "D:\\my-photobooth\\data\\saved-sessions\\20260602_103725_03-Banh-Quy-Tim_2b5d4\\video-frame-01.mp4"`, { stdio: 'pipe' });
  console.log(result.toString());
} catch (e) {
  console.log("Error or Output (FFmpeg outputs info on stderr):");
  console.log(e.stderr ? e.stderr.toString() : e.message);
}
