// 同じ枠で撮った写真を、ブラウザでクリックするたびに次へ切り替えて見るページを作る（写真は重ねて置くので位置がずれない）。
// node make-click-viewer.mjs <写真のあるフォルダ> <ページの題> "写真のファイル名|名前|注記" ...
//   フォルダに「０_ここをダブルクリック（写真をクリックすると次へ）.html」を書き出す。外部の読み込みは無い。?check=1 を付けて開くと、読み込みとクリックの巡回を DOM に書き出す（ヘッドレスの --dump-dom で確かめる用）
import fs from 'node:fs';
import path from 'node:path';
const [dir, heading, ...specs] = process.argv.slice(2);
const list = specs.map((s) => { const [file, name, note = ''] = s.split('|'); return { file, name, note }; });
for (const it of list) if (!fs.existsSync(path.join(dir, it.file))) throw new Error('NO_FILE ' + it.file);
const head = fs.readFileSync(path.join(dir, list[0].file)), W = head.readUInt32BE(16), H = head.readUInt32BE(20);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const json = JSON.stringify(list).replace(/</g, '\\u003c');
const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>${esc(heading)}</title>
<style>
  html, body { margin: 0; height: 100%; background: #0a0a1e; color: #e6e8f5; font-family: "Yu Gothic UI", "Meiryo", sans-serif; }
  body { display: flex; flex-direction: column; align-items: center; user-select: none; }
  #title { margin: 10px 0 6px; font-size: 22px; font-weight: bold; text-align: center; }
  #title small { display: block; font-size: 13px; font-weight: normal; color: #a0a4c0; margin-top: 2px; min-height: 17px; }
  #stage { position: relative; height: min(${H}px, calc(100vh - 160px)); aspect-ratio: ${W} / ${H}; cursor: pointer; }
  #stage img { position: absolute; inset: 0; width: 100%; height: 100%; visibility: hidden; -webkit-user-drag: none; }
  #stage img.on { visibility: visible; }
  #tabs { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin: 8px 8px 4px; }
  button { font: inherit; font-size: 14px; color: #e6e8f5; background: #1c1e38; border: 1px solid #3c3e5a; border-radius: 6px; padding: 6px 12px; cursor: pointer; }
  button.on { background: #7a1626; border-color: #ff7a6a; }
  #hint { font-size: 13px; color: #8286a0; margin-bottom: 8px; text-align: center; }
</style>
</head>
<body>
<div id="title"></div>
<div id="stage" title="クリックで次へ"></div>
<div id="tabs"></div>
<div id="hint">写真をクリック（または → キー）で次へ　／　← キーか右クリックで前へ　／　下のボタンか数字キーでその写真へ直接</div>
<pre id="check" hidden></pre>
<script>
  var LIST = ${json};
  var stage = document.getElementById('stage'), tabs = document.getElementById('tabs'), title = document.getElementById('title'), cur = 0;
  var imgs = LIST.map(function (it) { var im = new Image(); im.src = encodeURIComponent(it.file); im.alt = it.name; im.draggable = false; stage.appendChild(im); return im; });
  var btns = LIST.map(function (it, i) { var b = document.createElement('button'); b.textContent = (i + 1) + '　' + it.name; b.addEventListener('click', function () { show(i); }); tabs.appendChild(b); return b; });
  function show(i) {
    cur = (i + LIST.length) % LIST.length;
    imgs.forEach(function (im, k) { im.className = k === cur ? 'on' : ''; });
    btns.forEach(function (b, k) { b.className = k === cur ? 'on' : ''; });
    title.textContent = (cur + 1) + ' ／ ' + LIST.length + '　' + LIST[cur].name;
    var s = document.createElement('small'); s.textContent = LIST[cur].note; title.appendChild(s);
  }
  stage.addEventListener('click', function () { show(cur + 1); });
  stage.addEventListener('contextmenu', function (e) { e.preventDefault(); show(cur - 1); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); show(cur + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1); }
    else if (e.key >= '1' && e.key <= String(Math.min(9, LIST.length))) show(Number(e.key) - 1);
  });
  show(0);
  if (location.search.indexOf('check=1') >= 0) window.addEventListener('load', function () {
    var seq = [cur + 1]; for (var n = 0; n < LIST.length + 1; n++) { stage.click(); seq.push(cur + 1); }
    var pre = document.getElementById('check'); pre.hidden = false;
    pre.textContent = 'CHECK sizes=' + imgs.map(function (im) { return im.naturalWidth + 'x' + im.naturalHeight; }).join(',') + ' clicks=' + seq.join('-');
  });
</script>
</body>
</html>
`;
const out = path.join(dir, '０_ここをダブルクリック（写真をクリックすると次へ）.html');
fs.writeFileSync(out, html);
console.log('VIEWER_OK', list.length, W + 'x' + H);
