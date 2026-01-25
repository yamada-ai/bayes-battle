# [M1] Battle Core 最小戦闘

**Epic Issue** - Milestone 1

## Milestone Overview

**Goal**: 状態遷移とイベント生成が成立する最小の戦闘システムを実装する。1v1、技1つでも可。

---

## Success Criteria

- [ ] `initial_state + actions + seed -> next_state + events` が決定論で動作する
- [ ] 代表的イベント（行動宣言、命中/失敗、ダメージ、ターン終了）がログに出る
- [ ] seed固定で同一入力→同一出力が保証される
- [ ] 主要ユニットテストが存在し、通過する
- [ ] ダメージ計算が第4世代仕様に準拠する（最小版）

---

## Deliverables

### 1. Core Types
**Files**: `packages/battle-core/src/types/`

- `BattleState.ts`: 戦闘状態の型定義
  - `pokemon`: ポケモン配列（最小: HP, maxHP, species, level, stats）
  - `field`: 場の状態（最小: 天候なしで可）
  - `turn`: ターン数
  - `rng`: RNG状態

- `Action.ts`: 行動の型定義
  - `type: "move" | "switch"`
  - `moveIndex`: 技選択
  - `targetIndex`: 対象（1v1では不要だが将来対応）

- `Event.ts`: イベントログの型定義
  - `type`: イベント種別（enum）
  - `timestamp`: ターン内順序
  - `actor`, `target`, `value`: イベント依存フィールド

### 2. RNG Module
**File**: `packages/battle-core/src/rng/RNG.ts`

- seedから決定論的乱数生成
- `nextInt(min, max)`: 整数乱数
- `nextFloat()`: 浮動小数点乱数 [0, 1)
- 状態のシリアライズ/デシリアライズ

### 3. Damage Calculation
**File**: `packages/battle-core/src/damage/calculate.ts`

- 第4世代ダメージ計算式実装
- 物理/特殊区分（技ベース）
- タイプ相性
- 急所無し（最小版）
- 乱数係数 [0.85, 1.0] の適用

### 4. Battle Engine
**File**: `packages/battle-core/src/engine/BattleEngine.ts`

- `step(state: BattleState, actions: Actions, seed?: number): StepResult`
- StepResult: `{nextState, events}`
- ターン処理フロー:
  1. 行動宣言イベント生成
  2. 優先度・素早さ判定（最小版: 優先度0、素早さのみ）
  3. 先攻行動実行（命中判定→ダメージ→HP更新→瀕死判定）
  4. 後攻行動実行（同上）
  5. ターン終了イベント

### 5. Event Generation
**File**: `packages/battle-core/src/events/EventEmitter.ts`

- イベント生成の統一インターフェース
- 最小イベント種別:
  - `ACTION_DECLARED`: 行動宣言
  - `HIT`: 命中
  - `MISS`: 外れ
  - `DAMAGE`: ダメージ適用
  - `FAINT`: 瀕死
  - `TURN_END`: ターン終了

### 6. Tests
**Files**: `packages/battle-core/tests/`

- `engine.test.ts`: 統合テスト（1ターンの流れ）
- `damage.test.ts`: ダメージ計算の単体テスト
- `rng.test.ts`: RNGの決定論性テスト
- `determinism.test.ts`: 同一seed→同一結果の検証

---

## Subtasks (Feature Issues)

- [ ] #issue - Core Types定義 (BattleState, Action, Event)
- [ ] #issue - RNG実装 (決定論的乱数生成器)
- [ ] #issue - Damage Calculation実装
- [ ] #issue - Battle Engine実装 (step関数)
- [ ] #issue - Event Generation実装
- [ ] #issue - ユニットテスト: Damage Calculation
- [ ] #issue - ユニットテスト: RNG
- [ ] #issue - 統合テスト: 1ターンの戦闘フロー
- [ ] #issue - 決定論性テスト: seed固定での再現性

---

## Testing Requirements

### Unit Tests
- [ ] ダメージ計算: 代表的なケース（タイプ一致、相性、急所なし）
- [ ] RNG: seed固定で同一数列生成
- [ ] イベント生成: 各イベントタイプの生成確認

### Integration Tests
- [ ] 1ターンの完全フロー（行動宣言→先手後手→ダメージ→ターン終了）
- [ ] 命中/失敗の分岐
- [ ] HP0での瀕死判定

### Determinism Tests
- [ ] 同一seed + 同一actions → 同一nextState + 同一events
- [ ] 100回実行して結果が完全一致

---

## Dependencies

- **Depends on**: M0 (データスキーマ確定)
- **Blocks**: M2 (ルール拡張), M3 (Battle API)

---

## Notes

### 最小戦闘の定義
- **1v1**: パーティは1体ずつ
- **技1つでも可**: 最初はダメージ技のみ（状態異常・補助技は後回し）
- **交代なし**: 最小版では実装不要
- **天候・場なし**: ターン終了処理は最小限

### 決定論性の保証
- すべての乱数はRNGから取得
- `Math.random()` は使用禁止
- 状態遷移に外部依存なし（時刻、ファイルI/O等）

### ダメージ計算式（第4世代）
```
damage = (((2 * level / 5 + 2) * power * atk / def) / 50 + 2)
         * type_effectiveness * random_factor
```
- `random_factor` ∈ [0.85, 1.0] (16段階)
- 物理/特殊は技ベースで決定（第4世代仕様）

### イベントログの重要性
- RLとFEはEventLogに依存するため、設計を慎重に
- 各イベントは「観測可能な情報」のみ含む
- 内部状態（RNG状態等）は含まない

---

## References

- [implementation-plan.md - Milestone 1](../docs/implementation-plan.md#milestone-1battle-core-最小戦闘1v1--技1つでも可)
- [第4世代ダメージ計算式](https://bulbapedia.bulbagarden.net/wiki/Damage#Generation_IV)
- [Smogon: Generation 4 Battle Mechanics](https://www.smogon.com/dp/articles/damage_formula)
