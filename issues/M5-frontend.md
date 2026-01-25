# [M5] Frontend（検証UI）

**Epic Issue** - Milestone 5

## Milestone Overview

**Goal**: 実験結果を観察し、バグ・推論・方策を検証する「顕微鏡」としてのUIを実装する。

---

## Success Criteria

- [ ] リプレイ再生UI（EventLogを時系列表示）が動作する
- [ ] BattleState可視化（盤面・HP・状態異常）ができる
- [ ] 行動履歴が確認できる
- [ ] WebSocket接続でリアルタイム観戦ができる
- [ ] 手動でターン入力して対戦が進められる
- [ ] Belief可視化の基盤（次段階で拡張）が準備される

---

## Deliverables

### 1. Core UI Components
**Files**: `packages/frontend/src/components/`

- `BattleField.tsx`: 盤面表示
- `PokemonCard.tsx`: ポケモン情報（HP、状態異常等）
- `ActionLog.tsx`: 行動履歴
- `EventTimeline.tsx`: EventLogの時系列表示
- `ReplayController.tsx`: リプレイ再生制御（再生/一時停止/早送り）

### 2. Pages
- `/`: ホーム（ルーム作成・参加）
- `/room/:id`: 対戦画面
- `/replay/:id`: リプレイ再生画面

### 3. State Management
- WebSocket通信管理
- EventLogの状態管理（Redux/Zustand/Jotai等）

### 4. Visualization (Phase 1)
- HP バー（アニメーション）
- 状態異常アイコン
- 技エフェクト（テキストベース、後で拡張）

### 5. Belief Visualization (基盤のみ)
- Belief分布表示の枠組み（M6で実装）
- エントロピー表示の枠組み

---

## Subtasks (Feature Issues)

Phase 1: 基礎UI
- [ ] #issue - Next.js プロジェクトセットアップ
- [ ] #issue - デザインシステム構築（Tailwind/MUI等）
- [ ] #issue - BattleField コンポーネント
- [ ] #issue - PokemonCard コンポーネント
- [ ] #issue - ActionLog コンポーネント
- [ ] #issue - EventTimeline コンポーネント

Phase 2: リプレイ機能
- [ ] #issue - ReplayController 実装
- [ ] #issue - EventLog パース・状態再構築
- [ ] #issue - アニメーション実装（HP減少等）

Phase 3: リアルタイム対戦
- [ ] #issue - WebSocket接続実装
- [ ] #issue - ターン入力UI
- [ ] #issue - リアルタイム状態更新

Phase 4: Belief可視化（基盤）
- [ ] #issue - Belief分布表示の枠組み
- [ ] #issue - エントロピー表示の枠組み

---

## Testing Requirements

### Component Tests
- [ ] Storybook でコンポーネントカタログ作成
- [ ] 各コンポーネントの単体テスト（Vitest + Testing Library）

### Integration Tests
- [ ] リプレイ再生フロー
- [ ] WebSocket接続・切断

### E2E Tests (後回し可)
- [ ] Playwright でルーム作成〜対戦完了

---

## Dependencies

- **Depends on**: M4 (Match Server)
- **Blocks**: M6 (Belief可視化の完全版)

---

## Notes

### 設計方針
- **検証装置**: 「遊べるUI」より「観察・検証・説明可能性」を重視
- **可視化重視**: 状態・行動・Belief・方策を視覚的に理解できるように
- **段階的拡張**: 最初はリプレイ、次にリアルタイム、最後にBelief/Policy

### 技術選定
- **Next.js 14+**: App Router
- **状態管理**: Zustand推奨（軽量・TypeScript親和性）
- **デザイン**: Tailwind CSS + shadcn/ui
- **可視化**: D3.js / Recharts（Belief分布用）

### Belief可視化の方針（M6で詳細実装）
- 粒子分布のヒストグラム
- エントロピーの時系列推移
- 上位粒子の詳細表示（性格・努力値・持ち物・技役割）

### Policy可視化の方針（M7で実装）
- 行動確率分布
- 意図ベクトル（latent action space）のヒートマップ
- Q値の可視化

---

## References

- [implementation-plan.md - Milestone 5](../docs/implementation-plan.md#milestone-5frontend検証uiリプレイ状態表示)
