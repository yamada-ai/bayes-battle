# [M0] データスキーマ確定

**Epic Issue** - Milestone 0

## Milestone Overview

**Goal**: battle-coreが参照する最低限のデータ構造（スキーマ）を確定し、バリデーション可能な状態にする。

---

## Success Criteria

- [ ] Type Chart（タイプ相性）のスキーマ定義とダミーデータが存在する
- [ ] Species（種族）のスキーマ定義とダミーデータ（10種族）が存在する
- [ ] Move（技）のスキーマ定義とダミーデータ（30技）が存在する
- [ ] Item（持ち物）のスキーマ定義とダミーデータが存在する
- [ ] スキーマバリデーションテストが通る
- [ ] 外部データ変換スクリプトの雛形が存在する

---

## Deliverables

### 1. Type Chart Schema
- **File**: `packages/data/schema/type-chart.schema.json`
- **Content**: タイプ相性の2次元配列（18x18 for Gen4）
- **Validation**: 全要素が有効な倍率（0, 0.25, 0.5, 1, 2, 4）

### 2. Species Schema
- **File**: `packages/data/schema/species.schema.json`
- **Fields**:
  - `id`: string (unique identifier)
  - `name`: string
  - `types`: string[] (1-2 types)
  - `baseStats`: {hp, atk, def, spa, spd, spe}
  - `abilities`: string[] (1-3 abilities)
  - `learnset`: string[] (move IDs)

### 3. Move Schema
- **File**: `packages/data/schema/move.schema.json`
- **Fields**:
  - `id`: string
  - `name`: string
  - `type`: string
  - `category`: "physical" | "special" | "status"
  - `power`: number | null
  - `accuracy`: number | null
  - `priority`: number (default 0)
  - `effects`: object (追加効果の抽象化)

### 4. Item Schema
- **File**: `packages/data/schema/item.schema.json`
- **Fields**:
  - `id`: string
  - `name`: string
  - `category`: string (CHOICE_SPEED, HEAL, etc.)
  - `triggers`: string[] (ON_TURN_END, ON_HIT, etc.)
  - `effects`: object

### 5. Dummy Data
- **Files**:
  - `packages/data/examples/type-chart.json`
  - `packages/data/examples/species.json` (10種族：架空でも可)
  - `packages/data/examples/moves.json` (30技：最小セット)
  - `packages/data/examples/items.json`

### 6. Validation
- **File**: `packages/data/src/validate.ts`
- **Tests**: `packages/data/tests/validate.test.ts`
- **Script**: `pnpm --filter data validate`

### 7. External Data Script (Template)
- **File**: `packages/data/scripts/convert-external.ts`
- **Purpose**: 外部データ（JSON/CSV等）をスキーマに変換する雛形
- **Note**: 実際のデータは同梱しない

---

## Subtasks (Feature Issues)

- [ ] #issue - TypeScript types定義（全スキーマ共通）
- [ ] #issue - Type Chart スキーマ + ダミーデータ
- [ ] #issue - Species スキーマ + ダミーデータ
- [ ] #issue - Move スキーマ + ダミーデータ
- [ ] #issue - Item スキーマ + ダミーデータ
- [ ] #issue - バリデーションロジック実装
- [ ] #issue - バリデーションテスト実装
- [ ] #issue - 外部データ変換スクリプト雛形作成

---

## Testing Requirements

- [ ] スキーマバリデーション: 正常系・異常系
- [ ] ダミーデータがスキーマに準拠することを確認
- [ ] 外部データ変換スクリプトの動作確認（サンプルデータで）

---

## Dependencies

- **Depends on**: なし（最優先マイルストーン）
- **Blocks**: M1 (Battle Core最小戦闘)

---

## Notes

### スキーマ形式
- JSON Schema を採用
- TypeScript 型定義も同時生成（`json-schema-to-typescript` 等を利用）

### ダミーデータの方針
- 架空のモンスター・技でも可
- 最小限（10種族・30技）で動作確認できればOK
- 第4世代の代表的な要素（タイプ一致・相性・先制技等）を含む

### 公式データの扱い
- リポジトリには同梱しない
- 外部データ変換スクリプトは「雛形」のみ提供
- READMEに「各自で取得・変換」と明記

---

## References

- [implementation-plan.md - Milestone 0](../docs/implementation-plan.md#milestone-0データスキーマ確定最小)
- [第4世代ダメージ計算式](https://bulbapedia.bulbagarden.net/wiki/Damage#Generation_IV)
