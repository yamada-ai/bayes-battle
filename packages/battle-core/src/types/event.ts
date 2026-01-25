import type { StatusCondition } from './state';
import type { PokemonId } from './effect';

export const PublicEventType = {
  DAMAGE_DEALT: 'DAMAGE_DEALT',
  HEALED: 'HEALED',
  STATUS_INFLICTED: 'STATUS_INFLICTED',
  FAINTED: 'FAINTED',
  ITEM_ACTIVATED: 'ITEM_ACTIVATED',
  ITEM_CONSUMED: 'ITEM_CONSUMED',
} as const;

export type PublicEventType = (typeof PublicEventType)[keyof typeof PublicEventType];

export const RngEventType = {
  RNG_ROLL: 'RNG_ROLL',
} as const;

export type RngEventType = (typeof RngEventType)[keyof typeof RngEventType];

/**
 * PublicEvent: 観測可能なイベント（Belief Tracker が読む）
 */
export type PublicEvent =
  // === ダメージ・回復 ===
  | {
      type: typeof PublicEventType.DAMAGE_DEALT;
      target: PokemonId;
      amount: number; // 実ダメージ（過剰ダメージは切る）
      newHP: number;
      newHPPercent: number; // 丸めルール: 小数点2桁まで
    }
  | {
      type: typeof PublicEventType.HEALED;
      pokemon: PokemonId;
      amount: number; // 実回復量（上限でクリップされた量）
      newHP: number;
    }

  // === 状態異常 ===
  | {
      type: typeof PublicEventType.STATUS_INFLICTED;
      target: PokemonId;
      status: StatusCondition;
    }

  // === 瀕死 ===
  | {
      type: typeof PublicEventType.FAINTED;
      pokemon: PokemonId;
    }

  // === アイテム ===
  | {
      type: typeof PublicEventType.ITEM_ACTIVATED;
      pokemon: PokemonId;
      item: string; // アイテムID
    }
  | {
      type: typeof PublicEventType.ITEM_CONSUMED;
      pokemon: PokemonId;
      item: string; // 消費されたアイテムID
    };

/**
 * RngEvent: 乱数結果（Replay用）
 */
export type RngEvent = { type: typeof RngEventType.RNG_ROLL; purpose: 'damageRoll'; value: number }; // 85-100 (int)

// 将来の拡張用（コメントアウト）
// | { type: 'RNG_ROLL'; purpose: 'accuracy'; value: number }     // 0.0-1.0 (float)
// | { type: 'RNG_ROLL'; purpose: 'crit'; value: boolean }        // 急所判定
// | { type: 'RNG_ROLL'; purpose: 'secondary'; value: number }    // 0.0-1.0 (float)
