# [M2] Battle Core ルール拡張

**Epic Issue** - Milestone 2

## Milestone Overview

**Goal**: 第4世代らしい複雑性の核心を実装し、実戦レベルの戦闘システムを完成させる。

---

## Success Criteria

- [ ] 技優先度・素早さによる先手後手判定が正確に動作する
- [ ] 物理/特殊のダメージ計算が第4世代仕様に完全準拠する
- [ ] 主要な状態異常（まひ/やけど/どく/こおり/ねむり）が実装される
- [ ] 天候・場の効果（砂嵐/霰/ステルスロック等）が実装される
- [ ] 特性・道具の基礎（たべのこし/オボン/スカーフ等）が実装される
- [ ] 有名な確定数計算の回帰テストが通る
- [ ] EventLogから観測（先手後手、回復発動等）が取れる

---

## Implementation Priority

### Phase 1: 優先度・先手後手（最優先）
- [ ] 技優先度（-7 〜 +5）の実装
- [ ] 素早さ計算（ランク補正、まひ等）
- [ ] こだわりスカーフ（素早さ1.5倍）
- [ ] 先手後手のイベントログ

### Phase 2: ダメージ計算拡張
- [ ] 物理/特殊区分の完全実装
- [ ] 急所計算
- [ ] 一致技ボーナス（STAB 1.5倍）
- [ ] 特性による補正（いかく、てんねん等は後回し）

### Phase 3: 状態異常
- [ ] まひ（素早さ0.25倍、25%行動不能）
- [ ] やけど（攻撃0.5倍、毎ターンダメージ）
- [ ] どく（毎ターンダメージ）
- [ ] もうどく（蓄積ダメージ）
- [ ] こおり（行動不能、20%解除）
- [ ] ねむり（行動不能、1-3ターン）

### Phase 4: 天候・場
- [ ] 天候: 晴れ/雨/砂嵐/霰
- [ ] ステルスロック（交代時ダメージ）
- [ ] リフレクター/ひかりのかべ（ダメージ軽減）

### Phase 5: 特性・道具（基礎）
- [ ] たべのこし（毎ターン1/16回復）
- [ ] オボンのみ（HP50%以下で1/4回復）
- [ ] こだわりスカーフ（素早さ1.5倍、技固定）
- [ ] こだわりハチマキ/メガネ（攻撃1.5倍、技固定）
- [ ] きあいのタスキ（HP満タンで致死ダメージをHP1で耐える）

---

## Deliverables

### 1. Priority & Speed
- `packages/battle-core/src/engine/priority.ts`
- `packages/battle-core/src/engine/speed.ts`

### 2. Damage Calculation (Extended)
- `packages/battle-core/src/damage/calculate.ts` (拡張)
- 急所、STAB、特性補正

### 3. Status Conditions
- `packages/battle-core/src/status/`
- `StatusCondition` 型定義
- 各状態異常の効果実装

### 4. Weather & Field
- `packages/battle-core/src/field/weather.ts`
- `packages/battle-core/src/field/hazards.ts`

### 5. Abilities & Items
- `packages/battle-core/src/abilities/` (基礎のみ)
- `packages/battle-core/src/items/` (基礎のみ)

### 6. Regression Tests
- `packages/battle-core/tests/regression/`
- 有名な確定数計算（例: ガブリアスの地震でカイリュー確2）
- ダメージ範囲の検証

---

## Subtasks (Feature Issues)

Phase 1:
- [ ] #issue - 技優先度実装
- [ ] #issue - 素早さ計算（ランク補正）
- [ ] #issue - こだわりスカーフ実装
- [ ] #issue - 先手後手判定ロジック

Phase 2:
- [ ] #issue - 急所計算
- [ ] #issue - STAB補正
- [ ] #issue - ダメージ計算の完全実装

Phase 3:
- [ ] #issue - まひ実装
- [ ] #issue - やけど実装
- [ ] #issue - どく/もうどく実装
- [ ] #issue - こおり実装
- [ ] #issue - ねむり実装

Phase 4:
- [ ] #issue - 天候システム実装
- [ ] #issue - ステルスロック実装
- [ ] #issue - 壁（リフレクター/ひかりのかべ）実装

Phase 5:
- [ ] #issue - たべのこし/オボン実装
- [ ] #issue - こだわり系アイテム実装
- [ ] #issue - きあいのタスキ実装

Testing:
- [ ] #issue - 回帰テスト: 確定数計算
- [ ] #issue - 回帰テスト: 状態異常の挙動
- [ ] #issue - 統合テスト: 複合的な戦闘シナリオ

---

## Testing Requirements

### Regression Tests（最重要）
- [ ] ガブリアスの地震 vs カイリュー（確2）
- [ ] スカーフガブリアス vs 最速ゲンガー（スカーフが先制）
- [ ] やけど状態の物理技ダメージ（0.5倍）
- [ ] たべのこし回復のタイミング
- [ ] オボンのみ発動条件（HP50%以下）

### Unit Tests
- [ ] 各状態異常の効果
- [ ] 天候の効果（砂嵐でいわタイプ特防1.5倍等）
- [ ] 道具の発動条件

### Integration Tests
- [ ] 状態異常 + 天候 + 道具の複合シナリオ
- [ ] 複数ターンにわたる戦闘

---

## Dependencies

- **Depends on**: M1 (Battle Core最小戦闘)
- **Blocks**: M3 (Battle API), M6 (Belief Tracker)

---

## Notes

### 実装の段階性
- Phase 1-2を優先（先手後手・ダメージ計算）
- Phase 3-5は並行実装可能
- 回帰テストを随時追加

### 確定数計算の重要性
- 実戦で使われる代表的な組み合わせをテストケースに
- ダメージ範囲（乱数幅）の検証
- 相手推定（Belief Tracker）の前提となる精度保証

### イベントログの拡張
- 状態異常付与・解除イベント
- 天候開始・終了イベント
- 道具発動イベント（たべのこし、オボン等）
- これらはRL/FEの観測に直結

---

## References

- [implementation-plan.md - Milestone 2](../docs/implementation-plan.md#milestone-2battle-core-ルール拡張第4世代の要所)
- [Smogon: Status Conditions](https://www.smogon.com/dp/articles/status)
- [Bulbapedia: Weather](https://bulbapedia.bulbagarden.net/wiki/Weather)
