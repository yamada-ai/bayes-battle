import type { Pokemon, Move, Weather } from '../types/state';
import { getTypeEffectiveness } from './type-chart';

export interface CalculateDamageParams {
  attacker: Pokemon;
  defender: Pokemon;
  move: Move;
  isCritical: boolean;
  weather: Weather | null;
  randomRoll: number; // 85-100
}

/**
 * ダメージ計算（第4世代）
 *
 * 完全な計算式:
 * Damage = (((((((Level × 2 ÷ 5) + 2) × Power × A ÷ 50) ÷ D) × Mod1) + 2) × CH × Mod2 × R ÷ 100) × STAB × Type1 × Type2 × Mod3)
 *
 * 重要: 各演算子の実行後、小数点以下を切り捨ててから次の演算を行う
 *
 * @see docs/battle-mechanics/damage-calculation.md
 */
export function calculateDamage(params: CalculateDamageParams): number {
  const { attacker, defender, move, isCritical, weather: _weather, randomRoll } = params;

  // 技の威力チェック
  if (move.power === null || move.power === 0) {
    return 0; // 変化技
  }

  // 攻撃・防御の実数値（ランク補正は後で実装）
  const isPhysical = move.category === 'physical';
  const A = isPhysical ? attacker.stats.attack : attacker.stats.spAttack;
  const D = isPhysical ? defender.stats.defense : defender.stats.spDefense;

  // === 基礎ダメージ計算 ===
  // 1. (Level × 2 ÷ 5) + 2
  let damage = Math.floor((attacker.level * 2) / 5) + 2;

  // 2. × Power
  damage = Math.floor(damage * move.power);

  // 3. × A ÷ 50
  damage = Math.floor((damage * A) / 50);

  // 4. ÷ D
  damage = Math.floor(damage / D);

  // === Mod1（事前補正）===
  // 最小実装: Burn, Screen, Targets, Weather, FF
  // 今回はすべて 1.0（後で実装）
  const mod1 = 1.0;
  damage = Math.floor(damage * mod1);

  // 5. + 2
  damage = damage + 2;

  // === 急所補正（CH）===
  const criticalMultiplier = isCritical ? 2 : 1;
  damage = Math.floor(damage * criticalMultiplier);

  // === Mod2（中間補正）===
  // 最小実装: Item, First
  // 今回はすべて 1.0（後で実装）
  const mod2 = 1.0;
  damage = Math.floor(damage * mod2);

  // === 乱数補正（R）===
  // R = 85-100 の乱数
  damage = Math.floor((damage * randomRoll) / 100);

  // === STAB（タイプ一致補正）===
  const hasStab = attacker.types.includes(move.type);
  const stab = hasStab ? 1.5 : 1.0;
  damage = Math.floor(damage * stab);

  // === タイプ相性（Type1 × Type2）===
  let typeEffectiveness = 1.0;
  for (const defenderType of defender.types) {
    typeEffectiveness *= getTypeEffectiveness(move.type, defenderType);
  }

  // Type1
  damage = Math.floor(damage * typeEffectiveness);

  // === Mod3（事後補正）===
  // 最小実装: SRF, EB, TL, Berry
  // 今回はすべて 1.0（後で実装）
  const mod3 = 1.0;
  damage = Math.floor(damage * mod3);

  // === 最小ダメージ保証 ===
  if (damage === 0 && typeEffectiveness > 0) {
    return 1;
  }

  return damage;
}
