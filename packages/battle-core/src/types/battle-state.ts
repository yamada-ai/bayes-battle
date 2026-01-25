import type { Pokemon } from './state';
import type { PokemonId } from './effect';

/**
 * BattleState: バトル全体の状態
 * 最小実装版（Phase用）
 */
export interface BattleState {
  /** ポケモンのマップ（PokemonId -> Pokemon） */
  pokemon: Record<PokemonId, Pokemon>;

  /** 現在のターン番号（1から始まる） */
  turnNumber: number;
}
