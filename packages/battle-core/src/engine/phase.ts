import type { BattleState } from '../types/battle-state';
import type { TurnPlan, PlayerAction } from '../types/turn-plan';
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
  // 行動順にソート（Gen4ルール: priority → speed → speedTie）
  // speedTie は一度だけロールして結果をキャッシュ
  const speedTieResults = new Map<string, number>();

  const sortedActions = [...turnPlan.actions].sort((a, b) => {
    // 瀕死ポケモンは行動できない（末尾に）
    const pokemonA = state.pokemon[a.pokemon];
    const pokemonB = state.pokemon[b.pokemon];

    if (!pokemonA || pokemonA.hp === 0) return 1;
    if (!pokemonB || pokemonB.hp === 0) return -1;

    // USE_MOVEのみソート対象（SWITCHは未実装）
    if (a.type !== 'USE_MOVE' || b.type !== 'USE_MOVE') {
      return 0;
    }

    // 1. priority（高い方が先）
    const moveA = getMoveData(a.moveId);
    const moveB = getMoveData(b.moveId);

    const priorityA = moveA?.priority ?? 0;
    const priorityB = moveB?.priority ?? 0;

    if (priorityA !== priorityB) {
      return priorityB - priorityA; // 高い方が先
    }

    // 2. speed（高い方が先）
    const speedA = pokemonA.stats.speed;
    const speedB = pokemonB.stats.speed;

    if (speedA !== speedB) {
      return speedB - speedA; // 高い方が先
    }

    // 3. speedTie（同速時の50/50）
    // ペアごとにキャッシュして、同じペアで複数回呼ばれても1回だけロール
    const pairKey = `${Math.min(a.pokemon, b.pokemon)}-${Math.max(a.pokemon, b.pokemon)}`;
    let speedTieRoll = speedTieResults.get(pairKey);
    if (speedTieRoll === undefined) {
      speedTieRoll = rollSpeedTie(ctx);
      speedTieResults.set(pairKey, speedTieRoll);
    }

    // speedTieRoll の解釈: 0 なら pokemon ID が小さい方が先、1 なら大きい方が先
    if (speedTieRoll === 0) {
      return a.pokemon - b.pokemon; // ID が小さい方が先
    } else {
      return b.pokemon - a.pokemon; // ID が大きい方が先
    }
  });

  const effects: Effect[] = [];

  // ソート済みの actions から USE_MOVE Effect を生成
  for (const action of sortedActions) {
    const pokemon = state.pokemon[action.pokemon];

    // 瀕死ポケモンはスキップ
    if (!pokemon || pokemon.hp === 0) {
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
