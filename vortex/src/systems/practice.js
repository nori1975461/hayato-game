// systems/practice.js — れんしゅうじょう（本編とは別モード）。
//
// 実プレイFB「通常プレイだと敵の攻撃が激しくて確認に集中できない」「①紫の輪＝掴めない
// ②ボンバは溜められない が、プレイ中はよくわからない。まず事実を確認したい」。
//
// ★方針：**本編の実装をそのまま動かす**。ここで仕組みを作り直すと「練習では起きるのに
//   本編では起きない」を見逃す（R25で断末魔が9%しか完走していなかったのと同じ罠）。
//   このファイルがやるのは「状況を用意して、いま何が起きているかを画面に出す」ことだけ。
//
// コース：
//   ① いっき撃破の音  … 動かない敵の壁へ投げ込む。0キーで 標準/全開/ひかえめ/切 を聴き比べ
//   ② むらさきの わ    … よろけ＋断末魔を1体だけ用意。「つかめる／つかめない」を頭上に常時表示
//   ③ ボンバの どうかせん … ボンバだけを用意。溜めると手の中で爆発することを体で確かめる
import { BALANCE } from '../data/balance.js';
import { ENEMIES } from '../data/enemies.js';

const COURSES = [
  { key: 'crush', title: '① いっきに たおす おと',
    hint: '0キー で おとを きりかえ　→ かたまりへ なげこむ' },
  { key: 'throe', title: '② むらさきの わ が でたら つかめない',
    hint: 'むらさきの あいだに つかむと ビリッと はじかれる。よけてから つかむ' },
  { key: 'fuse',  title: '③ ボンバは ためられない',
    hint: 'つかんだら すぐ なげろ。まにあえば ばくだんの たまに なる' },
];

export function createPractice(run) {
  const byId = (id) => ENEMIES.find((d) => d.id === id);
  const st = {
    course: 0,
    tgt: null,          // ②③の主役（1体だけ）
    cluster: [],        // ①の的
    respawnT: 0,
    lastCrush: 0, crushMax: 0,
    fired: 0, dodged: 0, hurt: 0, grabbed: 0,
    lastBooms: 0, wasHeld: false, handBooms: 0, safeThrows: 0,
    // ⚠️ 累計カウンタは「今の値 - コース開始時の値」で出す。差分を取らずに素の値を出すと
    //    コースを切り替えても数字が戻らない（③で同じ罠を踏んだので最初からこの形にする）。
    blocked0: 0, bombHits0: 0,
    hitAt: -99,
    prev: { throe: false, active: false },
  };

  // ---- 画面表示（下段の帯）----
  const W = BALANCE.view.width, H = BALANCE.view.height;
  const panel = run.add.rectangle(W / 2, H - 30, W, 60, 0x000000, 0.62)
    .setScrollFactor(0).setDepth(78);
  const mk = (y, size, color) => run.add.text(W / 2, y, '', {
    fontFamily: 'monospace', fontSize: size + 'px', color,
  }).setOrigin(0.5).setScrollFactor(0).setDepth(79);
  const lineTitle = mk(H - 46, 15, '#ffe066');
  const lineHint = mk(H - 28, 12, '#7fffcf');
  const lineStat = mk(H - 12, 12, '#ffffff');
  // ⚠️ 上段は HP バーとモビット枠で埋まっている。操作の案内は下の帯のすぐ上に置く。
  const keys = run.add.text(W / 2, H - 64, '1 2 3 = コース　N = だしなおす　Q = タイトル', {
    fontFamily: 'monospace', fontSize: '11px', color: '#8899bb',
    backgroundColor: '#000000aa', padding: { x: 4, y: 1 },
  }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(79);

  // 主役の頭上に出す「つかめる／つかめない」。②の本体はここ。
  const tag = run.add.text(0, 0, '', {
    fontFamily: 'monospace', fontSize: '13px', color: '#ffffff',
    backgroundColor: '#000000cc', padding: { x: 4, y: 2 },
  }).setOrigin(0.5, 1).setDepth(40).setVisible(false);

  // ★一気撃破が「何体ぶん鳴ったか」を拾う。crushFinale は2体未満でも呼ばれて即returnするので、
  //   鳴る条件（minGroup以上）を満たしたときだけ数える（R27の教訓）。
  const origFinale = run.crushFinale.bind(run);
  run.crushFinale = (n, x, y) => {
    if (n >= BALANCE.crush.minGroup) { st.lastCrush = n; if (n > st.crushMax) st.crushMax = n; }
    origFinale(n, x, y);
  };

  const kb = run.input.keyboard;
  kb.on('keydown-ONE', () => setCourse(0));
  kb.on('keydown-TWO', () => setCourse(1));
  kb.on('keydown-THREE', () => setCourse(2));
  kb.on('keydown-N', () => setup());
  kb.on('keydown-Q', () => run.scene.start('Title'));

  function setCourse(i) {
    if (st.course === i) { setup(); return; }
    st.course = i;
    st.lastCrush = 0; st.crushMax = 0;
    st.fired = 0; st.dodged = 0; st.hurt = 0; st.grabbed = 0;
    st.handBooms = 0; st.safeThrows = 0;
    st.blocked0 = run.billiard.st.blocked || 0;
    st.bombHits0 = run.billiard.st.bombHits || 0;
    setup();
  }

  function clearField() {
    // 撃破ではなく「片付ける」。active を落とすと Run 側の compact が同じフレームで
    // releaseEnemy（よろけリングや王冠の後始末）まで通してプールへ返す。
    for (const e of run.enemies) if (e.active) e.active = false;
    st.cluster.length = 0;
    st.tgt = null;
    tag.setVisible(false);
  }

  // 動かない・撃ってこない的。①の壁と③の周りに使う。
  function place(def, x, y, hpMult) {
    const e = run.spawnEnemy(def, x, y, false, hpMult || 1);
    if (!e) return null;
    e.speed = 0;
    e.atkT = 1e9;
    e.atkState = 'ready';
    return e;
  }

  function setup() {
    clearField();
    st.respawnT = 0;
    const px = run.player.x, py = run.player.y;
    const C = COURSES[st.course].key;
    if (C === 'crush') {
      // 動かない敵の壁。毎回まったく同じ並びにする（音を聴き比べるので条件を揃える）
      const chibit = byId('chibit');
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const e = place(chibit, px + 140 + col * 22, py - 42 + row * 28);
          if (e) st.cluster.push(e);
        }
      }
      // 弾。貫通できるように「おもい」段（ガレオン）を1体、よろけた状態で足元に置く。
      // ①では wantThroe() が false なので断末魔（むらさきの わ）は起きない＝すぐ掴める。
      // ★HPが高い個体を弾にする＝貫通が伸びて 8体以上の一気撃破（スローモーションが入る帯）まで届く。
      //   本編でこの帯は16秒に1回しか来ないので、聴き比べのために意図的に届かせる。
      const ammo = place(byId('gareon'), px - 46, py, 3);
      if (ammo) run.enterStagger(ammo);
      st.tgt = ammo;
    } else if (C === 'throe') {
      // 断末魔つきの1体だけ。maxActive=1 の枠を確実に空けてから起こす
      for (const o of run.enemies) if (o.active) { o.throe = false; o.guardT = 0; }
      run._throeT = -99;
      // ★R29W2 旧実装は px+120。掴める距離は78pxなので、0.85秒の窓のうち0.28秒は
      //   歩いているだけで過ぎていた（＝「つかめない」を試す時間が短かった）。
      //   練習場は条件を体験させる場所なので、最初から手が届く位置に置く。
      const e = place(byId('gareon'), px + 70, py);
      if (e) run.enterStagger(e);
      st.tgt = e;
    } else {
      run._throeT = -99;
      const e = place(byId('bomba'), px + 54, py);
      if (e) run.enterStagger(e);
      st.tgt = e;
      st.lastBooms = run.billiard.st.handBooms;
      st.wasHeld = false;
    }
    if (st.tgt) st.prev = { throe: !!st.tgt.throe, active: true };
  }

  // ①（音を聴き比べるコース）では断末魔を混ぜない。②③では本編どおり起こす。
  function wantThroe() { return COURSES[st.course].key !== 'crush'; }

  // 被弾したことを覚えておく（②で「よけたか／くらったか」を判定する）
  function onHit() { st.hitAt = run.elapsed; }

  function updateThroe(dt) {
    const e = st.tgt;
    if (!e) return;
    if (e.active) {
      const guarded = !!(e.throe && e.guardT > 0);
      tag.setVisible(true)
        .setPosition(e.x, e.y - (e.radius || 12) - 10)
        .setText(guarded ? 'つかめない！' : 'つかめる')
        .setColor(guarded ? '#ff6ec7' : '#7fffcf');
      // 予告が終わって撃った瞬間＝「1発avoidしてから掴む」の分かれ目
      if (st.prev.throe && !e.throe) {
        st.fired++;
        run.time.delayedCall(500, () => {
          if (run.elapsed - st.hitAt < 0.9) st.hurt++; else st.dodged++;
        });
      }
      st.prev.throe = !!e.throe;
    } else {
      if (st.prev.active) { st.grabbed++; st.prev.active = false; tag.setVisible(false); }
      st.respawnT = (st.respawnT > 0) ? st.respawnT - dt : 1.2;
      if (st.respawnT <= 0) setup();
    }
  }

  function updateFuse(dt) {
    const B = run.billiard.st;
    const F = BALANCE.deathThroe.fuse;
    const e = st.tgt;
    if (e && e.active) {
      // ★地面に落ちている間は導火線を止める。本編では拾うまでの1秒で自分から爆発してしまい、
      //   「手の中で燃える」ところまで辿り着けないことが多い（実測：発火0回／掴まれて消滅37%）。
      //   ここで止めるのは**用意の仕方**だけで、手に持ってからの処理は本編そのまま。
      if (e.throe) e.atkT = Math.max(e.atkT, F.sec);
      tag.setVisible(true)
        .setPosition(e.x, e.y - (e.radius || 12) - 10)
        .setText('つかんだら すぐ なげろ')
        .setColor('#ff8a3d');
    } else if (B.held) {
      // 手の中で燃えている残り時間を数字でも出す（耳と目だけだと「よくわからない」の元）
      tag.setVisible(true)
        .setPosition(run.player.x, run.player.y - 34)
        .setText('どうかせん ' + Math.max(0, B.held.fuse || 0).toFixed(1) + 'びょう')
        .setColor('#ff4020');
    } else {
      tag.setVisible(false);
    }

    // 手から消えた瞬間に、爆発したのか投げ切ったのかを1回だけ数える。
    // ⚠️ 「今の値 - 開始時の値」で出すと、出し直すたびに基準が上書きされて常に0に戻る（実際に踏んだ）。
    const held = !!B.held;
    if (st.wasHeld && !held) {
      if (B.handBooms > st.lastBooms) { st.handBooms++; st.lastBooms = B.handBooms; }
      else st.safeThrows++;
    }
    st.wasHeld = held;

    if (!e || !e.active) {
      if (!held) {
        st.respawnT = (st.respawnT > 0) ? st.respawnT - dt : 1.0;
        if (st.respawnT <= 0) setup();
      }
    }
  }

  function updateCrush(dt) {
    let alive = 0;
    for (const e of st.cluster) if (e.active) alive++;
    const ammo = st.tgt && st.tgt.active;
    if (alive === 0 || (!ammo && !run.billiard.st.held && run.billiard.st.shots.length === 0)) {
      st.respawnT = (st.respawnT > 0) ? st.respawnT - dt : 1.0;
      if (st.respawnT <= 0) setup();
    }
  }

  function update(dt) {
    const C = COURSES[st.course];
    if (C.key === 'throe') updateThroe(dt);
    else if (C.key === 'fuse') updateFuse(dt);
    else updateCrush(dt);

    lineTitle.setText(C.title);
    lineHint.setText(C.hint);
    if (C.key === 'crush') {
      const p = run.crushPreset();
      lineStat.setText('おと：' + p.name + '（0キー）　さいご：' + (st.lastCrush || '-')
        + '体　さいこう：' + (st.crushMax || '-') + '体');
    } else if (C.key === 'throe') {
      lineStat.setText('とんできた：' + st.fired + '　よけた：' + st.dodged
        + '　くらった：' + st.hurt + '　つかんだ：' + st.grabbed
        + '　はじかれた：' + (run.billiard.st.blocked - st.blocked0));
    } else {
      lineStat.setText('てのなかで ばくはつ：' + st.handBooms
        + '　ばくだんで なげた：' + Math.max(0, st.safeThrows)
        + '　ばくはつ させた：' + (run.billiard.st.bombHits - st.bombHits0));
    }
  }

  function destroy() {
    run.crushFinale = origFinale;
    panel.destroy(); lineTitle.destroy(); lineHint.destroy(); lineStat.destroy();
    keys.destroy(); tag.destroy();
  }

  setup();
  return { update, onHit, destroy, setCourse, wantThroe, st };
}
