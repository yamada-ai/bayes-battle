# [M7] Policy Learning（Latent Action PPO）

**Epic Issue** - Milestone 7

## Milestone Overview

**Goal**: rolloutと学習ループが回り、ルールベース/ランダム相手に勝率が上がることを確認する。

---

## Success Criteria

- [ ] 行動埋め込み `e(a)` が実装される
- [ ] policy network（意図ベクトル `z_θ(s)` 出力）が実装される
- [ ] masked softmax（利用可能行動のみ）が実装される
- [ ] PPO学習ループ（Actor-Critic）が動作する
- [ ] PBRS報酬（HP差・残数差）が実装される
- [ ] ルールベース/ランダム相手に勝率が上昇する
- [ ] 学習ログとリプレイで挙動が説明できる
- [ ] Tensorboard等で学習曲線が確認できる

---

## Deliverables

### 1. Action Embedding
**File**: `rl-engine/policy/action_embedding.py`

```python
def action_embedding(action: Action, move_db: MoveDB) -> np.ndarray:
    """
    行動をベクトル化（威力・命中・タイプ・追加効果属性等）
    """
    # 例: [power, accuracy, type_one_hot, category_one_hot, priority, ...]
    # 次元: 32-64程度
```

### 2. Policy Network
**File**: `rl-engine/policy/network.py`

```python
class LatentActionPolicy(nn.Module):
    def __init__(self, state_dim, intent_dim):
        # Encoder: state → intent vector z
        # Actor: z + action embeddings → masked softmax
        # Critic: state → V(s)

    def forward(self, state, action_embeddings, action_mask):
        intent = self.encoder(state)  # z_θ(s)
        logits = intent @ action_embeddings.T / tau  # スコアリング
        masked_logits = logits.masked_fill(~action_mask, -inf)
        action_probs = softmax(masked_logits)
        value = self.critic(state)
        return action_probs, value
```

### 3. PPO Training
**File**: `rl-engine/policy/ppo.py`

- Rollout収集（self-play or vs ルールベース）
- Advantage計算（GAE）
- PPOクリップ目的関数
- エントロピーボーナス
- 学習ループ

### 4. Reward Shaping (PBRS)
**File**: `rl-engine/policy/reward.py`

```python
def pbrs_reward(state, next_state, gamma=0.99, lambda_hp=1.0, lambda_alive=3.0):
    """
    Potential-based Reward Shaping
    """
    phi_current = potential(state, lambda_hp, lambda_alive)
    phi_next = potential(next_state, lambda_hp, lambda_alive)
    shaping = gamma * phi_next - phi_current

    # 勝敗報酬
    win_reward = get_win_reward(next_state)  # +1, -1, or 0

    return win_reward + eta * shaping
```

### 5. Environment Wrapper
**File**: `rl-engine/env/battle_env.py`

```python
class BattleEnv(gym.Env):
    """
    Gym-compatible environment for RL
    """
    def reset(self):
        # battle-apiを呼び出して初期化

    def step(self, action):
        # battle-api呼び出し
        # observation: state + belief summary
        # reward: PBRS
        # done: 勝敗判定
        # info: events, etc.
```

---

## Subtasks (Feature Issues)

Phase 1: Action Embedding & Policy Network
- [ ] #issue - 行動埋め込み実装
- [ ] #issue - Policy Network実装（Encoder + Actor + Critic）
- [ ] #issue - Masked Softmax実装
- [ ] #issue - 単体テスト（forward pass確認）

Phase 2: PPO実装
- [ ] #issue - Rollout収集実装
- [ ] #issue - Advantage計算（GAE）
- [ ] #issue - PPO目的関数実装
- [ ] #issue - 学習ループ実装

Phase 3: Reward & Environment
- [ ] #issue - PBRS報酬実装
- [ ] #issue - Environment Wrapper実装
- [ ] #issue - Opponent（ルールベース/ランダム）実装

Phase 4: 実験・検証
- [ ] #issue - 学習スクリプト実装
- [ ] #issue - Tensorboard統合
- [ ] #issue - 対戦テスト（vs ルールベース/ランダム）
- [ ] #issue - リプレイ生成・FE連携

---

## Testing Requirements

### Unit Tests
- [ ] 行動埋め込みの次元・値範囲確認
- [ ] Policy Network forward pass（勾配確認）
- [ ] Masked Softmax（無効行動の確率が0）
- [ ] PBRS報酬計算（ポテンシャル不変性）

### Integration Tests
- [ ] Environment: reset → step → done
- [ ] Rollout収集（episode完走）
- [ ] PPO学習ループ（1 iteration）

### Smoke Tests
- [ ] Overfit確認（固定相手に過学習できるか）
- [ ] 勝率向上確認（ランダム相手に50% → 80%+）

### Validation
- [ ] 学習曲線の単調性（reward上昇、loss収束）
- [ ] Belief活用の確認（エントロピー低下時に攻撃的選択等）
- [ ] リプレイで挙動の妥当性確認

---

## Dependencies

- **Depends on**: M6 (Belief Tracker)
- **Blocks**: なし（最終マイルストーン）

---

## Notes

### ハイパーパラメータ（初期値）
- intent_dim: 64
- learning_rate: 3e-4
- batch_size: 256
- n_epochs: 10
- gamma: 0.99
- gae_lambda: 0.95
- clip_range: 0.2
- ent_coef: 0.01
- lambda_hp: 1.0
- lambda_alive: 3.0
- eta (shaping weight): 0.1

### 対戦相手
- Phase 1: ランダム（全行動等確率）
- Phase 2: ルールベース（簡易ヒューリスティック）
- Phase 3: Self-play（自己対戦）

### Self-play戦略
- 初期: 固定相手（学習安定性）
- 中期: 定期的にcheckpoint更新（exploitability回避）
- 後期: League（多様な過去版との対戦）

### Belief統合
- 状態表現: [self_state, belief_summary, entropy]
- belief_summary: E[e(m)] （期待埋め込み）
- entropy: 不確実性の明示

### 可視化（FE連携）
- 行動確率分布のヒートマップ
- 意図ベクトル z の可視化（PCA/t-SNE）
- Q値の可視化（どの行動が高評価か）

### 転移学習（Phase 2以降）
- 技追加: 新技の埋め込みを追加して再学習
- 世代変更: 新種族・新ルールへの適応

---

## References

- [methodology.md - Section 3-4](../docs/methodology.md#3-latent-action-spaceembedding--masked-softmax-による行動選択)
- [implementation-plan.md - Milestone 7](../docs/implementation-plan.md#milestone-7policylatent-action-ppo接続)
- Schulman, J., et al. (2017). Proximal Policy Optimization Algorithms.
- Ng, A. Y., et al. (1999). Policy invariance under reward shaping.
