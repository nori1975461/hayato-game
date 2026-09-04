// scenes/Title.js — ロゴと開始待ち。最初の入力で Sound.init して Run へ（PROTOTYPE_SPEC §5.2）。
import { Sound } from '../audio/sound.js';
import { BUILD } from '../data/version.js';

const Phaser = window.Phaser;

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    // シーンインスタンスは scene.start() で再利用されるため、再入のたびに開始フラグを戻す
    this._started = false;
    const W = 640, H = 360;
    this.cameras.main.setBackgroundColor('#0a0a1e');

    // 背景の星（軽い装飾）
    const bg = this.add.tileSprite(W / 2, H / 2, W, H, 'stars1');
    bg.setAlpha(0.7);
    this.bg = bg;

    // ロゴ。★R44W2 実プレイFB「クルット・モビットの文字の色がピンク色がいまいち」。
    //   ピンクの縁取りは飴玉の記号＝同じFBで否定された「かわいさ」そのものだった。
    //   金属生命体と戦う話に合わせて **打ち出した金属**にする：熾火（ember）の外縁と
    //   焦げた芯の二重の縁取り。Text の stroke は1本しか持てないので2枚重ねで作る。
    const LOGO = 'クルット・モビット';
    const logoHalo = this.add.text(W / 2, 112, LOGO, {
      fontFamily: 'monospace', fontSize: '34px', color: '#ff7a2a',
      fontStyle: 'bold', stroke: '#ff7a2a', strokeThickness: 11,
    }).setOrigin(0.5).setAlpha(0.55);
    const logo = this.add.text(W / 2, 112, LOGO, {
      fontFamily: 'monospace', fontSize: '34px', color: '#ffd76a',
      fontStyle: 'bold', stroke: '#2a1408', strokeThickness: 5,
    }).setOrigin(0.5);
    this.tweens.add({ targets: [logo, logoHalo], scale: 1.06, duration: 900,
      yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // ★R44W2「〜 KURUTTO MOBIT 〜 も現在の世界観にあわない」。ローマ字の副題は
    //   遊びの中身を何も言っていなかった。看板の動詞をそのまま副題にする＝
    //   タイトルを見ただけで「何をするゲームか」が分かる。
    this.add.text(W / 2, 156, 'つかんで ためて なげかえせ', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffcf9a',
    }).setOrigin(0.5);

    // ★R44W2「主人公の周囲をモビット達がまわっているのもいまいち」。
    //   公転は「連れて回っているマスコット」の絵で、オープニングで打ち出した
    //   「並んで戦う種族」と食い違っていた。→ **隊列**へ。主人公を中心に左右へ2体ずつ、
    //   同じ地面に立って正面を向く。動きは呼吸だけ（振幅2px・位相をずらす）。
    const demo = this.add.image(W / 2, 236, 'player_1').setScale(3.2);
    this.squad = [];
    const SQUAD = ['mon_togeron', 'mon_starpuppy', 'mon_terabit', 'mon_samet'];
    const SQUAD_X = [-122, -64, 64, 122];
    for (let i = 0; i < SQUAD.length; i++) {
      const x = W / 2 + SQUAD_X[i];
      const g = this.add.image(x, 250, 'glow').setBlendMode(Phaser.BlendModes.ADD)
        .setScale(1.1).setAlpha(0.45).setTint(0xffb27a);
      const spr = this.add.image(x, 248, SQUAD[i]).setScale(2.0);
      this.squad.push({ g, spr, x, y: 248, phase: i * 1.3 });
    }

    this.add.text(W / 2, 322, 'T キー で れんしゅうじょう（あたらしい しくみを ためす）', {
      fontFamily: 'monospace', fontSize: '12px', color: '#7fffcf',
    }).setOrigin(0.5);
    // ★おためしモードの入口。実プレイFB「画面内に情報量が多くて処理しきれない」を
    //   短いループで比べるための場所なので、切替キー(I)まで含めてここに書いておく
    //   （本編を1周してから気づく作りだと、比べる前に疲れる）。
    this.add.text(W / 2, 336, 'R キー で 1めんボス おためし（I キーで じょうほうりょう きりかえ）', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffcd75',
    }).setOrigin(0.5);
    // ★R57 すっきりモードの入口。おためし(R)は1面で終わるので「本編を最後まですっきりで遊ぶ」が
    //   できなかった。感想をもらうには本編を通しで遊べる必要があるので、専用の入口を分ける。
    this.add.text(W / 2, 350, 'S キー で ほんぺんを がめんすっきりで あそぶ', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffcd75',
    }).setOrigin(0.5);

    // 版番号。実プレイFB「私が見てるURLが違うのか？」への恒久対策。
    // ここの数字が src/data/version.js の BUILD と違えば、それは間違いなくブラウザのキャッシュ。
    this.add.text(6, H - 5, 'v' + BUILD, {
      fontFamily: 'monospace', fontSize: '10px', color: '#40506a',
    }).setOrigin(0, 1);

    // ★R57 一度 S キーで入ったら、そのあとは SPACE でもすっきりのまま始まる。
    //   ⚠️ これは飾りではなく**テストを守るための仕掛け**。死ぬと リザルト→タイトル へ戻るので、
    //      戻った先で点滅している「SPACE でスタート」を押すと、本人は気づかないまま
    //      **ふつうの画面で遊び続けてしまう**＝感想がどちらの話か分からなくなる。
    //      いま何で始まるのかを必ず文字に出し、戻す手段（N キー）も同じ行に書く。
    const sticky = !!(window.VORTEX && window.VORTEX.tidySticky);
    const prompt = this.add.text(W / 2, 306,
      sticky ? 'SPACE で スタート（がめん すっきり）　N キーで ふつうに もどす'
             : 'SPACE か クリックで スタート', {
        fontFamily: 'monospace', fontSize: sticky ? '13px' : '15px',
        color: sticky ? '#ffcd75' : '#ffffff',
      }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.25, duration: 650,
      yoyo: true, repeat: -1 });

    // autotest はタイトルをスキップして即 Run（Sound.init は呼ばない）
    const V = window.VORTEX || {};
    if (V.autotest) {
      this.time.delayedCall(0, () => this.startRun(false));
      return;
    }

    const begin = () => {
      if (this._started) return;
      this._started = true;
      Sound.init();
      this.startRun(true);
    };
    this.input.keyboard.once('keydown-SPACE', begin);
    // れんしゅうじょう：本編とは別モード。湧きもボスも止めて、確かめたい仕組みだけを起こす。
    this.input.keyboard.once('keydown-T', () => {
      if (this._started) return;
      this._started = true;
      Sound.init();
      this.scene.start('Run', { withAudio: true, practice: true });
    });
    // 1めんボスおためし：コロガンナーだけを10秒で出して、倒したらタイトルへ戻る短いループ。
    //   情報量の A/B は「同じ場面を続けて2回見る」ことでしか比べられないので専用の入口を作る。
    this.input.keyboard.once('keydown-R', () => {
      if (this._started) return;
      this._started = true;
      Sound.init();
      this.scene.start('Run', { withAudio: true, bossTrial: true });
    });
    // ★R57 すっきりモード：**本編そのもの**を最初から「がめん すっきり」で遊ぶ。
    //   ⚠️ プレイ中の切替（Iキー）は効かせない。感想をもらうのが目的なので、
    //      途中で押して見え方が変わると「どっちの感想か」が分からなくなる（おためしとは狙いが違う）。
    this.input.keyboard.once('keydown-S', () => {
      if (this._started) return;
      this._started = true;
      window.VORTEX = window.VORTEX || {};
      window.VORTEX.tidySticky = true;   // 死んで戻ってきても、そのまますっきりで続けられる
      Sound.init();
      this.scene.start('Run', { withAudio: true, tidyRun: true });
    });
    // すっきりを解除して、ふつうの画面に戻す。⚠️ 解除できないと「元に戻すには再読み込み」に
    //   なってしまい、親子で見比べるときに手間が増える（比べるのがこのモードの目的なので）。
    this.input.keyboard.on('keydown-N', () => {
      if (this._started || !sticky) return;
      window.VORTEX.tidySticky = false;
      this.scene.restart();             // 表示（いま何で始まるか）を書き直すため入り直す
    });
    this.time.delayedCall(450, () => { this.input.once('pointerdown', begin); });   // R21W2: 残クリック対策
  }

  update(_t, delta) {
    if (this.bg) this.bg.tilePositionX += delta * 0.004;
    const dt = delta / 1000;
    this._a = (this._a || 0) + dt;
    // 隊列の呼吸。位相をずらすので「そろって上下する人形」にはならない。
    if (this.squad) {
      for (const s of this.squad) {
        const b = Math.sin(this._a * 2.4 + s.phase) * 2;
        s.spr.setPosition(s.x, s.y + b);
        s.g.setPosition(s.x, s.y + 2 + b);
      }
    }
  }

  startRun(withAudio) {
    // ?practice=1 を付けて開いたときは、ふつうの開始でもれんしゅうじょうへ入る（検証用の近道）
    const V = window.VORTEX || {};
    // ★R57 一度 S で入っていたら SPACE／クリックでもすっきりのまま始める（上の注釈の理由）。
    this.scene.start('Run', { withAudio: !!withAudio, practice: !!V.practice,
      tidyRun: !!V.tidySticky });
  }
}
