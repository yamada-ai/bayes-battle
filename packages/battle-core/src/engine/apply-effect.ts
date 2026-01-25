import type { Pokemon } from '../types/state';
import { EffectType, type Effect } from '../types/effect';
import type { ApplyResult } from '../types/apply-result';
import { PublicEventType, type PublicEvent } from '../types/event';

/**
 * applyEffect: Effect を適用して State を更新する
 *
 * 重要な設計原則:
 * - State更新をやる唯一の場所
 * - ApplyResult を返す（events, rngEvents, triggerRequests, derivedEffects）
 * - 瀕死は APPLY_DAMAGE 内で即時処理
 * - TriggerRequest は subjects 限定、かつ瀕死なら出さない
 *
 * @param pokemon 対象のポケモン（State）
 * @param effect 適用するEffect
 * @returns ApplyResult
 */
export function applyEffect(pokemon: Pokemon, effect: Effect): ApplyResult {
  const events: PublicEvent[] = [];
  const triggerRequests: ApplyResult['triggerRequests'] = [];
  const derivedEffects: Effect[] = [];

  switch (effect.type) {
    case EffectType.USE_MOVE: {
      // USE_MOVE イベント
      events.push({
        type: PublicEventType.USE_MOVE,
        pokemon: effect.pokemon,
        moveId: effect.moveId,
      });

      // TODO: 実際の技効果処理（B3最小実装では省略）
      // 今は USE_MOVE イベントを出すだけ

      break;
    }

    case EffectType.APPLY_DAMAGE: {
      const oldHP = pokemon.hp;
      const actualDamage = Math.min(effect.amount, oldHP); // 過剰ダメージは切る
      const newHP = Math.max(0, oldHP - effect.amount);

      // State更新
      pokemon.hp = newHP;

      // HPパーセント計算（小数点2桁まで）
      const newHPPercent = Math.round((newHP / pokemon.maxHP) * 10000) / 100;

      // DAMAGE_DEALT イベント
      events.push({
        type: PublicEventType.DAMAGE_DEALT,
        target: effect.target,
        amount: actualDamage, // 実ダメージ（過剰ダメは切る）
        newHP,
        newHPPercent,
      });

      // 瀕死判定（ダメージ直後に即座に処理）
      if (newHP === 0 && oldHP > 0) {
        events.push({
          type: PublicEventType.FAINTED,
          pokemon: effect.target,
        });
        // 瀕死なので TriggerRequest は出さない
      } else if (newHP > 0) {
        // ON_DAMAGE トリガー（瀕死でない場合のみ）
        triggerRequests.push({
          timing: 'ON_DAMAGE',
          subjects: [effect.target],
          cause: effect,
          causeId: effect.id,
        });
      }

      break;
    }

    case EffectType.HEAL: {
      const oldHP = pokemon.hp;
      const requestedAmount = effect.amount;
      const actualAmount = Math.min(requestedAmount, pokemon.maxHP - oldHP); // 上限でクリップ
      const newHP = oldHP + actualAmount;

      // State更新
      pokemon.hp = newHP;

      // HEALED イベント
      events.push({
        type: PublicEventType.HEALED,
        pokemon: effect.pokemon,
        amount: actualAmount, // 実回復量（要求量ではない）
        newHP,
      });

      break;
    }

    case EffectType.SET_STATUS: {
      // 既に状態異常がある場合は何もしない（Phase 1仕様）
      if (pokemon.status !== null) {
        // イベントは出さない
        break;
      }

      // State更新
      pokemon.status = effect.status;

      // STATUS_INFLICTED イベント
      events.push({
        type: PublicEventType.STATUS_INFLICTED,
        target: effect.pokemon,
        status: effect.status,
      });

      break;
    }

    case EffectType.CONSUME_ITEM: {
      // アイテムを持っていない場合は何もしない
      if (pokemon.item !== effect.item) {
        break;
      }

      // State更新: アイテムを削除
      pokemon.item = null;

      // ITEM_CONSUMED イベント
      events.push({
        type: PublicEventType.ITEM_CONSUMED,
        pokemon: effect.pokemon,
        item: effect.item,
      });

      break;
    }

    default: {
      // 未実装のEffect
      const _exhaustive: never = effect;
      throw new Error(`Unhandled effect type: ${(_exhaustive as Effect).type}`);
    }
  }

  return {
    events,
    rngEvents: [],
    triggerRequests,
    derivedEffects,
  };
}
