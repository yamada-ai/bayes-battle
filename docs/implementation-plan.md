# ポケモン第4世代風 POMDP/RL プロジェクト：実装計画

## 0. 目的（この文書の位置づけ）
- 「学習機構（Belief + PPO）」は上物であり、先に **対戦環境（ルール・演算・ログ）** を成立させる必要がある。
- 本文書は、実装順と責務分割の詳細を定義し、段階的開発の指針を提供する。
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

## 3. 実装順（マイルストーンと完了条件）

### Milestone 0：データスキーマ確定（最小）
**ゴール：battle-coreが参照する最低限のデータ構造が決まっている。**

#### スキーマ対象
- **type_chart**（タイプ相性）
- **species**（種族値・タイプ・特性候補）
- **move**（威力・命中・カテゴリ・追加効果属性）
- **item**（カテゴリ/発動条件・効果の抽象化）

#### 完了条件
- JSON Schema（または TypeScript types）とダミーデータでバリデーションが通る
- バリデーションテストが存在する

#### 成果物
- `packages/data/schema/` 配下にスキーマ定義
- `packages/data/examples/` 配下にダミーデータ（10種族・30技程度）
- バリデーションスクリプト + テスト

---

### Milestone 1：battle-core 最小戦闘（1v1 / 技1つでも可）
**ゴール：状態遷移とイベント生成が成立する。**

#### 実装対象
- `BattleState` 型定義（最小版：HP・状態・場情報）
- `Action` 型定義（技選択・交代）
- `EventLog` 型定義（最小イベント種別）
- 決定論的RNG（seed固定）
- 状態遷移ロジック（技実行→ダメージ→HP更新→ターン終了）
- イベント生成（行動宣言・命中・ダメージ・ターン終了）

#### 完了条件
- `initial_state + actions + seed -> next_state + events` が決定論で動作
- 代表的イベント（命中/ダメージ/ターン終了）がログに出る
- 主要ユニットテストが書ける（seed固定・期待値一致）

#### 成果物
- `packages/battle-core/src/` に実装
- `packages/battle-core/tests/` にテスト

---

### Milestone 2：battle-core ルール拡張（第4世代の要所）
**ゴール：第4世代らしい複雑性の核心を実装する。**

#### 実装順序（優先度：高→低）
1. **技優先度 / 先手後手**（素早さ・スカーフ等）
2. **物理/特殊区分**（第4世代仕様）とダメージ計算
3. **状態異常**（まひ/やけど/どく/こおり等の基礎）
4. **天候・場**（砂・霰・ステロ等、必要に応じて段階的）
5. **特性・道具**（確定ログが出るものから：たべのこし/オボン/スカーフ）

#### 完了条件
- 代表ケースの回帰テストが通る
- イベントログから観測（先手後手、回復発動等）が取れる
- 有名な確定数計算（例：ガブリアスの地震でカイリュー確2等）が一致する

#### 成果物
- `packages/battle-core/src/` に追加実装
- `packages/battle-core/tests/regression/` に回帰テスト

---

### Milestone 3：battle-api（デバッグ窓口）
**ゴール：外部（FE/RL）からbattle-coreを一貫して叩ける。**

#### 実装対象
- `POST /step`: (state, actions, seed) -> (next_state, events)
- `POST /simulate`: (initial_state, policy_stub, seed, turns) -> replay
- エラーハンドリング（不正入力・無効行動等）

#### 完了条件
- step/simulate相当のAPIで、state+actions->eventsが取得できる
- seed固定でリプレイ再現が可能
- 簡易テスト（curl/Postmanで叩ける）

#### 成果物
- `packages/battle-api/src/` に実装
- OpenAPI/Swagger定義

---

### Milestone 4：match-server（最小の対戦進行）
**ゴール：ターンを入力して対戦が進む"枠"ができる。**

#### 実装対象
- ルーム作成・参加・準備完了
- ターン入力受付（両者の行動を待つ）
- battle-api呼び出し
- EventLogの永続化（PostgreSQL or SQLite）
- リプレイ取得API

#### 完了条件
- ルーム作成→参加→ターン進行→終了までが通る
- EventLogが永続化され、リプレイ可能
- 認証は後回し（匿名トークンで可）

#### 成果物
- `packages/match-server/src/` に実装
- DB migration scripts

---

### Milestone 5：frontend（検証UI：リプレイ＆状態表示）
**ゴール：実験結果の検証装置が動く。**

#### 実装対象
- リプレイ再生UI（EventLogを読み込み、時系列表示）
- BattleState可視化（盤面・HP・状態異常）
- 行動履歴表示
- WebSocket接続（リアルタイム観戦）

#### 完了条件
- matchのEventLogを読み込んでリプレイできる
- BattleStateとイベントが視覚的に追える
- 手動でターン入力して対戦が進められる

#### 成果物
- `packages/frontend/src/` に実装
- Storybook（コンポーネントカタログ）

---

### Milestone 6：belief tracker（Generative Particle / B1）
**ゴール：相手推定が「動く」ことを確認する（学習はまだ）。**

#### 実装対象
- 粒子定義：`(C_nature, C_ev, C_item, C_moves)`
- 尤度計算：
  - ダメージ尤度（区間尤度 + 技候補周辺化）
  - 速度尤度（先手後手）
  - 確定ログ尤度（持ち物・状態異常等）
- 重み更新・正規化・ESS計算
- リサンプリング
- Mixture混入（事前分布からの再生成）

#### 完了条件
- 典型ケースで belief が収束する（例：スカーフ判定、回復判定）
- FEで belief（上位粒子・エントロピー）が可視化できる
- 単体テスト（尤度計算・重み更新）が通る

#### 成果物
- `rl-engine/belief/` に実装
- 収束検証スクリプト

---

### Milestone 7：policy（Latent Action PPO）接続
**ゴール：rolloutと学習ループが回る。**

#### 実装対象
- 行動埋め込み `e(a)`（威力・命中・タイプ・追加効果属性）
- policy network：意図ベクトル `z_θ(s)` を出力
- masked softmax（利用可能行動のみ）
- PPO学習ループ（Actor-Critic）
- PBRS報酬（HP差・残数差）

#### 完了条件
- ルールベース/ランダム相手に勝率が上がる
- 学習ログとリプレイで挙動が説明できる
- Tensorboard等で学習曲線が確認できる

#### 成果物
- `rl-engine/policy/` に実装
- 学習スクリプト + config
- 実験ログ

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

## 6. テスト戦略

### 6.1 battle-core（最重視）
- **ユニットテスト**: 各関数・モジュール単位
- **統合テスト**: state遷移の代表ケース
- **回帰テスト**: 有名な確定数・ダメージ計算
- **プロパティベーステスト**: ランダム入力で不変条件を検証（例：HP≧0）

### 6.2 battle-api
- APIエンドポイントの正常/異常系
- seed固定でのリプレイ再現

### 6.3 match-server
- ルーム作成・参加・ターン進行のシナリオテスト
- 同時接続・タイムアウト

### 6.4 frontend
- Storybookでコンポーネント単位
- E2Eは後回し（Playwrightで実装可能）

### 6.5 rl-engine
- 尤度計算の単体テスト
- belief収束の検証スクリプト
- policy学習の煙テスト（overfitできるか）

---

## 7. 開発環境・ツール

### 7.1 言語・フレームワーク
- TypeScript: Node.js 20+, pnpm 8+
- Python: 3.10+, Poetry/uv

### 7.2 テスティング
- Vitest (TS)
- pytest (Python)

### 7.3 CI/CD
- GitHub Actions
  - lint, type-check, test
  - ビルド成果物の検証

### 7.4 開発環境
- Docker Compose（PostgreSQL, Redis等）
- devcontainer対応（任意）

---

## 8. プロジェクト管理

### 8.1 Issue駆動開発
- 各MilestoneをEpic issueとして作成
- Epic配下に具体的なFeature issueを切る
- 完了条件を明確に記載

### 8.2 ブランチ戦略
- `main`: 安定版
- `develop`: 開発統合
- `feature/M0-schema`, `feature/M1-core` 等

### 8.3 コミットメッセージ
- Conventional Commits準拠
- 例：`feat(battle-core): add damage calculation`, `test(data): add schema validation`

---

## 9. 今後の拡張（Phase 2以降）

### Phase 2（Milestone 7完了後）
- Rejuvenation（MCMC近傍遷移）
- 粒子カテゴリの細分化（S調整等）
- 技タグの高度化（prior学習）

### Phase 3（研究段階）
- 転移学習（世代変更・技追加への汎化）
- マルチエージェント（自己対戦）
- メタゲーム分析（パーティ構築への応用）

---

## まとめ

本実装計画は、**決定論的戦闘エンジン（battle-core）を真理の源泉**とし、その上に学習・可視化を積み上げる設計である。

**最優先事項**：
1. EventLogの設計（すべてがこれに依存）
2. データスキーマの確定（battle-coreの前提）
3. 決定論性の保証（テスト・再現性の基盤）

**開発の心構え**：
- 「最小で動く」ことを優先し、段階的に拡張する
- テストを書いてから実装する（TDD推奨）
- ドキュメントと実装を同期させる

---

この計画に基づき、段階的に実装を進めることで、研究的意義と実用性を兼ね備えたプロジェクトを実現する。
