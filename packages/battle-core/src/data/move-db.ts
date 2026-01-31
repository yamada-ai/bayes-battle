import type { Move } from '../types/state';

/**
 * 技データベース
 *
 * Gen4の代表的な技を定義
 * - 物理技: tackle, earthquake, stone_edge, aqua_jet
 * - 特殊技: thunderbolt, ice_beam, hydro_pump
 * - 変化技: swords_dance, recover (効果実装は将来対応)
 */
export const MOVE_DATABASE: Record<string, Move> = {
  // 物理技
  tackle: {
    id: 'tackle',
    name: 'たいあたり',
    type: 'normal',
    category: 'physical',
    power: 40,
    accuracy: 100,
    priority: 0,
    pp: 35,
    target: 'normal',
    makesContact: true,
  },
  earthquake: {
    id: 'earthquake',
    name: 'じしん',
    type: 'ground',
    category: 'physical',
    power: 100,
    accuracy: 100,
    priority: 0,
    pp: 10,
    target: 'allExceptSelf',
    makesContact: false,
  },
  stone_edge: {
    id: 'stone_edge',
    name: 'ストーンエッジ',
    type: 'rock',
    category: 'physical',
    power: 100,
    accuracy: 80,
    priority: 0,
    pp: 5,
    target: 'normal',
    makesContact: false,
  },
  aqua_jet: {
    id: 'aqua_jet',
    name: 'アクアジェット',
    type: 'water',
    category: 'physical',
    power: 40,
    accuracy: 100,
    priority: 1, // 先制技
    pp: 20,
    target: 'normal',
    makesContact: true,
  },

  // 特殊技
  thunderbolt: {
    id: 'thunderbolt',
    name: '10まんボルト',
    type: 'electric',
    category: 'special',
    power: 90,
    accuracy: 100,
    priority: 0,
    pp: 15,
    target: 'normal',
    makesContact: false,
  },
  ice_beam: {
    id: 'ice_beam',
    name: 'れいとうビーム',
    type: 'ice',
    category: 'special',
    power: 90,
    accuracy: 100,
    priority: 0,
    pp: 10,
    target: 'normal',
    makesContact: false,
  },
  hydro_pump: {
    id: 'hydro_pump',
    name: 'ハイドロポンプ',
    type: 'water',
    category: 'special',
    power: 110,
    accuracy: 80,
    priority: 0,
    pp: 5,
    target: 'normal',
    makesContact: false,
  },

  // 変化技（データのみ、効果実装は将来対応）
  swords_dance: {
    id: 'swords_dance',
    name: 'つるぎのまい',
    type: 'normal',
    category: 'status',
    power: null,
    accuracy: null, // 必中
    priority: 0,
    pp: 20,
    target: 'self',
    makesContact: false,
  },
  recover: {
    id: 'recover',
    name: 'じこさいせい',
    type: 'normal',
    category: 'status',
    power: null,
    accuracy: null, // 必中
    priority: 0,
    pp: 10,
    target: 'self',
    makesContact: false,
  },
};

/**
 * 技データ取得
 *
 * @param moveId 技のID
 * @returns Move | null（未登録の技はnull）
 */
export function getMoveData(moveId: string): Move | null {
  return MOVE_DATABASE[moveId] ?? null;
}
