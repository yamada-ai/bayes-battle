import type { BattleState } from '../types/battle-state';
import type { TurnPlan } from '../types/turn-plan';
import type { Effect } from '../types/effect';
import { EffectType } from '../types/effect';
import type { PublicEvent } from '../types/event';
import { PublicEventType } from '../types/event';
import { runQueue } from './effect-queue';

/**
 * executeTurn の結果
 */
export interface ExecuteTurnResult {
  events: PublicEvent[];
}

/**
 * Phase 1: ターン開始
 *
 * - TURN_START イベントを発行
 * - ターン番号をインクリメント
 */
function turnStart(state: BattleState): PublicEvent[] {
  const events: PublicEvent[] = [];

  // ターン番号をインクリメント
  state.turnNumber++;

  // TURN_START イベント
  events.push({
    type: PublicEventType.TURN_START,
    turnNumber: state.turnNumber,
  });

  return events;
}

/**
 * Phase 2: 行動実行
 *
 * - TurnPlan から USE_MOVE Effect を生成
 * - runQueue で実行
 */
function executeActions(turnPlan: TurnPlan, state: BattleState): PublicEvent[] {
  const effects: Effect[] = [];

  // TurnPlan から USE_MOVE Effect を生成
  for (const action of turnPlan.actions) {
    if (action.type === 'USE_MOVE') {
      effects.push({
        type: EffectType.USE_MOVE,
        id: `use-move-${action.pokemon}-${state.turnNumber}`,
        pokemon: action.pokemon,
        moveId: action.moveId,
      });
    }
    // SWITCH は今回未実装
  }

  // runQueue で実行
  const result = runQueue(effects, state);

  return result.events;
}

/**
 * Phase 3: ターン終了
 *
 * - 最小実装: 何もしない（天候・状態異常・たべのこしは今回未実装）
 */
function turnEnd(_state: BattleState): PublicEvent[] {
  // 最小実装: 何もしない
  return [];
}

/**
 * 1ターンを実行
 *
 * @param turnPlan ターン入力
 * @param state バトル状態
 * @returns ExecuteTurnResult
 */
export function executeTurn(turnPlan: TurnPlan, state: BattleState): ExecuteTurnResult {
  const allEvents: PublicEvent[] = [];

  // Phase 1: ターン開始
  const startEvents = turnStart(state);
  allEvents.push(...startEvents);

  // Phase 2: 行動実行
  const actionEvents = executeActions(turnPlan, state);
  allEvents.push(...actionEvents);

  // Phase 3: ターン終了
  const endEvents = turnEnd(state);
  allEvents.push(...endEvents);

  return { events: allEvents };
}
