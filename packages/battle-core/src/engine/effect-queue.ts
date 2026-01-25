import { EffectType, type Effect, type PokemonId } from '../types/effect';
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
    case EffectType.APPLY_DAMAGE:
      return effect.target;
    case EffectType.HEAL:
      return effect.pokemon;
    case EffectType.SET_STATUS:
      return effect.pokemon;
    default: {
      // 網羅性チェック: 新しいEffect型を追加したらコンパイルエラーになる
      const _exhaustive: never = effect;
      throw new Error(`Unknown effect type: ${(_exhaustive as Effect).type}`);
    }
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

    // derivedEffectsをimmediateキューの先頭に追加（優先度高）
    // unshiftで先頭に追加することで、残りの初期Effectより先に処理される
    immediateQueue.unshift(...result.derivedEffects);

    // triggerRequestsは今回無視（B2で実装予定）
  }

  return { events: allEvents, rngEvents: allRngEvents };
}
