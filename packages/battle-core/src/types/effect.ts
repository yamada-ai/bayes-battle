import type { StatusCondition } from './state';

export type PokemonId = number;

/**
 * Effect: 内部命令（状態更新・トリガ評価）
 *
 * 重要: 各Effectには id を付与する（TriggerGuard用）
 */
export type Effect =
  // === State変更系 ===
  | { type: 'APPLY_DAMAGE'; id: string; target: PokemonId; amount: number }
  | { type: 'HEAL'; id: string; pokemon: PokemonId; amount: number }
  | { type: 'SET_STATUS'; id: string; pokemon: PokemonId; status: StatusCondition };

// 将来の拡張用（コメントアウト）
// | { type: 'SET_HP'; id: string; pokemon: PokemonId; hp: number }
// | { type: 'MODIFY_STAT_STAGE'; id: string; pokemon: PokemonId; stat: Stat; delta: number }
