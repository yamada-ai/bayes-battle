# [M4] Match Server

**Epic Issue** - Milestone 4

## Milestone Overview

**Goal**: 対戦進行管理（ルーム作成・ターン受付・ログ永続化）を実装し、人間またはAIが対戦できる基盤を構築する。

---

## Success Criteria

- [ ] ルーム作成・参加・準備完了が動作する
- [ ] 両者の行動入力を待ち、ターンが進行する
- [ ] EventLogがDBに永続化される
- [ ] リプレイ取得APIが動作する
- [ ] 簡易認証（匿名トークン）が実装される
- [ ] タイムアウト・切断の基本対応ができる

---

## Deliverables

### 1. Match Server
**Files**: `packages/match-server/src/`

- `server.ts`: WebSocket + HTTP サーバー
- `services/room.ts`: ルーム管理ロジック
- `services/match.ts`: 対戦進行ロジック
- `db/`: DB接続・マイグレーション

### 2. API Endpoints

#### Room Management
- `POST /rooms`: ルーム作成
- `POST /rooms/:id/join`: ルーム参加
- `POST /rooms/:id/ready`: 準備完了
- `GET /rooms/:id`: ルーム状態取得

#### Turn Management
- `POST /rooms/:id/turns`: ターン入力
- `GET /rooms/:id/state`: 現在の戦闘状態取得

#### Replay
- `GET /replays/:id`: リプレイ取得（EventLog）

### 3. WebSocket Events
- `room:joined`: ルーム参加通知
- `room:ready`: 準備完了通知
- `turn:waiting`: ターン入力待ち
- `turn:executed`: ターン実行完了（EventLog配信）
- `match:ended`: 対戦終了

### 4. Database Schema
**Files**: `packages/match-server/db/migrations/`

- `rooms`: ルーム情報
- `matches`: 対戦情報（state, winner等）
- `turns`: ターンログ（actions, events）
- `replays`: リプレイデータ

### 5. Authentication (Minimal)
- 匿名トークン生成
- トークンベースの簡易認証

---

## Subtasks (Feature Issues)

- [ ] #issue - サーバーセットアップ（WebSocket + HTTP）
- [ ] #issue - DB設計・マイグレーション
- [ ] #issue - ルーム管理ロジック実装
- [ ] #issue - ターン進行ロジック実装
- [ ] #issue - EventLog永続化
- [ ] #issue - リプレイAPI実装
- [ ] #issue - WebSocket イベント実装
- [ ] #issue - 簡易認証（匿名トークン）
- [ ] #issue - タイムアウト処理
- [ ] #issue - 統合テスト（ルーム作成〜対戦完了）

---

## Testing Requirements

### Integration Tests
- [ ] ルーム作成→参加→準備完了
- [ ] ターン入力→battle-api呼び出し→EventLog保存
- [ ] 対戦完了→勝者判定
- [ ] リプレイ取得

### Scenario Tests
- [ ] 2人が同時にターン入力
- [ ] 1人がタイムアウト
- [ ] 途中切断

---

## Dependencies

- **Depends on**: M3 (Battle API)
- **Blocks**: M5 (Frontend)

---

## Notes

### 設計方針
- **battle-coreに委譲**: 戦闘計算はbattle-apiを呼び出し
- **セッション管理**: WebSocketでリアルタイム通信
- **永続化**: EventLogを中心にDBに保存

### DB選定
- 初期: SQLite（開発容易性）
- 本番: PostgreSQL

### タイムアウト
- デフォルト: 60秒
- タイムアウト時: ランダム行動 or 敗北扱い（要検討）

### 切断対応
- 再接続可能にする（トークンベース）
- 一定時間後に自動敗北

---

## References

- [implementation-plan.md - Milestone 4](../docs/implementation-plan.md#milestone-4match-server最小の対戦進行)
