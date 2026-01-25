# Battle Core アーキテクチャ設計

**作成日**: 2026-01-25
**対象**: Milestone 1（Battle Core 最小戦闘）
**参照**: [battle-mechanics/](../battle-mechanics/)

---

## 0. 設計方針の結論

**コアは「Phase（順序） + Effect Queue（副作用連鎖）」**

### 採用する設計要素

1. **Effect System（主軸）**: 副作用を明示的に管理
2. **Phase管理（順序保証）**: TurnPlan = ステップの配列として実装
3. **Event Sourcing（思想）**: Replayのためのイベント列を作る
   - ただし「状態はイベントから毎回再構築」まではやらない

### 重要な設計判断

- **EventLog は"真実"にできる** → そのためには**乱数結果もログ化**
- **State Machine の肥大化を防ぐ** → Phase = データ（配列）として持つ
- **Event と Effect は分ける** → 役割が異なる

---

## 1. 目的

### 1.1 第4世代の厳密性を保証

- ターン処理順序を**データとして固定**し、順序バグを根絶する
- 副作用連鎖を **Effect Queue** で処理し、呼び忘れ/抜け漏れを防ぐ
- **14段階のターン終了処理**を switch 地獄にしない

### 1.2 再現性とデバッグ

- EventLog を再現性・観測の両面で信頼できる**唯一の記録**とする
- **乱数結果を含めてログ化** → 実装変更で乱数消費順序が変わっても再現可能
- Replay 時は RNG を回さない（ログを読む）

### 1.3 Belief Tracker への観測情報提供

- PublicEvent として観測可能な事実のみを抽出
- 内部実装の変更が Belief Tracker に影響しないよう、Event の安定性を保証

---

## 2. 三層モデル

### 2.1 Effect（内部命令）

**役割**: 状態更新・トリガ評価・派生Effect生成に使う

**特徴**:
- 副作用の**宣言**（実行はキューが行う）
- Effect適用の結果に応じて、新しいEffectをキューに追加

**例**:
```typescript
type Effect =
  | { type: "APPLY_DAMAGE"; target: PokemonId; amount: number }
  | { type: "SET_HP"; pokemon: PokemonId; hp: number }
  | { type: "INFLICT_STATUS"; target: PokemonId; status: StatusCondition }
  | { type: "CHECK_ITEM_TRIGGER"; pokemon: PokemonId; timing: ItemTiming }
  | { type: "EVALUATE_ABILITY"; pokemon: PokemonId; timing: AbilityTiming };
```

### 2.2 Event（外部事実）

**役割**: 観測・リプレイ・デバッグに使う

**3種類に分類**:

#### PublicEvent（観測可能）
- **Belief Tracker が読む**唯一の情報源
- 後方互換が重要 → 最初から増やしすぎない
- 例: ダメージ量、状態異常発生、交代、使用技

#### RngEvent（乱数結果）
- **Replay の真実**
- 乱数の結果を記録（seed固定だけに依存しない）
- purpose（用途）を明記: `accuracy`, `crit`, `damageRoll`, `secondary`, `speedTie`

#### TraceEvent（内部トレース）
- デバッグ用（任意）
- 例: ダメージ内訳、補正一覧、ステップ開始/終了

**例**:
```typescript
// PublicEvent
type PublicEvent =
  | { type: "MOVE_USED"; pokemon: PokemonId; move: MoveId; target: PokemonId }
  | { type: "DAMAGE_DEALT"; target: PokemonId; amount: number; newHP: number }
  | { type: "STATUS_INFLICTED"; target: PokemonId; status: StatusCondition }
  | { type: "FAINTED"; pokemon: PokemonId };

// RngEvent
type RngEvent =
  | { type: "RNG_ROLL"; purpose: "accuracy"; value: number }
  | { type: "RNG_ROLL"; purpose: "damageRoll"; value: number }  // 85-100
  | { type: "RNG_ROLL"; purpose: "crit"; value: boolean }
  | { type: "RNG_ROLL"; purpose: "speedTie"; value: boolean };

// TraceEvent
type TraceEvent =
  | { type: "DAMAGE_BREAKDOWN"; attack: number; defense: number; modifier: number }
  | { type: "STEP_START"; step: string }
  | { type: "TRIGGER_EVALUATED"; trigger: string; result: boolean };
```

### 2.3 State（戦闘状態）

**役割**: 現在の戦闘状態を保持

**特徴**:
- **Effect適用によってのみ更新**される
- イベントから毎回再構築はしない（パフォーマンス優先）
- ただし、Replay 時はイベントストリームから再現可能

---

## 3. 実行モデル

### 3.1 全体フロー

```
Command → TurnPlan → Effect生成 → Effect Queue → Effect適用 → Trigger評価 → 派生Effect → Event記録
```

### 3.2 TurnPlan（ステップの配列）

**重要**: State Machine を巨大化させない

```typescript
type TurnPlanStep = (state: BattleState, ctx: TurnContext) => Effect[];

const TURN_PLAN: TurnPlanStep[] = [
  determinePriority,        // 行動順決定
  executeActions,           // 各ポケモンの行動実行
  applyWeatherDamage,       // ターン終了: 天候ダメージ
  applyStatusDamage,        // ターン終了: 状態異常ダメージ
  applyCurseDamage,         // ターン終了: 呪いダメージ
  applyLeechSeedDamage,     // ターン終了: 宿り木ダメージ
  applyItemEffects,         // ターン終了: 道具発動
  applyAbilityEffects,      // ターン終了: 特性発動
  // ... 残り7段階（合計14段階）
];
```

**ポイント**:
- 各ステップは**副作用を起こさない**（Effectを生成するだけ）
- **Stateを読むが、直接変更しない**（変更はEffect適用時に行う）
- 依存の事実はState経由で自然に反映される（例: 瀕死ポケモンは自動スキップ）
- ステップの順序 = turn-order.md の仕様そのもの
- 順序変更は配列の並び替えだけで済む

**重要な設計判断**:
- **瀕死判定はステップに含めない**
- 瀕死は `APPLY_DAMAGE` 適用時に即座に処理される（第4世代の仕様）
- 瀕死になったポケモンは以降のステップで自動的にスキップされる
- **砂嵐の岩タイプ特防1.5倍は常時補正**（ダメージ計算時に参照、ターン終了処理ではない）

### 3.3 Effect Queue（反応キュー）

**副作用連鎖の処理**（2段キュー + TriggerGuard 方式）:

```typescript
// 2段キュー（無限ループと順序崩壊を防ぐ）
const normalQueue: Effect[] = [];      // 通常の処理キュー
const immediateQueue: Effect[] = [];   // 即座に処理すべきキュー

// TurnRuntime（Trigger発動済み記録）
const runtime: TurnRuntime = {
  firedTriggers: new Set<string>(),
  effectIdCounter: 0,
};

// ステップからEffectを生成してキューに追加
for (const step of TURN_PLAN) {
  const effects = step(state, ctx);
  normalQueue.push(...effects);
}

// キューを逐次処理
while (normalQueue.length > 0 || immediateQueue.length > 0) {
  // immediate優先、なければnormalから取得
  const effect = immediateQueue.shift() ?? normalQueue.shift()!;

  // EffectにIDを付与（TriggerGuard用）
  const effectId = `effect_${runtime.effectIdCounter++}`;

  // Effectを適用してApplyResultを取得
  const result = applyEffect(state, effect);

  // Eventを記録
  eventLog.append(...result.events);
  eventLog.append(...result.rngEvents);

  // 派生Effectを即座に処理
  immediateQueue.push(...result.derivedEffects);

  // Triggerを評価して派生Effectを生成（TriggerGuard付き）
  for (const trigReq of result.triggerRequests) {
    // causeId を付与
    trigReq.causeId = effectId;

    // TriggerGuard でチェック済みTriggerをスキップ
    const triggeredEffects = evaluateTriggers(state, runtime, trigReq);
    immediateQueue.push(...triggeredEffects);
  }
}

// ターン終了時にクリア
runtime.firedTriggers.clear();
```

**例（地震の連鎖）**:
1. `APPLY_DAMAGE` → `applyEffect` が `ApplyResult` を返す
   - events: `[{ type: "DAMAGE_DEALT", amount: 106, newHP: 94 }]`
   - triggerRequests: `[{ timing: "ON_DAMAGE", subjects: [1] }]`
2. Trigger評価 → オボンのみが発動条件を満たす
3. `HEAL` が immediateQueue に追加
4. `HEAL` 適用 → HP回復
5. （必要なら）回復によるTrigger評価...

### 3.4 Trigger評価のタイミング

**重要**: Triggerを「いつ評価するか」「誰を対象にするか」を明示

```typescript
function evaluateTriggers(state: BattleState, trigReq: TriggerRequest): Effect[] {
  const effects: Effect[] = [];

  // TriggerRequest で指定された subjects のみ評価（全ポケモンではない）
  for (const pokemonId of trigReq.subjects) {
    const pokemon = state.getPokemon(pokemonId);

    // 瀕死のポケモンはスキップ
    if (pokemon.hp === 0) continue;

    // Item trigger
    if (pokemon.item && shouldTriggerItem(pokemon.item, trigReq.timing, state, trigReq.cause)) {
      effects.push(...itemToEffects(pokemon.item, pokemon));
    }

    // Ability trigger
    if (pokemon.ability && shouldTriggerAbility(pokemon.ability, trigReq.timing, state, trigReq.cause)) {
      effects.push(...abilityToEffects(pokemon.ability, pokemon));
    }
  }

  return effects;
}
```

**TriggerRequest の例**:

```typescript
// APPLY_DAMAGE の場合
{ timing: "ON_DAMAGE", subjects: [targetId], cause: damageEffect }

// TURN_END の場合
{ timing: "TURN_END", subjects: state.activePokemon.map(p => p.id), cause: turnEndEffect }

// ON_CONTACT_HIT の場合（攻撃側と防御側の両方）
{ timing: "ON_CONTACT_HIT", subjects: [attackerId, defenderId], cause: moveEffect }
```

---

## 4. Replay 方針（必須）

### 4.1 問題: seed固定だけでは不十分

**実装変更で乱数消費順序が変わると、Replayが壊れる**

例:
- 技の命中判定を追加 → その後のダメージ乱数が1つズレる
- 開発中は頻繁に起こる

### 4.2 解決策: 乱数結果をログに刻む

```typescript
// 乱数を使う箇所
function rollDamage(rng: RNG): number {
  const roll = rng.nextInt(85, 100);

  // RngEventに記録
  eventLog.append({
    type: "RNG_ROLL",
    purpose: "damageRoll",
    value: roll
  });

  return roll;
}

// Replay時
function rollDamageReplay(eventLog: EventLog): number {
  // RNGを回さず、ログから読む
  const event = eventLog.consumeNext("RNG_ROLL", "damageRoll");
  return event.value;
}
```

### 4.3 RngEvent の purpose（用途）

**最小セット**:
- `accuracy`: 命中判定（0.0〜1.0）
- `crit`: 急所判定（boolean）
- `damageRoll`: ダメージ乱数（85〜100）
- `secondary`: 追加効果判定（0.0〜1.0）
- `speedTie`: 同速判定（boolean）
- `statusDuration`: 状態異常ターン数（sleep: 2-5等）

**Phase 2（拡張）**:
- `flinch`: ひるみ判定
- `multiHit`: 連続技の回数（2-5回等）
- `confusion`: 混乱ターン数

---

## 5. 型定義の概要

### 5.1 TurnPlanStep

```typescript
type TurnContext = {
  turnNumber: number;
  weather: Weather | null;
  terrain: Terrain | null;
  rng: RNG | ReplayRNG;  // Replay時は ReplayRNG（ログから読む）
};

type TurnPlanStep = (state: BattleState, ctx: TurnContext) => Effect[];
```

### 5.2 Effect（詳細は別ドキュメント）

**カテゴリ**:
- **State変更系**: `APPLY_DAMAGE`, `SET_HP`, `SET_STATUS`
- **Trigger評価系**: `CHECK_ITEM_TRIGGER`, `EVALUATE_ABILITY`
- **行動系**: `USE_MOVE`, `SWITCH_POKEMON`

### 5.3 PublicEvent（詳細は別ドキュメント）

**最小セット（Phase 1）**:
- `MOVE_USED`: 技使用
- `DAMAGE_DEALT`: ダメージ発生
- `STATUS_INFLICTED`: 状態異常付与
- `FAINTED`: 瀕死
- `SWITCHED`: 交代
- `ITEM_ACTIVATED`: 道具発動
- `ABILITY_ACTIVATED`: 特性発動

**拡張（Phase 2）**:
- `STAT_CHANGED`: 能力変化
- `WEATHER_SET`: 天候変化
- `FIELD_EFFECT_SET`: 場の効果設定

---

## 6. 最小実装の完了条件（BattleCore v0）

### Phase 1（Milestone 1）

- [ ] 2体のシングルバトルで5ターン以上が安定して回る
- [ ] ダメージ計算が battle-mechanics/damage-calculation.md に準拠
- [ ] 行動順決定が battle-mechanics/priority-speed.md に準拠
- [ ] **瀕死判定が APPLY_DAMAGE 時に即座に処理される**
- [ ] 瀕死後のポケモンがターン終了処理をスキップする
- [ ] eventLog を replay して state が一致する（RngEvent 利用）
- [ ] turn-end の一部が動く:
  - [ ] 天候ダメージ
  - [ ] 状態異常ダメージ（やけど/どく）
  - [ ] 道具発動（たべのこし）

### Phase 2（Milestone 2）

- [ ] 状態異常の完全実装（6種類）
- [ ] ターン終了処理の完全実装（14段階）
- [ ] 複数の道具・特性が動く
- [ ] テストケース網羅（有名な確定数）

---

## 7. ディレクトリ構成（提案）

```
packages/battle-core/
├── src/
│   ├── types/
│   │   ├── effect.ts          # Effect型定義
│   │   ├── event.ts           # Event型定義（Public/Rng/Trace）
│   │   ├── state.ts           # BattleState型定義
│   │   └── turn-plan.ts       # TurnPlanStep型定義
│   ├── engine/
│   │   ├── turn-executor.ts   # TurnPlan実行器
│   │   ├── effect-queue.ts    # Effect Queue処理
│   │   └── trigger-evaluator.ts  # Trigger評価
│   ├── steps/
│   │   ├── determine-priority.ts
│   │   ├── execute-actions.ts
│   │   ├── turn-end/
│   │   │   ├── weather.ts
│   │   │   ├── status.ts
│   │   │   └── items.ts
│   │   └── index.ts           # TURN_PLAN配列
│   ├── damage/
│   │   └── calculator.ts      # ダメージ計算（battle-mechanics準拠）
│   ├── replay/
│   │   ├── event-log.ts       # EventLog管理
│   │   └── replay-rng.ts      # Replay用RNG（ログから読む）
│   └── index.ts
└── tests/
    ├── damage.test.ts
    ├── turn-order.test.ts
    └── replay.test.ts
```

---

## 8. 参考文献

- [battle-mechanics/turn-order.md](../battle-mechanics/turn-order.md)
- [battle-mechanics/damage-calculation.md](../battle-mechanics/damage-calculation.md)
- [battle-mechanics/priority-speed.md](../battle-mechanics/priority-speed.md)
- [data-schema-proposal.md](../data-schema-proposal.md)

---

## 9. 設計上の重要な注意点

### 瀕死判定の扱い

**第4世代の仕様**: ダメージを受けた直後に瀕死判定

**実装方針**:
- `APPLY_DAMAGE` の `applyEffect` 内で瀕死処理を完結させる
- ターン終了の14段階に `checkFainting` ステップは含めない
- 瀕死になったポケモンは `state.markAsFainted()` で以降の処理から除外

### Terrain は第4世代に存在しない

**削除済み**: `Terrain` 型、`SET_TERRAIN` Effect

**第4世代の場の効果**:
- 天候（Weather）: sun, rain, sandstorm, hail
- 場全体（GlobalFieldEffect）: trickRoom, gravity
- サイド効果（SideFieldEffect）: reflect, lightScreen, tailwind, mist, safeguard
- 設置技（HazardEffect）: stealthRock, spikes, toxicSpikes

### Effect Queue の無限ループ防止

**2段キュー方式**:
- `normalQueue`: 通常の処理キュー
- `immediateQueue`: 即座に処理すべきキュー（Trigger評価結果）
- **順序保証**: immediate → normal の順で処理

**TriggerGuard**:
- 2段キューだけでは不十分（同一Triggerの重複評価が起こりうる）
- `TurnRuntime.firedTriggers` で発動済みTriggerを記録
- キー: `${timing}:${pokemonId}:${causeId}`
- ターン開始時にクリア

### TurnContext の整理

**原則**: State が真実
- TurnContext は「ターン固有の外部入力」のみ（turnNumber, rng）
- 天候・トリックルーム等は **State から読む**（二重管理を避ける）
- ステップは `state.weather`, `state.globalEffects.trickRoom` 等を参照

### 砂嵐の特防補正

**常時補正**: ターン終了処理ではない
- 砂嵐の岩タイプ特防1.5倍は **ダメージ計算時に参照**
- `damage/calculator.ts` で `weather === sandstorm && defender is rock && move is special` のとき補正
- TURN_END_STEPS には含めない

---

## 10. 次のアクション（推奨順序）

詳細は [core-types.md](./core-types.md) の「次のアクション」を参照。

### Phase 1: 型定義
- Effect型（CHECK_ITEM_TRIGGER削除、ApplyResult、TriggerRequest + causeId）
- Event型（PublicEvent, RngEvent, TraceEvent）
- TurnRuntime型（TriggerGuard用）

### Phase 2: コアエンジン
- `apply-effect.ts`（APPLY_DAMAGE の瀕死即時処理）
- `effect-queue.ts`（2段キュー + TriggerGuard）
- `trigger-evaluator.ts`（runtime + trigReq）

### Phase 3: Replay
- ReplayRNG（purpose別consume）
- EventLog（consume API）

### Phase 4: 統合テスト
- 天候ダメ → 瀕死 → スキップ
- たべのこし → 毎ターン1回（TriggerGuard検証）
- Replay一致（RngEvent）

---

**最終更新**: 2026-01-25
