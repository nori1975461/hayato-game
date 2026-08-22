// バランス数値の正典 v3。値を変更したら dev/PROTOTYPE_SPEC.md §10.4 も併せて改訂すること。

export const BALANCE = {
  view: { width: 640, height: 360 },
  runDurationSec: 420,            // 参考値（クリア条件はボス撃破。時間切れ敗北なし）。Wave R2でステージ尺を延長
  // R12: 被弾に「押し返される」重みを持たせる（hurtKnockback）。lowHpRatio を割ると画面周縁が赤く脈打つ。
  // R22: 実プレイFB「主人公の動きを最初からもう少し早く。遅くてストレス」→ 120→148（+23%）。
  //   敵の最速はチビット62px/s なので、逃げ切れる余地は元々あった。問題は「操作した実感が鈍い」こと。
  //   ⚠️ 溜め中は moveMulWhileCharge 0.5 が掛かるので、溜めのリスク（②のアンカー）は74px/sで維持される。
  // R22: 実プレイFB「体力が少ない。少し体力ゲージを増やして」→ 100→140（+40%）。
  //   雑魚の接触は7〜16、遠距離は11〜28。無敵0.55秒なので接触され続けると最悪29HP/秒＝100では約3.5秒で死ぬ。
  //   140にすると約4.8秒。あわせて gemHeal（ジェルを一定数拾うと回復）を入れて、逃げるだけでなく
  //   「拾いに行って立て直す」という選択肢を作る。
  player: { hp: 140, speed: 148, invulnSec: 0.55, radius: 7,   // R21W2: 0.8秒では96px分を素通りできた
            hurtKnockback: 150, hurtKnockSec: 0.18, lowHpRatio: 0.3 },

  // 主人公＝近接のみ（R14・SPEC§22）。主武器は拳（クラッシュアーム）。銃は全廃し、
  // 変身（＝ゆりかごの腕の復元）で「腕の技」が解放される：Stage2 ワイヤーアーム／Stage3 アームスラム。
  // 最終ボス（マオウレクス）と同じ技＝ミラーマッチ（技の型の一致は正典の核。boss.js の同名攻撃を参照）。
  hero: {
    // 構えの狙い角に使う索敵距離（拳とワイヤーアームが同じ角を使う）。攻撃の射程ではない。
    aimRange: 260,

    // --- 主武器の主役：ブレイクストライク（R21 Wave 2・手動の一撃） ---
    // 設計の核＝「倒すのは手動の一撃」。仲間と自動拳は敵を削るだけで**とどめを刺せない**（Run.dealDamage の関門）。
    // HPが尽きた敵は「よろけ」(BALANCE.stagger)になって漂い、この一撃だけがそれを割る。
    // ⚠️ 距離で担当を分ける設計は実測により不可能と確定している（仲間の加害距離 中央値180px・最大538px・
    //    画面内最大は約367px＝仲間は画面外の敵まで倒していた）。担当は距離ではなく「とどめの権利」で分ける。
    // 旧ワイヤーアーム／アームスラムは廃止（自動発動＝プレイヤーの決断が0回だったため。R21 Wave 2で承認済み）。
    strike: {
      reach: 78, reachPerStage: 12,        // 扇の半径 Stage1=78 / 2=90 / 3=102（自動拳46/52/58の外側）
      arcDeg: 96,                          // 扇の開き（カーソル方向が中心）
      cooldownSec: 0.36,                   // 命中時のクールダウン
      whiffSec: 0.58,                      // 空振り時（命中より長い＝連打を支配戦略から外す）
      recoverSec: 0.10, whiffRecoverSec: 0.30,   // 硬直（この間は移動 x0.6）
      lungeMax: 96, lungeSec: 0.09, iframeSec: 0.14,   // 踏み込み突進（＝加速して殴る）
      damage: 34, damagePerStage: 12,      // 34 / 46 / 58。終盤の最硬雑魚(gareon 45.6)をStage3で一撃
      maxTargets: 4,                       // 直撃の対象数（連鎖は別枠）
      knockback: 260, knockbackSec: 0.12,  // 減衰除数が melee.knockbackSec 固定なので 0.12 に揃える
      heatPerHit: 2, heatPerChain: 1, heatOnWhiff: -2,   // ヒートは手動でしか溜まらない
      bossMul: 1.0,                        // 手動だけが等倍（自動は melee 0.5 / 仲間は orbit.bossMul）
      bossBreakMul: 2.4, bossBreakSec: 1.4,   // ボスの予告を割った直後の追撃倍率と持続
      counterMul: 1.8,                     // 予告中の敵に当てた時（atkState が telegraph）
    },

    // --- ビリヤード攻撃（R22スパイク・掴む→溜める→投げる） ---
    // 【これは検証用のスパイクであり、確定仕様ではない】ゲーム内キー5で一撃モードと切り替えて比較する。
    //
    // 設計の核＝「とどめを刺せるのは投げの着弾だけ」。ボタンは物理的に1つで、文脈で2つの動詞に分かれる：
    //   ・獲物（よろけ）が grabReach 以内にいる → 掴む（押しっぱなしで溜め、離すと投げる）
    //   ・いない                                → 突き（倒せない。削ってよろけにする＋ノックバック＋カウンター）
    // 突きを「倒せない」に留める理由：倒せる通常攻撃を併設すると、CDの安い方（0.36秒）に自然プレイが
    // 収束して投げが使われなくなる（過去の失敗「必殺技が84秒に1回」と同型）。とどめの独占は崩さない。
    // 突きを残す理由：一撃の 0.36秒CD＝理論上2.8回/秒 に対し、掴み→溜め→投げは1.2〜2.5秒サイクル＝
    // 0.4〜0.8回/秒。押す回数が3〜7分の1に落ちる。「ボタンを押して戦うのが好き」な読者にはこれが効く。
    billiard: {
      grabReach: 78, grabReachPerStage: 12,   // 掴める距離（strike.reach と同値＝実測で獲物の90%以上が入る）
      cooldownSec: 0.36,                      // 突きのCD。一撃と同値に揃えてケイデンスを維持する
      grabCooldownSec: 0.18,                  // 掴みは投げに続くので短め
      // 溜め。⚠️「溜め＝速度だけ」にすると数学的に最小溜め連打が支配戦略になる（必要連鎖数は
      //   サイクル秒に比例して増えるのに、リターンが飛翔体HPで頭打ちになるため）。だから溜めは
      //   速度と貫通HPの両方を買う。ここは合議で「設計全体の成否が懸かる」と指摘された箇所。
      chargeMaxSec: 0.85,                     // 溜め切りまで
      moveMulWhileCharge: 0.5,                // ★②のアンカー。溜め中は移動が鈍る＝群れの中で溜める判断が生まれる
      // 溜め中に方向キーを押している間の移動倍率。0＝足を止めて狙いだけ変える。
      moveMulWhileAiming: 0,
      // ★足が止まるのは溜め開始から この秒数まで（実プレイFB「足がとまる時間は0.5秒にしてくれ」）。
      //   狙いを付け直す分だけ止まって、それ以降は溜めたまま動ける＝群れの中で足を縛られ続けない。
      //   0.5 < chargeMaxSec 0.85 なので、溜め切るまでの後半0.35秒は moveMulWhileCharge で動ける。
      aimStopSec: 0.5,
      // 実プレイFB「弾のスピードを少し遅めに。いまは早すぎて飛ばした感触があまりない」。
      // 速い弾は「消えた」に見え、遅い弾は「重い物が飛んでいる」に見える。ビリヤードの玉は重い。
      // 射程が縮まないよう lifeSec を 2.2→2.8 に伸ばして相殺する（200×2.8＝560px＝画面横幅弱）。
      speedMin: 200, speedMax: 430,           // 溜め0で200px/s・溜め切りで430px/s
      chargeHpBonus: 4,                       // 溜め切りで貫通HP +4（チビットHP4なら4→8体分）
      // 飛翔体。HPは「掴んだ敵の maxHp ＋ 溜めボーナス」。1体当てるごとに hpCostPerHit 減る。
      // ⚠️ hpCostPerHit は合議が「この定数1個で設計全体の成否が決まる」と特定した最重要の仮定数。
      //    被弾側HP比例にするとチビット弾(HP4)がチビット1体で砕けて収支が破綻するので、まず固定1で測る。
      hpCostPerHit: 1,
      // 実プレイFB「ビリヤード攻撃が敵の数と比較して弱すぎる／攻撃がスペースキーの必殺技頼み」。
      // 原因：飛翔体HP＝掴んだ敵のmaxHp なので、量産型チビット(HP4)を掴むと4体しか貫けない。
      // 一番よく掴む相手が一番弱い弾になる構造だった。下限を置いて「投げは必ず群れを薙ぐ」を保証する。
      // 看板の動詞が必殺技に主役を奪われるのは、この設計の目的そのものの失敗にあたる。
      minHp: 8,
      hitRadius: 20, lifeSec: 2.8, damage: 90,   // 実プレイFB「標準をつけやすく」→ 当たり判定を広げた
      // ★なぎ倒す触感（実プレイFB「敵をなぎ倒す触感（ゆらぎ？震え？）をいれるのは」）。
      //   1体貫くごとに「ほんの一瞬止まる・小さく揺れる・少し減速する・弾がぶれる」を全部入れる。
      //   連鎖するとこれが積み重なって、群れに食い込んでいく抵抗として体に伝わる。
      pierceStopSec: 0.022,   // 1体ごとの極小ヒットストップ（積むとガガガッという刻みになる）
      pierceShake: 2.4,       // 1体ごとの極小の揺れ
      pierceDrag: 0.955,      // 1体貫くごとに弾が減速する＝手応え（＝抵抗）
      pierceWobble: 26,       // 弾の見た目が横に振れる量（当たり判定はぶらさない）
      // 照準。溜めている間、どこへ飛ぶかを線で見せる。これが無いと「狙って投げる」が成立しない。
      aimDots: 8, aimDotStep: 22, aimAssistDeg: 13, aimAssistPull: 0.40,
      //   aimAssistDeg … この角度以内に敵がいれば吸い付く / aimAssistPull … 吸い付く強さ(0..1)
      // 湧きの補正。実プレイFBを追って 0.55 →（戻す）0.85 →（減らす）0.70 と動かした。
      //   「敵が多すぎる」（第一印象）→「慣れると、はるかに戦っている緊張感がある」（数回後）
      //   →「攻撃が敵の数と比較して弱すぎる」→「もう少し減らして」
      // ⚠️ 0.55 では場の敵が11体しか居らず、炸裂の連鎖相手が消えて投げが逆に弱くなった（平均2.93体/投げ）。
      //    減らしすぎは①攻撃の爽快感を殺す。緊張感は合格基準②そのものなので、これ以上は慎重に。
      spawnMul: 0.70, capMul: 0.70,
      burstRadius: 132, burstMaxChain: 12,  // 一撃の 76 / 6 より広く長い＝投げだけの特権
      endBurst: true,                       // 飛び終わりに必ず炸裂する＝空振りの投げを無くす
      // 実プレイFB「演出が弱く爽快感なし」。頻度が3〜7分の1なので、そのぶん振幅を上げてよい。
      trailEveryFrames: 2, trailLifeMs: 220,
      shakeBase: 4, shakePerKill: 1.6, shakeMax: 13,
      freezeBase: 0.06, freezePerKill: 0.035, freezeMax: 0.22,
      bossMul: 1.0, bossBreakMul: 2.4,        // 一撃から「割る権利」を継承（継承しないとブレイクの受け皿が消える）
      // ★ボス戦の弾薬＝装甲片（R23）。
      //   ボスはよろけないので、ビリヤードの弾（＝よろけた敵）になれるのは召喚される雑魚だけ。
      //   実測（seed=42・ボス戦中）：場のよろけ平均0.47体／掴める距離に平均0.22体しかいない。
      //   ＝看板の動詞（投げ）が、ゲームの山場であるボス戦でだけ機能しない状態だった。
      //   湧きを増やすと「ボスへ集中させる」設計（§10.4）を壊すので、弾は**ボス自身から**出す：
      //     予告を見る → 近づいて突きで割る（②のリスク）→ 装甲が剥がれる → 拾って投げ返す（①）
      //   ＝ 既存の「予告を割る権利は突きが持つ」チャンネルに、そのまま弾薬供給を接続する。
      shards: {
        enemyId: 'chibit',   // 実体は既存の敵。ボスの summon が撒くのと同じ＝正典も作りも既存資産
        count: 2,            // 1回のブレイクで剥がれる数
        dist: 62,            // ボスからの距離。主人公の側へ撒く＝拾いに行く動線がボスへ近づく向きになる
        spreadDeg: 34,
        scaleMul: 1.35,      // 「装甲の塊」に見える大きさ。掴める記号（青白のよろけ）は共通のまま
        // ★装甲片をボスへ投げ返したときの特効。ボス戦の主役を投げへ戻すための倍率。
        //   90(damage) × dmgMul(1.0〜3.0) × 2.5 ＝ 225〜675。ブレイク直後は bossBreakMul 2.4 が乗る。
        bossMul: 2.5,
        // ゲーム内キー9で切り替える比較モード。ボットは「予告のほぼ全部を割る」上限値しか出せず
        // （実測でミサイルガ戦は予告10回中8回をブレイク）、正解は実プレイでしか決まらないため。
        modes: [
          { name: '標準', count: 2, mul: 2.5 },
          { name: '強',   count: 3, mul: 4.0 },
          { name: '切（R23前）', count: 0, mul: 1.0 },
          { name: '弱',   count: 2, mul: 1.5 },
        ],
      },
      // ---- らいこうだん（R23・ビリッコが手渡す特殊弾）----
      // 実プレイFB「特殊弾…手渡しされる際はスローモーションでゆっくりと。特殊な弾をわたされたことを
      //   プレイヤーが意識できるように。その弾のエフェクトはド派手に。威力も破壊的にして」。
      //
      // 設計：**新しい操作を1つも増やさない**。受け取ると手の中が雷光弾に変わるだけで、
      // 狙って離す操作は普段の投げと同じ。増えるのは「今これを持っている」という緊張だけ。
      // 振幅は頻度と逆相関の極北＝1ボスに1発しか無いので、遠慮なく全部を出す。
      bolt: {
        // 手渡し（スローモーション）
        slowSec: 1.15,       // 実時間でこれだけ、ゲーム内時間を slowMul 倍に落とす
        slowMul: 0.16,       // 0.16倍＝ほぼ止まる。ここで「渡された」を必ず認識させる
        handoverSec: 0.85,   // 弾がモビットから手へ渡りきるまで（実時間）
        arcEverySec: 0.05,   // 手渡し中に走る稲妻の間隔
        // 弾そのもの
        color: 0xffe14d, coreColor: 0xffffff,
        scale: 2.6, radius: 15,
        speedMul: 1.1,       // 通常の投げ（溜め切り）に対する速度倍率
        pierceHp: 999,       // 雑魚では絶対に砕けない（貫通し切る）
        // ★破壊的：ボスの最大HPの30%を1発で削る。ボスのHPは1800〜28000と幅があるので、
        //   固定値ではなく比率で置く＝どのボスでも必ず「ゲージが3割吹き飛ぶ」絵になる。
        bossHpRatio: 0.30,
        trashDamage: 999,    // 雑魚は当たれば必ず消し飛ぶ
        // 着弾の稲妻連鎖（周囲の敵へ枝分かれ）
        chainCount: 7, chainRange: 165, chainDamage: 999,
        // 演出量
        freezeSec: 0.30, shakeMs: 460, shakeAmp: 18, zoom: 0.06,
        // ⚠️ flash は白 0.6 だと着弾の瞬間に画面が真っ白になり、ボスも稲妻も見えなくなった
        //    （等倍スクショで確認）。金色 0.45 に落として、稲妻と落雷の柱が読めるようにする。
        flash: 0.45, rings: 4, streaks: 26,
      },
      // ---- 炎の炸裂弾（R24・レア雑魚マグマンを掴んで投げたとき）----
      // 実プレイFB「弾にすると火力が高いレアな雑魚キャラを一体つくって。見た目もひとめでそれと
      //   わかる外観で。ボディの色は赤。その弾のエフェクトも雷光弾同様にド派手に。炎をまとった炸裂弾。
      //   これはボス戦およびボス戦以外にもでてくる。出現は不定期」。
      //
      // らいこうだん（1ボスに1発の切り札）との住み分け：
      //   らいこうだん … ボス専用・単体へ最大HPの30%・**縦の一撃**
      //   ほのおだん   … いつでも出る・**面を焼く**（炸裂半径が通常の2.6倍＋周囲へ延焼）
      // ＝「ボスを削る弾」と「群れを消し飛ばす弾」で役割が重ならない。
      blast: {
        color: 0xff5a1f, coreColor: 0xffd24a,
        scale: 2.3, radius: 13,
        speedMul: 0.92,      // 重い。ゆっくり飛ぶぶん軌跡の炎が長く見える
        pierceHp: 60,        // 雑魚では砕けない（貫通し切る）
        // ボスへは最大HPの12%。らいこうだん(30%)の半分以下＝切り札の座は譲らない。
        bossHpRatio: 0.12,
        trashDamage: 999,
        radiusMul: 2.6,      // 着弾の炸裂半径（burstRadius に対する倍率）＝これがこの弾の主役
        chainCount: 12, chainRange: 175, chainDamage: 999,   // 延焼（周囲へ火が回る）
        freezeSec: 0.18, shakeMs: 340, shakeAmp: 14, zoom: 0.05,
        flash: 0.34, rings: 3, streaks: 24,
        emberEverySec: 0.05,  // 飛行中に散る火の粉の間隔
      },
      // 突き（倒せない動詞）
      jab: {
        reach: 78, arcDeg: 110, maxTargets: 3,
        damage: 7, damagePerStage: 4,         // 削り専用。チビット(HP4)は1発・ガレオン(HP14)は2発でよろけ
        knockback: 300, knockbackSec: 0.12,   // ★獲物(stag)は対象外。掴み圏から弾き出さないため
        counterMul: 1.8,                      // 予告を割る権利は突きが持つ（現行20.4回/分のチャンネルを維持）
      },
      // ★段位（実プレイFB「地味だから、よっぽど派手にしないと攻撃している実感がない。しかも成長で
      //   どんどん派手さが増す仕様でなければ飽きる」→ さらに「まだ地味」「段位の刻みが遅い」）。
      //   骨子の「成長を感じる」に直結する。段が上がると威力と見た目が同時に上がる＝派手さが強さの証明。
      //   ⚠️ 5段→7段に増やし、しきい値も前倒しした（3/6/10/15 → 2/4/6/9/12/16）。
      //      実測でLv9到達が75秒なので、旧設定では最高段が140秒以降＝420秒のうち3分の2が変化なしだった。
      //   ballMul=飛翔体の大きさ / rings=着弾の輪 / streaks=放射する光条 / flash=画面閃光 / zoom=カメラの寄り
      // ★段位（レベルで上がる投げの位）。
      // R24 実プレイFB「メガ投げ？ボルテクス投げ？と名称は勇ましいが、なにもレベルアップした
      //   ことが感じられない。投げたときの効果音。弾のエフェクト、効果音。弾の破壊力」。
      //
      // 原因は2つあった：
      //  (1) 威力が**段位が変わる瞬間にしか伸びていなかった**。自動強化のトップ項目 heroMult
      //      （+35%）は Run の拳と一撃にしか掛かっておらず、ビリヤードの投げには一切効いていない。
      //      ＝レベルが2つ上がっても投げは1ミリも強くならない区間が普通にあった
      //  (2) 手に持っている弾が段位で一切変わらない（色も大きさも常に同じ青白）
      //
      // 直し方：威力は heroMult（レベルアップのたびに伸びる）× dmgMul（段位）の積にする。
      //   そのぶん dmgMul の幅を 1.0〜3.0 → 1.0〜1.36 へ**圧縮**して、合計の伸びは今と同程度に保つ。
      //   ＝「段位で跳ねる」から「レベルのたびに伸びて、段位で見た目と音が変わる」へ移す。
      // sfx … 投げた瞬間の音。3段階で明確に別物になる（実プレイFB「投げたときの効果音」）。
      throwTiers: [
        { untilLevel: 2,   name: 'なげる',           hpBonus: 0,  radiusMul: 1.00, dmgMul: 1.00, rings: 1, streaks: 4,  flash: 0.06, ballMul: 1.9, trailMul: 1.0, stopMul: 1.00, zoom: 0.010, color: 0x9fe8ff, sfx: 'throwLight', pitch: 1.18 },
        { untilLevel: 4,   name: 'つよなげ',         hpBonus: 2,  radiusMul: 1.10, dmgMul: 1.06, rings: 2, streaks: 9,  flash: 0.09, ballMul: 2.2, trailMul: 1.3, stopMul: 1.10, zoom: 0.014, color: 0x8affd2, sfx: 'throwLight', pitch: 1.00 },
        { untilLevel: 6,   name: 'メガなげ',         hpBonus: 4,  radiusMul: 1.20, dmgMul: 1.12, rings: 3, streaks: 14, flash: 0.12, ballMul: 2.5, trailMul: 1.7, stopMul: 1.20, zoom: 0.018, color: 0x7ee8ff, sfx: 'throwHeavy', pitch: 1.14 },
        { untilLevel: 9,   name: 'ギガなげ',         hpBonus: 7,  radiusMul: 1.32, dmgMul: 1.18, rings: 4, streaks: 19, flash: 0.15, ballMul: 2.8, trailMul: 2.1, stopMul: 1.32, zoom: 0.023, color: 0xffe066, sfx: 'throwHeavy', pitch: 1.00 },
        { untilLevel: 12,  name: 'テラなげ',         hpBonus: 10, radiusMul: 1.44, dmgMul: 1.24, rings: 5, streaks: 25, flash: 0.18, ballMul: 3.1, trailMul: 2.5, stopMul: 1.45, zoom: 0.028, color: 0xffa93d, sfx: 'throwHeavy', pitch: 0.88 },
        { untilLevel: 16,  name: 'ハイパーなげ',     hpBonus: 14, radiusMul: 1.56, dmgMul: 1.30, rings: 6, streaks: 31, flash: 0.22, ballMul: 3.4, trailMul: 2.9, stopMul: 1.58, zoom: 0.034, color: 0xff9de0, sfx: 'throwUltra', pitch: 1.06 },
        { untilLevel: 999, name: 'ボルテックスなげ', hpBonus: 19, radiusMul: 1.70, dmgMul: 1.36, rings: 7, streaks: 38, flash: 0.26, ballMul: 3.8, trailMul: 3.4, stopMul: 1.75, zoom: 0.042, color: 0xff5a5a, sfx: 'throwUltra', pitch: 0.90 },
      ],
      // ★手に持っている弾を段位の光で包む（実プレイFB本人の案：
      //   「捕獲した敵が光に包まれて威力が増す。レベルアップするたびにエフェクトが大きく派手に、色も派手に」）。
      // レベル1つごとにも僅かに育つ（lvGlow）＝段位の谷間でも「伸びている」が目に見える。
      // ⚠️ 初版はここの数字が全部小さすぎて**画面上ほぼ何も足していなかった**（実測で確認）。
      //    輪は w_ring（48px・太さ5px）なので scale 0.1 では直径9px・太さ0.5px＝等倍では消える。
      //    光は depth 8 ＝主人公より下だったので体で隠れていた。
      //    差分計測（光を消した1枚との引き算）で、光が足す明るさが段位順に増えることまで見る。
      heldAura: {
        depth: 13,                          // 主人公(10前後)より上・弾(14)より下。ADD合成なのでドット絵は潰さない
        // ⚠️ 光の大きさを掴んだ敵の半径だけで決めると、小さい敵を掴んだ段位4が段位3より暗くなる
        //    （実測で addLum が 99583→42723 と逆転した）。光が伝えるのは**自分の強さ**なので、
        //    大半を固定値にして、掴んだ敵の大きさはわずかに効かせるだけにする。
        baseRadius: 7, radiusShare: 0.35,
        glowBase: 3.2, glowPerTier: 0.55,   // 段位ごとに光の直径が大きくなる
        lvGlow: 0.020,                      // レベル1つごとの上乗せ（段位の谷間を埋める）
        glowAlpha: 0.34, glowAlphaPerTier: 0.07,     // 段位が上がるほど濃くなる
        // 白い芯。**色相に関係なく明るさが必ず上がる**ようにするための保険。
        // 赤や桃は緑成分が乏しく、ADD合成では金色より暗く見える（実測で上位段位のほうが暗かった）。
        coreBase: 1.5, corePerTier: 0.22, coreAlpha: 0.18, coreAlphaPerTier: 0.09,
        ringFromTier: 2,                    // この段位以上で弾のまわりに輪が回りはじめる
        ringBase: 0.55, ringPerTier: 0.075, ringCharge: 0.12,    // 直径26→48px（等倍で読める太さになる）
        ringAlpha: 0.50, ringAlphaPerTier: 0.05,
        ring2FromTier: 4, ring2Mul: 1.42,   // 2枚目（白・逆回転）
        moteFromTier: 5, motes: 3, moteRadius: 22,               // 最上位帯だけ光の粒が回る
        sparkFromTier: 3, sparkEverySec: 0.09, sparkRange: 26,   // さらに上の段位で火花が散る
      },
      // ★投球モーション（実プレイFB「ファミスタの投手のように、おもいっきり振りかぶって、足を高く上げて、
      //   高速スピードで腕を振って投げつける動きを。今は主人公の身体から弾が飛び出しているようにしか見えない」）。
      //   FBは見え方の話ではなく実装そのものを言い当てていた：弾は run.player.x/y ＝**体の中心**から出ていた。
      //   直す核は「弾は手から出る」。そのために投げを一瞬のモーションへ分解する：
      //     溜め中＝振りかぶり（腕とボールを後ろへ引き、体を反らせ、足を上げる）
      //     → 振り（releaseAt の時点で**手の位置**から弾が生まれる）→ フォロースルー
      pitch: {
        // ★R23 再設計（実プレイFB「投手動作があまりにもダサすぎる」／足上げの廃止は許可済み）。
        //
        // 調査で確認した原則（ピクセルアートのアニメーション原則・トップダウンの可読性）：
        //   ・「400%で綺麗でも等倍でぐちゃぐちゃ」は定番の失敗。**必ず等倍で判定する**
        //   ・小さいスプライトでは「リアルさより明快さ」。等倍で読めるのは**シルエットの変化だけ**
        //   ・ゲームでは長い予備動作は操作を鈍らせる。予備動作は「構えの姿勢」に前もって仕込む
        //   ・段階は wind-up → travel → hit → recoil → camera response
        //
        // 旧実装がダサかった理由は演出の量ではなく、**この縮尺で読めない動きを描いていた**こと：
        //   ・bodyLift 8px（足を高く上げる）→ トップダウンでは「跳ねた・浮いた」にしか見えない
        //   ・windSweepDeg 150°の水平スイープ → 腕は太さ数pxの帯なので「風車」に見える
        //   ・残像5枚×52°の扇 → 体が36pxしかないので ただのノイズ
        //
        // 再設計の核＝**横に振るのをやめて、縦に振る**。
        //   トップダウンでは水平の回転は画面上でただの回転にしか見えない。対して
        //   「頭の上 → 前方へ振り下ろす」は画面のYにそのまま出るので、等倍でもはっきり読める。
        //   ＝ 野球の投球ではなく「**振りかぶって叩きつける**」。求められたのは投球フォームではなく
        //      「弾を敵に投げつけるモーション」なので、投手の模倣自体をやめた。
        //
        //   タメ（手が頭上へ・体は縦に伸びて後ろへ引く）
        //     → 振り下ろし（手が弧を描いて頭上から前下へ。残像は扇ではなく**弧の上**に置く）
        //     → **リリースで画面が0.045秒止まる**（離した瞬間にポーズが1コマ決まる＝感触の中心）
        //     → 踏み込み（体が前へ出て横に潰れる）→ フォロースルー
        // ⚠️ 22pxだと等倍4倍クロップで**ボールが頭に重なって**いた（主人公は約42px＝頭頂が約-21px）。
        //    輪郭の外へ出して初めて「頭の上に構えている」と読める。
        windUp: 21, windUpMax: 9,   // 振りかぶりで手が頭上へ上がる高さ（溜め切りで 21+9＝30px）
        windBack: 7,                // 同時に狙いと逆へ引く距離
        arcLift: 11, arcBulge: 8,   // 振り下ろしの弧のふくらみ（上へ膨らんでから前へ落ちる）
        releaseReach: 32,           // ★離す瞬間の手の位置＝弾が生まれる場所。体の中心ではない
        releaseDown: 5,             // 離す位置は水平よりわずかに下＝「振り下ろした」の証拠
        motionSec: 0.22,            // 旧0.17。3つのポーズが読める長さまで伸ばす
        releaseAt: 0.30,            // この割合で手からボールが離れる（0.22×0.30＝約0.066秒）
        releaseFreeze: 0.045,       // ★離した瞬間のヒットストップ
        followUp: 7,                // 振り抜いて前へ行き過ぎる距離（旧 followDeg 34°の置き換え）
        ghosts: 3,                  // 弧の上に置く腕の残像（旧5枚の扇→3本の弧）
        drawBack: 6,                // 溜め切りで体が狙いと逆へ引く距離（旧 bodyLift の置き換え）
        drawStretch: 0.10,          // 溜め中に体が縦へ伸びる量（引き絞り）
        bodyLean: 0.20,             // 振りかぶりの反り(rad)
        bodyLungeLean: 0.24,        // 振り抜きの前傾(rad)
        bodyLunge: 9,               // 振り抜きで前へ踏み込む距離
        squash: 0.13,               // 踏み込んだ瞬間の潰れ（縦を縮めて横を広げる）
        moveMulWhileThrow: 0.25,    // 投げている間は踏ん張る。0にはしない（足止めのFBがあったため）
        dust: 8,                    // 踏み込みの土煙の粒数
      },

      recoil: 420,       // 投げた反動の速度(px/s)。hurtKnockSec 0.18 の減衰に乗るので実移動は約23px
      pierceKnock: 240,  // 貫通したが生き残った敵を弾く強さ＝通過が目に見える
      // 開幕の空白対策。実測で最初の獲物が生まれるのは4.48〜4.62秒＝「最初の10秒」の45%が無反応だった。
      // 湧きは可視矩形の外周（最短200〜240px）からなので湧きレートでは消せない＝開幕だけ直接置く。
      openingPrey: 3, openingPreyDist: 95,
    },

    // --- 主武器：クラッシュアーム（R12・自動近接連撃） ---
    // 設計の核＝「操作を増やさずに駆け引きを作る」。プレイヤーができるのは移動だけなので、
    // "どれだけ踏み込むか" がそのまま火力になるよう、距離とヒートの2軸で威力を変える。
    //   ① closeDist 以内まで踏み込むと closeMul 倍（＝敵に触れる距離が一番強い＝一番危険）
    //   ② 殴り続けると heat が溜まり heatDamageMulPerStep ずつ加算（離れると decay で冷める）
    // 旧スターオーラ（auraDamage 4・tick 0.5秒＝実質8dps の飾り）を置き換える主役。
    melee: {
      // 拳の届く範囲（Stage1=58 / 2=68 / 3=78）。
      // ⚠️ 旧34は「実プレイで一度も殴れない」死に値だった：なかまは公転半径48の上を回りながら
      // SLASHのhitRadius18で66pxまで叩き、当時の銃も240px先から削るため、敵は34pxに入る前に
      // 全滅する（実測40秒＝31体撃破・平均撃破距離57px・間合い内で倒れた敵0体・殴り0回）。
      // ただし広げるほど拳が遠くで敵を倒してしまい、かえって敵が近づかない（70にしたら最寄り距離が
      // 27→62pxへ後退＝自己相殺）。間合いは近接らしい58に留め、頻度は敵の密度側で確保する。
      radius: 46, radiusPerStage: 6,        // R21W2: 手動(78/90/102)の内側へ。役割の分離が絵で分かる
      intervalSec: 0.55,                    // R21W2: 牽制なので遅い（旧0.3）
      damage: 4, damagePerStage: 2,         // R21W2: 4/6/8。実効29DPS（旧112DPS・-74%）＝削るだけ
      maxTargets: 2,                        // R21W2: 薙ぐ絵は残すが数は絞る
      // 至近ボーナス：踏み込むほど強い。間合いを広げたぶん「踏み込む」意味が薄れないよう、
      // ボーナス圏は間合いの半分以下（26/56）に保つ＝わざわざ近づいた者だけが1.7倍を取れる。
      closeDist: 26, closeMul: 1.0,         // R21W2: 踏み込みの報酬は strike 側へ移した
      bossMul: 0.5,                         // ボスへは半減（接近リスクに報いるがボス戦を壊さない）
      knockback: 120, knockbackSec: 0.12,   // 殴った敵を弾く（押し返せる手応え）
      // ヒート：連撃で腕が熱を持つ。火力（+4%/段・最大+40%）と見た目の派手さが連動する。
      // 収支に注意：殴る間隔が 0.3秒なので1回あたりの減衰は heatDecayPerSec×0.3＝0.9。
      // heatPerHit=2 との差し引きで実質 +1.1/回 ＝ 殴り続けて約3秒で満タン、離れると約3.3秒で冷める。
      // （heatPerHit=1 だと実質 +0.1/回 にしかならず、実プレイでは永遠に溜まらない。CDP実測で判明）
      heatMax: 10, heatPerHit: 0, heatDecayPerSec: 3, heatDamageMulPerStep: 0.04,   // R21W2: 自動ではヒートは溜まらない
      // 踏み込みモーション。0.14秒＝8フレームは速すぎて「殴った絵」が見えなかったので 0.2秒へ。
      punchSec: 0.2, punchLunge: 7,
    },
  },

  // R21 Wave 2: よろけ（瀕死）。仲間と自動拳はHPを0にできても**とどめを刺せず**、敵はこの状態で漂う。
  // 「仲間が強い＝主人公の出番が減る」という逆相関を、「仲間が強い＝獲物が増える」正の相関へ反転させる。
  // ⚠️ よろけは攻撃をやめるが**接触ダメージは維持し、主人公へ歩き続ける**。攻撃も接触も無くすと
  //    被弾の緊張感（このゲームの2大合格基準の片方）が下がるため。実測：現行はHP30%未満の時間が0秒だった。
  stagger: {
    sec: 4.5, warnSec: 1.2,            // 4.5秒で復帰。残り1.2秒は橙・4Hz脈動で予告
    speedMul: 0.55,                    // 遅くなるが止まらない（歩いて主人公の間合いへ入る）
    // R22スパイク：よろけの挙動をゲーム内キー6で切り替えて体感で選ぶ。①と②が正面から競合するため。
    //   歩く   … 接触圧が維持される（②）。ただし実測で獲物の100%が40px以内へ自己配達＝取りに行く工程が消える
    //   漂う   … 取りに行く工程が生まれる（①の奥行き）。ただし逃げ回ると弾薬が本当に付いてこない
    // ⚠️ 速度差の実測：よろけは最速のチビットでも 62×0.55＝34px/s、主人公は120px/s（3.5倍速い）。
    //    取りに行けば同じ52pxを0.45秒、待てば1.6秒。速いのは行く方だが、待つのはノーリスク。
    driftModes: [
      { name: '歩く（現行）',   speedMul: 0.55 },
      { name: 'ゆっくり漂う',   speedMul: 0.18 },
      { name: 'その場で漂う',   speedMul: 0 },
    ],
    tint: 0x9fe8ff, ringAlpha: 0.42,   // 青白＝「これは自分の獲物」。覚える語彙は1色だけ
    rebootHpRatio: 0.45, rebootSpeedMul: 1.25, rebootDamageMul: 1.25, rebootTint: 0xff5a5a,
    gemMul: 2,                         // 手動で割った時のXP倍率（殴る動機）
    burstRadius: 76, burstFalloff: 0.92, burstMaxChain: 6,   // 炸裂連鎖（群れの中心を叩くほど得）
    burstDamage: 16, burstDelayMs: 45,
  },

  // R21: 打撃感（イース風）。実プレイFB「当たった感触がほぼない・殴る爽快感が皆無」への対応。
  // ⚠️着手前の実測で判明した欠落：拳にも仲間の攻撃にも画面振動が一切なく（Run.updateHeroMelee /
  //   orbit.js のどこにも shake 呼び出しがない）、仲間には命中音そのものが無かった（発射音だけ）。
  //   ヒットストップも 0.03秒固定で強さに連動していなかった。ここを power(0..1) 一本へ統一する。
  // 好みは文章で決められないので、プリセットを数値で並べてゲーム内キー 1〜4 で即切替して選ぶ。
  hitFeel: {
    defaultPreset: 2,          // 起動時のプリセット（0基点・2='イース'）
    // 仲間の攻撃は6体×高頻度で当たるため、素通しにすると音と揺れが渋滞して逆に何も感じなくなる。
    // 「最も近い1発だけ」に間引くのが要点（イースも1撃ごとに1回しか鳴らない）。
    allySfxMinSec: 0.085,      // 仲間の命中音の最短間隔
    allyShakeMinSec: 0.05,     // 仲間の命中による揺れの最短間隔
    dmgTextMinSec: 0.05,       // ダメージ数字の最短間隔
    killShakeMul: 1.35,        // 撃破した瞬間だけ揺れを増す（トドメの手応え）
    // ★R21W2の設計原則：振幅は頻度と逆相関で設計する。被弾の9pxは酔わない（稀だから）が、
    //   毎秒1〜3回起きる攻撃の8pxは「いきすぎ・酔う」と実プレイで判定された。
    //   稀な出来事には大きく、頻繁な出来事には小さく割り当てる。
    freezeCapSec: 0.16,        // ヒットストップの総量上限（被弾0.12と重なる渋滞を防ぐ）
    chainPitchStep: 0.05, chainPitchMax: 1.45,   // 連鎖1段ごとに半音上げる
    presets: [
      // heroShake/allyShake = [振幅px, 持続ms]。stop = [最小秒, 最大秒]（power で補間）。
      {
        id: 'off', name: '現行（変更なし）',
        heroShake: [0, 0], allyShake: [0, 0], stop: [0.03, 0.03],
        autoShake: [0, 0], strikeShake: [0, 0], breakShake: [0, 0], chainShake: [0, 0],
        allySfx: false, pitch: false, dmgText: false, squash: 0, sparkMul: 1,
      },
      {
        id: 'mild', name: 'ひかえめ',
        heroShake: [2.5, 90], allyShake: [1.2, 70], stop: [0.03, 0.045],
        autoShake: [0, 0], strikeShake: [3, 110], breakShake: [4, 120], chainShake: [4.5, 130],
        allySfx: true, pitch: true, dmgText: false, squash: 0.10, sparkMul: 1.2,
      },
      {
        id: 'ys', name: 'イース',
        heroShake: [5, 130], allyShake: [2.2, 90], stop: [0.045, 0.075],
        autoShake: [0, 0], strikeShake: [5, 120], breakShake: [6, 140], chainShake: [7, 150],
        allySfx: true, pitch: true, dmgText: true, squash: 0.18, sparkMul: 1.7,
      },
      {
        id: 'max', name: 'やりすぎ',
        heroShake: [6.5, 170], allyShake: [3.4, 110], stop: [0.06, 0.10],
        autoShake: [0, 0], strikeShake: [6, 140], breakShake: [7.5, 160], chainShake: [8, 170],
        allySfx: true, pitch: true, dmgText: true, squash: 0.26, sparkMul: 2.3,
      },
    ],
  },

  // Wave R2: 公転仲間は最大3人（火力過多防止）。開始2人・180秒で3人目を解禁（強さカーブを緩やかに）
  orbit: {
    baseRadius: 48, baseAngularDeg: 120, maxSlots: 3,
    // R21W2: 仲間の到達距離の上限。実測で仲間は最大538px先（画面外）の敵まで倒しており、
    // 敵が主人公に届く前に消えていた＝殴る機会と殴られる脅威が同時に失われていた。
    // 132の根拠：画面内保証半径163px未満／turret の hoverDist 160 より内側／主人公の1入力射程194px以内。
    allyMaxReach: 132,
    bossMul: 0.12,        // 仲間の対ボス倍率（従来は倍率なしで、主人公だけ半減という真逆の構造だった）
    formCycleSec: 11,     // フォーム往復の周期。wave.stepSec 30 / rush 50 と位相ロックしない値
    slotSchedule: [{ untilSec: 180, slots: 2 }, { untilSec: 9999, slots: 3 }],
  },
  archetypes: {
    SLASH: { tickSec: 0.25, hitRadius: 18 },
    SHOT:  { intervalSec: 0.88, bulletSpeed: 315, range: 110, bulletRadius: 3 },  // R21W2: range は索敵のみ（飛距離は Run のリーシュが決める）
    BEAM:  { intervalSec: 3.5, durationSec: 0.4, length: 60, width: 6 },
    FIELD: { radius: 60, slowFactor: 0.6, tickSec: 0.5, tickDamage: 1 },
    // Wave B: かわいい武器の新アーキタイプ
    BOOMERANG: { intervalSec: 1.6, speed: 260, maxDist: 52, hitRadius: 14, tickSec: 0.25 },
    RINGWAVE:  { intervalSec: 1.5, maxRadius: 52, expandSpeed: 220, thickness: 16 },
    // R22 実プレイFB「体力を少しずつ回復してくれるモビットをいれて」。
    // 唯一の非戦闘アーキタイプ。敵に触れないので dealDamage を一切呼ばない＝
    // 「仲間はとどめを刺せない」という設計の関門とは無関係に成立する。
    // 3.5秒に2回復＝0.57HP/秒。ジェル回復（20HP/約16秒＝1.25HP/秒）の半分弱に置いて「少しずつ」を守る。
    // ⚠️ 公転スロットは有限なので、回復役を入れる＝火力を1枠削るというトレードオフになる。これは意図。
    HEAL: { intervalSec: 3.5, amount: 2 },
    // R23 実プレイFB「特殊弾を生成してくれるモビットもいれて。…イナズマが迸る雷光弾。
    //   ボス戦でのみ。1ボスに対して1弾。マオウレクス戦では2弾」。
    // 2つ目の非戦闘アーキタイプ。敵に触れず、ボス戦のあいだだけ主人公へ「らいこうだん」を手渡す。
    // ⚠️ 手渡しは在庫制（perBoss発）。ボスが変わるたびに補充され、持ち越しはしない。
    //    毎ボス必ず同じ回数だけ撃てる＝「ここぞで使う切り札」という理解が毎戦成立する。
    // ⚠️ 発数は武器レベルでも進化でも合体でも**増えない**。増やすと1発30%×複数で
    //    終盤ボスが一方的になる。この子の価値は「発数」ではなく「切り札を必ず1発持てること」。
    // ⚠️ firstDelaySec は短くしてある。実測（seed=42）で最初の2体のボスは7秒もたずに沈み、
    //    「1ボスに1弾」が守れていなかった。refillSec も同じ理由で詰めてある（マオウレクスの2発目）。
    AMMO: { firstDelaySec: 4, refillSec: 16, perBoss: 1, perFinal: 2 },
  },

  // 合成モンスターの強化倍率（orbit.js が party[i].fused を見て適用）
  fused: {
    // FB#2: 合成なかまは「実効武器レベル」に+3のボーナス（レベル起因の成長。damageMult 等の固定倍率とは別枠）。
    damageMult: 2.5, spriteScale: 3, glowScale: 2.2, weaponLevelBonus: 3,
    slashRadiusMult: 1.5, shotIntervalMult: 0.7,
    beamLengthMult: 1.4, beamWidthMult: 2.0,
    fieldRadius: 90, fieldTickDamage: 3,
    boomerangDistMult: 1.4, boomerangRadiusMult: 1.6,
    ringwaveRadiusMult: 1.5, ringwaveThicknessMult: 1.8,
    healMult: 2,
  },

  // 進化（プレイヤーLv6から2レベル毎にparty先頭の未進化1体が進化）
  evolve: { startLevel: 6, everyLevels: 2 },

  // v5(Wave C): 中盤以降の密度不足を解消。湧き数は小数のまま累積するので階段状に増えない。
  // Wave R2: ステージ尺420sへ合わせて強さカーブを14ステップ(=420s)に延長。開幕を易しく(hpMultStart0.9,
  // spawnIntervalStart1.9)し、終盤の硬さは微増(hpMultEnd3.4)。
  // R12c: 序盤の湧きが 1.9秒に1体＝0.53体/秒しかなく、拳の間合いへ敵が到達する前に
  // なかまと銃が処理しきっていた（＝突撃兵なのに殴る相手がいない）。序盤だけ約2.5倍に厚くして
  // 「群がる敵を殴り倒す」絵を成立させる（0.53体/秒→2.6体/秒）。終盤側（IntervalEnd/CountEnd）は据え置き＝最終密度は不変。
  wave: { stepSec: 30, steps: 14, spawnIntervalStart: 0.95, spawnIntervalEnd: 0.45,
          hpMultStart: 0.9, hpMultEnd: 3.4, spawnCountStart: 3, spawnCountEnd: 5 },
  enemyCap: 220,
  // 敵数上限は時間で段階的に上がる（序盤はむしろ軽く、後半で「囲まれる」密度になる）。Wave R2で5段化
  capSteps: [
    { untilSec: 60,   cap: 50 },
    { untilSec: 150,  cap: 90 },
    { untilSec: 260,  cap: 140 },
    { untilSec: 360,  cap: 190 },
    { untilSec: 9999, cap: 220 },
  ],
  // ラッシュ（山場）。warnSec前にテロップ＋警告リングで必ず予告する。Wave R2で早め・6波化
  rush: { startSec: 40, intervalSec: 50, counts: [12, 16, 20, 26, 30, 36], warnSec: 1.2 },
  // 雑魚の“ぷるぷる”。生成時に消費済みのsinePhaseを流用するので乱数を追加消費しない
  enemyFx: { bobHz: 7, bobAmp: 0.09, tiltAmp: 0.10 },
  elite: { times: [110, 200, 290], hpMult: 9, sizeMult: 2, speedMult: 0.8 },
  // Wave R2: 合成祭壇は3回出現（150/250/340s）。開始2人スタートに合わせ最低人数を2へ
  altar: { appearSecs: [150, 250, 340], minParty: 2 },
  xp: { gemValue: 1, eliteGemValue: 10, firstLevelNeed: 5, needStep: 5, magnetRadius: 40 },
  capture: { dropRate: 0.25, eliteDropRate: 1.0, coreLifeSec: 10, fullPartyCoins: 50 },

  // FB#1: 体力回復アイテム（ハート）。雑魚は低確率・エリートは高確率・ボスは撃破で確定1個（boss.js）。
  // healAmount は player.hp=100 基準で 25（約25%）＝回復過多で難度が壊れない範囲。貴重なので magnet は弱め
  // （xp.magnetRadius=40 より狭く・吸引も弱い）。満タンで拾ったら無駄にせず少額コインに替える。
  // ジェル回復（実プレイFB「ジェルを一定数取得したら体力が回復するように。ジェルを獲得する強い動機になる」）。
  // every 個ぶん拾うたびに healAmount 回復する。**HUDにゲージを出す**のが要点で、
  // 見えない内部カウンタでは「あと少しで回復する」という動機が生まれない（＝FBの狙いを外す）。
  // エリートのジェルは eliteCount 個ぶんとして数える（拾う価値の差がそのままゲージの伸びになる）。
  // ⚠️ 満タン時に捨てないよう、回復ハートと同じくコインへ振り替える。
  // 実プレイFB「回復ペース（16秒に1回・20回復）が遅い。もう少し早く」→ every 24→14。
  // 1回あたりの量ではなく間隔の不満なので、healAmount は据え置いて頻度だけ上げる
  // （量を増やすと「たまに大きく戻る」になり、遅いという体感は消えない）。
  gemHeal: { every: 14, healAmount: 20, eliteCount: 3, fullBonusCoins: 10 },

  healItem: {
    dropRate: 0.045, eliteDropRate: 0.6, healAmount: 25,
    lifeSec: 12, magnetRadius: 24, pickupRadius: 13, pull: 140, fullBonusCoins: 15,
  },

  // 武器レベル（★取得でなかまの攻撃そのものが成長する）
  weapon: {
    maxLevel: 12,
    damageAddPerLevel: 0.28,
    slash: { hitRadiusAdd: 1.6, tickSecMult: 0.955, tickSecMin: 0.10 },
    shot:  { intervalMult: 0.945, intervalMin: 0.18, bulletSpeedAdd: 0, bulletRadiusAdd: 0.32,
             extraShotEvery: 3, maxShots: 5, spreadDeg: 10 },
    beam:  { intervalMult: 0.94, intervalMin: 1.2, lengthAdd: 0.6, widthAdd: 1.1 },
    field: { radiusAdd: 1.5, tickDamageAdd: 0.7, tickSecMult: 0.955, tickSecMin: 0.18 },
    boomerang: { intervalMult: 0.955, intervalMin: 0.5, maxDistAdd: 1.2, hitRadiusAdd: 0.8, speedAdd: 8 },
    ringwave:  { intervalMult: 0.95,  intervalMin: 0.5, maxRadiusAdd: 1.2, expandSpeedAdd: 8, thicknessAdd: 0.6 },
    // 最大レベル(wl=11)で 4.2回復/2.80秒＝1.5HP/秒。囲まれた時の被弾(最悪29HP/秒)には遠く及ばないので、
    // 「立て直しを助ける」範囲に収まる。無敵にはならない。
    heal:  { amountAdd: 0.2, intervalMult: 0.98, intervalMin: 2.2 },
  },

  // 必殺技（敵を倒すとゲージが溜まる。1ステージ10回まで）
  // v4: テンポ改善（cinematicSec短縮=すぐ操作に戻れる・killsPerCharge減=撃ちやすい・startCharge増=序盤から1発目が近い）
  special: {
    // R9: 最終ボス マオウレクス最強化の対価として必殺を2点強化。
    //   ① 最大 8→10 回（回数増・威力/ゲージ速度は据え置き）
    //   ② ボスへのダメージのみ「近いほど強い」3段階（雑魚は距離無関係に即死のまま）
    // R24: 実プレイFB「必殺技の回数を最大15回にして」→ 10→15。ゲージ速度(killsPerCharge)は据え置き
    //      ＝溜まる速さは変えず「持てる上限」だけ増やす（連打できるようにはしない）。
    killsPerCharge: 18, maxUses: 15, radius: 320, damage: 9999, bossDamage: 360,
    cinematicSec: 0.7, startCharge: 0.7,
    // ボス限定の距離倍率：接近戦を報いる。プレイヤー↔ボス距離で near×2.0 / mid×1.0 / far×0.6。
    // 実効ダメージ = round(bossDamage × mul)（near720 / mid360 / far216）。雑魚には一切適用しない。
    distanceScale: { nearDist: 110, midDist: 220, nearMul: 2.0, midMul: 1.0, farMul: 0.6 },
  },

  // レベルアップは選択せず自動強化（cycle は upgrades[].id を順に適用）
  autoUpgrade: {
    // R21W2: 先頭の 'atk'（仲間の攻撃）を 'hero'（主人公の攻撃）へ振り替えた。
    // ゲートで仲間はとどめを刺せないので、仲間の攻撃力はよろけ速度しか上げない一方、
    // 撃破を一手に担う主人公の火力にはLv10以降の成長手段が1つも無かった。
    cycle: ['hero', 'spin', 'hp', 'move', 'atk', 'magnet', 'radius', 'catch'],
    bonusEveryLevels: 5,
  },

  upgrades: [
    // R24: heroMult は投げ（看板の動詞）にも効くようになったので、ラベルを「なげる」と言い切る。
    //      「こぶし」のままだと、一番よく出る強化が何を強くしたのか画面から分からない。
    { id: 'hero',   label: 'なげる +35%',    desc: 'なげる ちからが つよくなる',       stat: 'heroMult',    add: 0.35 },
    { id: 'atk',    label: 'なかま +30%',    desc: 'なかまの こうげきが つよくなる',   stat: 'damageMult',  add: 0.30 },
    { id: 'spin',   label: 'かいてん +35%',  desc: 'なかまが まわる はやさ アップ',    stat: 'angularMult', add: 0.35 },
    { id: 'radius', label: 'きどう +12%',    desc: 'なかまの まわる わが ひろがる',    stat: 'radiusMult',  add: 0.12 },
    { id: 'move',   label: 'いどう +16%',    desc: 'じぶんの あしが はやくなる',       stat: 'moveMult',    add: 0.16 },
    { id: 'hp',     label: 'たいりょく +30', desc: 'さいだいHPアップ ＋ すこしかいふく', stat: 'maxHpAdd',    add: 30 },
    { id: 'catch',  label: 'ほかく +10%',    desc: 'スターコアが おちやすくなる',      stat: 'captureAdd',  add: 0.10 },
    { id: 'magnet', label: 'じしゃく +50px', desc: 'ジェムを すいよせる はんい アップ', stat: 'magnetAdd',   add: 50 },
  ],

  // 虹カード（金枠レア。levelup.js が effects/heal を解釈する）
  rainbowUpgrades: [
    { id: 'rainbow_all',  label: 'にじ:オールアップ',
      desc: 'こうげき・かいてん・いどう ぜんぶアップ！',
      effects: [{ stat: 'damageMult', add: 0.15 }, { stat: 'angularMult', add: 0.15 },
                { stat: 'moveMult', add: 0.10 }, { stat: 'heroMult', add: 0.15 }] },
    { id: 'rainbow_heal', label: 'にじ:きせきのいやし',
      desc: 'HPぜんかいふく ＋ さいだいHP+20',
      effects: [{ stat: 'maxHpAdd', add: 20 }], heal: 'full' },
    { id: 'rainbow_hero', label: 'にじ:ヒーローパワー',
      desc: 'じぶんの こうげきが 1.5ばい',
      effects: [{ stat: 'heroMult', add: 0.5 }] },
  ],

  // どうくつ・たからばこ
  cave: {
    times: [50, 115, 175, 245, 310], lifeSec: 25, minDist: 260, maxDist: 320, touchRadius: 24,
    rewards: [
      { id: 'ring',   label: 'ぶき パワーリング',   weight: 3, stat: 'damageMult', add: 0.30 },
      { id: 'shield', label: 'ぼうぐ ほしのたて',   weight: 3, stat: 'maxHpAdd',   add: 30, invulnSec: 2 },
      { id: 'boots',  label: 'スピードブーツ',      weight: 2, stat: 'moveMult',   add: 0.20 },
      { id: 'magnet', label: 'メガじしゃく',        weight: 2, stat: 'magnetAdd',  add: 60 },
      { id: 'rcore',  label: 'にじのコア',          weight: 2, dropCore: 'R' },
      { id: 'coins',  label: 'コインぶくろ',        weight: 2, coins: 100 },
    ],
  },

  // ★やしろ（R23・実プレイFB「洞窟：アイテム取得。祭壇：モビット合体につづく三つ目の場所を作成して。
  //   やしろ：攻撃力・防御力・スピードが20％ずつアップする」）。
  //   3つの場所は役割で分かれる：どうくつ＝1個のランダム報酬／さいだん＝モビット合体／
  //   やしろ＝**3つの能力が同時に上がる恒久強化**。1回で3つ上がるので、出現は洞窟より少なくする。
  //   見た目は鳥居（柱2本＋横木2本）。色は青紫にした——朱色は「強化復活した敵 #ff5a5a」や
  //   ボスの弾の赤と紛らわしく、洞窟のライラック #ffb0e8・さいだんの桃 #ff9ee0 とも離す必要があるため。
  shrine: {
    times: [95, 200, 290], lifeSec: 24, minDist: 250, maxDist: 320, touchRadius: 26,
    // 攻撃力は damageMult（なかま）と heroMult（主人公＝投げ・突き）の**両方**へ加算する。
    // R24: heroMult を足さないと、看板の動詞である投げに「攻撃力アップ」が一切効かなかった。
    attackAdd: 0.20,
    defenseAdd: 0.20,   // 防御力（被ダメージを 20% 減。重ねがけの上限は 60%）
    defenseCap: 0.60,
    speedAdd: 0.20,     // スピード（stats.moveMult へ加算）
    tint: 0xa67dff, label: 0xe8d9ff,
  },

  // ボス（Wave R3：ロボット6体・6段スケジュール）。boss.js が tiers を時間順に処理する。
  // top-level はHUD/spawner/test-core 互換の代表値（＝最終ボス=マオウレクス基準）を残す。
  // 各 tier に「署名武器」の小ブロック（machinegun/cutter/vulcan/wavecannon/missile/laser/armslam）を持たせ、
  // attacks に載せた武器のみ発動する。dash/ring/summon は共通の予備パラメータとして全 tier が保持。
  boss: {
    hudBossSec: 350,                // HUDタイマーがBOSS赤表示に切替（最終ボス接近の合図）
    warnSec: 358, spawnSec: 360, spawnDist: 260,  // ← spawnSec は最終ボス=クリア条件時刻
    // ボス戦中の雑魚スポーン制限（spawner.js が参照）
    trashInterval: 2.4, trashCount: 1,

    // 出現順（小→final）。betweenAttacks の長さは attacks の長さと一致させること。
    tiers: [
      // 1. 小ボス「コロガンナー」（~60秒）。マシンガン連射＋突進。phase2なし・撃破でプレイ続行。
      {
        tier: 'small', bossId: 'korotama', final: false,
        warnSec: 58, spawnSec: 60, spawnDist: 290,
        hp: 1800, radius: 52, spriteScale: 8, glowScale: 6.8,
        glowOuter: '#8a8f98', glowInner: '#38e1ff',
        chaseSpeed: 68, bodyDamage: 12,
        attacks: ['machinegun', 'dash'],
        machinegun: { telegraphSec: 0.5, burstSec: 0.9, shotInterval: 0.08, bulletSpeed: 264,
                      bulletRadius: 3, damage: 6, spreadDeg: 14, lifeSec: 1.6 },
        dash: { telegraphSec: 1.0, speed: 300, durationSec: 0.7, damage: 20 },
        ring: { telegraphSec: 0.5, count: 5, count2: 7, bulletSpeed: 120,
                bulletRadius: 4, damage: 12, lifeSec: 3.0 },
        summon: { count: 4, enemyId: 'chibit', ringRadius: 50 },
        idleSec: { afterSpawn: 2.5, betweenAttacks: [2.2, 2.2] },
        phase2: false, phase2HpRatio: 0.5, phase2IdleMult: 0.85, phase2DashSpeedMult: 1.1,
        rageText: '', bulletTint: '#38e1ff',
        rewardCoins: 100, deathCinematicSec: 1.0,
      },
      // 2. 小+ボス「ジェットバイパー」（~120秒）。円鋸カッター（ブーメラン）＋突進。
      {
        tier: 'small', bossId: 'jetviper', final: false,
        warnSec: 118, spawnSec: 120, spawnDist: 300,
        hp: 3600, radius: 56, spriteScale: 8, glowScale: 7.2,
        glowOuter: '#2a6bff', glowInner: '#7fd0ff',
        chaseSpeed: 70, bodyDamage: 15,
        attacks: ['cutter', 'dash'],
        cutter: { telegraphSec: 0.6, count: 2, speed: 180, spreadDeg: 40, bladeRadius: 9,
                  damage: 20, spinSpeed: 12, lifeSec: 2.4, returns: true },
        dash: { telegraphSec: 0.9, speed: 340, durationSec: 0.75, damage: 28 },
        ring: { telegraphSec: 0.5, count: 7, count2: 9, bulletSpeed: 132,
                bulletRadius: 4, damage: 14, lifeSec: 3.2 },
        summon: { count: 5, enemyId: 'chibit', ringRadius: 55 },
        idleSec: { afterSpawn: 2.5, betweenAttacks: [2.0, 2.0] },
        phase2: false, phase2HpRatio: 0.5, phase2IdleMult: 0.8, phase2DashSpeedMult: 1.12,
        // R19d: 弾色は #7fd0ff（仲間スターパピー #7fd8ff と ΔE 5.8＝ほぼ同色）だった。毒々しい蛍光グリーンへ。
        rageText: '', bulletTint: '#1dff12',
        rewardCoins: 150, deathCinematicSec: 1.2,
      },
      // 3. 中ボス「ウズバルカン」（~180秒）。バルカン掃射＋アームスラム＋phase2「ぶちギレ」。
      {
        tier: 'mid', bossId: 'uzuking', final: false,
        warnSec: 178, spawnSec: 180, spawnDist: 310,
        hp: 6500, radius: 64, spriteScale: 9, glowScale: 9,
        glowOuter: '#e8720c', glowInner: '#ffd23f',
        chaseSpeed: 66, bodyDamage: 18,
        attacks: ['vulcan', 'armslam'],
        vulcan: { telegraphSec: 0.5, bursts: 3, perBurst: 9, sweepDeg: 14, bulletSpeed: 138,
                  bulletRadius: 4, damage: 15, lifeSec: 3.2 },
        armslam: { telegraphSec: 0.7, slamSec: 0.5, shockCount: 9, shockSpeed: 144,
                   shockRadius: 5, shockDamage: 20, meleeRadius: 46, meleeDamage: 34 },
        dash: { telegraphSec: 0.9, speed: 360, durationSec: 0.8, damage: 34 },
        ring: { telegraphSec: 0.5, count: 7, count2: 11, bulletSpeed: 132,
                bulletRadius: 4, damage: 15, lifeSec: 3.5 },
        summon: { count: 6, enemyId: 'chibit', ringRadius: 60 },
        idleSec: { afterSpawn: 3, betweenAttacks: [2.5, 2.5] },
        phase2: true, phase2HpRatio: 0.5, phase2IdleMult: 0.7, phase2DashSpeedMult: 1.15,
        // R19d: 弾色は #ffd23f（主人公の金と完全同一・ΔE 0.0）だった。「味方の攻撃＝金」に統一した以上、
        //   ボスの弾が味方の攻撃に見えてしまうので灼熱の橙赤へ。乱射バルカンには金より似合う。
        rageText: 'ウズバルカン ぶちギレ！', bulletTint: '#ff3d00',
        rewardCoins: 220, deathCinematicSec: 1.5,
      },
      // 4. 中+ボス「ウェイブロード」（~240秒）。波動砲（薙ぎビーム）＋アームスラム＋召喚＋phase2。
      {
        tier: 'mid', bossId: 'wavelord', final: false,
        warnSec: 238, spawnSec: 240, spawnDist: 320,
        hp: 11000, radius: 72, spriteScale: 9, glowScale: 10,
        glowOuter: '#38e1ff', glowInner: '#a8f0ff',
        chaseSpeed: 60, bodyDamage: 22,
        attacks: ['wavecannon', 'armslam', 'summon'],
        wavecannon: { chargeSec: 1.2, beamWidth: 44, beamLength: 260, damage: 34,
                      sweepDeg: 18, activeSec: 0.5 },
        armslam: { telegraphSec: 0.7, slamSec: 0.5, shockCount: 9, shockSpeed: 144,
                   shockRadius: 5, shockDamage: 20, meleeRadius: 46, meleeDamage: 34 },
        dash: { telegraphSec: 0.85, speed: 370, durationSec: 0.8, damage: 40 },
        ring: { telegraphSec: 0.5, count: 9, count2: 13, bulletSpeed: 142,
                bulletRadius: 4, damage: 16, lifeSec: 3.6 },
        summon: { count: 6, enemyId: 'chibit', ringRadius: 65, telegraphSec: 0.6 },
        idleSec: { afterSpawn: 3, betweenAttacks: [2.5, 2.0, 2.5] },
        phase2: true, phase2HpRatio: 0.5, phase2IdleMult: 0.7, phase2DashSpeedMult: 1.15,
        rageText: 'ウェイブロード かくせい！', bulletTint: '#a8f0ff',
        rewardCoins: 300, deathCinematicSec: 1.6,
      },
      // 5. 大ボス「ミサイルガ」（~300秒）。ホーミングミサイル＋バルカン＋召喚＋phase2。
      {
        tier: 'large', bossId: 'missilga', final: false,
        warnSec: 298, spawnSec: 300, spawnDist: 330,
        hp: 18000, radius: 76, spriteScale: 8, glowScale: 10,
        glowOuter: '#e8720c', glowInner: '#ff4d4d',
        chaseSpeed: 60, bodyDamage: 26,
        attacks: ['missile', 'vulcan', 'summon'],
        missile: { telegraphSec: 0.6, count: 4, launchSpeed: 216, homingRate: 2.4, maxTurnDeg: 70,
                   speed: 180, radius: 6, damage: 24, blastDamage: 18, lifeSec: 3.5 },
        vulcan: { telegraphSec: 0.5, bursts: 3, perBurst: 9, sweepDeg: 14, bulletSpeed: 138,
                  bulletRadius: 4, damage: 15, lifeSec: 3.2 },
        dash: { telegraphSec: 0.85, speed: 380, durationSec: 0.85, damage: 46 },
        ring: { telegraphSec: 0.5, count: 11, count2: 14, bulletSpeed: 144,
                bulletRadius: 4, damage: 17, lifeSec: 3.6 },
        summon: { count: 7, enemyId: 'chibit', ringRadius: 68, telegraphSec: 0.6 },
        idleSec: { afterSpawn: 2.8, betweenAttacks: [2.2, 2.2, 2.2] },
        phase2: true, phase2HpRatio: 0.5, phase2IdleMult: 0.68, phase2DashSpeedMult: 1.18,
        rageText: 'ミサイルガ ぶちギレ！', bulletTint: '#ff4d4d',
        rewardCoins: 380, deathCinematicSec: 1.7,
      },
      // 6. 最終ボス「マオウレクス」（~360秒＝クリア条件）。最終ボスは5つの必殺級攻撃を持つ：
      //    ① 亜空間レーザー薙ぎ（laser・極太/長射程） ② ナックルウェーブ（knuckle＝新・最強武器／両手を胸前で叩き
      //    合わせ、米軍トマホーク型の巨大ミサイルを扇状に一斉発射） ③ ワイヤーアーム（wirearm＝新・最強武器／両拳を
      //    ワイヤーで主人公へ射出し殴って手繰り戻すロケットパンチ・最大の見せ場） ④ 多連ホーミングミサイル斉射
      //    （missile・弾数7の扇状"斉射"） ⑤ 重力弾幕ノヴァ（nova／全方位弾を回転させ連続波で放つ弾幕）。この5つが
      //    attacks ローテーション。phase2 では laser の後に vulcan を割り込ませる（beginAttack が cfg.vulcan を参照）。
      //    knuckle/wirearm は maou 専用（armslam は uzuking/wavelord 用に残す＝丸い衝撃波のまま不変）。
      //    腕(armR/armL)パーツを持つのは maou のみ＝「腕で殴る絵」はこのボスで主役化する。撃破でクリア。
      //    サイズ：spriteScale 8（縦長人型のため通常ボス≈8-9 に対し素の大きさで約1.2倍・画面占有を抑え「大きすぎ」を解消）・
      //    radius/glow/spawnDist も追随縮小（通常ボスの radius 64〜76 帯へ）。
      {
        tier: 'final', bossId: 'maou', final: true,
        warnSec: 358, spawnSec: 360, spawnDist: 320,
        hp: 28000, radius: 68, spriteScale: 8, glowScale: 9.5,
        glowOuter: '#b01c22', glowInner: '#4ad4ff',
        chaseSpeed: 68, bodyDamage: 30,
        attacks: ['laser', 'knuckle', 'wirearm', 'missile', 'nova'],
        laser: { chargeSec: 1.0, beamWidth: 46, beamLength: 420, damage: 42,
                 sweepFromDeg: -42, sweepToDeg: 42, activeSec: 0.7 },
        // 特別攻撃②：多連ホーミングミサイル斉射（count 4→7・扇状に一斉発射で"斉射"感）
        missile: { telegraphSec: 0.6, count: 7, launchSpeed: 216, homingRate: 2.4, maxTurnDeg: 70,
                   speed: 180, radius: 6, damage: 24, blastDamage: 18, lifeSec: 3.5 },
        // 特別攻撃③：重力弾幕ノヴァ（予告付き・全方位弾を波ごとに spinDeg 回して螺旋状に連続で放つ）
        nova: { telegraphSec: 1.1, waves: 5, waveInterval: 0.16, perWave: 14,
                bulletSpeed: 116, bulletRadius: 4, damage: 20, lifeSec: 4.0, spinDeg: 13 },
        // 最強武器①ナックルウェーブ（maou 専用）：両腕を胸前で叩き合わせ、トマホーク型の巨大ミサイルを
        // 扇状（spreadDeg 分の広がり）に count 本一斉発射する。丸い衝撃波(armslam)の刷新版＝派手さ優先。
        // ミサイルは直進弾（避けられる）＝威力はやや高めでも理不尽にしない。clapSec は叩き合わせのモーション尺。
        knuckle: { telegraphSec: 1.0, clapSec: 0.4, count: 7, spreadDeg: 150,
                   bulletSpeed: 178, radius: 8, damage: 22, lifeSec: 3.4 },
        // 最強武器②ワイヤーアーム（maou 専用）：両拳をワイヤーで主人公方向へ射出し、最大長 maxLen まで伸ばして
        // 殴り、手繰り戻す（飛ばしっぱなしにしない）。extendSpeed で伸長、turnDeg/秒 のマイルド追尾（横移動で振り切れる）。
        // damage は現状最強クラス(dash 52)超えの大ダメージだが、プレイヤー maxHp 100 未満＝満タンから一撃死しない値。
        wirearm: { teleSec: 1.1, shotSec: 0.5, backSec: 0.35, maxLen: 210,
                   extendSpeed: 640, fistRadius: 16, damage: 64, turnDeg: 55 },
        vulcan: { telegraphSec: 0.4, bursts: 3, perBurst: 9, sweepDeg: 16, bulletSpeed: 150,
                  bulletRadius: 4, damage: 16, lifeSec: 3.2 },
        dash: { telegraphSec: 0.8, speed: 400, durationSec: 0.85, damage: 52 },
        ring: { telegraphSec: 0.5, count: 11, count2: 14, bulletSpeed: 150,
                bulletRadius: 4, damage: 18, lifeSec: 3.8 },
        summon: { count: 8, enemyId: 'chibit', ringRadius: 70 },
        idleSec: { afterSpawn: 2.5, betweenAttacks: [2.2, 2.4, 2.6, 2.0, 2.6] },
        phase2: true, phase2HpRatio: 0.55, phase2IdleMult: 0.65, phase2DashSpeedMult: 1.2,
        rageText: 'マオウレクス かくせい！', bulletTint: '#38e1ff',
        rewardCoins: 500, deathCinematicSec: 1.8,
      },
    ],
  },

  // Wave R1: 序盤は手数(chibit)＋壁(gareon)、中盤で狙撃(snipa)/特攻(bomba)、後半で砲台(turret)も加わり役割が増える
  // ★レア雑魚の出現（R24・実プレイFB「これはボス戦およびボス戦以外にもでてくる。出現は不定期」）。
  // 通常の spawnPhases（重み抽選）には**入れない**。入れると常時湧く＝レアでなくなるため、
  // 独立したタイマーで、間隔を毎回ランダムに引き直して湧かせる。
  // ⚠️ ボス戦中も止めない。ボス戦は装甲片しか弾が無いので、ここに強い弾が1個混ざる価値が大きい。
  rareEnemy: {
    enemyId: 'magman',
    firstSec: 38,                 // 最初の1体
    everyMin: 24, everyMax: 44,   // 以後の間隔は毎回この範囲で引き直す＝「不定期」
    maxAlive: 2,                  // 場に同時に居られる数（増えると珍しさが消える）
    dist: 210,                    // 主人公からこの距離に湧く（画面内で見つけられる距離）
    hpMultCap: 1.5,               // 波のHP倍率の上限。硬すぎて掴めなくなるのを防ぐ
    tint: 0xff5a1f, label: 'マグマン',
  },

  spawnPhases: [
    { untilSec: 60,   weights: { chibit: 0.58, gareon: 0.27, snipa: 0.15 } },   // R21W2: 開幕から射手を入れる（開始54秒の被弾ゼロ帯を解消）
    { untilSec: 120,  weights: { chibit: 0.42, gareon: 0.23, snipa: 0.20, bomba: 0.15 } },
    { untilSec: 240,  weights: { chibit: 0.26, gareon: 0.20, snipa: 0.20, turret: 0.19, bomba: 0.15 } },
    { untilSec: 9999, weights: { chibit: 0.18, gareon: 0.22, snipa: 0.22, turret: 0.20, bomba: 0.18 } },
  ],
};
