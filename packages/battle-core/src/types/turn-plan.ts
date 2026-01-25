import type { PokemonId } from './effect';

/**
 * PlayerAction: プレイヤーの行動選択
 *
 * 最小実装版（技使用のみ）
 */
export type PlayerAction =
  | {
      type: 'USE_MOVE';
      pokemon: PokemonId;
      moveId: string; // 技のID
    }
  | {
      type: 'SWITCH';
      pokemon: PokemonId;
      to: PokemonId;
    };

/**
 * TurnPlan: ターン開始時の入力
 *
 * 各プレイヤーの行動選択
 */
export interface TurnPlan {
  actions: PlayerAction[];
}
