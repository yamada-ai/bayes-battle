# データスキーマ提案（第4世代準拠）

**作成日**: 2026-01-25
**対象**: Milestone 0（データスキーマ確定）
**参照**: [battle-mechanics/](./battle-mechanics/)

---

## 0. 背景と目的

### 調査結果から明らかになった要件

[battle-mechanics/](./battle-mechanics/) の仕様調査により、以下が明確になった：

1. **物理/特殊は技ごとに決まる**（第4世代の特徴）
2. **優先度は -7〜+5 の範囲**
3. **追加効果は構造化が必要**（状態異常、能力変化、急所等）
4. **道具・特性の発動タイミングが厳密**（ターン処理順序に依存）
5. **接触技の判定が必要**（特性発動に影響）

### 本文書の目的

- 上記要件を満たすデータスキーマを提案
- JSON Schema + TypeScript型定義を明確化
- ダミーデータの例を示す
- 実装フェーズを明確化（最小セット vs 拡張）

### 重要な世代固有仕様

- **第4世代はタイプ17種類**（フェアリーは第6世代導入）
- **隠れ特性なし**（第5世代導入）
- **物理/特殊は技ごとに固定**（タイプ依存ではない）

---

## 1. 性格（Nature）

### 概要

- 25種類の性格が存在
- 攻撃/防御/特攻/特防/素早さのいずれかが1.1倍、別の能力が0.9倍
- 補正なし（「がんばりや」等）も存在

### スキーマ定義

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "increased": {
      "type": "string",
      "enum": ["attack", "defense", "spAttack", "spDefense", "speed", null]
    },
    "decreased": {
      "type": "string",
      "enum": ["attack", "defense", "spAttack", "spDefense", "speed", null]
    }
  },
  "required": ["id", "name"]
}
```

### TypeScript型定義

```typescript
type Stat = 'attack' | 'defense' | 'spAttack' | 'spDefense' | 'speed';

interface Nature {
  id: string;
  name: string;
  increased: Stat | null;
  decreased: Stat | null;
}
```

### ダミーデータ例

```json
[
  {
    "id": "adamant",
    "name": "いじっぱり",
    "increased": "attack",
    "decreased": "spAttack"
  },
  {
    "id": "jolly",
    "name": "ようき",
    "increased": "speed",
    "decreased": "spAttack"
  },
  {
    "id": "hardy",
    "name": "がんばりや",
    "increased": null,
    "decreased": null
  }
]
```

### 実装の考慮点

- **完全列挙 vs 最小セット**
  - 推奨: 25種類すべてを定義（サイズ小、固定的）
  - ファイル: `packages/data/schema/natures.json`

---

## 2. 技（Move）

### 概要

第4世代の技は以下の特徴を持つ：

- **物理/特殊/変化の3分類**（技ごとに固定）
- **優先度 -7〜+5**
- **追加効果**（状態異常、能力変化、急所等）
- **接触技判定**（特性発動に影響）
- **対象**（単体/全体等、Targets補正に影響）

### スキーマ定義

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "type": {
      "type": "string",
      "enum": ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel"]
    },
    "category": {
      "type": "string",
      "enum": ["physical", "special", "status"]
    },
    "power": { "type": ["number", "null"] },
    "accuracy": { "type": ["number", "null"] },
    "priority": {
      "type": "number",
      "minimum": -7,
      "maximum": 5
    },
    "pp": { "type": "number" },
    "target": {
      "type": "string",
      "enum": ["single", "self", "allOpponents", "allAllies", "all", "randomOpponent", "allExceptSelf"]
    },
    "makesContact": { "type": "boolean" },
    "roleTags": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["STAB_MAIN", "STAB_SUB", "COVERAGE", "PRIORITY", "BOOST", "STATUS", "SUPPORT", "HAZARD", "HEAL", "PIVOT"]
      }
    },
    "secondaryEffect": {
      "type": ["object", "null"],
      "properties": {
        "type": { "type": "string" },
        "chance": { "type": "number" }
      }
    },
    "flags": {
      "type": "object",
      "properties": {
        "protect": { "type": "boolean" },
        "mirror": { "type": "boolean" },
        "snatch": { "type": "boolean" }
      }
    }
  },
  "required": ["id", "name", "type", "category", "priority", "pp", "target"]
}
```

### TypeScript型定義

```typescript
type Type = 'normal' | 'fire' | 'water' | 'electric' | 'grass' | 'ice' |
            'fighting' | 'poison' | 'ground' | 'flying' | 'psychic' | 'bug' |
            'rock' | 'ghost' | 'dragon' | 'dark' | 'steel';

type MoveCategory = 'physical' | 'special' | 'status';

type MoveTarget = 'single' | 'self' | 'allOpponents' | 'allAllies' | 'all' |
                  'randomOpponent' | 'allExceptSelf';

type SecondaryEffect =
  | { type: 'status'; status: StatusCondition; chance: number }
  | { type: 'statChange'; stat: Stat; stages: number; target: 'self' | 'opponent'; chance: number }
  | { type: 'flinch'; chance: number }
  | { type: 'critRateBoost'; boost: number }
  | { type: 'recoil'; percent: number }
  | { type: 'drain'; percent: number }
  | { type: 'healing'; percent: number };

interface Move {
  id: string;
  name: string;
  type: Type;
  category: MoveCategory;
  power: number | null;
  accuracy: number | null;  // null = 必中
  priority: number;  // -7〜+5
  pp: number;
  target: MoveTarget;
  makesContact: boolean;
  roleTags?: string[];  // Generative Particle用の役割タグ（STAB_MAIN, COVERAGE等）
  secondaryEffect?: SecondaryEffect;
  flags?: {
    protect?: boolean;  // まもる/みきりで防げるか
    mirror?: boolean;   // マジックコートで跳ね返るか
    snatch?: boolean;   // よこどりで奪えるか
  };
}
```

### ダミーデータ例

```json
[
  {
    "id": "thunderbolt",
    "name": "10まんボルト",
    "type": "electric",
    "category": "special",
    "power": 95,
    "accuracy": 100,
    "priority": 0,
    "pp": 15,
    "target": "single",
    "makesContact": false,
    "roleTags": ["STAB_MAIN"],
    "secondaryEffect": {
      "type": "status",
      "status": "paralysis",
      "chance": 10
    },
    "flags": {
      "protect": true,
      "mirror": true
    }
  },
  {
    "id": "earthquake",
    "name": "じしん",
    "type": "ground",
    "category": "physical",
    "power": 100,
    "accuracy": 100,
    "priority": 0,
    "pp": 10,
    "target": "allExceptSelf",
    "makesContact": false,
    "roleTags": ["STAB_MAIN"],
    "flags": {
      "protect": true
    }
  },
  {
    "id": "quick-attack",
    "name": "でんこうせっか",
    "type": "normal",
    "category": "physical",
    "power": 40,
    "accuracy": 100,
    "priority": 1,
    "pp": 30,
    "target": "single",
    "makesContact": true,
    "roleTags": ["PRIORITY"],
    "flags": {
      "protect": true
    }
  },
  {
    "id": "trick-room",
    "name": "トリックルーム",
    "type": "psychic",
    "category": "status",
    "power": null,
    "accuracy": null,
    "priority": -7,
    "pp": 5,
    "target": "all",
    "makesContact": false,
    "roleTags": ["SUPPORT"],
    "flags": {
      "mirror": true
    }
  }
]
```

### 実装の考慮点

- **最小セット（Phase 1）**: 30技程度
  - ダメージ技（物理/特殊各5種）
  - 状態異常技（でんじは、おにび等）
  - 優先度技（でんこうせっか等）
  - 特殊技（トリックルーム）
- **拡張（Phase 2）**: 複雑な技
  - みがわり、まもる、アンコール等

---

## 3. 道具（Item）

### 概要

道具は以下の特徴を持つ：

- **発動タイミング**（ターン処理順序に対応）
- **発動条件**（HP閾値、状態等）
- **効果**（回復、能力補正、状態異常治癒等）
- **消費型 vs 永続型**

### スキーマ定義

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "category": {
      "type": "string",
      "enum": ["CHOICE_SPEED", "CHOICE_POWER", "SASH", "HEAL", "RECOIL", "CONTACT", "STATUS_CURE", "BOOST", "NONE"]
    },
    "trigger": {
      "type": "object",
      "properties": {
        "timing": {
          "type": "string",
          "enum": ["TURN_START", "BEFORE_MOVE", "ON_HIT", "AFTER_MOVE", "TURN_END", "ON_SWITCH_IN", "ON_DAMAGE"]
        },
        "condition": { "type": ["string", "null"] }
      },
      "required": ["timing"]
    },
    "effect": {
      "type": "object"
    },
    "consumable": { "type": "boolean" }
  },
  "required": ["id", "name", "category", "trigger", "effect"]
}
```

### TypeScript型定義

```typescript
type ItemTriggerTiming =
  | 'TURN_START'
  | 'BEFORE_MOVE'
  | 'ON_HIT'
  | 'AFTER_MOVE'
  | 'TURN_END'
  | 'ON_SWITCH_IN'
  | 'ON_DAMAGE';

type ItemEffect =
  | { type: 'heal'; amount: string }  // "1/16", "1/4" 等
  | { type: 'statBoost'; stat: Stat; multiplier: number }
  | { type: 'cureStatus'; status?: StatusCondition }  // undefined = all
  | { type: 'surviveKO' }
  | { type: 'damageBoost'; multiplier: number; recoil?: number }
  | { type: 'priorityBoost'; chance: number };

interface Item {
  id: string;
  name: string;
  category: string;
  trigger: {
    timing: ItemTriggerTiming;
    condition?: string;  // "hp <= 50%", "hp <= 25%" 等
  };
  effect: ItemEffect;
  consumable?: boolean;  // default: false
}
```

### ダミーデータ例

```json
[
  {
    "id": "leftovers",
    "name": "たべのこし",
    "category": "HEAL",
    "trigger": {
      "timing": "TURN_END"
    },
    "effect": {
      "type": "heal",
      "amount": "1/16"
    },
    "consumable": false
  },
  {
    "id": "sitrus-berry",
    "name": "オボンのみ",
    "category": "HEAL",
    "trigger": {
      "timing": "ON_DAMAGE",
      "condition": "hp <= 50%"
    },
    "effect": {
      "type": "heal",
      "amount": "1/4"
    },
    "consumable": true
  },
  {
    "id": "choice-scarf",
    "name": "こだわりスカーフ",
    "category": "CHOICE_SPEED",
    "trigger": {
      "timing": "BEFORE_MOVE"
    },
    "effect": {
      "type": "statBoost",
      "stat": "speed",
      "multiplier": 1.5
    },
    "consumable": false
  },
  {
    "id": "focus-sash",
    "name": "きあいのタスキ",
    "category": "SASH",
    "trigger": {
      "timing": "ON_DAMAGE",
      "condition": "hp == 100% && wouldFaint"
    },
    "effect": {
      "type": "surviveKO"
    },
    "consumable": true
  },
  {
    "id": "life-orb",
    "name": "いのちのたま",
    "category": "RECOIL",
    "trigger": {
      "timing": "AFTER_MOVE"
    },
    "effect": {
      "type": "damageBoost",
      "multiplier": 1.3,
      "recoil": 10
    },
    "consumable": false
  }
]
```

### 実装の考慮点

- **最小セット（Phase 1）**: 10種類程度
  - たべのこし、オボンのみ
  - こだわりスカーフ、ハチマキ、メガネ
  - きあいのタスキ
  - いのちのたま
- **拡張（Phase 2）**: 特殊な道具
  - 半減の実、パワー系アイテム等

---

## 4. 特性（Ability）

### 概要

特性は以下の特徴を持つ：

- **発動タイミング**（ターン処理順序に対応）
- **発動条件**（接触、被弾、場に出る等）
- **効果**（能力変化、状態異常付与、ダメージ補正等）

### スキーマ定義

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "trigger": {
      "type": "object",
      "properties": {
        "timing": {
          "type": "string",
          "enum": ["ON_SWITCH_IN", "ON_CONTACT_HIT", "TURN_END", "PASSIVE", "ON_DAMAGE"]
        },
        "condition": { "type": ["string", "null"] }
      },
      "required": ["timing"]
    },
    "effect": {
      "type": "object"
    }
  },
  "required": ["id", "name", "trigger", "effect"]
}
```

### TypeScript型定義

```typescript
type AbilityTriggerTiming =
  | 'ON_SWITCH_IN'
  | 'ON_CONTACT_HIT'
  | 'TURN_END'
  | 'PASSIVE'  // 常時発動（素早さ補正等）
  | 'ON_DAMAGE';

type AbilityEffect =
  | { type: 'statChange'; target: 'self' | 'opponent' | 'allOpponents'; stat: Stat; stages: number }
  | { type: 'status'; status: StatusCondition; chance: number }
  | { type: 'speedBoost'; multiplier: number; condition?: string }
  | { type: 'damageModifier'; multiplier: number; condition?: string }
  | { type: 'heal'; amount: string; condition?: string };

interface Ability {
  id: string;
  name: string;
  trigger: {
    timing: AbilityTriggerTiming;
    condition?: string;
  };
  effect: AbilityEffect;
}
```

### ダミーデータ例

```json
[
  {
    "id": "intimidate",
    "name": "いかく",
    "trigger": {
      "timing": "ON_SWITCH_IN"
    },
    "effect": {
      "type": "statChange",
      "target": "allOpponents",
      "stat": "attack",
      "stages": -1
    }
  },
  {
    "id": "static",
    "name": "せいでんき",
    "trigger": {
      "timing": "ON_CONTACT_HIT",
      "condition": "wasHit"
    },
    "effect": {
      "type": "status",
      "status": "paralysis",
      "chance": 30
    }
  },
  {
    "id": "swift-swim",
    "name": "すいすい",
    "trigger": {
      "timing": "PASSIVE"
    },
    "effect": {
      "type": "speedBoost",
      "multiplier": 2.0,
      "condition": "weather == rain"
    }
  },
  {
    "id": "poison-heal",
    "name": "ポイズンヒール",
    "trigger": {
      "timing": "TURN_END"
    },
    "effect": {
      "type": "heal",
      "amount": "1/8",
      "condition": "status == poison || status == badlyPoisoned"
    }
  }
]
```

### 実装の考慮点

- **最小セット（Phase 1）**: 10種類程度
  - いかく、せいでんき
  - すいすい、ようりょくそ
  - ポイズンヒール
- **拡張（Phase 2）**: 複雑な特性
  - てんねん、マジックガード等

---

## 5. 種族（Species）

### スキーマ定義

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "types": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "maxItems": 2
    },
    "baseStats": {
      "type": "object",
      "properties": {
        "hp": { "type": "number" },
        "attack": { "type": "number" },
        "defense": { "type": "number" },
        "spAttack": { "type": "number" },
        "spDefense": { "type": "number" },
        "speed": { "type": "number" }
      },
      "required": ["hp", "attack", "defense", "spAttack", "spDefense", "speed"]
    },
    "abilities": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "maxItems": 2
    },
    "learnset": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": ["id", "name", "types", "baseStats", "abilities", "learnset"]
}
```

### TypeScript型定義

```typescript
interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

interface Species {
  id: string;
  name: string;
  types: [Type] | [Type, Type];
  baseStats: BaseStats;
  abilities: string[];  // ability IDs
  learnset: string[];   // move IDs
}
```

### ダミーデータ例

```json
[
  {
    "id": "garchomp",
    "name": "ガブリアス",
    "types": ["dragon", "ground"],
    "baseStats": {
      "hp": 108,
      "attack": 130,
      "defense": 95,
      "spAttack": 80,
      "spDefense": 85,
      "speed": 102
    },
    "abilities": ["sandVeil", "roughSkin"],
    "learnset": ["earthquake", "outrage", "stoneedge", "fireblast", "dracometeor"]
  },
  {
    "id": "dragonite",
    "name": "カイリュー",
    "types": ["dragon", "flying"],
    "baseStats": {
      "hp": 91,
      "attack": 134,
      "defense": 95,
      "spAttack": 100,
      "spDefense": 100,
      "speed": 80
    },
    "abilities": ["innerFocus", "multiscale"],
    "learnset": ["outrage", "extremespeed", "earthquake", "fireblast", "thunder"]
  }
]
```

### 実装の考慮点

- **最小セット（Phase 1）**: 10種族
  - 第4世代の代表的なポケモン（ガブリアス、ラティオス、メタグロス等）
  - タイプ・能力値のバリエーション確保
- **架空データでも可**（初期検証用）
- **第4世代では隠れ特性なし**（第5世代導入）
  - abilities配列は通常1〜2個

---

## 6. タイプ相性表（TypeChart）

### 概要

- **第4世代は17タイプ**（フェアリーは第6世代導入）
- 17タイプ × 17タイプの2次元配列
- 値: 0（無効）, 0.5（いまひとつ）, 1（等倍）, 2（効果抜群）

### スキーマ定義

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "types": {
      "type": "array",
      "items": { "type": "string" }
    },
    "chart": {
      "type": "array",
      "items": {
        "type": "array",
        "items": {
          "type": "number",
          "enum": [0, 0.5, 1, 2]
        }
      }
    }
  },
  "required": ["types", "chart"]
}
```

### TypeScript型定義

```typescript
type TypeEffectiveness = 0 | 0.5 | 1 | 2;

interface TypeChart {
  types: Type[];
  chart: TypeEffectiveness[][];  // [attacker][defender]
}
```

### ダミーデータ例

```json
{
  "types": ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel"],
  "chart": [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.5, 0, 1, 1, 0.5],
    [1, 0.5, 0.5, 1, 2, 2, 1, 1, 1, 1, 1, 2, 0.5, 1, 0.5, 1, 2],
    ...
  ]
}
```

### 実装の考慮点

- **完全定義必須**（17x17の289要素）
- バリデーション: 行列のサイズ一致確認（types.length === 17, chart.length === 17, chart[i].length === 17）
- 第4世代にフェアリータイプは存在しない

---

## 7. 実装フェーズ

### Phase 1（Milestone 0）：最小セット

| データ種別 | 件数 | 備考 |
|----------|------|------|
| Nature | 25種類（全て） | 固定的なので全定義 |
| Type Chart | 17x17 | 固定的なので全定義（第4世代はフェアリーなし） |
| Species | 10種族 | 代表的なポケモン or 架空 |
| Move | 30技 | 物理/特殊/状態異常/優先度のバリエーション |
| Item | 10種類 | たべのこし、スカーフ、タスキ等 |
| Ability | 10種類 | いかく、せいでんき、すいすい等 |

**完了条件**:
- JSON Schema定義完了
- ダミーデータでバリデーション通過
- TypeScript型定義生成
- バリデーションテスト通過

### Phase 2（Milestone 2）：ルール拡張時

- 複雑な技（みがわり、まもる、アンコール等）
- 複雑な特性（てんねん、マジックガード等）
- 複雑な道具（半減の実、パワー系等）

---

## 7.5. 条件式（Condition）の最小DSL

### 目的

Item/Ability の `condition` フィールドを文字列で記述する場合、解釈ブレを防ぐため**許可文法を固定**する。

### 許可される条件式

Phase 1 では以下の形式のみを許可：

```
<variable> <operator> <value>
```

#### 変数（Variable）

| 変数 | 意味 | 型 |
|------|------|-----|
| `hp_ratio` | 現在HP / 最大HP | number (0.0〜1.0) |
| `hp_percent` | 現在HP / 最大HP * 100 | number (0〜100) |
| `status` | 状態異常 | string |
| `weather` | 天候 | string |
| `would_faint` | 致死ダメージか | boolean |

#### 演算子（Operator）

| 演算子 | 意味 |
|--------|------|
| `<=` | 以下 |
| `<` | 未満 |
| `>=` | 以上 |
| `>` | より大きい |
| `==` | 等しい |
| `!=` | 等しくない |
| `in` | 含まれる（配列） |

#### 値（Value）

- 数値: `0.5`, `25`, `100`
- 文字列: `"poison"`, `"rain"`
- 真偽値: `true`, `false`
- 配列: `["poison", "badlyPoisoned"]`

### 例

```json
{
  "condition": "hp_ratio <= 0.5"
}
```

```json
{
  "condition": "status in [\"poison\", \"badlyPoisoned\"]"
}
```

```json
{
  "condition": "weather == \"rain\""
}
```

```json
{
  "condition": "hp_percent == 100 && would_faint == true"
}
```

### Phase 2 での拡張

- 論理演算子: `&&`, `||`, `!`
- 関数: `has_stat_boost(stat)`, `is_grounded()`等

### バリデーション

- condition のパース可能性をテスト
- 実行時エラーを避けるため、スキーマ段階で検証

---

## 8. ディレクトリ構造（提案）

```
packages/data/
├── schema/
│   ├── nature.schema.json
│   ├── move.schema.json
│   ├── item.schema.json
│   ├── ability.schema.json
│   ├── species.schema.json
│   └── type-chart.schema.json
├── examples/
│   ├── natures.json          # 25種類（全定義）
│   ├── type-chart.json        # 17x17（全定義）
│   ├── species.json           # 10種族（ダミー）
│   ├── moves.json             # 30技（ダミー）
│   ├── items.json             # 10種類（ダミー）
│   └── abilities.json         # 10種類（ダミー）
├── src/
│   ├── types.ts               # 生成されたTypeScript型
│   ├── validate.ts            # バリデーションロジック
│   └── load.ts                # データ読み込み
├── tests/
│   └── validate.test.ts       # バリデーションテスト
└── scripts/
    └── convert-external.ts    # 外部データ変換（雛形）
```

---

## 9. バリデーション戦略

### JSON Schema検証

```bash
pnpm --filter data validate
```

- 各データファイルがスキーマに準拠しているか
- 必須フィールドの存在確認
- 型の整合性確認
- 範囲チェック（priority: -7〜+5等）

### 整合性検証

```typescript
// 例: 技のlearnsetが実際に存在するか
function validateLearnset(species: Species, moves: Move[]): void {
  const moveIds = new Set(moves.map(m => m.id));
  for (const moveId of species.learnset) {
    if (!moveIds.has(moveId)) {
      throw new Error(`Unknown move: ${moveId} in ${species.id}`);
    }
  }
}
```

---

## 10. 次のアクション

1. **合意形成**: 本提案をレビュー、Issue #1に反映
2. **スキーマ実装**: JSON Schemaファイル作成
3. **ダミーデータ作成**: 最小セット（Phase 1）
4. **バリデーション実装**: validate.ts + tests
5. **型定義生成**: json-schema-to-typescript等を利用

---

## 参考文献

- [battle-mechanics/](./battle-mechanics/)
- [JSON Schema](https://json-schema.org/)
- [json-schema-to-typescript](https://github.com/bcherny/json-schema-to-typescript)
