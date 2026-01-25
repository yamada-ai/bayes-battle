import type { Effect, PokemonId } from '../types/effect';
import type { BattleState } from '../types/battle-state';
import type { PublicEvent, RngEvent } from '../types/event';
import type { ApplyResult } from '../types/apply-result';
import type { Pokemon } from '../types/state';
import { applyEffect } from './apply-effect';

/**
 * runQueue実行結果
 */
export interface RunQueueResult {
  events: PublicEvent[];
  rngEvents: RngEvent[];
}

/**
 * Effectのターゲット（対象ポケモンID）を取得
 */
function getEffectTarget(effect: Effect): PokemonId {
  switch (effect.type) {
    case 'APPLY_DAMAGE':
      return effect.target;
    case 'HEAL':
      return effect.pokemon;
    case 'SET_STATUS':
      return effect.pokemon;
  }
}

/**
 * EffectQueueを実行（2段キュー）
 *
 * - immediate: 優先度高（derivedEffects はここに積まれる）
 * - deferred: 優先度低（今回は未使用）
 * - triggerRequests は今回無視（B2で実装）
 *
 * @param initialEffects 初期Effect配列
 * @param state バトル状態
 * @param applyEffectFn Effect適用関数（デフォルトは applyEffect、テストでカスタマイズ可能）
 * @returns 全イベントとRngイベント
 */
export function runQueue(
  initialEffects: Effect[],
  state: BattleState,
  applyEffectFn: (pokemon: Pokemon, effect: Effect) => ApplyResult = applyEffect
): RunQueueResult {
  const immediateQueue: Effect[] = [...initialEffects];
  const deferredQueue: Effect[] = [];

  const allEvents: PublicEvent[] = [];
  const allRngEvents: RngEvent[] = [];

  while (immediateQueue.length > 0 || deferredQueue.length > 0) {
    // immediate優先で取り出し
    const effect = immediateQueue.length > 0 ? immediateQueue.shift()! : deferredQueue.shift()!;

    // effectの対象ポケモンを取得
    const targetId = getEffectTarget(effect);
    const pokemon = state.pokemon[targetId];

    if (!pokemon) {
      throw new Error(`Pokemon ${targetId} not found in state`);
    }

    // applyEffectを実行
    const result = applyEffectFn(pokemon, effect);

    // イベントを収集
    allEvents.push(...result.events);
    allRngEvents.push(...result.rngEvents);

    // derivedEffectsをimmediateキューに追加
    immediateQueue.push(...result.derivedEffects);

    // triggerRequestsは今回無視（B2で実装予定）
  }

  return { events: allEvents, rngEvents: allRngEvents };
}
