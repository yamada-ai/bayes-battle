import type { BattleState } from '../types/battle-state';
import type { TurnPlan } from '../types/turn-plan';
import type { Effect } from '../types/effect';
import { EffectType } from '../types/effect';
import type { PublicEvent, RngEvent } from '../types/event';
import { PublicEventType } from '../types/event';
import type { RngContext } from '../types/rng-context';
import type { Move } from '../types/state';
import { runQueue } from './effect-queue';
import { rollSpeedTie } from './rng';

/**
 * executeTurn の結果
 */
export interface ExecuteTurnResult {
  events: PublicEvent[];
  rngEvents: RngEvent[];
}

/**
 * 技データ取得（最小実装: ハードコード）
 *
 * TODO(movedb): 将来的には state.moveDatabase から取得
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
 * - TurnPlan の actions を行動順にソート（priority → speed → speedTie）
 * - USE_MOVE Effect を生成
 * - 瀕死ポケモンはスキップ
 * - runQueue で実行
 */
function executeActions(
  turnPlan: TurnPlan,
  state: BattleState,
  ctx: RngContext
): { events: PublicEvent[]; rngEvents: RngEvent[] } {
  // Step 1: 瀕死チェック & 技データ取得を含む前処理
  const actionsWithData = turnPlan.actions.map((action) => {
    const pokemon = state.pokemon[action.pokemon];
    const isFainted = !pokemon || pokemon.hp === 0;

    if (action.type === 'USE_MOVE') {
      const move = getMoveData(action.moveId);
      return {
        action,
        pokemon,
        isFainted,
        priority: move?.priority ?? 0,
        speed: pokemon?.stats.speed ?? 0,
      };
    } else {
      // SWITCH（未実装）
      return {
        action,
        pokemon,
        isFainted,
        priority: 0, // SWITCH の優先度（今回未実装）
        speed: pokemon?.stats.speed ?? 0,
      };
    }
  });

  // Step 2: priority → speed → pokemon.id で決定的にソート
  actionsWithData.sort((a, b) => {
    // 瀕死は末尾
    if (a.isFainted && !b.isFainted) return 1;
    if (!a.isFainted && b.isFainted) return -1;
    if (a.isFainted && b.isFainted) return 0;

    // priority（高い方が先）
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    // speed（高い方が先）
    if (a.speed !== b.speed) {
      return b.speed - a.speed;
    }

    // pokemon.id（小さい方が先、決定的なソート）
    return a.action.pokemon - b.action.pokemon;
  });

  // Step 3: 同速グループを特定して speedTie で順序を決定
  let i = 0;
  while (i < actionsWithData.length) {
    const groupStart = i;
    const current = actionsWithData[i];

    // 瀕死は処理しない
    if (current.isFainted) {
      break;
    }

    // 同じ priority & speed のグループを見つける
    let groupEnd = i + 1;
    while (
      groupEnd < actionsWithData.length &&
      !actionsWithData[groupEnd].isFainted &&
      actionsWithData[groupEnd].priority === current.priority &&
      actionsWithData[groupEnd].speed === current.speed
    ) {
      groupEnd++;
    }

    const groupSize = groupEnd - groupStart;

    // グループサイズが2以上なら speedTie をロール
    if (groupSize >= 2) {
      const speedTieRoll = rollSpeedTie(ctx);

      // speedTieRoll = 0: ID昇順（元のまま）
      // speedTieRoll = 1: ID降順（逆転）
      if (speedTieRoll === 1) {
        // グループ内を逆順にする
        const group = actionsWithData.slice(groupStart, groupEnd);
        group.reverse();
        actionsWithData.splice(groupStart, groupSize, ...group);
      }
    }

    i = groupEnd;
  }

  // Step 4: ソート済みの actions から USE_MOVE Effect を生成
  const effects: Effect[] = [];

  for (const { action, isFainted } of actionsWithData) {
    // 瀕死ポケモンはスキップ
    if (isFainted) {
      continue;
    }

    if (action.type === 'USE_MOVE') {
      effects.push({
        type: EffectType.USE_MOVE,
        id: `use-move-${action.pokemon}-${state.turnNumber}`,
        pokemon: action.pokemon,
        moveId: action.moveId,
      });
    } else if (action.type === 'SWITCH') {
      // SWITCH は未実装
      throw new Error('SWITCH action is not implemented yet');
    }
  }

  // runQueue で実行
  const result = runQueue(effects, state, ctx);

  return { events: result.events, rngEvents: result.rngEvents };
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
 * @param ctx RNG Context（省略時は live mode）
 * @returns ExecuteTurnResult
 */
export function executeTurn(
  turnPlan: TurnPlan,
  state: BattleState,
  ctx?: RngContext
): ExecuteTurnResult {
  const allEvents: PublicEvent[] = [];
  const allRngEvents: RngEvent[] = [];

  // RNG Context: 引数で渡されていなければ live mode を作成
  const rngContext: RngContext = ctx ?? {
    mode: 'live',
    rngEvents: allRngEvents,
  };

  // Phase 1: ターン開始
  const startEvents = turnStart(state);
  allEvents.push(...startEvents);

  // Phase 2: 行動実行
  const actionResult = executeActions(turnPlan, state, rngContext);
  allEvents.push(...actionResult.events);
  // rngEvents は rngContext.rngEvents に直接追記されているため、
  // live mode の場合は allRngEvents に自動的に入っている

  // Phase 3: ターン終了
  const endEvents = turnEnd(state);
  allEvents.push(...endEvents);

  return { events: allEvents, rngEvents: allRngEvents };
}
