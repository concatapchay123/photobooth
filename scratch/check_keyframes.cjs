const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

try {
  const cmd = `"${ffmpeg}" -i "D:\\my-photobooth\\data\\saved-sessions\\20260602_103725_03-Banh-Quy-Tim_2b5d4\\video-capture-01.mp4" -vf showinfo -f null - 2>&1`;
  const result = execSync(cmd);
  const output = result.toString();
  
  const lines = output.split('\n').filter(line => line.includes('showinfo') && line.includes('n:'));
  const keyframes = lines.map(line => {
    const nMatch = line.match(/n:\s*(\d+)/);
    const timeMatch = line.match(/pts_time:([0-9.]+)/);
    const isKey = line.includes('iskey:1');
    const typeMatch = line.match(/type:([I-Z])/);
    return {
      n: nMatch ? parseInt(nMatch[1], 10) : null,
      time: timeMatch ? parseFloat(timeMatch[1]) : null,
      isKey,
      type: typeMatch ? typeMatch[1] : null
    };
  }).filter(f => f.isKey);

  console.log(`Total keyframes found: ${keyframes.length}`);
  console.log("Keyframes details:");
  console.log(keyframes.map(k => `Frame n:${k.n} at time:${k.time}s type:${k.type}`).join('\n'));

} catch (e) {
  console.log("Error:", e.message);
}
