// 撮影済みPNGから主人公周辺を切り出して4倍に拡大する（等倍だと細部が読めないため）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(HERE, 'r43-claw.png');
const out = path.join(HERE, 'r43-claw-zoom.png');
// Chrome の canvas で拡大する（依存を足さない）
const html = `<canvas id=c></canvas><script>
const img = new Image();
img.onload = () => {
  const S = 4, W = 180, H = 150;
  const cx = Math.round(img.width * 0.5), cy = Math.round(img.height * 0.42);
  const c = document.getElementById('c'); c.width = W*S; c.height = H*S;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(img, cx-W/2, cy-H/2-20, W, H, 0, 0, W*S, H*S);
  document.title = c.toDataURL('image/png');
};
img.src = 'data:image/png;base64,${fs.readFileSync(src).toString('base64')}';
</script>`;
const tmp = path.join(HERE, '_zoom.html');
fs.writeFileSync(tmp, html);
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const p = spawn(CHROME, ['--headless=new', '--disable-gpu', '--dump-dom', '--virtual-time-budget=3000',
  `--user-data-dir=${path.join(HERE, '.chrome-prof-zoom2')}`, tmp], { stdio: ['ignore', 'pipe', 'ignore'] });
let buf = '';
p.stdout.on('data', (d) => { buf += d; });
p.on('close', () => {
  const m = buf.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
  if (!m) { console.log('NG: 画像を取り出せなかった'); process.exit(1); }
  fs.writeFileSync(out, Buffer.from(m[1], 'base64'));
  fs.unlinkSync(tmp);
  console.log('zoom ->', out);
});
