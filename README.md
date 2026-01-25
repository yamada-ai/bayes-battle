# Bayes Battle

**ポケモン第4世代風 対戦AI：Generative Particle Belief + Latent Action PPO**

## 概要

本プロジェクトは、ポケモン第4世代対戦を **部分観測マルコフ決定過程（POMDP）** として定式化し、相手の隠れ状態（努力値・性格・持ち物・技構成）を明示的に推定しながら最適行動を学習するAI研究実装です。

従来の大規模end-to-end強化学習（RNN暗黙推論）とは異なり、**ドメイン知識を活用したベイズ推論**により、サンプル効率・解釈可能性・ルール変化耐性を同時に実現することを目指します。

---

## 研究的意義・差別化点

本手法の核心は以下の3点です：

### 1. **Generative Particle Belief**（生成的粒子による明示的推定）
- 相手の隠れ状態を **構造化された潜在パラメータ** `(性格, 努力値, 持ち物, 技役割)` として粒子で表現
- テンプレ列挙ではなく、**生成表現 + MCMC近傍遷移**により未知型にも到達可能
- ダメージ乱数・技候補を **周辺化（Rao-Blackwellization）** し、粒子退化を抑制
- 不確実性（エントロピー）を方策に入力し、**情報獲得行動**の発現を検証

### 2. **Latent Action Space**（行動埋め込みによる汎化）
- 行動を「技ID」ではなく **特徴ベクトル空間** に埋め込み
- 方策は「意図ベクトル」を出力し、行動埋め込みとの内積で選択（masked softmax）
- 技追加・世代変更に対する **転移学習** を主張可能

### 3. **決定論的戦闘エンジン + 観測イベントログ**
- `battle-core`: 同一seed・同一入力 → 同一結果を保証
- すべての観測を `EventLog` として構造化出力
- RL・可視化・テストが同一の真理ソースから構築可能

---

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (検証UI)                                           │
│  - リプレイ再生、Belief可視化、Policy解釈                      │
└─────────────────┬───────────────────────────────────────────┘
                  │ WebSocket / HTTP
┌─────────────────▼───────────────────────────────────────────┐
│  Match Server (対戦進行・セッション管理)                        │
│  - ルーム管理、ターン受付、ログ永続化                           │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTP
┌─────────────────▼───────────────────────────────────────────┐
│  Battle API (薄いHTTPラッパー)                                │
│  - step(state, actions, seed) -> (next_state, events)       │
└─────────────────┬───────────────────────────────────────────┘
                  │ Function Call
┌─────────────────▼───────────────────────────────────────────┐
│  Battle Core (決定論的戦闘演算ライブラリ)                       │
│  - 状態遷移、ダメージ計算、優先度、EventLog生成                 │
│  - Pure Function (DB/HTTP/Session非依存)                     │
└─────────────────┬───────────────────────────────────────────┘
                  │ Event Stream
┌─────────────────▼───────────────────────────────────────────┐
│  RL Engine (Belief Tracker + PPO)                           │
│  - Particle Filter (Generative, Rao-Blackwellization)      │
│  - Latent Action Policy (Embedding + Masked Softmax)       │
│  - PPO Learning Loop                                        │
└─────────────────────────────────────────────────────────────┘
                  ▲
                  │ Data Schema
┌─────────────────┴───────────────────────────────────────────┐
│  Data (マスタデータ・スキーマ)                                  │
│  - Species, Move, Item, Type Chart (Schema + Minimal Dummy) │
│  ※ 公式データは同梱しない（外部取得・変換スクリプトのみ）          │
└─────────────────────────────────────────────────────────────┘
```

---

## 技術スタック

### Core Engine & API
- **Battle Core**: TypeScript (pure, framework-agnostic)
- **Battle API**: Node.js + Express / Fastify
- **Match Server**: Node.js + PostgreSQL (初期はSQLite可)

### RL Engine
- **Language**: Python 3.10+
- **Framework**: PyTorch 2.0+
- **Particle Filter**: NumPy + custom implementation
- **PPO**: Stable-Baselines3 / CleanRL ベース

### Frontend
- **Framework**: Next.js 14+ (React)
- **Visualization**: D3.js / Recharts (Belief分布・方策可視化)
- **Communication**: WebSocket (リアルタイムリプレイ)

### Infrastructure
- **Monorepo**: pnpm workspaces
- **Testing**: Vitest (TS), pytest (Python)
- **CI/CD**: GitHub Actions
- **Containerization**: Docker Compose (開発環境)

---

## ディレクトリ構造（予定）

```
bayes-battle/
├── packages/
│   ├── battle-core/          # 戦闘演算ライブラリ (TS)
│   │   ├── src/
│   │   │   ├── state/        # BattleState定義
│   │   │   ├── actions/      # Action型定義・validation
│   │   │   ├── engine/       # 状態遷移・ダメージ計算
│   │   │   ├── events/       # EventLog型定義・生成
│   │   │   └── rng/          # 決定論的RNG
│   │   └── tests/            # ユニット・統合テスト
│   ├── battle-api/           # HTTPラッパー (TS)
│   ├── match-server/         # 対戦進行管理 (TS)
│   ├── frontend/             # 検証UI (Next.js)
│   └── data/                 # マスタデータ・スキーマ
│       ├── schema/           # JSON Schema / TypeScript types
│       ├── examples/         # ダミーデータ
│       └── scripts/          # 外部データ変換スクリプト
├── rl-engine/                # 学習・推論 (Python)
│   ├── belief/               # Particle Filter実装
│   ├── policy/               # Latent Action PPO
│   ├── env/                  # Gym環境ラッパー
│   └── experiments/          # 学習スクリプト・ログ
├── docs/                     # ドキュメント
│   ├── methodology.md        # 理論詳細（POMDP定式化）
│   ├── implementation-plan.md # 実装順序
│   └── architecture.md       # コンポーネント詳細設計
├── .github/
│   ├── ISSUE_TEMPLATE/       # Issue テンプレート
│   └── workflows/            # CI/CD
└── docker-compose.yml        # 開発環境
```

---

## 開発方針

### 1. **決定論性の保証**
- `battle-core` は同一seed・同一入力で必ず同一結果を返す
- すべての乱数はseedから生成される擬似乱数を使用
- リプレイ完全再現可能

### 2. **EventLogを真理の源泉に**
- すべての観測可能情報は `EventLog` として構造化
- RL・FE・テストはすべてEventLogから構築
- Event設計を最優先で固める

### 3. **公式データの非同梱**
- ポケモン名・技名・説明文・画像等は **リポジトリに含めない**
- スキーマ + ダミーデータのみ提供
- 外部データの取り込みはユーザー責任

### 4. **段階的実装（最小で動く → 拡張）**
- Milestone 0: データスキーマ確定
- Milestone 1: 最小戦闘（1v1, 技1つでも可）
- Milestone 2-7: ルール拡張 → API → Server → FE → Belief → Policy

### 5. **テスト駆動**
- `battle-core` は高いテストカバレッジ（目標: >90%）
- 回帰テスト（有名な確定数・ダメージ計算）を含む
- Beliefの収束・方策の妥当性を可視化で検証

---

## Getting Started

### 前提条件
- Node.js 20+
- Python 3.10+
- pnpm 8+

### セットアップ（実装完了後の見通し）

```bash
# 依存関係インストール
pnpm install

# データスキーマのバリデーション
pnpm --filter data validate

# Battle Coreのテスト
pnpm --filter battle-core test

# 開発サーバー起動
docker-compose up -d
pnpm dev

# RL学習実行
cd rl-engine
python -m experiments.train_ppo --config configs/baseline.yaml
```

---

## マイルストーン

| ID | タイトル | 完了条件 |
|----|---------|---------|
| M0 | データスキーマ確定 | スキーマ定義 + バリデーション通過 |
| M1 | Battle Core 最小戦闘 | 1v1・技1つで状態遷移 + EventLog出力 |
| M2 | Battle Core ルール拡張 | 第4世代主要ルール実装 + 回帰テスト |
| M3 | Battle API | step/simulate APIが叩ける |
| M4 | Match Server | ターン進行 + ログ永続化 |
| M5 | Frontend 検証UI | リプレイ再生 + 状態可視化 |
| M6 | Belief Tracker | Particle Filter動作 + 収束検証 |
| M7 | Policy Learning | PPO学習ループ + 勝率向上確認 |

詳細は [Issues](https://github.com/yourusername/bayes-battle/issues) を参照してください。

---

## ライセンス

MIT License

**注意**: 本プロジェクトは研究・教育目的です。ポケモンは任天堂・クリーチャーズ・ゲームフリークの登録商標です。公式データの使用は各自の責任で行ってください。

---

## 貢献

Issue・PRを歓迎します。大きな変更の場合は、事前にIssueで議論してください。

---

## 参考文献

詳細な理論的背景は [`docs/methodology.md`](./docs/methodology.md) を参照してください。

- Ng, A. Y., et al. (1999). Policy invariance under reward shaping. ICML.
- Silver, D., et al. (2016). Mastering the game of Go with deep neural networks. Nature.
- Vinyals, O., et al. (2019). Grandmaster level in StarCraft II using multi-agent reinforcement learning. Nature.
