// ライリュウ戦（28面・最終ボス）が同時にプレイヤーへ提示する「情報の量」を実測するプローブ
// 使い方: node dev/info-load-probe.js game.js [--low-info|--info-v2]
//   --low-info … ロード直後に lowInfoMode=true にして同じ計測をする（通常モードとの対照実験用）。
//                同じシードなら予告系（strikes/fences/novas/ボスの技）は完全一致するはず＝
//                最後に出る TELSIG が両モードで一致すればゲームプレイは1mmも変わっていない証明になる。
//   --info-v2  … おためしモード相当（trialMode=true）＋ infoLevel=2「こうげき ととのえ」で計測する。
//                こちらは攻撃の開始タイミングを整理する＝TELSIG は当然変わる（変わらなければ効いていない）。
//
// 目的: 「情報量が多くて処理しきれない」という実プレイFBを数値化し、低情報モードの
//       情報バジェット（①行動要求／②状態／③装飾の同時表示上限）を決める基礎データを取る。
//
// 設計の約束（事故防止）:
//   - game.js は1行も変更しない。フックはすべてプローブ側から（ロード後の関数差し替え）。
//   - 情報の数え上げはゲーム本体の状態（popups/strikes/fences/novas/各タイマー）をそのまま読む。
//     表示条件（点滅位相・HUDが描かれたか）は drawText フックで「実際に描かれた文字列」を見る＝条件式の再実装をしない。
//   - 1つの要素を2つの経路で数えない。popups は状態配列からのみ、HUDは drawText フックからのみ数える。
//   - Math.random はシード付き疑似乱数に差し替えて再現可能にする（シード42/123/999）。
//   - 例外はすべて捕捉して件数を出す。終了時に必ず EXCEPTIONS=n を出力する。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ARGS = process.argv.slice(2);
const INFO_V2 = ARGS.includes('--info-v2');
const LOW_INFO = ARGS.includes('--low-info') || INFO_V2; // v2は「ひかえめ＋こうげき整理」なので表示間引きも入る
const SRC_PATH = ARGS.filter((a) => !a.startsWith('--'))[0] || path.join(__dirname, '..', 'game.js');
const src = fs.readFileSync(SRC_PATH, 'utf8');
const SEEDS = [42, 123, 999];
const MODE_LABEL = INFO_V2 ? 'INFOV2' : (LOW_INFO ? 'LOWINFO' : 'NORMAL');
const OUT_JSON = path.join(__dirname, '..', 'vortex', 'scratchpad',
  INFO_V2 ? 'hayato-info-probe-result-infov2.json'
    : (LOW_INFO ? 'hayato-info-probe-result-lowinfo.json' : 'hayato-info-probe-result.json'));

// ---------- シード付き疑似乱数（mulberry32） ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- 疑似DOM（dev/rairyu-death-test.js と同じ形。window.AudioContext を渡さない＝無音） ----------
function makeSandbox(seed) {
  const ctxStub = new Proxy({}, {
    get(t, p) {
      if (p === 'createLinearGradient' || p === 'createRadialGradient' || p === 'createPattern') {
        return () => ({ addColorStop() {} });
      }
      if (p === 'measureText') return () => ({ width: 10 });
      if (p === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return typeof t[p] !== 'undefined' ? t[p] : () => {};
    },
    set(t, p, v) { t[p] = v; return true; },
  });
  const canvas = {
    width: 480, height: 360,
    getContext: () => ctxStub,
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 480, height: 360 }),
    style: {},
  };
  // Math はホストのものをそのまま渡すと random の差し替えがホスト側に漏れるので複製して渡す
  const seededMath = {};
  for (const k of Object.getOwnPropertyNames(Math)) {
    const v = Math[k];
    seededMath[k] = typeof v === 'function' ? v.bind(Math) : v;
  }
  seededMath.random = mulberry32(seed);

  const sandbox = {
    document: { getElementById: () => canvas, addEventListener() {}, createElement: () => canvas },
    window: { addEventListener() {}, prompt: () => null },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    requestAnimationFrame: () => 1,
    performance: { now: () => 0 },
    Math: seededMath, JSON, console, Number, String, Array, Object, Uint8ClampedArray, Float32Array,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return (code) => vm.runInContext(code, sandbox);
}

// ---------- 文言 → ①②③ 分類表（vortex/scratchpad/hayato-rairyu-info-inventory.md の分類が正典） ----------
// 1=①行動要求（見て動きを変える必要がある） / 2=②状態（自分と相手の現況） / 3=③装飾（見なくても困らない）
const POPUP_CLASS = [
  ['^カキン！$', 1],                    // 狙い直しの要求（最高頻度）
  ['^よわてん！$', 1],                  // コア命中の成功通知＝狙い継続の指示
  ['^らいめいのあらし！！$', 1],
  ['^なかまをよんだ！$', 1],
  ['^かこのボスを よびだした！$', 1],
  ['^！！！$', 1],                      // 巨大弾チャージ
  ['^たいあたり！！$', 1],
  ['^なぎはらい！！$', 1],
  ['^ふみつけ！！$', 1],
  ['^パンチ！！$', 1],
  ['^いなずまのブレス！！$', 1],        // 炎ブレス（breathアクト）
  ['^らいこうレーザー！！$', 1],        // 薙ぎ払いビーム（beamアクト）。以前は炎ブレスと同一文言だった
  ['^こんとんのブレス！！$', 1],        // ティアマトのbeamアクト（breathName流用）
  ['^いかずちのかご！！$', 1],
  ['^ばんらいノヴァ！！$', 1],
  ['^ひっさつは', 1],                   // 「1ボスせんに5かいまで！」＝不可の通知
  ['^シールド！$', 1],
  ['^こおった！$', 2],
  ['^いとに からまった！$', 2],
  ['^ふっかつ！！$', 2],
  ['^のこり\\d+$', 2],                  // 傭兵の残りHP
  ['^ちからが みなぎる！', 3],
  ['^ひっさつわざ！！$', 3],
  ['^かいしん！$', 3],
  ['^ガード！$', 3],
  ['^すずのバリア！$', 3],
  ['^とげ はんげき！$', 3],
  ['^はじいた！$', 3],
  ['^かいふく！$', 3],
  ['^ゆうしゃLv\\d+！$', 3],
  ['^\\+\\d+$', 3],
  ['^！！$', 3],
  ['^たおれた…$', 3],
  ['^たいりょく上限アップ！$', 3],
];
const BANNER_CLASS = [
  ['しんの すがたに めざめる', 1],
  ['だいにけいたい！！', 1],
  ['が げきどした！！', 1],
  ['を よびだした！！', 1],
  ['^ぶんれつ！！', 1],
  ['^ぶきしんか！', 3],
  ['^すがたしんか！', 3],
  ['^ゆうしゃレベル', 3],
  ['ちからが かいほうされた', 3],
  ['^ぜんステージクリア', 3],
  ['^ステージ\\d+へ！', 3],
  ['^コンティニュー！', 3],
];

// ---------- サンドボックス内で走る本体（ホストの変数は一切参照しない） ----------
function probeMain(cfg) {
  const R = {
    seed: cfg.seed, frames: 0, exceptions: [], milestones: {}, unknownTexts: {},
    popupEvents: {}, events: {}, eventLayer: { 1: 0, 2: 0, 3: 0 },
    series: [], meta: {},
    telSig: 2166136261, telTotals: { strikes: 0, fences: 0, novas: 0, acts: 0 },
    telSysHist: {}, telSysMax: 0,
    // 山場（第2形態 or 激怒）とそれ以外で分けた同時系統数のヒストグラム。
    // infoLevel=2 の上限は「通常1／山場2」なので、2系統が山場だけで起きているかをこれで確かめる
    telSysHistPeak: {}, telSysHistNormal: {}, telSysMaxNormal: 0, telSysMaxPeak: 0,
    peakFrames: 0,
  };
  // 予告系の指紋（FNV-1a）。毎フレームの strikes/fences/novas/技予告の同時数を順番どおりに畳み込む。
  // 低情報モードは表示しか触らないので、同じシードならこの値は1ビットも変わらないはず。
  function fnv(h, s) {
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h;
  }
  const mk = (arr) => arr.map((p) => ({ re: new RegExp(p[0]), layer: p[1] }));
  const popupRules = mk(cfg.popupClass);
  const bannerRules = mk(cfg.bannerClass);
  const cache = {};
  function classify(rules, text, kind) {
    const ck = kind + ' ' + text;
    if (cache[ck]) return cache[ck];
    let lay = 0;
    for (const r of rules) { if (r.re.test(text)) { lay = r.layer; break; } }
    if (!lay) {
      R.unknownTexts[kind + ':' + text] = (R.unknownTexts[kind + ':' + text] || 0) + 1;
      lay = 3; // 未知の文言は装飾扱い（レポートに一覧を出す）
    }
    cache[ck] = lay;
    return lay;
  }
  const norm = (t) => String(t).replace(/\d+/g, 'N');
  function bumpEvent(name, layer) {
    const k = layer + '|' + name;
    R.events[k] = (R.events[k] || 0) + 1;
    R.eventLayer[layer]++;
  }

  // ===== フック1: addPopup（イベント発生数の記録だけ。挙動は素通し） =====
  // 数えるのは「呼ばれた回数」ではなく「実際にpopupsへ積まれた回数」＝画面に出たものだけ。
  // 低情報モードは addPopup の中で間引くので、呼び出し前に数えると間引きが見えなくなる。
  const origAddPopup = addPopup;
  let hooksLive = false;
  addPopup = function (x, y, text, color, size, keep) {
    const before = popups.length;
    const ret = origAddPopup(x, y, text, color, size, keep);
    if (hooksLive && popups.length > before) {
      try {
        const key = norm(text);
        R.popupEvents[key] = (R.popupEvents[key] || 0) + 1;
        bumpEvent('ポップアップ:' + key, classify(popupRules, String(text), 'popup'));
      } catch (err) { R.exceptions.push('addPopupフック: ' + err.message); }
    }
    return ret;
  };

  // ===== フック2: drawText（そのフレームに実際に描かれた文字列。点滅位相もHUDの有無もこれで確定） =====
  const origDrawText = drawText;
  let frameTexts = [];
  drawText = function (text, x, y, color, size) {
    if (hooksLive) frameTexts.push(String(text));
    return origDrawText(text, x, y, color, size);
  };
  const drawn = (needle) => frameTexts.some((t) => t.indexOf(needle) >= 0);

  // ===== プレイヤーの操作（キー入力を毎フレーム組み立てる。死なない程度に脅威を避けて動き回る） =====
  function drive() {
    keys.ArrowUp = keys.ArrowDown = keys.ArrowLeft = keys.ArrowRight = false;
    const p = playerCenter();
    let vx = 0, vy = 0;
    const push = (sx, sy, range, w) => {
      const dx = p.x - sx, dy = p.y - sy;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d < range) { vx += (dx / d) * ((range - d) / range) * w; vy += (dy / d) * ((range - d) / range) * w; }
    };
    for (const s of strikes) push(s.x, s.y, 95, 3);
    for (const nv of novas) push(nv.cx, nv.cy, nv.r + 30, 2);
    for (const fc of fences) {
      // 柵は線分。最寄り点から離れる（distToSegment は game.js の実装をそのまま使う）
      const d = distToSegment(p.x, p.y, fc.x1, fc.y1, fc.x2, fc.y2);
      if (d < 60) {
        const mx = (fc.x1 + fc.x2) / 2, my = (fc.y1 + fc.y2) / 2;
        const nx = fc.x1 === fc.x2 ? (p.x - mx) : 0;
        const ny = fc.y1 === fc.y2 ? (p.y - my) : 0;
        const nl = Math.sqrt(nx * nx + ny * ny) || 1;
        vx += (nx / nl) * 2.5; vy += (ny / nl) * 2.5;
      }
    }
    for (const e of enemies) {
      const ecx = e.x + e.size / 2, ecy = e.y + e.size / 2;
      push(ecx, ecy, e.boss ? 130 : 46, e.boss ? 2.2 : 0.8); // ボスからは離れて立ち回る（接触と巻き込みを避ける）
    }
    for (const f of fireballs) push(f.x, f.y, 40, 1.2);
    // 画面中央へのゆるい引力＋接線方向の周回（止まらず動き続ける＝現在地狙いの落雷をかわす）
    const dxc = W / 2 - p.x, dyc = H / 2 - p.y;
    const dc = Math.sqrt(dxc * dxc + dyc * dyc) || 1;
    vx += (dxc / dc) * 0.6 + (-dyc / dc) * 0.9;
    vy += (dyc / dc) * 0.6 + (dxc / dc) * 0.9;
    if (vx > 0.22) keys.ArrowRight = true; else if (vx < -0.22) keys.ArrowLeft = true;
    if (vy > 0.22) keys.ArrowDown = true; else if (vy < -0.22) keys.ArrowUp = true;
  }

  // ===== ボスへのダメージ（本体経路 damageBoss を通す。近接ヒットの後始末も本体と同じ形） =====
  // HPが「線形に targetFrames で0になる」線より上にいるときだけ殴る＝所要時間を約束どおりにする
  function attack(f) {
    const b = enemies.find((e) => e.boss && !e.summoned && !e.dying);
    if (!b) return;
    if (b.hitTimer > 0 || b.airborne) return;            // 本体の updateWeaponHits と同じ再ヒット待ち
    const schedHp = b.maxHp * Math.max(0, 1 - f / cfg.targetFrames);
    if (b.hp <= schedHp) return;                          // 予定より削れている＝この瞬間は攻撃しない
    const remain = Math.max(1, cfg.targetFrames - f);
    const expectHits = Math.max(1, (remain / cfg.hitPeriod) * cfg.pCore * 2); // コア命中のみ有効・2倍ダメージ
    // 1発で複数のしきい値（60%召喚・50%変身・25%激怒）をまたがないよう1発の上限を6%に抑える
    const dmg = Math.max(1, Math.min(b.maxHp * 0.06, b.hp / expectHits));
    let hx, hy;
    if (Math.random() < cfg.pCore) {
      const core = bossCorePos(b);                        // 弱点コアの座標も本体の関数から取る
      hx = core.x + (Math.random() - 0.5) * 24;
      hy = core.y + (Math.random() - 0.5) * 24;
    } else {
      const a = Math.random() * Math.PI * 2;
      hx = b.x + b.size / 2 + Math.cos(a) * b.size * 0.42;
      hy = b.y + b.size / 2 + Math.sin(a) * b.size * 0.42;
    }
    const dealt = damageBoss(b, dmg, hx, hy);
    if (dealt === 0) { b.hitTimer = 14; return; }         // カキン！＝弾かれた（本体 5188 と同じ）
    addSlash(hx, hy, Math.random() * Math.PI * 2);
    hitstopT = Math.min(6, hitstopT + 3);
    if (b.hp <= 0) killEnemy(b); else b.hitTimer = 18;
  }

  // ===== 1フレーム分の情報要素を数える =====
  const HUD_CONST = 8; // スコア/ぶき/ステージ/ゆうしゃLv/ゴールド/HPハート/ポーズボタン/必殺ゲージ（renderHUDで無条件）
  let prev = { banner: '', bannerT: 0, serifuT: 0, warnT: 0, strikes: 0, fences: 0, novas: 0, hurtFxT: 0, bossEvent: false };
  const actState = new Map();
  const flagState = new Map();

  function sample(f) {
    const it = {};
    const L = { 1: 0, 2: 0, 3: 0 };
    const add = (key, layer, n) => { if (n > 0) { it[key] = (it[key] || 0) + n; L[layer] += n; } };

    // --- ポップアップ（状態配列をそのまま読む） ---
    let p1 = 0, p2 = 0, p3 = 0;
    for (const p of popups) {
      const c = classify(popupRules, String(p.text), 'popup');
      if (c === 1) p1++; else if (c === 2) p2++; else p3++;
    }
    add('ポップアップ①', 1, p1); add('ポップアップ②', 2, p2); add('ポップアップ③', 3, p3);

    // --- 敵まわりを1回のスキャンで数える（同じ要素を2度数えないため） ---
    let actN = 0, giantN = 0, transN = 0, rageBurstN = 0, coreN = 0, ragedN = 0, subBar = 0, minion = 0;
    let actTelN = 0;
    let mainBoss = null;
    for (const e of enemies) {
      if (!e.boss) { minion++; continue; }
      if (!e.summoned && !mainBoss) mainBoss = e;
      if (e.summoned) subBar++;
      if (e.act) actN++;
      if (e.act && e.act.telOn !== false) actTelN++;
      if (e.giantCharge > 0) giantN++;
      if (e.transforming > 0) transN++;
      if (e.rageBurstT > 0) rageBurstN++;
      if (e.raged) ragedN++;
      if (!e.dying && e.type.gimmicks.indexOf('weakpoint') >= 0) coreN++;
    }

    // --- ①行動要求 ---
    if (bannerTimer > 0 && bannerText && drawn(bannerText)) {
      const c = classify(bannerRules, String(bannerText), 'banner');
      add(c === 1 ? 'バナー①' : 'バナー③', c, 1);
    }
    if (drawn('！！ WARNING ！！')) add('WARNING演出', 1, 1);
    if (drawn('スペースキーで ひっさつわざ！')) add('必殺プロンプト', 1, 1);
    if (drawn('ひかるコアをねらえ！')) add('コア指示ラベル', 1, 1);
    add('落雷予告(strikes)', 1, strikes.length);
    add('電気フェンス(fences)', 1, fences.length);
    add('ノヴァ(novas)', 1, novas.length);
    add('ボスの技予告(act)', 1, actN);
    add('巨大弾チャージ', 1, giantN);
    add('変身演出', 1, transN);
    add('激怒の咆哮', 1, rageBurstN);
    add('弱点コア', 1, coreN);

    // --- ②状態 ---
    const hudOn = drawn('スコア ');
    add('HUD常時8点', 2, hudOn ? HUD_CONST : 0);
    if (drawn('ひっさつ のこり')) add('必殺のこり回数', 2, 1);
    add('ボスHPバー', 2, mainBoss ? 1 : 0);
    add('召喚ボスの小HPバー', 2, subBar);
    add('被弾ビネット', 2, hurtFxT > 0 ? 1 : 0);
    add('激怒オーラ', 2, ragedN);

    // --- ③装飾 ---
    if (drawn('が あらわれた！')) add('セリフウィンドウ', 3, 1);
    add('撃破カットシーン', 3, bossEvent ? 1 : 0);
    add('白フラッシュ', 3, flashTimer > 0 ? 1 : 0);
    add('赤フラッシュ', 3, redFlashTimer > 0 ? 1 : 0);
    add('画面シェイク', 3, shakeTimer > 0 ? 1 : 0);
    add('ヒットストップ', 3, hitstopT > 0 ? 1 : 0);
    if (drawn(' コンボ！')) add('コンボ表示', 3, 1);
    if (drawn('BGM案:')) add('BGMデバッグ表示', 3, 1);
    // 稲妻の線（自分の武器の連鎖雷＋背景の遠雷）は本数が多くても「1つの光り物」として読むので1点で数える
    add('稲妻(bolts)', 3, bolts.length > 0 ? 1 : 0);

    // 予告系の指紋を更新（表示ではなくゲームプレイそのものの時系列）
    R.telSig = fnv(R.telSig, f + ':' + strikes.length + ',' + fences.length + ',' + novas.length + ',' + actN + ';');
    R.telTotals.strikes += strikes.length;
    R.telTotals.fences += fences.length;
    R.telTotals.novas += novas.length;
    R.telTotals.acts += actN;

    // 「同時に出ている予告の系統数」＝落雷/かご/ノヴァ/技予告/巨大弾チャージ のうち今フレームで予告中のもの。
    // infoLevel=2 なら通常時1以下・山場（第2形態/激怒）2以下に収まる（game.js の trialTelegraphCount と同じ状態を見る）
    const telSys = (strikes.length > 0 ? 1 : 0)
      + (fences.some((fc) => fc.t > 0) ? 1 : 0)
      + (novas.some((nv) => nv.delay > 0 || nv.tel > 0) ? 1 : 0)
      + actTelN + giantN;
    R.telSysHist[telSys] = (R.telSysHist[telSys] || 0) + 1;
    if (telSys > R.telSysMax) R.telSysMax = telSys;
    // 山場かどうかは game.js の trialTelegraphLimit と同じ状態（本体ボスの form2 / raged）で判定する
    const peak = !!(mainBoss && (mainBoss.form2 || mainBoss.raged));
    const ph = peak ? R.telSysHistPeak : R.telSysHistNormal;
    ph[telSys] = (ph[telSys] || 0) + 1;
    if (peak) { R.peakFrames++; if (telSys > R.telSysMaxPeak) R.telSysMaxPeak = telSys; }
    else if (telSys > R.telSysMaxNormal) R.telSysMaxNormal = telSys;

    const hpPct = mainBoss ? Math.max(0, mainBoss.hp / mainBoss.maxHp) * 100 : 0;
    R.series.push({
      f, hp: Math.round(hpPct * 10) / 10, l1: L[1], l2: L[2], l3: L[3], it,
      en: enemies.length, mi: minion, fb: fireballs.length, bo: bolts.length,
    });

    // --- イベント（層別の発生数）を状態のエッジから拾う。ポップアップはフック側で計上済み ---
    if (bannerTimer > 0 && (prev.bannerT === 0 || bannerText !== prev.banner)) {
      bumpEvent('バナー:' + norm(bannerText), classify(bannerRules, String(bannerText), 'banner'));
    }
    if (serifuTimer > 0 && prev.serifuT === 0) bumpEvent('セリフウィンドウ', 3);
    if (warningTimer > 0 && prev.warnT === 0) bumpEvent('WARNING演出', 1);
    if (strikes.length > prev.strikes) bumpEventN('落雷予告(strike)', 1, strikes.length - prev.strikes);
    if (fences.length > prev.fences) {
      bumpEventN('電気フェンス(fence)', 1, fences.length - prev.fences);
      if (mainBoss) markMilestone(mainBoss, 'cage', f); // いかずちのかご解禁＝HP80%以下
    }
    if (novas.length > prev.novas) bumpEventN('ノヴァ(nova)', 1, novas.length - prev.novas);
    if (hurtFxT > 0 && prev.hurtFxT === 0) bumpEvent('プレイヤー被弾', 2);
    if (bossEvent && !prev.bossEvent) bumpEvent('撃破カットシーン', 3);
    for (const e of enemies) {
      if (!e.boss) continue;
      const key = e;
      const kind = e.act ? e.act.kind : null;
      if (actState.get(key) !== kind) {
        if (kind) bumpEvent('ボスの技:' + kind, 1);
        actState.set(key, kind);
      }
      const fl = flagState.get(key) || {};
      if (e.giantCharge > 0 && !fl.giant) { bumpEvent('巨大弾チャージ', 1); fl.giant = true; }
      if (e.giantCharge <= 0) fl.giant = false;
      if (e.transforming > 0 && !fl.trans) { bumpEvent('変身開始', 1); fl.trans = true; markMilestone(e, 'transformStart', f); }
      if (e.form2 && !fl.form2) { bumpEvent('第2形態へ変身完了', 1); fl.form2 = true; if (!e.summoned) markMilestone(e, 'form2', f); }
      if (e.raged && !fl.raged) { bumpEvent('激怒', 1); fl.raged = true; if (!e.summoned) markMilestone(e, 'rage', f); }
      if (e.calledBoss && !fl.called) { bumpEvent('過去ボス召喚', 1); fl.called = true; markMilestone(e, 'callboss', f); }
      if (e.dying && !fl.dying) { fl.dying = true; if (!e.summoned) markMilestone(e, 'kill', f); }
      flagState.set(key, fl);
    }
    prev = {
      banner: bannerText, bannerT: bannerTimer, serifuT: serifuTimer, warnT: warningTimer,
      strikes: strikes.length, fences: fences.length, novas: novas.length,
      hurtFxT, bossEvent: !!bossEvent,
    };
  }
  function bumpEventN(name, layer, n) { for (let i = 0; i < n; i++) bumpEvent(name, layer); }
  function markMilestone(e, key, f) {
    if (R.milestones[key]) return;
    R.milestones[key] = { frame: f, hpPct: Math.round((e.hp / e.maxHp) * 1000) / 10 };
  }

  // ===== セットアップ: 28面（ライリュウ）を、終盤らしいスコア・武器で始める =====
  startGame();
  if (cfg.infoV2) {
    // ゲーム内でタイトルR→Iキー2回を押した状態と同じにする（startGameがtrialModeを落とすのでこの順序）
    trialMode = true;
    infoLevel = 2;
    lowInfoMode = true;
    trialSlotFreeAt = 0;
  }
  stage = LAST_STAGE;
  score = cfg.startScore;              // 28面到達時のスコア相当（nextBossScoreの積み上げから算出）
  weaponIdx = weaponForScore(score);
  formIdx = formForScore(score);
  nextBossScore = score + 1000000;     // 計測中に別のWARNINGが割り込まないようにする
  lives = maxLives();
  // ウォームアップ（ゆうしゃレベルのまとめ上げ演出などを計測前に消化する）
  for (let i = 0; i < cfg.warmupFrames; i++) { drive(); loop(); if (lives < 3) lives = maxLives(); }
  popups.length = 0; bannerTimer = 0; bannerText = ''; flashTimer = 0; shakeTimer = 0;

  // ===== 計測開始: WARNING演出からボス撃破カットシーンの終わりまで =====
  hooksLive = true;
  warningTimer = 120;  // ボス出現の警告からが「戦闘の情報」の始まり
  bossActive = false;
  let endHold = -1;
  let bossSeen = false;
  let f = 0;
  for (; f < cfg.maxFrames; f++) {
    try {
      if (lives < 3) lives = maxLives();  // 死なせない（プレイヤーが上手い前提。被弾そのものは止めない）
      drive();
      attack(f);
      frameTexts = [];
      loop();
      sample(f);
      const mb = enemies.find((e) => e.boss && !e.summoned);
      if (mb) { bossSeen = true; if (!R.meta.bossSprite) { R.meta.bossSprite = mb.type.sprite; R.meta.bossName = mb.type.name; R.meta.bossMaxHp = mb.maxHp; } }
      else if (bossSeen && !R.milestones.death) R.milestones.death = { frame: f, hpPct: 0 };
      if (R.milestones.death && !bossEvent && !enemies.some((e) => e.boss)) {
        if (endHold < 0) endHold = 60;
        else if (--endHold <= 0) { f++; break; }
      }
      if (state !== 'playing' && R.milestones.death) { f++; break; }
    } catch (err) {
      R.exceptions.push('frame ' + f + ': ' + (err && err.stack ? String(err.stack).split('\n').slice(0, 2).join(' | ') : String(err)));
      if (R.exceptions.length > 20) { f++; break; }
    }
  }
  R.frames = f;
  R.meta = Object.assign(R.meta, {
    stage, lastStage: LAST_STAGE, finalClear, state,
    hudConst: HUD_CONST,
    startScore: cfg.startScore, endScore: score,
    weapon: WEAPONS[weaponIdx].name, heroLevel: hero.level,
  });
  return R;
}

// ---------- 統計ヘルパ ----------
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
const half = (a) => (a.length ? (Math.max(...a) - Math.min(...a)) / 2 : 0);
const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
const pct = (v) => (Math.round(v * 1000) / 10).toFixed(1) + '%';

function layerStats(series, key) {
  const vals = series.map((s) => s[key]);
  const n = vals.length || 1;
  const ge = (k) => vals.filter((v) => v >= k).length / n;
  return { max: Math.max(...vals, 0), mean: mean(vals), ge3: ge(3), ge5: ge(5), ge8: ge(8) };
}

// ---------- 実行 ----------
console.log('=== 計測条件 ===');
console.log(`対象: ${path.basename(SRC_PATH)} の28面（ライリュウ）／WARNING演出から撃破カットシーン終了まで`);
console.log(`モード: ${INFO_V2 ? 'おためしv2（trialMode=true / infoLevel=2＝こうげき ととのえ）'
  : (LOW_INFO ? '低情報モード（lowInfoMode=true）' : '通常モード（lowInfoMode=false）')}`);
console.log('数え方: 「同時に画面へ出ている情報要素の数」を毎フレーム集計。①行動要求／②状態／③装飾の3層。');
console.log('  ・ポップアップ/予告/タイマー類はゲーム本体の状態をそのまま読む（条件式の再実装なし）');
console.log('  ・HUDの常時要素は8点の定数（スコア/ぶき/ステージ/ゆうしゃLv/ゴールド/HPハート/ポーズ/必殺ゲージ）');
console.log('  ・点滅する表示（バナー・WARNING・必殺プロンプト等）は drawText フックで「実際に描かれたフレーム」だけ数える');
console.log('  ・敵キャラ本体・敵弾・パーティクルは「読む情報」ではなくゲーム対象として層外に別集計（ピーク行の 敵N体/敵弾N発）');
console.log('  ・稲妻(bolts)は本数によらず1点。1要素を2つの経路で数えない');
console.log('操作: プローブ側の自動プレイ（脅威から離れつつ中央を周回）。lives は3未満で補充＝死なせないが被弾は止めない\n');
const results = [];
let totalExceptions = 0;
for (const seed of SEEDS) {
  const cfg = {
    seed,
    popupClass: POPUP_CLASS,
    bannerClass: BANNER_CLASS,
    startScore: 186600,   // 3000 + Σ(4000 + 200s) s=1..27 ＝ 28面到達時のボス出現しきい値
    warmupFrames: 150,
    targetFrames: 7200,   // HP100%→0% を約120秒（90〜150秒の中央）で削る
    hitPeriod: 16,        // 本体の再ヒット待ち（当たり18f／弾かれ14f）の平均
    pCore: 0.35,          // 攻撃のうち弱点コアに当たる割合（プローブの前提値）
    maxFrames: 14000,
    infoV2: INFO_V2,      // おためしモード相当＋infoLevel=2（プローブ本体の startGame 直後に立てる）
  };
  let R;
  try {
    const run = makeSandbox(seed);
    // 低情報モードはグローバルを立てるだけ（ゲーム側でIキーを1回押した状態と同じ）。
    // startGame() が infoLevel と lowInfoMode を同期し直すので、両方を立てておく必要がある
    if (LOW_INFO) run('infoLevel = 1; lowInfoMode = true;');
    R = run('(' + probeMain.toString() + ')(' + JSON.stringify(cfg) + ')');
  } catch (err) {
    R = { seed, frames: 0, exceptions: ['起動失敗: ' + (err.stack || err)], series: [], milestones: {}, events: {}, popupEvents: {}, eventLayer: { 1: 0, 2: 0, 3: 0 }, unknownTexts: {}, meta: {}, telSig: 0, telTotals: {}, telSysHist: {}, telSysMax: 0 };
  }
  totalExceptions += R.exceptions.length;
  results.push(R);
  const m = R.milestones;
  const sec = (x) => (x ? f1(x.frame / 60) + 's' : '—');
  console.log(
    `シード${seed}: ${R.frames}フレーム(${f1(R.frames / 60)}秒) ボス=${R.meta.bossSprite || '不在'} ` +
    `かご80%=${sec(m.cage)} 召喚60%=${sec(m.callboss)} 変身開始=${sec(m.transformStart)} 第2形態=${sec(m.form2)} 激怒=${sec(m.rage)} トドメ=${sec(m.kill)} 演出終了=${sec(m.death)} ` +
    `EXCEPTIONS=${R.exceptions.length}`
  );
  console.log(
    `  予告系: TELSIG=${(R.telSig >>> 0).toString(16)} ` +
    `のべ 落雷${R.telTotals.strikes}f・フェンス${R.telTotals.fences}f・ノヴァ${R.telTotals.novas}f・技予告${R.telTotals.acts}f`
  );
  {
    const show = (h) => {
      const tot = Object.keys(h).reduce((s, k) => s + h[k], 0) || 1;
      return Object.keys(h).sort((a, b) => a - b).map((k) => `${k}系統=${pct(h[k] / tot)}`).join(' ');
    };
    console.log(`  予告の同時系統数: 最大${R.telSysMax} / ${show(R.telSysHist || {})}`);
    console.log(`    通常時(最大${R.telSysMaxNormal}): ${show(R.telSysHistNormal || {})}`);
    console.log(`    山場=第2形態/激怒(最大${R.telSysMaxPeak}): ${show(R.telSysHistPeak || {})}`);
  }
  for (const e of R.exceptions.slice(0, 5)) console.log('    ! ' + e);
}

// ---------- サマリ ----------
const ok = results.filter((r) => r.series.length > 0);
console.log('\n=== 情報負荷サマリ ===');
console.log('（3シード 42/123/999 の平均±幅。「幅」は(最大-最小)/2）');
console.log('層              同時最大        平均            ≥3の時間割合    ≥5            ≥8');
const LAYER_LABEL = { l1: '①行動要求', l2: '②状態    ', l3: '③装飾    ' };
const stats = {};
for (const key of ['l1', 'l2', 'l3']) {
  const per = ok.map((r) => layerStats(r.series, key));
  stats[key] = per;
  const g = (fn) => `${f1(mean(per.map(fn)))}±${f1(half(per.map(fn)))}`;
  const gp = (fn) => `${pct(mean(per.map(fn)))}`;
  console.log(
    `${LAYER_LABEL[key]}      ${g((s) => s.max).padEnd(14)}  ${g((s) => s.mean).padEnd(14)}  ` +
    `${gp((s) => s.ge3).padEnd(14)}  ${gp((s) => s.ge5).padEnd(12)}  ${gp((s) => s.ge8)}`
  );
}
{
  const per = ok.map((r) => layerStats(r.series.map((s) => ({ t: s.l1 + s.l2 + s.l3 })), 't'));
  stats.total = per;
  const g = (fn) => `${f1(mean(per.map(fn)))}±${f1(half(per.map(fn)))}`;
  console.log(`合計          ${g((s) => s.max).padEnd(14)}  ${g((s) => s.mean).padEnd(14)}  ` +
    `${pct(mean(per.map((s) => s.ge3))).padEnd(14)}  ${pct(mean(per.map((s) => s.ge5))).padEnd(12)}  ${pct(mean(per.map((s) => s.ge8)))}`);
}

// ---------- ピーク Top5（3シード通し・合計数の多い順。1シードあたり上位から拾う） ----------
console.log('\n=== ピーク Top5（同時表示の合計が多かった瞬間） ===');
const allPeaks = [];
for (const r of ok) {
  const sorted = r.series.slice().sort((a, b) => (b.l1 + b.l2 + b.l3) - (a.l1 + a.l2 + a.l3));
  const picked = [];
  for (const s of sorted) {                       // 同一シーンの連続フレームで埋まらないよう90f以上離す
    if (picked.every((p) => Math.abs(p.f - s.f) > 90)) picked.push(s);
    if (picked.length >= 5) break;
  }
  for (const s of picked) allPeaks.push({ seed: r.seed, ...s });
}
allPeaks.sort((a, b) => (b.l1 + b.l2 + b.l3) - (a.l1 + a.l2 + a.l3));
const topPeaks = allPeaks.slice(0, 5);
topPeaks.forEach((p, i) => {
  const detail = Object.keys(p.it).map((k) => `${k}×${p.it[k]}`).join(' / ');
  console.log(`${i + 1}. seed${p.seed} フレーム${p.f}(${f1(p.f / 60)}秒) ボスHP${f1(p.hp)}% 合計${p.l1 + p.l2 + p.l3}点（①${p.l1} ②${p.l2} ③${p.l3}）敵${p.en}体 敵弾${p.fb}発`);
  console.log(`   内訳: ${detail}`);
});

// ---------- 文言別の出現回数ランキング ----------
console.log('\n=== 文言別の出現回数ランキング（ポップアップ・3シード合計／1戦あたり平均） ===');
const popAgg = {};
for (const r of ok) for (const k of Object.keys(r.popupEvents)) popAgg[k] = (popAgg[k] || 0) + r.popupEvents[k];
const popRank = Object.keys(popAgg).sort((a, b) => popAgg[b] - popAgg[a]);
for (const k of popRank) {
  const lay = (function () {
    for (const [re, l] of POPUP_CLASS) if (new RegExp(re).test(k.replace(/N/g, '1'))) return l;
    return 3;
  })();
  console.log(`  ${('①②③'[lay - 1])} ${k.padEnd(24)} ${String(popAgg[k]).padStart(5)}回 (1戦 ${f1(popAgg[k] / ok.length)}回)`);
}

// ---------- 1分あたりのイベント発生数 ----------
console.log('\n=== 1分あたりのイベント発生数（層別） ===');
const minutes = ok.map((r) => r.frames / 3600);
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
  const [lay, name] = k.split('|');
  console.log(`    ${'①②③'[lay - 1]} ${name.padEnd(30)} ${String(evAgg[k]).padStart(5)}回`);
});

// ---------- 未知の文言（分類表に無いもの） ----------
const unkAgg = {};
for (const r of ok) for (const k of Object.keys(r.unknownTexts)) unkAgg[k] = (unkAgg[k] || 0) + r.unknownTexts[k];
const unkKeys = Object.keys(unkAgg);
if (unkKeys.length) {
  console.log('\n=== 分類表に無かった文言（③として集計。要確認） ===');
  for (const k of unkKeys.slice(0, 20)) console.log(`  ${k} (${unkAgg[k]})`);
} else {
  console.log('\n分類表に無い文言はなし（UNKNOWN_TEXTS=0）');
}

// ---------- JSON 出力 ----------
const json = {
  generatedAt: new Date().toISOString(),
  target: path.basename(SRC_PATH),
  lowInfoMode: LOW_INFO,
  mode: MODE_LABEL,
  seeds: SEEDS,
  note: '層の定義: ①行動要求／②状態／③装飾。敵本体・敵弾・パーティクルは「読む情報」ではなくゲーム対象として層外に別集計（en/mi/fb）。',
  layerSummary: ['l1', 'l2', 'l3'].reduce((o, k) => {
    o[k] = { perSeed: stats[k], mean: { max: mean(stats[k].map((s) => s.max)), mean: mean(stats[k].map((s) => s.mean)), ge3: mean(stats[k].map((s) => s.ge3)), ge5: mean(stats[k].map((s) => s.ge5)), ge8: mean(stats[k].map((s) => s.ge8)) } };
    return o;
  }, {}),
  totalSummary: stats.total,
  peaks: topPeaks,
  popupRanking: popRank.map((k) => ({ text: k, count: popAgg[k], perRun: popAgg[k] / (ok.length || 1) })),
  eventsPerMinute: [1, 2, 3].reduce((o, lay) => { o[lay] = mean(ok.map((r, i) => r.eventLayer[lay] / minutes[i])); return o; }, {}),
  eventTotals: evAgg,
  unknownTexts: unkAgg,
  runs: results.map((r) => ({
    seed: r.seed, frames: r.frames, meta: r.meta, milestones: r.milestones,
    exceptions: r.exceptions, eventLayer: r.eventLayer,
    telSig: (r.telSig >>> 0).toString(16), telTotals: r.telTotals,
    telSysHist: r.telSysHist, telSysMax: r.telSysMax,
    telSysHistNormal: r.telSysHistNormal, telSysHistPeak: r.telSysHistPeak,
    telSysMaxNormal: r.telSysMaxNormal, telSysMaxPeak: r.telSysMaxPeak, peakFrames: r.peakFrames,
    // 時系列は5フレームおきに間引いて保存（内訳itは容量が大きいので落とす）
    seriesEvery5: r.series.filter((s) => s.f % 5 === 0).map((s) => [s.f, s.hp, s.l1, s.l2, s.l3, s.en, s.fb]),
  })),
};
fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(json, null, 2), 'utf8');
console.log(`\n詳細JSON: ${OUT_JSON}`);

// ---------- 固定トークン ----------
let allOk = ok.length === SEEDS.length;
for (const r of results) {
  const m = r.milestones;
  const need = ['cage', 'callboss', 'transformStart', 'form2', 'rage', 'kill', 'death'];
  const miss = need.filter((k) => !m[k]);
  if (miss.length) { allOk = false; console.log(`NG  シード${r.seed}: 未到達のしきい値 → ${miss.join(', ')}`); }
  const secs = r.frames / 60;
  if (secs < 90 || secs > 200) { allOk = false; console.log(`NG  シード${r.seed}: 戦闘時間が想定外 ${f1(secs)}秒`); }
  console.log(`SEED=${r.seed} EXCEPTIONS=${r.exceptions.length} TELSIG=${(r.telSig >>> 0).toString(16)} TELSYSMAX=${r.telSysMax}`);
}
console.log(`MODE=${MODE_LABEL} TELSIG_ALL=${results.map((r) => (r.telSig >>> 0).toString(16)).join('/')}`);
if (INFO_V2) {
  // 整理が効いていれば、同時系統数は「通常時1以下・山場（第2形態/激怒）2以下」に収まるはず
  const worstN = Math.max(...results.map((r) => r.telSysMaxNormal));
  const worstP = Math.max(...results.map((r) => r.telSysMaxPeak));
  const sum = (h, f) => Object.keys(h).filter(f).reduce((s, k) => s + h[k], 0);
  const zero = results.map((r) => (r.telSysHist[0] || 0) / (r.frames || 1));
  const two = results.map((r) => sum(r.telSysHist, (k) => +k >= 2) / (r.frames || 1));
  const twoN = results.map((r) => sum(r.telSysHistNormal, (k) => +k >= 2) / (r.frames || 1));
  console.log(`ZEROSYS=${pct(mean(zero))} TWOSYS=${pct(mean(two))} TWOSYS_NORMAL=${pct(mean(twoN))}`);
  console.log((worstN <= 1 && worstP <= 2) ? 'SERIALIZED_OK'
    : `SERIALIZED_NG（通常時の最大 ${worstN} / 山場の最大 ${worstP}）`);
}
console.log(allOk && totalExceptions === 0 ? 'PROBE_OK' : 'PROBE_NG');
console.log(`EXCEPTIONS=${totalExceptions}`);
process.exit(allOk && totalExceptions === 0 ? 0 : 1);
