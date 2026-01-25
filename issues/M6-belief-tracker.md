# [M6] Belief Tracker（Generative Particle）

**Epic Issue** - Milestone 6

## Milestone Overview

**Goal**: 相手推定が「動く」ことを確認する。Generative Particle Filter を実装し、典型的なケースでbelief収束を検証する。

---

## Success Criteria

- [ ] 粒子定義 `(C_nature, C_ev, C_item, C_moves)` が実装される
- [ ] 尤度計算（ダメージ・速度・確定ログ）が動作する
- [ ] 重み更新・正規化・ESS計算・リサンプリングが実装される
- [ ] Mixture混入（事前分布からの再生成）が実装される
- [ ] 典型ケースでbelief収束が確認できる（スカーフ判定、回復判定等）
- [ ] FEでbelief（上位粒子・エントロピー）が可視化できる

---

## Deliverables

### 1. Particle Definition
**File**: `rl-engine/belief/particle.py`

```python
@dataclass
class Particle:
    nature_category: NatureCategory  # SPEED+, ATTACK+, DEFENSE+, NEUTRAL
    ev_category: EVCategory          # AS, CS, HA, HC, HB, HD, HS
    item_category: ItemCategory      # CHOICE_SPEED, HEAL, SASH, etc.
    move_roles: Tuple[MoveRole, ...]  # (STAB_MAIN, COVERAGE, PRIORITY, BOOST)
```

### 2. Likelihood Calculation
**File**: `rl-engine/belief/likelihood.py`

- `damage_likelihood(particle, observed_damage, attacker_stats, defender_stats)`:
  - 区間尤度（0.85 * Dmax ~ Dmax）
  - 技候補周辺化（役割タグ → 可用技集合 → 尤度和）

- `speed_likelihood(particle, priority_observed)`:
  - 先手後手の観測との整合
  - スカーフ判定

- `log_likelihood(particle, confirmed_logs)`:
  - たべのこし回復 → HEAL確定
  - オボン発動 → HEAL確定
  - 状態異常付与 → STATUS技の存在

### 3. Particle Filter
**File**: `rl-engine/belief/filter.py`

- `ParticleFilter` クラス:
  - `initialize(prior, n_particles)`: 初期化
  - `update(observation)`: 重み更新
  - `resample()`: ESS閾値でリサンプリング
  - `mixture_rejuvenation(ratio)`: 事前分布混入
  - `get_belief_summary()`: 期待埋め込み + エントロピー

### 4. Prior Distribution
**File**: `rl-engine/belief/prior.py`

- メタゲーム統計に基づく事前分布（初期は均等でも可）
- 種族ごとの典型構成（例: ガブリアス → AS型多い等）

### 5. Visualization Support
**File**: `rl-engine/belief/visualize.py`

- 上位粒子の抽出
- 粒子分布のヒストグラム生成（JSON出力）
- エントロピー時系列

---

## Subtasks (Feature Issues)

Phase 1: 粒子定義・尤度計算
- [ ] #issue - Particle型定義（カテゴリ列挙）
- [ ] #issue - ダメージ尤度実装（区間尤度）
- [ ] #issue - 技候補周辺化実装
- [ ] #issue - 速度尤度実装
- [ ] #issue - 確定ログ尤度実装
- [ ] #issue - 尤度の分解・統合

Phase 2: Particle Filter実装
- [ ] #issue - 初期化・重み更新・正規化
- [ ] #issue - ESS計算
- [ ] #issue - リサンプリング実装
- [ ] #issue - Mixture混入実装

Phase 3: 検証・可視化
- [ ] #issue - 典型ケースでの収束検証スクリプト
- [ ] #issue - 可視化関数実装
- [ ] #issue - FE連携（belief分布の表示）

---

## Testing Requirements

### Unit Tests
- [ ] ダメージ尤度計算の正確性
- [ ] 技候補周辺化の正確性
- [ ] 速度尤度計算
- [ ] 確定ログ尤度（たべのこし/オボン等）
- [ ] ESS計算
- [ ] リサンプリング（粒子数保存、重み均等化）

### Integration Tests
- [ ] 典型ケース1: スカーフ判定
  - 初手で相手が想定外の速度 → スカーフ粒子の重みが上昇
- [ ] 典型ケース2: たべのこし判定
  - ターン終了時に回復 → HEAL粒子のみ生存
- [ ] 典型ケース3: ダメージからの努力値推定
  - 複数回のダメージ観測 → 努力値カテゴリ収束

### Convergence Validation
- [ ] エントロピーが単調減少する（情報蓄積）
- [ ] 上位粒子（重み上位10%）が正解に収束する
- [ ] ESSが適切に維持される（退化しない）

---

## Dependencies

- **Depends on**: M2 (Battle Core ルール拡張)
- **Blocks**: M7 (Policy学習)

---

## Notes

### 粒子数
- 初期: N=1000（調整可能）
- ESS閾値: 0.5 * N（退化判定）

### Mixture混入率
- ρ=5-10%（メタ外・予想外への対応）

### 技候補周辺化の実装
- 種族の可用技リストから役割タグに合致する技を抽出
- 各技のダメージ尤度を計算し、加重和（事前分布 P(x|m)）

### Rejuvenation（Phase 2で追加）
- MCMC近傍遷移（Metropolis-Hastings）
- 提案分布: 1要素をランダム変更
- 受理確率: 尤度比 * 事前分布比

### Belief要約表現（Policy入力）
- 期待埋め込み: E[e(m)] = Σ w_i * e(m_i)
- エントロピー: H = -Σ w_i log w_i
- 埋め込み次元: 32-64程度

---

## References

- [methodology.md - Section 2](../docs/methodology.md#2-belief-stategenerative-particle-による明示推定)
- [implementation-plan.md - Milestone 6](../docs/implementation-plan.md#milestone-6belief-trackergenerative-particle--b1)
- Doucet, A., & Johansen, A. M. (2009). A tutorial on particle filtering and smoothing.
