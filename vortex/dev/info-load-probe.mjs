// クルット・モビットが「同時にプレイヤーへ提示している情報の量」を実測するプローブ。
// HAYATO 側の dev/info-load-probe.js（疑似DOM版）と対になる計測器で、両ゲームの数値から
// 「情報バジェット（①行動要求／②状態／③装飾の同時表示上限）」を決めるのが目的。
//
// ⚠️ Chrome が必須。vortex は Phaser（実DOM＋WebGL/Canvas）なので疑似DOMでは動かない。
//    headless Chrome をローカル配信 + CDP で動かして、実際に画面へ出ている表示オブジェクトを数える。
//    既定パス: C:/Program Files/Google/Chrome/Application/chrome.exe（環境変数 CHROME で上書き可）
//
// 使い方:
//   node vortex/dev/info-load-probe.mjs            開幕〜90秒（初ボス「コロガンナー」60s戦を含む）
//   node vortex/dev/info-load-probe.mjs --full     開幕〜310秒（ボス5体目ミサイルガまで）
//   node vortex/dev/info-load-probe.mjs --seeds 42 単一シードだけ回す（デバッグ用）
// 詳細JSONの出力先: vortex/scratchpad/vortex-info-probe-result.json（--full は …-full.json）
//
// 設計の約束（事故防止）:
//   - vortex/src は1行も変更しない。フックはすべてページへ注入したスクリプトから掛ける。
//   - 同時表示数は「実際に画面にある Phaser 表示オブジェクト」を毎フレーム数える。
//     寿命を定数から再計算するモデル化はしない（[[feedback_instrument_must_match_impl]]）。
//     数え方は depth × 型 × visible。depth の対応表は vortex/scratchpad/vortex-info-inventory.md が正典。
//   - サンプリングは scene.events.on('postupdate') ＝ゲームのフレームそのもの。外からのポーリングにしない。
//   - 1つの要素を2つの経路で数えない。
//       ・雑魚の予告（照準ライン／爆風リング）は enemies[].aimLine からだけ数える（depth 8 は走査対象外）
//       ・誘導矢印は本体(depth1750)だけ数え、ラベル(depth1751)は同じ要素として数えない
//       ・WARNING/ラッシュは帯(depth1850)だけ数え、点滅する文字(depth1851)は数えない
//   - イベント発生数は (a) run.floatText / run.fx.announce のラップ と
//     (b) 表示オブジェクトの「新規出現」検出 の2系統で取り、両方を出して突き合わせる。
//     ⚠️ fx.js 内部から呼ばれる announce 3種（ぶきレベル／ボルテックスバースト／ひっさつ準備OK）は
//        run.fx.announce を通らないので、正典は (b) の側。(a) は整合性チェック用。
//   - autotest=1 はタイトルを飛ばすだけで自動プレイは無い。プレイヤーが動かないと
//     「掴む→投げる」が1回も起きず情報量を過小評価するので、プローブ側から入力を注入する
//     （run.moveKeys / run._jKey の isDown を毎フレーム書く＝キーボードで遊んでいるのと同じ経路）。
//   - 死ぬと計測が途切れるので run.endRun(false) をラップして全快に差し替える（HAYATO版の lives 補充と同じ）。
//     差し替えた回数は REVIVES として必ず報告する（0 なら素の値）。
//   - 例外はすべて捕捉して EXCEPTIONS=n を出力する（0が合格条件）。
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8992, DBG = 9544;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.png': 'image/png', '.json': 'application/json',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ARGS = process.argv.slice(2);
const FULL = ARGS.includes('--full');
const WINDOW_SEC = FULL ? 310 : 90;
const SEEDS = (() => {
  const i = ARGS.indexOf('--seeds');
  if (i < 0) return [42, 123, 999];
  return ARGS.slice(i + 1).filter((a) => /^\d+$/.test(a)).map(Number);
})();
const OUT_JSON = path.join(ROOT, 'vortex', 'scratchpad',
  FULL ? 'vortex-info-probe-result-full.json' : 'vortex-info-probe-result.json');
let exceptions = 0;

// ---------- 文言 → ①②③ 分類表（vortex/scratchpad/vortex-info-inventory.md の分類が正典） ----------
// 1=①行動要求（見て動きを変える必要がある） / 2=②状態（自分と相手の現況） / 3=③装飾（見なくても困らない）
const FLOAT_CLASS = [
  ['^まだ しんでない！$', 1],            // 断末魔（近づくな／割れ）
  ['^おうかん！', 1],                    // 王冠が生まれた＝狙う相手が変わる
  ['^なげろ！$', 1],                     // 特殊弾の手渡し完了
  ['^ビリッ！ つかめない！$', 1],
  ['^さわって ごうせい！$', 1],
  ['^ぜんだん はっしゃ！$', 1],
  ['^てのなかで ばくはつ！$', 1],
  ['^カキン！$', 1],                     // 弾かれた＝狙い直せ
  ['^アーマーブレイク！$', 1],           // 装甲片が落ちた＝掴め
  ['ヒット！$', 1],                      // コアヒット！／しんがん ヒット！＝そこを狙い続けろ
  ['ぶちギレ！$', 1],
  ['かくせい！$', 1],
  ['^それでも とまらない！$', 1],
  ['^いのちの ?たて！$', 2],             // マモリン（自分に盾が付いた状態）
  ['^ばくそく ドリンク！', 2],           // ドリンゴ
  ['^(かるい|おもい|ずっしり|ばくだん級)！$', 2],   // 掴んだ玉の格（いま手に持っている物の重さ）
  ['^\\d+$', 3],                         // ダメージ数値（最頻）
  ['^いりょく ×', 3],                    // 投擲段位アップ
  ['^(こうしえんの すな|ときのすなどけい|スターダスト|ゴールドスーツ|ビッグドリンク|ミニドリンク|マシンガンアーム|ビリビリホイッスル|ほしのたて)！$', 3],
  ['^\\+\\d+ HP$', 3],
  ['^\\+\\d+ コイン$', 3],
  ['^さいだいHP \\+\\d+！$', 3],
  ['^ブレイク！$', 3],
  ['^まにあった！$', 3],
  ['^\\d+体！$', 3],
  ['^\\d+体 いっき！$', 3],
  ['^\\d+たい よろけた！$', 3],
  ['^\\d+ れんぞく！$', 3],
  ['^\\d+ かい はねた！！$', 3],
  ['^ばくだん！！$', 3],
  ['だん!!$', 3],                        // 特殊弾が当たった瞬間の技名（らいこうだん!! / ほのおだん!! など）
  ['^ブラックホール！！$', 3],
  ['たまが あつまった！$', 3],
  ['なかま！$', 3],
  ['たんじょう！$', 3],
  ['^パワーアップ！$', 3],
  ['^ぶきパワーアップ！$', 3],
  ['げきは！$', 3],
  ['を たおした！$', 3],
  ['^まんたん！$', 3],
  ['^こうげき・ぼうぎょ・スピード', 3],
  ['^たいりょく ぜんかいふく！！$', 3],   // R50 転生時の全回復
];
const BANNER_CLASS = [
  ['^どうくつが あらわれた！$', 1],
  ['^やしろが あらわれた！$', 1],
  ['^がったいの さいだんが あらわれた！$', 1],
  ['コア！ ボスに きく らしい$', 1],
  ['しゅつげん！ つかんで なげろ！$', 1],
  ['^そうびが はがれた！ つかんで なげろ！$', 1],
  ['を つくった！$', 1],                 // ビリッコ が らいこうだん を つくった！
  ['^ひっさつ じゅんび OK！', 1],
  ['^おうかん！ たおして たまにしろ！$', 1],
  ['^つぎの \\d+とうが', 1],             // こんしんの いちげき の予告
  ['ゲット！$', 3],
  ['^てきの じかんが とまる！$', 3],     // 以下 どうくつ報酬の説明文（balance.js の cave.items[].get）
  ['^むてき！ ぶつかった', 3],
  ['^ぜんしん きんいろ！', 3],
  ['^からだが おおきくなった！', 3],
  ['^ちいさくなった！', 3],
  ['^ためなしで なげほうだい！$', 3],
  ['^てきが いっせいに よろけた！$', 3],
  ['^HPぜんかいふく！', 3],
  ['^やしろの ごりやく！', 3],
  ['アップ！$', 3],                      // レベルアップの選択結果
  ['^ぶきレベル \\d+ ！$', 3],
  ['^ボルテックスバースト！！$', 3],
  ['^なげる が ', 3],
  ['^こんしんの いっとう！！$', 3],
  ['まとめて ふきとばした！！$', 3],
  ['が めをさました！$', 3],
  ['おわり$', 3],                        // バフ切れ
  ['^BGM ', 3],
];

// ---------- 静的配信 ----------
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/vortex/index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
    res.writeHead(404); res.end('404'); return;
  }
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(fp).pipe(res);
});

// ---------- CDP ----------
let ws, msgId = 0;
const pending = new Map();
function send(method, params = {}) {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve) => pending.set(id, { resolve }));
}
async function evalJs(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) {
    exceptions++;
    console.log('  [eval EXC]', (r.exceptionDetails.exception
      && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
    return undefined;
  }
  return r.result && r.result.value;
}

// ================= ページ内で走る本体（ホストの変数は一切参照しない） =================
/* eslint-disable */
function pageProbe(cfg) {
  const run = window.__run;
  const P = {
    seed: cfg.seed, frames: 0, done: false, endedAt: null,
    exceptions: [], unknown: {}, revives: 0,
    series: [], peaks: [], events: {}, eventLayer: { 1: 0, 2: 0, 3: 0 },
    floatTexts: {}, bannerTexts: {}, wrap: { floatText: 0, announce: 0 },
    arrowHist: {}, guideHist: {}, meta: { bossesSeen: [] },
    drive: { throws: 0, grabs: 0, presses: 0 },
  };
  window.__P = P;

  const mk = (arr) => arr.map((p) => ({ re: new RegExp(p[0]), layer: p[1] }));
  const floatRules = mk(cfg.floatClass);
  const bannerRules = mk(cfg.bannerClass);
  const cache = {};
  function classify(rules, text, kind) {
    const ck = kind + '\u0000' + text;
    if (cache[ck]) return cache[ck];
    let lay = 0;
    for (const r of rules) { if (r.re.test(text)) { lay = r.layer; break; } }
    if (!lay) {
      const k = kind + ':' + text;
      P.unknown[k] = (P.unknown[k] || 0) + 1;
      lay = 3;                       // 未知の文言は装飾扱い。件数と一覧をレポートに出す
    }
    cache[ck] = lay;
    return lay;
  }
  const norm = (t) => String(t).replace(/\d+/g, 'N');
  function bumpEvent(name, layer) {
    const k = layer + '|' + name;
    P.events[k] = (P.events[k] || 0) + 1;
    P.eventLayer[layer]++;
  }

  // ===== フック(a): 関数ラップ（イベント発生数の整合性チェック用） =====
  const origFloat = run.floatText.bind(run);
  run.floatText = function (x, y, text, color) {
    try { P.wrap.floatText++; } catch (e) { P.exceptions.push('floatTextラップ: ' + e.message); }
    return origFloat(x, y, text, color);
  };
  if (run.fx && run.fx.announce) {
    const origAnn = run.fx.announce;
    run.fx.announce = function (text, color) {
      try { P.wrap.announce++; } catch (e) { P.exceptions.push('announceラップ: ' + e.message); }
      return origAnn(text, color);
    };
  }
  // 死なせない（HAYATO版の lives 補充と同じ。被弾そのものは止めない）
  const origEnd = run.endRun.bind(run);
  run.endRun = function (win) {
    if (!win && !P.done) { P.revives++; run.player.hp = run.player.maxHp; return; }
    P.endedAt = run.elapsed;
    return origEnd(win);
  };

  // ===== HUDウィジェットの同定（生成時の座標で1回だけ引き当てる） =====
  // draw() は毎フレーム text/visible を書き換えるので、以後は「実際に描かれているか」を直接読める。
  const HUDMAP = {
    '8,24': ['ぶきLv/Lv', 2], '8,56': ['ひっさつ残数', 2], '320,6': ['のこり時間', 2],
    '632,44': ['コイン', 3], '6,344': ['デバッグoverlay', 3],
    '632,60': ['バフ行', 2], '632,74': ['バフ行', 2], '632,88': ['バフ行', 2], '632,102': ['バフ行', 2],
    '320,180': ['ポーズ文言', 3], '320,210': ['MUTE', 3], '320,28': ['ボス名', 2],
  };
  const hudW = [];
  let bossArrowText = null;
  for (const o of run.children.list) {
    if (!o || o.type !== 'Text' || o.scrollFactorX !== 0) continue;
    if (!(o.depth >= 1000 && o.depth <= 1006)) continue;
    const key = Math.round(o.x) + ',' + Math.round(o.y);
    if (HUDMAP[key]) hudW.push({ o, name: HUDMAP[key][0], layer: HUDMAP[key][1] });
    else if (o.text === 'ボス') bossArrowText = o;
  }
  P.meta.hudWidgetsFound = hudW.length;
  P.meta.bossArrowFound = !!bossArrowText;

  // ===== 表示オブジェクトの「新規出現」検出（イベントの正典） =====
  const seen = new WeakSet();
  // depth → [名前, 層, テキストで分類するか]
  function depthInfo(o) {
    const d = o.depth;
    if (d === 1400 && o.type === 'Text') return ['フロート', 0, floatRules, 'float'];
    if (d === 1800 && o.type === 'Text') return ['バナー', 0, bannerRules, 'banner'];
    if (d === 1750) return ['ゆうどう矢印', 1, null, null];
    if (d === 1850) return [(o.height >= 80 ? 'ボス警告(WARNING)' : 'ラッシュ予告'), 1, null, null];
    if (d === 1860 && o.type === 'Text') return ['ぶきLVテロップ', 3, null, null];
    if (d === 1500 && o.type === 'Text') return ['ごうせい条件メッセージ', 1, null, null];
    if (d === 13 && o.type === 'Text') return ['ワールドラベル', 1, null, null];
    if (d >= 1990 && d <= 1992 && o.type === 'Text') return ['ボス名乗り', 1, null, null];
    return null;
  }

  // ===== 毎フレームの数え上げ =====
  const prev = { lowHp: 0, hurtFx: 0, flash: 0, bossVig: 0 };
  function sample() {
    const it = {}, L = { 1: 0, 2: 0, 3: 0 };
    const add = (key, layer, n) => { if (n > 0) { it[key] = (it[key] || 0) + n; L[layer] += n; } };
    let bossVig = 0;

    // --- HUD（常時ぶんは定数。bar 1枚に4本のゲージが描かれているので個数で数える） ---
    add('HUD:HPバー', 2, 1);
    add('HUD:ジェル回復ゲージ', 2, 1);
    add('HUD:XPバー', 2, 1);
    add('HUD:ひっさつゲージ', 2, 1);
    add('HUD:パーティ枠', 2, 1);
    for (const w of hudW) {
      if (!w.o.visible || !w.o.text) continue;
      // ひっさつ残数は「SPACE!」が出ている間だけ①（押せという要求）
      const lay = (w.name === 'ひっさつ残数' && w.o.text.indexOf('SPACE!') >= 0) ? 1 : w.layer;
      add('HUD:' + w.name, lay, 1);
    }
    if (bossArrowText && bossArrowText.visible) add('HUD:ボス方向矢印', 1, 1);
    if (run.boss && run.boss.active) add('HUD:ボスHPバー', 2, 1);

    // --- 表示リスト走査（実際に画面にあるものだけ） ---
    let guideArrows = 0;
    let lowHp = 0, hurtFx = 0, cine = 0, flash = 0, ripple = 0;
    const list = run.children.list;
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (!o || o.visible === false) continue;
      const d = o.depth;
      if (d === 1400) { if (o.type === 'Text') add('フロート' + '\u2460\u2461\u2462'[classify(floatRules, o.text, 'float') - 1], classify(floatRules, o.text, 'float'), 1); continue; }
      if (d === 1750) { guideArrows++; continue; }
      if (d === 1800) { if (o.type === 'Text') { const c = classify(bannerRules, o.text, 'banner'); add('バナー' + '\u2460\u2461\u2462'[c - 1], c, 1); } continue; }
      if (d === 1850) { add(o.height >= 80 ? 'ボス警告(WARNING)' : 'ラッシュ予告', 1, 1); continue; }
      if (d === 1860) { add('ぶきLVテロップ', 3, 1); continue; }
      if (d === 1500) { add('ごうせい条件メッセージ', 1, 1); continue; }
      if (d === 13 && o.type === 'Text') { add('ワールドラベル', 1, 1); continue; }
      if (d >= 1990 && d <= 1992) { if (o.type === 'Text') add('ボス名乗り', 1, 1); continue; }
      if (d === 2070) { lowHp = 1; continue; }
      // R52 ボス出現の警告フェーズだけ出る赤い周縁（4枚の帯＝低HP警告と同じ作法なので1件に数える）
      if (d === 2071) { bossVig = 1; continue; }
      if (d === 2080 || d === 2081) { hurtFx = 1; continue; }
      if (d >= 2050 && d <= 2064) { cine = 1; continue; }
      if (d === 60 || d === 2091 || d === 2092 || d === 2099 || d === 2100) { flash = 1; continue; }
      if (d === 1900) { ripple = 1; continue; }
    }
    add('ゆうどう矢印', 1, guideArrows);
    add('ていHP周縁けいこく', 1, lowHp);
    add('ボス出現けいこく周縁', 1, bossVig);   // ①＝これから起きることへ備えろ、の信号
    add('被弾フラッシュ/方向帯', 2, hurtFx);
    add('シネマ演出', 3, cine);
    // 状態のエッジで拾うイベント（同じ瞬間に複数オブジェクトが生まれる要素は、表示物ではなく状態で1件に数える）
    if (lowHp && !prev.lowHp) bumpEvent('ていHP周縁けいこく', 1);
    if (bossVig && !prev.bossVig) bumpEvent('ボス出現けいこく周縁', 1);
    if (hurtFx && !prev.hurtFx) bumpEvent('プレイヤー被弾', 2);
    if (flash && !prev.flash) bumpEvent('全画面フラッシュ', 3);
    prev.lowHp = lowHp; prev.hurtFx = hurtFx; prev.flash = flash; prev.bossVig = bossVig;
    add('全画面フラッシュ', 3, flash);
    add('リップル', 3, ripple);

    // --- ゲーム側の状態（描画側を書き換えずに読むだけ） ---
    let aim = 0, stagRing = 0, crown = 0, minions = 0;
    for (const e of run.enemies) {
      if (!e.active) continue;
      minions++;
      if (e.aimLine) aim++;                                   // 照準ライン／爆風予告リング
      if (e.stag && e.stagRing && e.stagRing.visible) stagRing++;
      if (e.crown && e.crownSpr && e.crownSpr.visible) crown++;
    }
    add('雑魚の予告(照準/爆風)', 1, aim);
    add('よろけ輪', 1, stagRing);
    add('王冠の星', 1, crown);
    const strikes = (run.boss && run.boss.strikeCount) || 0;
    add('ボス着弾予告円', 1, strikes);
    if (run.boss && run.boss.active) {
      if (run.boss.telegraphing) add('ボス本体の予告点滅', 1, 1);
      // 撃破済みだと最後に読んだときには居ないので、戦ったボスは通りがかりに控えておく
      const bn = run.boss.entity && run.boss.entity.def && run.boss.entity.def.name;
      if (bn && P.meta.bossesSeen.indexOf(bn) < 0) P.meta.bossesSeen.push(bn);
    }
    const st = run.billiard && run.billiard.st;
    if (st && st.held) { add('手の中の弾オーラ', 2, 1); add('狙い点線＋先端リング', 2, 1); }
    if (run.cinematic) add('進行停止シネマ', 3, 1);
    if (run.freezeT > 0) add('ヒットストップ', 3, 1);
    if (run.slowT > 0) add('スローモーション', 3, 1);
    const cam = run.cameras && run.cameras.main;
    if (cam && cam.shakeEffect && cam.shakeEffect.isRunning) add('画面シェイク', 3, 1);

    const t = Math.round(run.elapsed * 100) / 100;
    const bossArrow = (bossArrowText && bossArrowText.visible) ? 1 : 0;
    P.series.push([t, L[1], L[2], L[3], guideArrows + bossArrow, guideArrows,
      minions, run.bullets.length]);
    const ak = String(guideArrows + bossArrow);
    P.arrowHist[ak] = (P.arrowHist[ak] || 0) + 1;
    const gk = String(guideArrows);
    P.guideHist[gk] = (P.guideHist[gk] || 0) + 1;

    // ピーク候補（合計の多い順に60件だけ内訳ごと残す）
    P.peaks.push({ t, l1: L[1], l2: L[2], l3: L[3], it, en: minions, bu: run.bullets.length,
      hp: Math.round((run.player.hp / run.player.maxHp) * 100) });
    if (P.peaks.length > 400) {
      P.peaks.sort((a, b) => (b.l1 + b.l2 + b.l3) - (a.l1 + a.l2 + a.l3));
      P.peaks.length = 60;
    }

    // --- イベント（新しく画面に出た表示物＝発生1件） ---
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (!o || seen.has(o)) continue;
      const info = depthInfo(o);
      if (!info) continue;
      seen.add(o);
      if (info[2]) {
        const lay = classify(info[2], o.text, info[3]);
        const key = norm(o.text);
        const bag = info[3] === 'float' ? P.floatTexts : P.bannerTexts;
        bag[key] = (bag[key] || 0) + 1;
        bumpEvent(info[0] + ':' + key, lay);
      } else {
        bumpEvent(info[0], info[1]);
      }
    }
  }

  // ===== 入力の注入（autotest には自動プレイが無いので、キーボードで遊ぶのと同じ経路を叩く） =====
  // 掴む→投げるが1回も起きないと、このゲームの情報の大半（撃破数・連鎖・ダメージ数字）が消える。
  let prevHeld = false;
  function drive() {
    const k = run.moveKeys, p = run.player;
    if (!k || !p) return;
    let vx = 0, vy = 0;
    const push = (sx, sy, range, w) => {
      const dx = p.x - sx, dy = p.y - sy;
      const d = Math.hypot(dx, dy) || 1;
      if (d < range) { vx += (dx / d) * ((range - d) / range) * w; vy += (dy / d) * ((range - d) / range) * w; }
    };
    const pull = (sx, sy, w) => {
      const dx = sx - p.x, dy = sy - p.y;
      const d = Math.hypot(dx, dy) || 1;
      vx += (dx / d) * w; vy += (dy / d) * w;
    };
    const st = run.billiard && run.billiard.st;
    const holding = !!(st && st.held);

    // 脅威から離れる
    for (const e of run.enemies) {
      if (!e.active || e.stag) continue;
      push(e.x, e.y, e.isBoss ? 170 : 62, e.isBoss ? 2.4 : 0.9);
    }
    for (const b of run.bullets) { if (b.active) push(b.x, b.y, 58, 1.5); }

    if (holding) {
      // 投げる向き＝方向キーの向き。いちばん敵が固まっている方角へ向ける
      let bx = 0, by = 0, n = 0;
      for (const e of run.enemies) {
        if (!e.active || e.isBoss) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d > 340) continue;
        bx += e.x; by += e.y; n++;
      }
      if (n) pull(bx / n, by / n, 3.2);
      else if (run.boss && run.boss.active && run.boss.entity) pull(run.boss.entity.x, run.boss.entity.y, 3.2);
    } else {
      // よろけている敵＝掴める獲物へ寄る。無ければジェムを拾いに行く（レベルアップの情報も測るため）
      let tg = null, bd = 1e9;
      for (const e of run.enemies) {
        if (!e.active || !e.stag) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < bd) { bd = d; tg = e; }
      }
      if (!tg) {
        let gd = 1e9;
        for (const g of run.gems) {
          if (!g.active) continue;
          const d = Math.hypot(g.x - p.x, g.y - p.y);
          if (d < gd) { gd = d; tg = g; }
        }
      }
      if (tg) pull(tg.x, tg.y, 2.0);
      else {
        // 何も無ければ最寄りの敵へ寄って突く（よろけを作らないと掴む相手が出ない）
        let ed = 1e9, en = null;
        for (const e of run.enemies) {
          if (!e.active || e.isBoss) continue;
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          if (d < ed) { ed = d; en = e; }
        }
        if (en) pull(en.x, en.y, 1.2);
      }
    }
    k.left.isDown = vx < -0.22; k.right.isDown = vx > 0.22;
    k.up.isDown = vy < -0.22; k.down.isDown = vy > 0.22;
    k.a.isDown = false; k.d.isDown = false; k.w.isDown = false; k.s.isDown = false;

    // 押しっぱなし＝掴む/突く。溜め切ったら離す＝投げる
    let press = true;
    if (st && st.held && !st.held.handed && st.maxRung) press = false;
    if (run._jKey) { if (press && !run._jKey.isDown) P.drive.presses++; run._jKey.isDown = press; }
    if (holding && !prevHeld) P.drive.grabs++;
    if (!holding && prevHeld) P.drive.throws++;
    prevHeld = holding;
  }

  // ===== 取り付け =====
  const onPre = () => { try { if (!P.done) drive(); } catch (e) { P.exceptions.push('drive: ' + e.message); } };
  const onPost = () => {
    if (P.done) return;
    try {
      P.frames++;
      sample();
      if (run.elapsed >= cfg.windowSec) finish();
    } catch (e) {
      P.exceptions.push('sample f' + P.frames + ': ' + (e && e.stack ? String(e.stack).split('\n').slice(0, 2).join(' | ') : String(e)));
      if (P.exceptions.length > 20) finish();
    }
  };
  function finish() {
    P.done = true;
    try {
      run.events.off('preupdate', onPre);
      run.events.off('postupdate', onPost);
      const k = run.moveKeys;
      if (k) { k.left.isDown = k.right.isDown = k.up.isDown = k.down.isDown = false; }
      if (run._jKey) run._jKey.isDown = false;
      P.peaks.sort((a, b) => (b.l1 + b.l2 + b.l3) - (a.l1 + a.l2 + a.l3));
      P.peaks.length = Math.min(P.peaks.length, 60);
      P.meta.elapsed = run.elapsed;
      P.meta.level = run.level;
      P.meta.weaponLevel = (run.orbit && run.orbit.weaponLevel) || 0;
      P.meta.coins = run.coins;
      P.meta.party = run.party.map((m) => m.def.name).join('/');
      const st = run.billiard && run.billiard.st;
      if (st) {
        P.meta.throws = st.throws; P.meta.grabs = st.grabs; P.meta.jabs = st.jabs;
        P.meta.bestChain = st.bestChain; P.meta.tier = st.tierIdx;
      }
      P.meta.bossActive = !!(run.boss && run.boss.active);
      P.meta.bossName = (run.boss && run.boss.entity && run.boss.entity.def
        && run.boss.entity.def.name) || null;
    } catch (e) { P.exceptions.push('finish: ' + e.message); }
  }
  run.events.on('preupdate', onPre);
  run.events.on('postupdate', onPost);
  P.meta.startElapsed = run.elapsed;
  return true;
}
/* eslint-enable */

// ---------- 統計ヘルパ ----------
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
const half = (a) => (a.length ? (Math.max(...a) - Math.min(...a)) / 2 : 0);
const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
const pct = (v) => (Math.round(v * 1000) / 10).toFixed(1) + '%';
function layerStats(series, idx) {
  const vals = series.map((s) => s[idx]);
  const n = vals.length || 1;
  const ge = (k) => vals.filter((v) => v >= k).length / n;
  return { max: Math.max(...vals, 0), mean: mean(vals), ge3: ge(3), ge5: ge(5), ge8: ge(8) };
}

// ---------- 実行 ----------
async function boot(seed) {
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=${seed}` });
  await sleep(2000);
  for (let i = 0; i < 100; i++) {
    const ok = await evalJs(`(function(){var g=window.__vortexGame;if(!g)return false;
      var r=g.scene.getScene('Run');if(!r||!r.sys||r.sys.settings.status<4)return false;
      window.__run=r;
      return !!(r.orbit&&r.billiard&&r.boss&&r.hud&&r.player&&r.moveKeys);})()`);
    if (ok) return true;
    await sleep(200);
  }
  return false;
}

async function runSeed(seed) {
  const ready = await boot(seed);
  if (!ready) { exceptions++; console.log(`  ! シード${seed}: Runシーンの起動待ちタイムアウト`); return null; }
  const cfg = { seed, windowSec: WINDOW_SEC, floatClass: FLOAT_CLASS, bannerClass: BANNER_CLASS };
  const installed = await evalJs('(' + pageProbe.toString() + ')(' + JSON.stringify(cfg) + ')');
  if (!installed) { exceptions++; console.log(`  ! シード${seed}: プローブの取り付けに失敗`); return null; }

  const deadline = Date.now() + WINDOW_SEC * 1000 * 2.2 + 40000;
  let done = false;
  while (!done && Date.now() < deadline) {
    await sleep(2000);
    done = await evalJs('!!(window.__P && window.__P.done)');
  }
  if (!done) { exceptions++; console.log(`  ! シード${seed}: 計測窓が閉じないままタイムアウト`); await evalJs('window.__P && (window.__P.done=true)'); }
  const R = await evalJs('JSON.stringify(window.__P)');
  if (!R) { exceptions++; return null; }
  return JSON.parse(R);
}

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    `--remote-debugging-port=${DBG}`, '--window-size=700,420', '--hide-scrollbars',
    // プロファイルは既存のCDPスクリプトと同じ scratchpad へ置く（dev/ に作業ゴミを残さない）
    `--user-data-dir=${path.join(ROOT, 'vortex', 'scratchpad', '.chrome-prof-infoload')}`,
    'about:blank'], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 80 && !wsUrl; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) wsUrl = page.webSocketDebuggerUrl;
    } catch { /* retry */ }
    if (!wsUrl) await sleep(200);
  }
  if (!wsUrl) { console.log('Chrome に接続できませんでした。CHROME 環境変数でパスを指定してください。'); console.log('PROBE_NG'); console.log('EXCEPTIONS=1'); process.exit(1); }
  ws = new WebSocket(wsUrl);
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result || {}); pending.delete(m.id); }
    else if (m.method === 'Runtime.exceptionThrown') {
      exceptions++;
      const d = m.params.exceptionDetails;
      console.log('  [EXC]', d.text, (d.exception && d.exception.description) || '');
    } else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      if (/404 \(Not Found\)/.test(m.params.entry.text || '')) return;
      exceptions++; console.log('  [LOG error]', m.params.entry.text);
    }
  };
  await new Promise((r) => { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');

  console.log('=== 計測条件 ===');
  console.log(`対象: vortex（クルット・モビット）の本番ラン 開幕〜${WINDOW_SEC}秒`
    + (FULL ? '（ボス5体目ミサイルガまで）' : '（初ボス「コロガンナー」60秒戦を含む＝息子さんの実到達範囲）'));
  console.log(`シード: ${SEEDS.join(' / ')}（?autotest=1&seed=N）`);
  console.log('数え方: 毎フレーム（scene postupdate）に「実際に画面へ出ている表示オブジェクト」を数える。');
  console.log('  ・depth×型×visible で層別（対応表は vortex/scratchpad/vortex-info-inventory.md）');
  console.log('  ・雑魚の予告は enemies[].aimLine、ボス着弾予告は boss.strikeCount から読む（描画側は触らない）');
  console.log('  ・矢印はラベルを、WARNING/ラッシュは点滅する文字を、同じ要素として二重に数えない');
  console.log('  ・HUDの常時要素は5点の定数（HP/ジェル/XP/ひっさつゲージ/パーティ枠）＋テキスト系は visible と中身を実読み');
  console.log('  ・敵キャラ本体・敵弾・ジェムは「読む情報」ではなくゲーム対象として層外に別集計');
  console.log('操作: プローブが毎フレーム moveKeys/_jKey を書いて自動プレイ（脅威を避け、よろけを掴んで投げる）。');
  console.log('      autotest=1 はタイトルを飛ばすだけで自動プレイは無いため、入力注入が無いと投擲0回になる。\n');

  const results = [];
  for (const seed of SEEDS) {
    const R = await runSeed(seed);
    if (!R) continue;
    results.push(R);
    const m = R.meta || {};
    console.log(`シード${seed}: ${R.frames}フレーム(${f1(m.elapsed || 0)}秒) `
      + `Lv${m.level} ぶきLv${m.weaponLevel} 投${m.throws || 0}回/掴${m.grabs || 0}回/突${m.jabs || 0}回 `
      + `最大連鎖${m.bestChain || 0} 戦ったボス=${(m.bossesSeen || []).join('/') || '（なし）'} REVIVES=${R.revives} `
      + `EXCEPTIONS=${R.exceptions.length}`);
    console.log(`  ラップ計上: floatText ${R.wrap.floatText}回 / fx.announce ${R.wrap.announce}回`
      + `（表示物の新規出現から数えた件数は下のランキング。fx内部のannounce 3種はラップを通らない）`);
    for (const e of R.exceptions.slice(0, 5)) console.log('    ! ' + e);
  }
  const ok = results.filter((r) => r.series.length > 0);
  if (!ok.length) {
    console.log('\n計測できたシードがありません。');
    console.log('PROBE_NG'); console.log(`EXCEPTIONS=${exceptions}`); process.exit(1);
  }

  // ---------- 層別サマリ ----------
  console.log('\n=== 情報負荷サマリ ===');
  console.log(`（${SEEDS.length}シード ${SEEDS.join('/')} の平均±幅。「幅」は(最大-最小)/2）`);
  console.log('層              同時最大        平均            ≥3の時間割合    ≥5            ≥8');
  const LAYER_LABEL = { 1: '①行動要求', 2: '②状態    ', 3: '③装飾    ' };
  const stats = {};
  for (const lay of [1, 2, 3]) {
    const per = ok.map((r) => layerStats(r.series, lay));
    stats[lay] = per;
    const g = (fn) => `${f1(mean(per.map(fn)))}±${f1(half(per.map(fn)))}`;
    console.log(
      `${LAYER_LABEL[lay]}      ${g((s) => s.max).padEnd(14)}  ${g((s) => s.mean).padEnd(14)}  `
      + `${pct(mean(per.map((s) => s.ge3))).padEnd(14)}  ${pct(mean(per.map((s) => s.ge5))).padEnd(12)}  `
      + `${pct(mean(per.map((s) => s.ge8)))}`);
  }
  {
    const per = ok.map((r) => layerStats(r.series.map((s) => [0, s[1] + s[2] + s[3]]), 1));
    stats.total = per;
    const g = (fn) => `${f1(mean(per.map(fn)))}±${f1(half(per.map(fn)))}`;
    console.log(`合計          ${g((s) => s.max).padEnd(14)}  ${g((s) => s.mean).padEnd(14)}  `
      + `${pct(mean(per.map((s) => s.ge3))).padEnd(14)}  ${pct(mean(per.map((s) => s.ge5))).padEnd(12)}  `
      + `${pct(mean(per.map((s) => s.ge8)))}`);
  }

  // ---------- ピーク Top5 ----------
  console.log('\n=== ピーク Top5（同時表示の合計が多かった瞬間） ===');
  const allPeaks = [];
  for (const r of ok) {
    const picked = [];
    for (const s of r.peaks) {                      // 同一シーンの連続フレームで埋まらないよう1.5秒以上離す
      if (picked.every((p) => Math.abs(p.t - s.t) > 1.5)) picked.push(s);
      if (picked.length >= 5) break;
    }
    for (const s of picked) allPeaks.push(Object.assign({ seed: r.seed }, s));
  }
  allPeaks.sort((a, b) => (b.l1 + b.l2 + b.l3) - (a.l1 + a.l2 + a.l3));
  const topPeaks = allPeaks.slice(0, 5);
  topPeaks.forEach((p, i) => {
    console.log(`${i + 1}. seed${p.seed} ${f1(p.t)}秒 自HP${p.hp}% `
      + `合計${p.l1 + p.l2 + p.l3}点（①${p.l1} ②${p.l2} ③${p.l3}）敵${p.en}体 敵弾${p.bu}発`);
    console.log('   内訳: ' + Object.keys(p.it).map((k) => `${k}×${p.it[k]}`).join(' / '));
  });

  // ---------- 文言別ランキング ----------
  const rank = (bag, rules, title) => {
    console.log(`\n=== ${title} ===`);
    const agg = {};
    for (const r of ok) for (const k of Object.keys(r[bag])) agg[k] = (agg[k] || 0) + r[bag][k];
    const keys = Object.keys(agg).sort((a, b) => agg[b] - agg[a]);
    if (!keys.length) { console.log('  （なし）'); return agg; }
    for (const k of keys) {
      let lay = 3;
      for (const [re, l] of rules) { if (new RegExp(re).test(k.replace(/N/g, '1'))) { lay = l; break; } }
      console.log(`  ${'①②③'[lay - 1]} ${k.padEnd(30)} ${String(agg[k]).padStart(5)}回 `
        + `(1ラン ${f1(agg[k] / ok.length)}回)`);
    }
    return agg;
  };
  const floatAgg = rank('floatTexts', FLOAT_CLASS, `フロートテキストの文言別ランキング（${ok.length}シード合計／1ランあたり平均）`);
  const bannerAgg = rank('bannerTexts', BANNER_CLASS, `バナー（announce）の文言別ランキング（${ok.length}シード合計／1ランあたり平均）`);

  // ---------- 1分あたりのイベント発生数 ----------
  console.log('\n=== 1分あたりのイベント発生数（層別） ===');
  const minutes = ok.map((r) => (r.meta.elapsed || WINDOW_SEC) / 60);
  for (const lay of [1, 2, 3]) {
    const per = ok.map((r, i) => r.eventLayer[lay] / minutes[i]);
    console.log(`  ${'①②③'[lay - 1]} ${f1(mean(per))}±${f1(half(per))} 件/分`);
  }
  {
    const per = ok.map((r, i) => (r.eventLayer[1] + r.eventLayer[2] + r.eventLayer[3]) / minutes[i]);
    console.log(`  合計 ${f1(mean(per))}±${f1(half(per))} 件/分 ＝ ${f1(mean(per) / 60)}件/秒`);
  }
  console.log('  内訳（3シード合計・上位15件）:');
  const evAgg = {};
  for (const r of ok) for (const k of Object.keys(r.events)) evAgg[k] = (evAgg[k] || 0) + r.events[k];
  Object.keys(evAgg).sort((a, b) => evAgg[b] - evAgg[a]).slice(0, 15).forEach((k) => {
    const i = k.indexOf('|');
    console.log(`    ${'①②③'[Number(k.slice(0, i)) - 1]} ${k.slice(i + 1).padEnd(34)} ${String(evAgg[k]).padStart(5)}回`);
  });

  // ---------- 誘導矢印の同時本数 ----------
  console.log('\n=== 画面端の矢印の同時本数（誘導矢印＋ボス方向矢印。棚卸しの「最大6本」懸念の実測） ===');
  const hist = {}, ghist = {};
  let frames = 0;
  for (const r of ok) {
    for (const k of Object.keys(r.arrowHist)) { hist[k] = (hist[k] || 0) + r.arrowHist[k]; frames += r.arrowHist[k]; }
    for (const k of Object.keys(r.guideHist)) ghist[k] = (ghist[k] || 0) + r.guideHist[k];
  }
  const showHist = (h, label) => {
    const tot = Object.keys(h).reduce((s, k) => s + h[k], 0) || 1;
    console.log(`  ${label}: 最大${Math.max(...Object.keys(h).map(Number), 0)}本 / `
      + Object.keys(h).sort((a, b) => a - b).map((k) => `${k}本=${pct(h[k] / tot)}`).join(' '));
  };
  showHist(hist, '合計 ');
  showHist(ghist, 'ゆうどう矢印のみ');

  // ---------- 未知の文言 ----------
  const unkAgg = {};
  for (const r of ok) for (const k of Object.keys(r.unknown)) unkAgg[k] = (unkAgg[k] || 0) + r.unknown[k];
  const unkKeys = Object.keys(unkAgg);
  if (unkKeys.length) {
    console.log('\n=== 分類表に無かった文言（③として集計。要確認） ===');
    for (const k of unkKeys.slice(0, 30)) console.log(`  ${k} (${unkAgg[k]})`);
  } else {
    console.log('\n分類表に無い文言はなし');
  }

  // ---------- JSON ----------
  const json = {
    generatedAt: new Date().toISOString(),
    target: 'vortex', windowSec: WINDOW_SEC, full: FULL, seeds: SEEDS,
    note: '層の定義: ①行動要求／②状態／③装飾。敵本体・敵弾は「読む情報」ではなくゲーム対象として層外に別集計（en/bu）。'
      + '同時表示数は毎フレームの実表示オブジェクト数。series=[t秒, l1, l2, l3, 矢印合計, ゆうどう矢印, 敵数, 弾数]。',
    layerSummary: [1, 2, 3].reduce((o, lay) => {
      o[lay] = {
        perSeed: stats[lay],
        mean: {
          max: mean(stats[lay].map((s) => s.max)), mean: mean(stats[lay].map((s) => s.mean)),
          ge3: mean(stats[lay].map((s) => s.ge3)), ge5: mean(stats[lay].map((s) => s.ge5)),
          ge8: mean(stats[lay].map((s) => s.ge8)),
        },
      };
      return o;
    }, {}),
    totalSummary: stats.total,
    peaks: topPeaks,
    floatRanking: Object.keys(floatAgg).sort((a, b) => floatAgg[b] - floatAgg[a])
      .map((k) => ({ text: k, count: floatAgg[k], perRun: floatAgg[k] / ok.length })),
    bannerRanking: Object.keys(bannerAgg).sort((a, b) => bannerAgg[b] - bannerAgg[a])
      .map((k) => ({ text: k, count: bannerAgg[k], perRun: bannerAgg[k] / ok.length })),
    eventsPerMinute: [1, 2, 3].reduce((o, lay) => {
      o[lay] = mean(ok.map((r, i) => r.eventLayer[lay] / minutes[i])); return o;
    }, {}),
    eventTotals: evAgg,
    arrowHist: hist, guideArrowHist: ghist, arrowFrames: frames,
    unknownTexts: unkAgg,
    runs: results.map((r) => ({
      seed: r.seed, frames: r.frames, meta: r.meta, revives: r.revives,
      exceptions: r.exceptions, eventLayer: r.eventLayer, wrap: r.wrap,
      arrowHist: r.arrowHist, guideHist: r.guideHist,
      // 時系列は10フレームおきに間引いて保存
      seriesEvery10: r.series.filter((s, i) => i % 10 === 0),
    })),
  };
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(json, null, 2), 'utf8');
  console.log(`\n詳細JSON: ${OUT_JSON}`);

  // ---------- 固定トークン ----------
  let allOk = ok.length === SEEDS.length;
  let inner = 0;
  for (const r of results) {
    inner += r.exceptions.length;
    if (!(r.meta.bossesSeen || []).length) {
      // 60秒のコロガンナー戦を含まない＝計測窓が意図どおりでない
      allOk = false; console.log(`NG  シード${r.seed}: ボス戦が計測窓に入っていない`);
    }
    if ((r.meta.throws || 0) < 3) { allOk = false; console.log(`NG  シード${r.seed}: 投擲が${r.meta.throws || 0}回＝自動プレイが成立していない`); }
    console.log(`SEED=${r.seed} FRAMES=${r.frames} ELAPSED=${f1(r.meta.elapsed || 0)} `
      + `THROWS=${r.meta.throws || 0} REVIVES=${r.revives} EXCEPTIONS=${r.exceptions.length}`);
  }
  const total = exceptions + inner;
  console.log(`UNKNOWN_TEXTS=${unkKeys.length}`);
  console.log(allOk && total === 0 ? 'PROBE_OK' : 'PROBE_NG');
  console.log(`EXCEPTIONS=${total}`);
  process.exit(allOk && total === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); console.log('PROBE_NG'); console.log('EXCEPTIONS=1'); process.exit(1); });
