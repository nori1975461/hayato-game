// make-click-viewer.mjs で作ったページを、ヘッドレス Chrome で実際に開いて確かめる（写真が全部同じ大きさで読み込めたか・クリックで最後まで巡回するか）。
//   node check-click-viewer.mjs <ページのあるフォルダ> [Chrome のプロファイル用フォルダ]   → CHECK sizes=… clicks=1-2-…-1-2
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dir = process.argv[2], prof = process.argv[3] || path.join(os.tmpdir(), 'gaika-click-viewer-prof');
const html = fs.readdirSync(dir).find((f) => f.endsWith('.html')); if (!html) throw new Error('NO_HTML_IN ' + dir);
const url = pathToFileURL(path.join(dir, html)).href + '?check=1';
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p)); if (!chrome) throw new Error('CHROME_NOT_FOUND');
const out = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--user-data-dir=' + prof, '--virtual-time-budget=8000', '--dump-dom', url], { encoding: 'utf8', maxBuffer: 1 << 26 });
const m = out.match(/id="check"[^>]*>([\s\S]*?)<\//); console.log(m ? m[1].trim().slice(0, 1200) : 'NO_CHECK_NODE ' + out.length);
