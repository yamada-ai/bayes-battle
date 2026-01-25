# Core Types 定義

**作成日**: 2026-01-25
**対象**: Battle Core の中核となる型定義
**参照**: [battle-core.md](./battle-core.md)

---

## 0. 概要

Battle Core の設計で最も重要な**3つのデータ型**を定義：

1. **Effect**: 内部命令（状態更新・トリガ評価）
2. **Event**: 外部事実（観測・リプレイ・デバッグ）
3. **TurnPlanStep**: 処理ステップ（順序保証）

---

## 1. Effect（内部命令）

### 1.1 設計原則

- **副作用の宣言**（実行はキューが行う）
- **State を直接変更しない**
- Effect適用の結果に応じて、新しいEffectをキューに追加

### 1.2 Effect型定義

```typescript
type PokemonId = number;  // 0-5（シングル: 0-1）
type MoveId = string;
type ItemId = string;
type AbilityId = string;
type StatusCondition = "burn" | "freeze" | "paralysis" | "poison" | "badlyPoisoned" | "sleep";
type Stat = "attack" | "defense" | "spAttack" | "spDefense" | "speed" | "accuracy" | "evasion";

type Effect =
  // === State変更系 ===
  | { type: "SET_HP"; pokemon: PokemonId; hp: number }
  | { type: "APPLY_DAMAGE"; target: PokemonId; amount: number; source?: DamageSource }
  | { type: "HEAL"; pokemon: PokemonId; amount: number; source?: HealSource }
  | { type: "SET_STATUS"; pokemon: PokemonId; status: StatusCondition | null }
  | { type: "SET_STAT_STAGE"; pokemon: PokemonId; stat: Stat; stage: number }  // -6〜+6
  | { type: "MODIFY_STAT_STAGE"; pokemon: PokemonId; stat: Stat; delta: number }  // ±1, ±2等

  // === 行動系 ===
  | { type: "USE_MOVE"; attacker: PokemonId; move: MoveId; target: PokemonId }
  | { type: "SWITCH_POKEMON"; player: 0 | 1; from: PokemonId; to: PokemonId }

  // === 技実行の詳細 ===
  | { type: "ROLL_ACCURACY"; attacker: PokemonId; move: MoveId; target: PokemonId }
  | { type: "ROLL_CRITICAL"; attacker: PokemonId; critStage: number }
  | { type: "CALCULATE_DAMAGE"; attacker: PokemonId; defender: PokemonId; move: MoveId; isCrit: boolean }
  | { type: "APPLY_SECONDARY_EFFECT"; move: MoveId; target: PokemonId }

  // === 場の効果 ===
  | { type: "SET_WEATHER"; weather: Weather | null; duration: number }
  | { type: "SET_GLOBAL_EFFECT"; effect: GlobalFieldEffect | null; duration: number }  // トリックルーム、じゅうりょく
  | { type: "SET_SIDE_EFFECT"; effect: SideFieldEffect; side: 0 | 1; duration: number }  // リフレクター等
  | { type: "SET_HAZARD"; hazard: HazardEffect; side: 0 | 1; layers?: number }  // ステルスロック等

  // === 行動順管理 ===
  | { type: "SET_ACTION_ORDER"; order: PokemonId[] };

type DamageSource =
  | { type: "move"; move: MoveId; attacker: PokemonId }
  | { type: "weather"; weather: Weather }
  | { type: "status"; status: StatusCondition }
  | { type: "recoil"; move: MoveId }
  | { type: "ability"; ability: AbilityId; owner: PokemonId };

type HealSource =
  | { type: "item"; item: ItemId }
  | { type: "ability"; ability: AbilityId }
  | { type: "move"; move: MoveId };

type Weather = "sun" | "rain" | "sandstorm" | "hail";

// 第4世代の場の効果
type GlobalFieldEffect = "trickRoom" | "gravity";
type SideFieldEffect = "reflect" | "lightScreen" | "tailwind" | "mist" | "safeguard";
type HazardEffect = "stealthRock" | "spikes" | "toxicSpikes";

type ItemTiming =
  | "TURN_START"
  | "BEFORE_MOVE"
  | "ON_HIT"
  | "ON_DAMAGE"
  | "AFTER_MOVE"
  | "TURN_END"
  | "ON_SWITCH_IN";

type AbilityTiming =
  | "ON_SWITCH_IN"
  | "ON_CONTACT_HIT"
  | "ON_DAMAGE"
  | "TURN_END"
  | "PASSIVE";  // 常時発動（素早さ補正等）
```

### 1.3 使用例

```typescript
// 例1: 地震の実行
const effects: Effect[] = [
  { type: "USE_MOVE", attacker: 0, move: "earthquake", target: 1 },
  { type: "ROLL_ACCURACY", attacker: 0, move: "earthquake", target: 1 },
  { type: "ROLL_CRITICAL", attacker: 0, critStage: 0 },
  { type: "CALCULATE_DAMAGE", attacker: 0, defender: 1, move: "earthquake", isCrit: false },
  { type: "APPLY_DAMAGE", target: 1, amount: 106, source: { type: "move", move: "earthquake", attacker: 0 } },
];

// 例2: ダメージ → オボンのみ発動（TriggerRequest経由）
const effects: Effect[] = [
  { type: "APPLY_DAMAGE", target: 1, amount: 106 },
];

// applyEffect の結果として TriggerRequest が返される
const result: ApplyResult = {
  events: [{ type: "DAMAGE_DEALT", target: 1, amount: 106, newHP: 94, newHPPercent: 47 }],
  rngEvents: [],
  triggerRequests: [{ timing: "ON_DAMAGE", subjects: [1], cause: effects[0] }],
  derivedEffects: [],
};

// Trigger評価で派生Effectが生成される
const triggeredEffects: Effect[] = [
  { type: "HEAL", pokemon: 1, amount: 50, source: { type: "item", item: "sitrus-berry" } },
];
```

---

## 2. Event（外部事実）

### 2.1 設計原則

- **PublicEvent**: Belief Tracker が読む唯一の情報源（後方互換重視）
- **RngEvent**: Replay の真実（乱数結果を記録）
- **TraceEvent**: デバッグ用（任意）

### 2.2 PublicEvent型定義

```typescript
type PublicEvent =
  // === ターン制御 ===
  | { type: "TURN_START"; turnNumber: number }
  | { type: "TURN_END"; turnNumber: number }

  // === 行動 ===
  | { type: "MOVE_USED"; pokemon: PokemonId; move: MoveId; target: PokemonId }
  | { type: "MOVE_FAILED"; pokemon: PokemonId; move: MoveId; reason: MoveFailReason }
  | { type: "SWITCHED"; player: 0 | 1; from: PokemonId; to: PokemonId }

  // === ダメージ・回復 ===
  | { type: "DAMAGE_DEALT"; target: PokemonId; amount: number; newHP: number; newHPPercent: number }
  | { type: "HEALED"; pokemon: PokemonId; amount: number; newHP: number }

  // === 状態異常 ===
  | { type: "STATUS_INFLICTED"; target: PokemonId; status: StatusCondition }
  | { type: "STATUS_CURED"; pokemon: PokemonId; status: StatusCondition }
  | { type: "STATUS_PREVENTED_ACTION"; pokemon: PokemonId; status: StatusCondition }

  // === 能力変化 ===
  | { type: "STAT_CHANGED"; pokemon: PokemonId; stat: Stat; oldStage: number; newStage: number }

  // === 道具・特性 ===
  | { type: "ITEM_ACTIVATED"; pokemon: PokemonId; item: ItemId; trigger: ItemTiming }
  | { type: "ITEM_CONSUMED"; pokemon: PokemonId; item: ItemId }
  | { type: "ABILITY_ACTIVATED"; pokemon: PokemonId; ability: AbilityId; trigger: AbilityTiming }

  // === 勝敗 ===
  | { type: "FAINTED"; pokemon: PokemonId }
  | { type: "BATTLE_END"; winner: 0 | 1 | null };  // null = 引き分け

type MoveFailReason =
  | "missed"
  | "protected"
  | "immune"
  | "failed"  // 技自体が失敗（まもる連続等）
  | "paralyzed"
  | "asleep"
  | "frozen";
```

### 2.3 RngEvent型定義

```typescript
// purpose ごとに型を分ける（型安全性向上）
type RngEvent =
  // === Phase 1（最小セット） ===
  | { type: "RNG_ROLL"; purpose: "accuracy"; value: number }        // 0.0〜1.0 (float)
  | { type: "RNG_ROLL"; purpose: "crit"; value: boolean }           // 急所判定
  | { type: "RNG_ROLL"; purpose: "damageRoll"; value: number }      // 85〜100 (int)
  | { type: "RNG_ROLL"; purpose: "secondary"; value: number }       // 0.0〜1.0 (float)
  | { type: "RNG_ROLL"; purpose: "speedTie"; value: boolean }       // 同速判定
  | { type: "RNG_ROLL"; purpose: "statusDuration"; value: number }  // sleep: 2-5 (int)

  // === Phase 2（拡張） ===
  | { type: "RNG_ROLL"; purpose: "flinch"; value: number }          // 0.0〜1.0 (float)
  | { type: "RNG_ROLL"; purpose: "multiHit"; value: number }        // 2-5回 (int)
  | { type: "RNG_ROLL"; purpose: "confusion"; value: number }       // 1-4ターン (int)
  | { type: "RNG_ROLL"; purpose: "itemTrigger"; value: boolean }    // せんせいのツメ等
  | { type: "RNG_ROLL"; purpose: "abilityTrigger"; value: number }; // 0.0〜1.0 (float)
```

### 2.4 TraceEvent型定義

```typescript
type TraceEvent =
  // === ダメージ内訳 ===
  | { type: "DAMAGE_BREAKDOWN"; breakdown: DamageBreakdown }

  // === ステップトレース ===
  | { type: "STEP_START"; step: string; turnNumber: number }
  | { type: "STEP_END"; step: string; effectCount: number }

  // === Trigger評価 ===
  | { type: "TRIGGER_EVALUATED"; trigger: string; pokemon: PokemonId; result: boolean }

  // === Effect適用 ===
  | { type: "EFFECT_APPLIED"; effect: Effect; stateBefore: string; stateAfter: string };

type DamageBreakdown = {
  baseDamage: number;
  attack: number;
  defense: number;
  mod1: number;
  mod2: number;
  mod3: number;
  stab: number;
  typeEffectiveness: number;
  critMultiplier: number;
  randomRoll: number;
  finalDamage: number;
};
```

### 2.5 使用例

```typescript
// 例: 10まんボルトでダメージ + まひ
const events: PublicEvent[] = [
  { type: "MOVE_USED", pokemon: 0, move: "thunderbolt", target: 1 },
  { type: "DAMAGE_DEALT", target: 1, amount: 95, newHP: 105, newHPPercent: 52.5 },
  { type: "STATUS_INFLICTED", target: 1, status: "paralysis" },
];

const rngEvents: RngEvent[] = [
  { type: "RNG_ROLL", purpose: "accuracy", value: 0.87 },  // 命中
  { type: "RNG_ROLL", purpose: "crit", value: false },     // 急所なし
  { type: "RNG_ROLL", purpose: "damageRoll", value: 92 },  // 乱数92
  { type: "RNG_ROLL", purpose: "secondary", value: 0.08 }, // 10% → まひ発動
];
```

---

## 2.6 ApplyResult型定義

**Effect適用の結果**を返す型（観測の一貫性を保つため）

```typescript
type ApplyResult = {
  // 観測可能なイベント + デバッグトレース
  events: (PublicEvent | TraceEvent)[];

  // 乱数イベント（Replay用）
  rngEvents: RngEvent[];

  // Trigger評価リクエスト（誰を評価するか明示）
  triggerRequests: TriggerRequest[];

  // 派生Effect（反動・自動処理など）
  derivedEffects: Effect[];
};

type TriggerRequest = {
  timing: TriggerTiming;
  subjects: PokemonId[];  // 評価対象（全ポケモンではない）
  cause: Effect;          // 何が原因か
  causeId: string;        // 原因の一意ID（TriggerGuard用）
};

type TriggerTiming =
  | "ON_SWITCH_IN"
  | "BEFORE_MOVE"
  | "ON_HIT"
  | "ON_DAMAGE"
  | "AFTER_MOVE"
  | "TURN_END"
  | "ON_CONTACT_HIT";
```

### 使用例: APPLY_DAMAGE の適用

```typescript
function applyEffect(state: BattleState, effect: Effect): ApplyResult {
  if (effect.type === "APPLY_DAMAGE") {
    const pokemon = state.getPokemon(effect.target);
    const oldHP = pokemon.hp;
    const newHP = Math.max(0, oldHP - effect.amount);
    pokemon.hp = newHP;

    const events: PublicEvent[] = [
      { type: "DAMAGE_DEALT", target: effect.target, amount: effect.amount, newHP, newHPPercent: (newHP / pokemon.maxHP) * 100 }
    ];

    // 瀕死判定（ダメージ直後に即座に処理）
    if (newHP === 0 && oldHP > 0) {
      events.push({ type: "FAINTED", pokemon: effect.target });
      state.markAsFainted(effect.target);  // 以降の処理から除外
    }

    // ON_DAMAGE トリガーを評価（瀕死でない場合のみ）
    const triggerRequests: TriggerRequest[] = newHP > 0 ? [
      { timing: "ON_DAMAGE", subjects: [effect.target], cause: effect }
    ] : [];

    return { events, rngEvents: [], triggerRequests, derivedEffects: [] };
  }

  // 他のEffectの処理...
}
```

---

## 3. TurnPlanStep（処理ステップ）

### 3.1 設計原則

- **副作用を起こさない**（Effectを生成するだけ）
- **順序はデータとして管理**（配列の並び替えで仕様変更可能）
- **Stateを読む**が直接変更しない（変更はEffect適用時に行う）
- 依存の事実はState経由で自然に反映される（例: 瀕死ポケモンは自動スキップ）

### 3.2 TurnPlanStep型定義

```typescript
type TurnContext = {
  turnNumber: number;
  rng: RNG | ReplayRNG;
  // 注: 天候・トリックルーム等は State から読む（二重管理を避ける）
};

type TurnPlanStep = (state: BattleState, ctx: TurnContext) => Effect[];

// RNG インターフェース
interface RNG {
  nextInt(min: number, max: number): number;
  nextFloat(): number;  // 0.0〜1.0
  nextBoolean(): boolean;
  getSeed(): number;
}

// Replay用RNG（ログから読む）
interface ReplayRNG {
  consumeNext(purpose: RngPurpose): number | boolean;
}
```

### 3.3 TURN_PLAN定義

```typescript
// ターン全体の処理計画
const TURN_PLAN: TurnPlanStep[] = [
  // === ターン開始 ===
  turnStart,

  // === 行動順決定 ===
  determinePriority,

  // === 各ポケモンの行動実行 ===
  executeActions,

  // === ターン終了処理（14段階） ===
  ...TURN_END_STEPS,
];

// ターン終了の13段階
// 注1: 瀕死判定はここに含めない（APPLY_DAMAGE 時に即座に処理）
// 注2: 砂嵐の岩タイプ特防1.5倍は常時補正（ダメージ計算時に参照）
const TURN_END_STEPS: TurnPlanStep[] = [
  applyWeatherDamage,       // 1. 天候ダメージ（すなあらし/あられ）
  applyStatusDamage,        // 2. 状態異常ダメージ（やけど/どく/もうどく）
  applyCurseDamage,         // 3. 呪いのダメージ
  applyLeechSeedDamage,     // 4. 宿り木のダメージ
  applyItemHeal,            // 5. 道具による回復（たべのこし等）
  applyAbilityHeal,         // 6. 特性による回復（ポイズンヒール等）
  applyAquaRing,            // 7. アクアリング
  applyIngrain,             // 8. ねをはる
  applyBindDamage,          // 9. 拘束技のダメージ
  applyNightmareDamage,     // 10. 悪夢のダメージ
  applyPerishSong,          // 11. ほろびのうた（カウント0で瀕死）
  applyFutureAttack,        // 12. みらいよち/はめつのねがい
  decrementDurations,       // 13. 各種ターン数カウント
];
```

### 3.4 ステップ実装例

```typescript
// 例1: 天候ダメージ
const applyWeatherDamage: TurnPlanStep = (state, ctx) => {
  const effects: Effect[] = [];

  if (!ctx.weather) return effects;

  for (const pokemon of state.activePokemon) {
    if (pokemon.hp === 0) continue;

    const shouldTakeDamage =
      (ctx.weather === "sandstorm" && !pokemon.types.includes("rock") && !pokemon.types.includes("steel") && !pokemon.types.includes("ground")) ||
      (ctx.weather === "hail" && !pokemon.types.includes("ice"));

    if (shouldTakeDamage) {
      const damage = Math.floor(pokemon.maxHP / 16);
      effects.push({
        type: "APPLY_DAMAGE",
        target: pokemon.id,
        amount: damage,
        source: { type: "weather", weather: ctx.weather },
      });
    }
  }

  return effects;
};

// 例2: 状態異常ダメージ
const applyStatusDamage: TurnPlanStep = (state, ctx) => {
  const effects: Effect[] = [];

  for (const pokemon of state.activePokemon) {
    if (pokemon.hp === 0 || !pokemon.status) continue;

    let damage = 0;
    if (pokemon.status === "burn" || pokemon.status === "poison") {
      damage = Math.floor(pokemon.maxHP / 8);
    } else if (pokemon.status === "badlyPoisoned") {
      damage = Math.floor((pokemon.maxHP * pokemon.toxicCounter) / 16);
      // カウンターは別ステップで増加
    }

    if (damage > 0) {
      effects.push({
        type: "APPLY_DAMAGE",
        target: pokemon.id,
        amount: damage,
        source: { type: "status", status: pokemon.status },
      });
    }
  }

  return effects;
};

// 例3: 行動順決定
const determinePriority: TurnPlanStep = (state, ctx) => {
  const effects: Effect[] = [];

  // 優先度・道具・素早さで順序決定
  const order = calculateActionOrder(state, ctx.rng);

  // 同速判定で乱数を使った場合、RngEventを記録
  // （この例では簡略化）

  // state.actionOrder に順序を保存するEffectを生成
  effects.push({
    type: "SET_ACTION_ORDER",
    order,
  });

  return effects;
};
```

---

## 3.6 TurnRuntime と TriggerGuard

### 無限ループ防止の必要性

**問題**: 2段キューだけでは不十分
- 同一原因で同一タイミングのTriggerを何度も評価すると無限ループ
- 例: たべのこしが TURN_END で何度も発動してしまう
- 例: 発動条件の書き間違いが即座に無限ループに

**解決策**: TriggerGuard

```typescript
type TurnRuntime = {
  // Trigger発動済み記録（無限ループ防止）
  firedTriggers: Set<string>;  // key = `${timing}:${pokemonId}:${causeId}`

  // その他ターン実行時の一時データ
  effectIdCounter: number;  // Effect に一意IDを振る
};

function evaluateTriggers(
  state: BattleState,
  runtime: TurnRuntime,
  trigReq: TriggerRequest
): Effect[] {
  const effects: Effect[] = [];

  for (const pokemonId of trigReq.subjects) {
    // TriggerGuard: 同一原因につき一回だけ
    const key = `${trigReq.timing}:${pokemonId}:${trigReq.causeId}`;
    if (runtime.firedTriggers.has(key)) {
      continue;  // 既に発動済み
    }
    runtime.firedTriggers.add(key);

    const pokemon = state.getPokemon(pokemonId);
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

### TriggerGuard の仕組み

**キーの構造**: `${timing}:${pokemonId}:${causeId}`

- **timing**: ON_DAMAGE, TURN_END 等
- **pokemonId**: 評価対象のポケモン
- **causeId**: 原因となったEffectの一意ID

**例**:
- `ON_DAMAGE:1:effect_42` → ポケモン1に対する effect_42 による ON_DAMAGE は1回のみ
- `TURN_END:0:turn_end_5` → ポケモン0に対する ターン終了処理5 による TURN_END は1回のみ

**ライフサイクル**:
- ターン開始時に `runtime.firedTriggers.clear()`
- 各Trigger評価前にチェック
- 発動したら即座に記録

---

## 4. BattleState（補足）

```typescript
interface BattleState {
  // === ポケモン ===
  pokemon: Pokemon[];  // 全ポケモン（シングル: 2体、ダブル: 4体）
  activePokemon: Pokemon[];  // 場に出ているポケモン

  // === 場の状態 ===
  weather: Weather | null;
  weatherTurnsLeft: number;

  // 場全体の効果
  globalEffects: {
    trickRoom: number;     // 残りターン数（0 = 未発動）
    gravity: number;
  };

  // サイドごとの効果（0 = 自分側, 1 = 相手側）
  sideEffects: {
    [side in 0 | 1]: {
      reflect: number;
      lightScreen: number;
      tailwind: number;
      mist: number;
      safeguard: number;
      stealthRock: boolean;      // 設置済みか
      spikesLayers: number;      // 0-3層
      toxicSpikesLayers: number; // 0-2層
    };
  };

  // === ターン情報 ===
  turnNumber: number;
  actionOrder: PokemonId[];  // 今ターンの行動順

  // === その他 ===
  lastMoveDamage: number;  // カウンター等で使用
}

interface Pokemon {
  id: PokemonId;
  speciesId: string;
  level: number;

  // === 現在値 ===
  hp: number;
  maxHP: number;
  status: StatusCondition | null;
  statStages: { [stat in Stat]: number };  // -6〜+6

  // === 固定値 ===
  baseStats: BaseStats;
  nature: NatureId;
  evs: EVs;
  ivs: IVs;
  ability: AbilityId;
  item: ItemId | null;
  moves: MoveId[];

  // === 状態異常関連 ===
  toxicCounter: number;  // もうどく用
  sleepTurnsLeft: number;

  // === その他 ===
  types: Type[];
  selectedMove: MoveId | null;  // 今ターン選択した技
}
```

---

## 5. 重要な設計判断のまとめ

### 瀕死判定

- **ターン終了ステップに含めない**（第4世代仕様: ダメージ直後に判定）
- `applyEffect(APPLY_DAMAGE)` 内で完結
- 瀕死後は `state.markAsFainted()` で以降の処理から除外

### Terrain 削除

- 第4世代に存在しない概念（第6世代導入）
- `BattleState` から `terrain` フィールド削除
- `TurnContext` から `terrain` フィールド削除

### TurnContext の整理

- **State が真実**：天候・トリックルーム等は State に置く
- TurnContext は「ターン固有の外部入力」のみ（turnNumber, rng）
- 二重管理を避けるため、ステップは State から読む

### TriggerRequest 方式の採用

- **CHECK_ITEM_TRIGGER / EVALUATE_ABILITY を Effect から削除**
- TriggerRequest 一本で Trigger 評価を行う
- `subjects` 明示でパフォーマンス改善、`causeId` で無限ループ防止

### TriggerGuard の導入

- 2段キューだけでは無限ループを防げない
- `TurnRuntime.firedTriggers` で発動済みTriggerを記録
- キー: `${timing}:${pokemonId}:${causeId}`

### RngEvent の型安全性

- `purpose` ごとに `value` の型を分離
- `damageRoll`: `number` (85-100の整数)
- `accuracy`, `secondary`: `number` (0.0-1.0の浮動小数点)
- `crit`, `speedTie`: `boolean`

### ApplyResult の導入

- Effect適用の結果を構造化
- `events: (PublicEvent | TraceEvent)[]` で TraceEvent の出口を確保
- `events`, `rngEvents`, `triggerRequests`, `derivedEffects` を明示的に返す
- 観測の一貫性を保証

### 砂嵐の特防補正

- **ターン終了処理ではない**（常時補正）
- ダメージ計算時に参照
- TURN_END_STEPS から除外

---

## 6. 次のアクション（推奨順序）

### Phase 1: 型定義

`packages/battle-core/src/types/`

1. **effect.ts**
   - Effect型（CHECK_ITEM_TRIGGER / EVALUATE_ABILITY 削除済み）
   - ApplyResult型（events: PublicEvent | TraceEvent, triggerRequests, derivedEffects）
   - TriggerRequest型（timing + subjects + cause + causeId）

2. **event.ts**
   - PublicEvent, RngEvent, TraceEvent型

3. **turn-plan.ts**
   - TurnPlanStep型
   - TurnRuntime型（firedTriggers, effectIdCounter）

4. **state.ts**
   - BattleState型

### Phase 2: コアエンジン

`packages/battle-core/src/engine/`

1. **apply-effect.ts**
   - APPLY_DAMAGE の瀕死即時処理（ここが芯）
   - HEAL / SET_STATUS くらいまで

2. **effect-queue.ts**
   - 2段キュー処理
   - TriggerGuard（TurnRuntime 使用）

3. **trigger-evaluator.ts**
   - evaluateTriggers 関数（runtime, trigReq を受け取る）
   - TriggerGuard でチェック済みTriggerをスキップ

### Phase 3: Replay

`packages/battle-core/src/replay/`

1. **replay-rng.ts**
   - ReplayRNG.consumeNext(purpose) の実装

2. **event-log.ts**
   - EventLog のconsume API（purpose別に読む）

### Phase 4: 統合テスト

`packages/battle-core/tests/`

1. **天候ダメ → 瀕死 → 以降スキップ**
2. **たべのこし → 毎ターン1回だけ**（TriggerGuard検証）
3. **replay一致**（RngEventでズレない）

---

**最終更新**: 2026-01-25
