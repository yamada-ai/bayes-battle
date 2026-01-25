import type { PublicEvent, RngEvent } from './event';
import type { Effect, PokemonId } from './effect';

/**
 * TriggerTiming: Trigger評価のタイミング
 */
export type TriggerTiming =
  | 'ON_DAMAGE'
  | 'ON_HEAL'
  | 'TURN_END'
  | 'ON_SWITCH_IN'
  | 'BEFORE_MOVE'
  | 'AFTER_MOVE';

/**
 * TriggerRequest: Trigger評価リクエスト
 *
 * 重要:
 * - subjects: 評価対象を明示（全ポケモンではない）
 * - causeId: 原因の一意ID（TriggerGuard用）
 */
export interface TriggerRequest {
  timing: TriggerTiming;
  subjects: PokemonId[]; // 評価対象
  cause: Effect; // 何が原因か
  causeId: string; // 原因の一意ID（TriggerGuard用）
}

/**
 * ApplyResult: Effect適用の結果
 *
 * applyEffect が返す型
 */
export interface ApplyResult {
  // 観測可能なイベント
  events: PublicEvent[];

  // 乱数イベント（Replay用）
  rngEvents: RngEvent[];

  // Trigger評価リクエスト
  triggerRequests: TriggerRequest[];

  // 派生Effect（反動・自動処理など）
  derivedEffects: Effect[];
}
