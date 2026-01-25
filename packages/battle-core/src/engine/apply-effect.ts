import type { Pokemon, Move } from '../types/state';
import { EffectType, type Effect } from '../types/effect';
import type { ApplyResult } from '../types/apply-result';
import { PublicEventType, type PublicEvent } from '../types/event';
import type { BattleState } from '../types/battle-state';
import type { RngContext } from '../types/rng-context';
import { calculateDamage } from '../damage/calculator';
import { rollDamage } from './rng';

/**
 * 技データ取得（最小実装: ハードコード）
 *
 * TODO: 将来的には state.moveDatabase から取得
 */
function getMoveData(moveId: string): Move | null {
  // 最小実装: tackle のみサポート
  if (moveId === 'tackle') {
    return {
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
    };
  }

  // 未実装の技
  return null;
}

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
 * @param state バトル状態（USE_MOVE など、他ポケモンへの参照が必要な場合に使用）
 * @param ctx RNG Context（乱数生成・記録用）
 * @returns ApplyResult
 */
export function applyEffect(
  pokemon: Pokemon,
  effect: Effect,
  state: BattleState,
  ctx: RngContext
): ApplyResult {
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

      // 技データ取得（最小実装: tackle のみハードコード）
      const move = getMoveData(effect.moveId);

      if (!move) {
        // 未実装の技
        break;
      }

      // 対象決定（最小実装: 2体戦のみ対応、単体1体、相手固定）
      // TODO: 将来的には move.target と場の状況から対象を決定
      // 制約: PokemonId は 0 と 1 のみを想定
      const targetId = effect.pokemon === 0 ? 1 : 0;
      const defender = state.pokemon[targetId];

      if (!defender || defender.hp === 0) {
        // 対象が存在しない or 瀕死ならスキップ
        break;
      }

      // ダメージ技の場合
      if (move.category !== 'status' && move.power !== null && move.power > 0) {
        // ダメージ乱数をロール（RNG記録）
        const randomRoll = rollDamage(ctx);

        // ダメージ計算（最小実装: 必中、急所なし）
        const damage = calculateDamage({
          attacker: pokemon,
          defender,
          move,
          isCritical: false,
          weather: null,
          randomRoll,
        });

        // APPLY_DAMAGE を derivedEffects に追加
        derivedEffects.push({
          type: EffectType.APPLY_DAMAGE,
          id: `${effect.id}-damage`,
          target: targetId,
          amount: damage,
        });
      }

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
