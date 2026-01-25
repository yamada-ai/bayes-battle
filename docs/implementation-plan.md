# ポケモン第4世代風 POMDP/RL プロジェクト：実装計画

## 0. 目的（この文書の位置づけ）
- 「学習機構（Belief + PPO）」は上物であり、先に **対戦環境（ルール・演算・ログ）** を成立させる必要がある。
- 本文書は、実装順と責務分割の概要を定義し、段階的開発の指針を提供する。
- **詳細な実装計画・サブタスク・調査記録は [GitHub Issues](https://github.com/yamada-ai/bayes-battle/issues) を参照**。
- 公式データ（ポケモン名/技名/図鑑文/画像等）は **リポジトリに同梱しない**。データは外部取得 or 最小ダミーで進める。

---

## 1. 全体方針（最短で「回る」ことを優先）

### 1.1 最重要KPI（開発の成立条件）
1. **battle-core** が「決定的に正しい」：同一seed・同一入力なら同一結果になる
2. **観測ログ（events）** が出る：学習・可視化・テストに利用できる
3. **最小の対戦進行** が回る：人間入力 or AI入力でターンが進む
4. **FEは"検証装置"**：勝つためのUIではなく、状態・belief・方策の挙動を検証する可視化に寄せる

### 1.2 リポジトリ/モジュールの分割方針
- 初期は **monorepo** が最速（インターフェースを早期凍結しないため）。
- 後に安定したら `battle-core` を独立リポジトリ化できる設計にする（pure domain）。

---

## 2. 主要コンポーネントと責務

### 2.1 battle-core（最優先）
**目的：第4世代ルールに基づく「状態遷移」と「イベント生成」を担う純粋演算ライブラリ。**

- **入力**：`BattleState` + `Actions (両者)` + `RNG(seed)`
- **出力**：`BattleState'` + `EventLog`（観測可能なイベント列）
- **原則**：
  - DB・HTTP・セッション・ユーザー概念を持たない
  - I/OはJSON等の構造体で受け渡し可能にし、テスト容易性を最優先
  - **決定論**（seed固定で完全再現）

#### battle-coreが生成すべき Event の例（最低限）
- 行動宣言（技/交代）
- 優先度・先手後手の決定
- 命中/失敗
- ダメージ適用（量、残HP）
- 状態異常付与
- ターン終了処理（天候・やどりぎ等）
- 発動ログ（たべのこし回復、オボン発動 等）

> **重要**: RLもFEも「EventLogがあれば後から作れる」ため、Event設計は先に固める。

---

### 2.2 data（マスタデータ・スキーマ・インポート）
**目的：種族/技/特性/持ち物/タイプ相性などの"参照データ"の取り扱いを標準化する。**

- リポジトリには以下のみを含める：
  - JSON Schema（または同等の型定義）
  - ダミーデータ（架空モンスター/架空技でも可）
  - 外部データを変換するスクリプト（ただしデータは同梱しない）
- 方針：
  - 最初は **最小セット**（例：10種族・30技）で良い
  - battle-coreは「スキーマに沿ったデータ」をロードできれば動く

---

### 2.3 battle-api（任意だが早期にあると便利）
**目的：battle-coreをHTTP等で叩けるようにし、FE/RL/テストを共通の窓口で動かす。**

- **典型I/F**：
  - `step`: (state, actions, seed) -> (next_state, events)
  - `simulate`: (initial_state, policy_stub, seed, turns) -> replay
- **方針**：
  - 薄く作る（ビジネスロジックを持たない）
  - デバッグ・可視化・検証の"配管"として使う

---

### 2.4 match-server（対戦進行・セッション管理）
**目的：対戦の進行管理（部屋/ターン受付/ログ保存）を担う。**

- **責務**：
  - ルーム作成・参加・準備完了
  - 各ターンの入力受付（人間 or AI）
  - タイムアウト・切断対応（最初は簡易で良い）
  - リプレイ用ログ保存（events中心）
- **原則**：
  - battleの計算は battle-core/battle-api に委譲
  - DBは「進行とログ」を持つ（battle stateは最初JSONで良い）

---

### 2.5 frontend（検証UI）
**目的：実験結果を観察し、バグ・推論・方策を検証する"顕微鏡"。**

- **最低限の機能**：
  - リプレイ（EventLogを時系列で再生）
  - BattleStateの可視化（盤面・HP・状態）
  - 行動履歴（誰が何を選んだか）
- **次段階**：
  - belief分布/エントロピー表示（粒子の収束）
  - policy出力（行動確率、latent意図ベクトルの可視化）
- **方針**：
  - 「遊べるUI」に寄せすぎず、検証と説明可能性に寄せる

---

### 2.6 rl-engine（学習・推論）
**目的：POMDPとしての相手推定（belief）と方策学習（PPO）を実装する。**

- **入力**：
  - battle-coreが出す `EventLog`（観測）
  - 抽象化された状態特徴（自分の確定状態 + belief要約 + 不確実性）
- **出力**：
  - 行動分布（latent action space で masked softmax）
  - 学習済みモデル
- **原則**：
  - 最初は学習より「推論とrolloutが回る」ことを優先
  - 相手推定は粒子（Generative Particle）で開始（役割タグB1）

---

## 3. マイルストーン概要と実装優先順位

詳細な実装計画・サブタスク・テスト要件は **GitHub Issues** を参照してください：
https://github.com/yamada-ai/bayes-battle/issues

| ID | タイトル | ゴール | 完了条件 | Issue |
|----|---------|-------|----------|-------|
| **M0** | データスキーマ確定 | battle-coreが参照する最低限のデータ構造（type chart, species, move, item）を確定 | スキーマ + ダミーデータ + バリデーションテストが通る | [#1](https://github.com/yamada-ai/bayes-battle/issues/1) |
| **M1** | Battle Core 最小戦闘 | 状態遷移とイベント生成が成立する最小の戦闘システム（1v1, 技1つでも可） | seed固定で決定論的に動作、EventLogが出力される | [#2](https://github.com/yamada-ai/bayes-battle/issues/2) |
| **M2** | Battle Core ルール拡張 | 第4世代らしい複雑性（優先度・状態異常・天候・特性・道具）を実装 | 回帰テスト通過、有名な確定数計算が一致 | [#3](https://github.com/yamada-ai/bayes-battle/issues/3) |
| **M3** | Battle API | battle-coreをHTTPで叩けるラッパーを実装（step/simulate） | FE/RLから呼び出し可能、リプレイ再現可能 | [#4](https://github.com/yamada-ai/bayes-battle/issues/4) |
| **M4** | Match Server | 対戦進行管理（ルーム・ターン受付・ログ永続化） | ルーム作成→対戦→終了が完走、EventLog永続化 | [#5](https://github.com/yamada-ai/bayes-battle/issues/5) |
| **M5** | Frontend 検証UI | リプレイ再生・状態可視化・行動履歴表示 | リプレイ再生可能、BattleState可視化 | [#6](https://github.com/yamada-ai/bayes-battle/issues/6) |
| **M6** | Belief Tracker | Generative Particle Filter による相手推定 | 典型ケースでbelief収束、FEで可視化 | [#7](https://github.com/yamada-ai/bayes-battle/issues/7) |
| **M7** | Policy Learning | Latent Action PPO による方策学習 | rollout動作、ルールベース相手に勝率向上 | [#8](https://github.com/yamada-ai/bayes-battle/issues/8) |

### 実装の優先順位

1. **M0（データスキーマ）** が最優先
   - すべてのコンポーネントが依存する基盤
   - 最小セット（10種族・30技）で開始

2. **M1（最小戦闘）→ M2（ルール拡張）** を先に完成させる
   - battle-coreの完成がすべての前提
   - M1は1v1・技1つでも可（最速で動かす）
   - M2は段階的実装（優先度→状態異常→天候→特性）

3. **M3（API）→ M4（Server）→ M5（FE）** は並行可能
   - M3完了後、M4/M5は独立して進められる
   - FEは「検証装置」として早期に着手推奨

4. **M6（Belief）と M7（Policy）** は M2 完了後に着手
   - M6はM2のイベントログに依存
   - M7はM6のbelief出力に依存

### 依存関係

```
M0 (データスキーマ)
 └─ M1 (最小戦闘)
     └─ M2 (ルール拡張)
         ├─ M3 (API)
         │   ├─ M4 (Server) ─→ M5 (FE)
         │   └─ M6 (Belief) ─→ M7 (Policy)
         └─ M6 (直接依存も可)
```

---

## 4. 公開方針（データ非同梱の徹底）

### 4.1 リポジトリに含めるもの
- スキーマ（JSON Schema / TypeScript types）
- ダミーデータ（架空モンスター/架空技、最小限）
- 外部データ変換スクリプト（実行は各自）

### 4.2 リポジトリに含めないもの
- 公式データ（ポケモン名・技名・説明文・画像）
- 使用率統計等の二次データ（元データの権利に依存）

### 4.3 README記載事項
- 「本プロジェクトは研究・教育目的」
- 「公式データは各自で取得・変換」
- 「FEは検証UI（ゲームではない）」

---

## 5. 最初に確定すべき設計（実装を止めないための要点）

### 5.1 BattleState の最小要素
- HP/最大HP
- 状態異常（まひ/やけど/どく/こおり/ねむり）
- 場の状態（天候・フィールド・ステルスロック等）
- 残数/交代可能性
- 素早さランク補正
- 選択不可能な技（こだわり等）

### 5.2 Action の表現
- 技選択：`{type: "move", moveIndex: number}`
- 交代：`{type: "switch", pokemonIndex: number}`
- アイテム：`{type: "item", itemId: string, target: number}` (後回し可)
- action mask の定義（選択不可能な行動を明示）

### 5.3 EventLog のスキーマ
- イベント種別（enum）：
  - `ACTION_DECLARED`, `PRIORITY_DETERMINED`, `HIT`, `MISS`, `DAMAGE`, `FAINT`, `STATUS_INFLICT`, `ITEM_TRIGGER`, `WEATHER_TRIGGER`, `TURN_END`
- 各イベントの必須フィールド（actor, target, value等）
- タイムスタンプ（ターン内順序）

### 5.4 データスキーマ（species/move/item/type chart）
- **Species**: id, name, types, baseStats, abilities, learnset
- **Move**: id, name, type, category, power, accuracy, priority, effects
- **Item**: id, name, category, triggers, effects
- **TypeChart**: 2D array (attacker x defender)

### 5.5 RNGと決定論
- seed固定で完全再現
- RNG状態をBattleStateに含める（次の乱数が決定論的）
- 乱数消費順序の明確化（優先度決定→命中→ダメージ→追加効果等）

---

## 6. 今後の拡張（Phase 2以降）

- Rejuvenation（MCMC近傍遷移）
- 粒子カテゴリの細分化（S調整等）
- 技タグの高度化（prior学習）
- 転移学習（世代変更・技追加への汎化）
- マルチエージェント（自己対戦）
- メタゲーム分析（パーティ構築への応用）

---

## 7. まとめ

本実装計画は、**決定論的戦闘エンジン（battle-core）を真理の源泉**とし、その上に学習・可視化を積み上げる設計である。

**最優先事項**：
1. EventLogの設計（すべてがこれに依存）
2. データスキーマの確定（battle-coreの前提）
3. 決定論性の保証（テスト・再現性の基盤）

**開発の心構え**：
- 「最小で動く」ことを優先し、段階的に拡張する
- Issue駆動開発（調査・議論・意思決定はGitHub Issuesに記録）
- テストを書いてから実装する（TDD推奨）

**詳細な実装計画は [GitHub Issues](https://github.com/yamada-ai/bayes-battle/issues) を参照してください。**
