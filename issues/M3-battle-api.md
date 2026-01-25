# [M3] Battle API

**Epic Issue** - Milestone 3

## Milestone Overview

**Goal**: battle-coreを外部（FE/RL）から利用できるHTTPラッパーを実装し、デバッグ・検証の窓口を提供する。

---

## Success Criteria

- [ ] `POST /step` で1ターン実行できる
- [ ] `POST /simulate` で複数ターンのシミュレーションができる
- [ ] seed固定でリプレイ再現が可能
- [ ] エラーハンドリング（不正入力・無効行動）が適切
- [ ] OpenAPI/Swagger定義が存在する
- [ ] curl/Postmanで動作確認できる

---

## Deliverables

### 1. API Server
**Files**: `packages/battle-api/src/`

- `server.ts`: Express/Fastify サーバー
- `routes/battle.ts`: 戦闘関連エンドポイント
- `middleware/`: エラーハンドリング、バリデーション

### 2. Endpoints

#### `POST /step`
- **Request**:
  ```json
  {
    "state": BattleState,
    "actions": [Action, Action],
    "seed": number (optional)
  }
  ```
- **Response**:
  ```json
  {
    "nextState": BattleState,
    "events": Event[]
  }
  ```

#### `POST /simulate`
- **Request**:
  ```json
  {
    "initialState": BattleState,
    "policy": "random" | "rule-based" | {...},
    "turns": number,
    "seed": number (optional)
  }
  ```
- **Response**:
  ```json
  {
    "finalState": BattleState,
    "replay": Event[],
    "winner": "player1" | "player2" | "draw"
  }
  ```

#### `GET /health`
- ヘルスチェック

### 3. OpenAPI Definition
- `packages/battle-api/openapi.yaml`
- Swagger UI at `/api-docs`

### 4. Error Handling
- 400: Invalid input (バリデーションエラー)
- 422: Invalid action (無効な行動)
- 500: Internal server error

---

## Subtasks (Feature Issues)

- [ ] #issue - Express/Fastify サーバーセットアップ
- [ ] #issue - `/step` エンドポイント実装
- [ ] #issue - `/simulate` エンドポイント実装
- [ ] #issue - OpenAPI定義作成
- [ ] #issue - エラーハンドリングミドルウェア
- [ ] #issue - バリデーションミドルウェア（Zod等）
- [ ] #issue - 統合テスト（APIエンドポイント）
- [ ] #issue - ドキュメント整備（使い方・例）

---

## Testing Requirements

### Integration Tests
- [ ] `/step`: 正常系（1ターン実行）
- [ ] `/step`: 異常系（不正なstate、無効な行動）
- [ ] `/simulate`: 正常系（複数ターン、勝敗判定）
- [ ] seed固定でのリプレイ再現

### Manual Testing
- [ ] curl での動作確認
- [ ] Postman/Insomnia での動作確認
- [ ] Swagger UI からの実行

---

## Dependencies

- **Depends on**: M2 (Battle Core ルール拡張)
- **Blocks**: M4 (Match Server), M5 (Frontend)

---

## Notes

### 設計方針
- **薄いラッパー**: ビジネスロジックはbattle-coreに委譲
- **ステートレス**: セッション管理はmatch-serverが担当
- **デバッグ重視**: ログ出力を充実させる

### 技術選定
- Express vs Fastify: 好みに応じて（Fastifyが高速）
- バリデーション: Zod推奨（TypeScriptとの親和性）

### セキュリティ（初期は簡易）
- 認証・認可は後回し（match-server側で実装）
- Rate limiting は後回し

---

## References

- [implementation-plan.md - Milestone 3](../docs/implementation-plan.md#milestone-3battle-apiデバッグ窓口)
