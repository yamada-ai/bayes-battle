import type { Type } from '../types/state';

// タイプ相性表（第4世代、17タイプ）
// 値: 0（無効）, 0.5（いまひとつ）, 1（等倍）, 2（効果抜群）
type TypeEffectiveness = 0 | 0.5 | 1 | 2;

// 最小実装: 地震（地面タイプ）vs カイリュー（ドラゴン/飛行）に必要な相性のみ
const typeChart: Record<Type, Partial<Record<Type, TypeEffectiveness>>> = {
  normal: {},
  fire: {},
  water: {},
  electric: { flying: 2, ground: 0 },
  grass: {},
  ice: {},
  fighting: {},
  poison: {},
  ground: {
    // 地震 vs カイリューに必要
    dragon: 1, // 地面 → ドラゴン（等倍）
    flying: 1, // 地面 → 飛行（等倍）
    electric: 2, // 地面 → 電気（効果抜群）
  },
  flying: {},
  psychic: {},
  bug: {},
  rock: {},
  ghost: { normal: 0, fighting: 0 },
  dragon: {},
  dark: {},
  steel: {},
};

/**
 * タイプ相性を取得
 * @param attackType 攻撃側のタイプ
 * @param defenseType 防御側のタイプ
 * @returns タイプ相性倍率（0, 0.5, 1, 2）
 */
export function getTypeEffectiveness(attackType: Type, defenseType: Type): TypeEffectiveness {
  return typeChart[attackType]?.[defenseType] ?? 1; // デフォルトは等倍
}
