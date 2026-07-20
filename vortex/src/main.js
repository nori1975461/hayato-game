// main.js — Phaser.Game のブートストラップ（PROTOTYPE_SPEC §5）。
// Phaser は index.html でグローバル読み込み済み。ここでは window.Phaser を参照する。
import { BootScene } from './scenes/Boot.js';
import { TitleScene } from './scenes/Title.js';
import { RunScene } from './scenes/Run.js';
import { ResultScene } from './scenes/Result.js';
import { installErrorBanner } from './ui/hud.js';

// 何よりも先にエラーバナーを仕込む（この後の初期化でコケても画面で気づけるように）。
installErrorBanner();

// URLパラメータ: ?seed=N（既定 20260720）・?autotest=1（タイトルスキップ）
const params = new URLSearchParams(location.search);
const seedParam = parseInt(params.get('seed'), 10);
const seed = Number.isFinite(seedParam) && seedParam > 0 ? seedParam : 20260720;
const autotest = params.get('autotest') === '1';
window.VORTEX = { seed, autotest };

const Phaser = window.Phaser;

const config = {
  type: Phaser.AUTO,
  width: 640,
  height: 360,
  parent: 'game-root',
  backgroundColor: '#0a0a1e',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { antialias: false },
  scene: [BootScene, TitleScene, RunScene, ResultScene],
};

window.__vortexGame = new Phaser.Game(config);
