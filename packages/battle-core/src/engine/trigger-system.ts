import type { TriggerRequest } from '../types/apply-result';
import type { Effect, PokemonId } from '../types/effect';
import { EffectType } from '../types/effect';
import type { BattleState } from '../types/battle-state';
import type { PublicEvent } from '../types/event';
import { PublicEventType } from '../types/event';

/**
 * TriggerEvaluator の結果
 */
export interface EvaluateTriggerResult {
  effects: Effect[];
  events: PublicEvent[];
}

/**
 * TriggerGuard: 無限ループ防止
 *
 * 同じ causeId で同じトリガーが発火したかを記録
 */
export class TriggerGuard {
  private fired = new Set<string>();

  hasFired(causeId: string, pokemonId: PokemonId, triggerId: string): boolean {
    const key = `${causeId}:${pokemonId}:${triggerId}`;
    return this.fired.has(key);
  }

  markFired(causeId: string, pokemonId: PokemonId, triggerId: string): void {
    const key = `${causeId}:${pokemonId}:${triggerId}`;
    this.fired.add(key);
  }
}

/**
 * オボンのみ（Oran Berry）の判定
 *
 * - ON_DAMAGE のタイミングで発動
 * - HP が maxHP の 1/2 以下になったときに発動
 * - HP を 10 回復
 * - 消費される（使い捨て）
 */
function evaluateOranBerry(
  pokemonId: PokemonId,
  state: BattleState,
  guard: TriggerGuard,
  causeId: string
): EvaluateTriggerResult {
  const pokemon = state.pokemon[pokemonId];

  // 瀕死ならスキップ
  if (pokemon.hp === 0) {
    return { effects: [], events: [] };
  }

  // オボンのみを持っているか
  if (pokemon.item !== 'oranBerry') {
    return { effects: [], events: [] };
  }

  // HP が 1/2 以下か
  if (pokemon.hp > pokemon.maxHP / 2) {
    return { effects: [], events: [] };
  }

  // TriggerGuard: 既に発火済みか
  if (guard.hasFired(causeId, pokemonId, 'oranBerry')) {
    return { effects: [], events: [] };
  }

  // 発火マーク
  guard.markFired(causeId, pokemonId, 'oranBerry');

  // アイテム発動イベント
  const events: PublicEvent[] = [
    {
      type: PublicEventType.ITEM_ACTIVATED,
      pokemon: pokemonId,
      item: 'oranBerry',
    },
  ];

  // Effect: 回復 + アイテム消費
  const effects: Effect[] = [
    {
      type: EffectType.HEAL,
      id: `oran-heal-${pokemonId}`,
      pokemon: pokemonId,
      amount: 10,
    },
    {
      type: EffectType.CONSUME_ITEM,
      id: `oran-consume-${pokemonId}`,
      pokemon: pokemonId,
      item: 'oranBerry',
    },
  ];

  return { effects, events };
}

/**
 * TriggerRequest を評価して Effect[] に変換
 *
 * @param request TriggerRequest
 * @param state BattleState
 * @param guard TriggerGuard（無限ループ防止）
 * @returns EvaluateTriggerResult
 */
export function evaluateTrigger(
  request: TriggerRequest,
  state: BattleState,
  guard: TriggerGuard
): EvaluateTriggerResult {
  const allEffects: Effect[] = [];
  const allEvents: PublicEvent[] = [];

  // subjects（評価対象）を順に処理
  for (const pokemonId of request.subjects) {
    const pokemon = state.pokemon[pokemonId];

    // 瀕死ならスキップ
    if (!pokemon || pokemon.hp === 0) {
      continue;
    }

    // ON_DAMAGE のタイミング
    if (request.timing === 'ON_DAMAGE') {
      // オボンのみ判定
      const oranResult = evaluateOranBerry(pokemonId, state, guard, request.causeId);
      allEffects.push(...oranResult.effects);
      allEvents.push(...oranResult.events);
    }

    // 他のトリガータイミングは今回未実装
  }

  return { effects: allEffects, events: allEvents };
}
