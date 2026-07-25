const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

try {
  const cmd = `"${ffmpeg}" -i "D:\\my-photobooth\\data\\saved-sessions\\20260602_103725_03-Banh-Quy-Tim_2b5d4\\video-capture-01.mp4" -vf showinfo -f null - 2>&1`;
  const result = execSync(cmd);
  const output = result.toString();
  
  const lines = output.split('\n').filter(line => line.includes('showinfo') && line.includes('n:'));
  console.log(`Parsed ${lines.length} frames.`);
  
  // Parse checksum for each frame
  const frames = lines.map(line => {
    const nMatch = line.match(/n:\s*(\d+)/);
    const checksumMatch = line.match(/checksum:([0-9A-F]+)/i);
    const timeMatch = line.match(/pts_time:([0-9.]+)/);
    return {
      n: nMatch ? parseInt(nMatch[1], 10) : null,
      checksum: checksumMatch ? checksumMatch[1] : null,
      time: timeMatch ? parseFloat(timeMatch[1]) : null
    };
  }).filter(f => f.n !== null);

  // Find if checksum becomes constant (frozen)
  let frozenStart = null;
  let lastChecksum = null;
  let isFrozen = false;
  
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    if (f.checksum === lastChecksum) {
      if (!isFrozen) {
        frozenStart = f;
        isFrozen = true;
      }
    } else {
      isFrozen = false;
      frozenStart = null;
      lastChecksum = f.checksum;
    }
  }

  if (frozenStart) {
    console.log(`Video becomes frozen at frame ${frozenStart.n} (time: ${frozenStart.time}s) with checksum ${lastChecksum}`);
    console.log(`Remaining frames: ${frames.length - frozenStart.n}`);
  } else {
    console.log("No frozen frames detected at the end of the video!");
  }

  // Also print first few and last few checksums
  console.log("First 5 frames checksums:");
  console.log(frames.slice(0, 5).map(f => `n:${f.n} t:${f.time}s c:${f.checksum}`).join('\n'));
  console.log("Last 5 frames checksums:");
  console.log(frames.slice(-5).map(f => `n:${f.n} t:${f.time}s c:${f.checksum}`).join('\n'));

} catch (e) {
  console.log("Error:", e.message);
}
