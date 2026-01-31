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
 * - live mode: 固定1を返す（TODO(accuracy): 実際の乱数生成に切り替え）
 * - replay mode: RngEventログから消費（範囲チェックあり）
 *
 * @param ctx RNG Context
 * @returns 命中乱数（1-100）
 */
export function rollAccuracy(ctx: RngContext): number {
  if (ctx.mode === 'live') {
    // 固定1（全技必中）
    const value = 1;

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

    // 範囲チェック（1-100）
    if (event.value < 1 || event.value > 100) {
      throw new Error(
        `RNG replay error: accuracyRoll value out of range (1-100): ${event.value} at index ${ctx.consumeIndex}`
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

/**
 * 同速時の乱数をロール（0 or 1）
 *
 * - live mode: 固定0を返す（TODO(speed): 実際の乱数生成に切り替え。現状は固定でpokemon0が先）
 * - replay mode: RngEventログから消費（範囲チェックあり）
 *
 * Gen4の同速判定: 50/50でどちらが先に動くか決定
 *
 * @param ctx RNG Context
 * @returns 同速乱数（0 or 1）
 */
export function rollSpeedTie(ctx: RngContext): number {
  if (ctx.mode === 'live') {
    // 固定0（現状: pokemon0が常に先）
    const value = 0;

    // RngEvent を記録
    ctx.rngEvents.push({
      type: RngEventType.RNG_ROLL,
      purpose: 'speedTie',
      value,
    });

    return value;
  } else {
    // replay mode: RngEvent から消費
    const event = ctx.rngEvents[ctx.consumeIndex];

    if (!event || event.type !== RngEventType.RNG_ROLL || event.purpose !== 'speedTie') {
      throw new Error(
        `RNG replay error: expected speedTie at index ${ctx.consumeIndex}, got ${event?.purpose || 'none'}`
      );
    }

    // 範囲チェック（0 or 1）
    if (event.value !== 0 && event.value !== 1) {
      throw new Error(
        `RNG replay error: speedTie value must be 0 or 1: ${event.value} at index ${ctx.consumeIndex}`
      );
    }

    ctx.consumeIndex++;
    return event.value;
  }
}
