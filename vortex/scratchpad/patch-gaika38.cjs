// 第38稿のパッチ（一度だけ当てる）。node patch-gaika38.cjs
//   FB「ノズルの長さを縦の長さ比で15％伸ばして。いまのただの筒状から武骨なイメージをもつビジュアルに」
//   長さ＝内 96→110（口 106→120）・外 68→78（口 92→102）。噴射を収めるためテクスチャの高さ 150→160（bbox の縦 327→337）
//   形＝新しい style 'brute'（既定の taper と tube は触らない＝第一案の SKIRT と旧稿は不変）
//     上＝機関部の箱（太い帯二本＋鋲）／中＝釣鐘（縦の補強リブ四本＋帯一本）／下＝可変ノズルの羽根六枚（隙間から噴射の蒼が漏れる）。
//     羽根の付け根に一番太い作動環（鋲・上縁に金一筋）。口縁の金はやめ、焼けた黒鉄にする
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const once = (from, to) => {
  const i = src.indexOf(from);
  if (i < 0) throw new Error('NOT FOUND: ' + from.slice(0, 60));
  if (src.indexOf(from, i + 1) >= 0) throw new Error('NOT UNIQUE: ' + from.slice(0, 60));
  src = src.slice(0, i) + to + src.slice(i + from.length);
};

once("    if (style === 'tube') {   // 第24稿", `    if (style === 'brute') {
      // 第38稿：武骨なノズル（機関部の箱・釣鐘の縦リブ・可変ノズルの羽根・鋲を打った太い帯）
      const L = y1 - y0, BANDS = [[0.06, 4, 1.4, false], [0.2, 4, 1.4, false], [0.5, 3.5, 1.2, false], [0.71, 5.5, 2.1, true]];
      for (let y = y0; y <= y1; y += 0.5) {
        const t = (y - y0) / L, tt = (t - 0.74) / 0.26;
        const base = t < 0.3 ? w0 + 0.8 : t < 0.74 ? w0 + 0.8 + (w1 - w0 - 0.8) * Math.pow((t - 0.3) / 0.44, 0.8) : w1 * (1 - 0.1 * Math.pow(tt, 1.5));
        const bd = BANDS.find(([bt, bh]) => y >= y0 + bt * L && y < y0 + bt * L + bh), by = bd ? y - (y0 + bd[0] * L) : 0;
        const half = base + (bd ? bd[2] : 0);
        for (let x = -half; x <= half; x += 0.5) {
          const v = x / half;
          let c;
          if (bd) {
            if (bd[3] && by < 1) c = v < 0 ? 'Y' : 'y';
            else if (by >= bd[1] - 1 || Math.abs(v) > 0.93) c = 'k';
            else if (Math.abs(by - bd[1] / 2) < 0.75 && Math.abs(Math.round(x)) % 4 === 0 && Math.abs(x - Math.round(x)) < 0.45) c = 's';
            else c = v < -0.5 ? 'f' : v < 0.15 ? 'm' : 'j';
          } else if (t >= 0.74) {
            const fr = ((v + 1) * 3) % 1, slit = (fr < 0.09 || fr > 0.91) && Math.abs(v) < 0.95;
            if (y > y1 - 1.5) c = Math.abs(v) < 0.6 ? 'j' : 'k';
            else if (Math.abs(v) > 0.95) c = 'k';
            else if (slit) c = tt > 0.7 ? jet[2] : tt > 0.35 ? jet[3] : 'k';
            else c = fr < 0.3 ? (v < 0.2 ? 'f' : 'm') : v < -0.3 ? 'm' : v < 0.5 ? 'j' : 'k';
          } else if (t >= 0.3) {
            const fr = ((v + 1) * 2.5) % 1;
            if (Math.abs(v) > 0.94) c = 'k';
            else if ((fr < 0.1 || fr > 0.9) && Math.abs(v) < 0.9) c = 'k';
            else if (fr < 0.24 && Math.abs(v) < 0.9) c = v < 0.3 ? 'f' : 'm';
            else c = v < -0.7 ? 'm' : v < -0.4 ? 'f' : v < 0.05 ? 'm' : v < 0.55 ? 'j' : 'k';
          } else {
            c = Math.abs(v) > 0.93 ? 'k' : Math.abs(v) < 0.07 ? 'k' : v < -0.6 ? 'f' : v < 0 ? 'm' : v < 0.55 ? 'j' : 'k';
          }
          P(G, cx + bx + x, y, c);
        }
      }
      for (let x = -w1 * 0.9 + 1.5; x <= w1 * 0.9 - 1.5; x += 0.5) for (let y = 0; y <= 2; y += 0.5) P(G, cx + bx + x, y1 + 0.5 + y, Math.abs(x) < w1 * 0.45 ? jet[4] : jet[5]);
      continue;
    }
    if (style === 'tube') {   // 第24稿`);

once('const SKB_W = 216, SKB_H = 150,', 'const SKB_W = 216, SKB_H = 160,');
once("const SKIRT_BIG = skirtTex([[-32, 10, 106, 10.5, 14.5], [32, 10, 106, 10.5, 14.5], [-54, 24, 92, 8, 11.5], [54, 24, 92, 8, 11.5]], [[-32, 108, 41, 10.5], [32, 108, 41, 10.5], [-54, 94, 46, 8.5], [54, 94, 46, 8.5]], SKB_H, 'taper',",
  "// 第38稿：FB「ノズルを縦の長さ比で15％伸ばして。ただの筒状から武骨なビジュアルに」＝内 96→110・外 68→78・style 'brute'・高さ 150→160\nconst SKIRT_BIG = skirtTex([[-32, 10, 120, 10.5, 14.5], [32, 10, 120, 10.5, 14.5], [-54, 24, 102, 8, 11.5], [54, 24, 102, 8, 11.5]], [[-32, 122, 37, 10.5], [32, 122, 37, 10.5], [-54, 104, 46, 8.5], [54, 104, 46, 8.5]], SKB_H, 'brute',");

fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH38_OK');
