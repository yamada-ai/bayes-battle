import type { RngContext } from '../types/rng-context';
import { RngEventType } from '../types/event';

/**
 * ダメージ乱数をロール（85-100）
 *
 * - live mode: 固定100を返す（TODO(rng): 将来的には実際の乱数生成）
 * - replay mode: RngEventログから消費
 *
 * @param ctx RNG Context
 * @returns ダメージ乱数（85-100）
 */
export function rollDamage(ctx: RngContext): number {
  if (ctx.mode === 'live') {
    // 固定100（最小実装）
    const value = 100;

    // RngEvent を記録
    ctx.rngEvents.push({
      type: RngEventType.RNG_ROLL,
      purpose: 'damageRoll',
      value,
    });

    return value;
  } else {
    // replay mode: RngEvent から消費
    const event = ctx.rngEvents[ctx.consumeIndex];

    if (!event || event.type !== RngEventType.RNG_ROLL || event.purpose !== 'damageRoll') {
      throw new Error(
        `RNG replay error: expected damageRoll at index ${ctx.consumeIndex}, got ${event?.purpose || 'none'}`
      );
    }

    ctx.consumeIndex++;
    return event.value;
  }
}

/**
 * 命中乱数をロール（1-100）
 *
 * - live mode: 固定100を返す（TODO(accuracy): accuracy<100の技を追加する際は固定値を1に変更。現状は100なのでaccuracy=100の技のみ必中）
 * - replay mode: RngEventログから消費
 *
 * @param ctx RNG Context
 * @returns 命中乱数（1-100）
 */
export function rollAccuracy(ctx: RngContext): number {
  if (ctx.mode === 'live') {
    // 固定100（現状: tackle (accuracy=100) のみ対応）
    const value = 100;

    // RngEvent を記録
    ctx.rngEvents.push({
      type: RngEventType.RNG_ROLL,
      purpose: 'accuracyRoll',
      value,
    });

    return value;
  } else {
    // replay mode: RngEvent から消費
    const event = ctx.rngEvents[ctx.consumeIndex];

    if (!event || event.type !== RngEventType.RNG_ROLL || event.purpose !== 'accuracyRoll') {
      throw new Error(
        `RNG replay error: expected accuracyRoll at index ${ctx.consumeIndex}, got ${event?.purpose || 'none'}`
      );
    }

    ctx.consumeIndex++;
    return event.value;
  }
}

/**
 * 急所乱数をロール（1-16）
 *
 * - live mode: 固定16を返す（TODO(critical): 急所を発生させる場合は実際の乱数生成。現状は16なので急所なし）
 * - replay mode: RngEventログから消費
 *
 * Gen4の急所率: 1/16 (急所ランク0)
 *
 * @param ctx RNG Context
 * @returns 急所乱数（1-16、1なら急所）
 */
export function rollCritical(ctx: RngContext): number {
  if (ctx.mode === 'live') {
    // 固定16（現状: 急所なし）
    const value = 16;

    // RngEvent を記録
    ctx.rngEvents.push({
      type: RngEventType.RNG_ROLL,
      purpose: 'criticalRoll',
      value,
    });

    return value;
  } else {
    // replay mode: RngEvent から消費
    const event = ctx.rngEvents[ctx.consumeIndex];

    if (!event || event.type !== RngEventType.RNG_ROLL || event.purpose !== 'criticalRoll') {
      throw new Error(
        `RNG replay error: expected criticalRoll at index ${ctx.consumeIndex}, got ${event?.purpose || 'none'}`
      );
    }

    ctx.consumeIndex++;
    return event.value;
  }
}
