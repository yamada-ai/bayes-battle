import { describe, it, expect } from 'vitest';
import { executeTurn } from '../src/engine/phase';
import type { BattleState } from '../src/types/battle-state';
import type { Pokemon } from '../src/types/state';
import type { TurnPlan } from '../src/types/turn-plan';
import { PublicEventType, type PublicEvent } from '../src/types/event';

describe('Phase (B3)', () => {
  it('5ターン回してreplay一致（超ミニ実装）', () => {
    // テスト用のポケモン2体
    const pokemon1: Pokemon = {
      id: 0,
      speciesId: 'test1',
      level: 50,
      hp: 100,
      maxHP: 100,
      status: null,
      stats: {
        hp: 100,
        attack: 100,
        defense: 100,
        spAttack: 100,
        spDefense: 100,
        speed: 100,
      },
      statStages: {
        attack: 0,
        defense: 0,
        spAttack: 0,
        spDefense: 0,
        speed: 0,
        accuracy: 0,
        evasion: 0,
      },
      types: ['normal'],
      ability: 'test',
      item: null,
      moves: ['tackle'],
    };

    const pokemon2: Pokemon = {
      id: 1,
      speciesId: 'test2',
      level: 50,
      hp: 100,
      maxHP: 100,
      status: null,
      stats: {
        hp: 100,
        attack: 100,
        defense: 100,
        spAttack: 100,
        spDefense: 100,
        speed: 100,
      },
      statStages: {
        attack: 0,
        defense: 0,
        spAttack: 0,
        spDefense: 0,
        speed: 0,
        accuracy: 0,
        evasion: 0,
      },
      types: ['normal'],
      ability: 'test',
      item: null,
      moves: ['tackle'],
    };

    // 初期状態（1回目）
    const state1: BattleState = {
      pokemon: {
        0: { ...pokemon1 },
        1: { ...pokemon2 },
      },
      turnNumber: 0,
    };

    // 初期状態（2回目、同じ状態）
    const state2: BattleState = {
      pokemon: {
        0: { ...pokemon1 },
        1: { ...pokemon2 },
      },
      turnNumber: 0,
    };

    // ターン入力（5ターン分、同じ入力）
    const turnPlans: TurnPlan[] = Array.from({ length: 5 }, () => ({
      actions: [
        { type: 'USE_MOVE' as const, pokemon: 0, moveId: 'tackle' },
        { type: 'USE_MOVE' as const, pokemon: 1, moveId: 'tackle' },
      ],
    }));

    // 1回目の実行
    const events1: PublicEvent[] = [];
    for (const turnPlan of turnPlans) {
      const result = executeTurn(turnPlan, state1);
      events1.push(...result.events);
    }

    // 2回目の実行
    const events2: PublicEvent[] = [];
    for (const turnPlan of turnPlans) {
      const result = executeTurn(turnPlan, state2);
      events2.push(...result.events);
    }

    // Replay一致確認
    expect(events1).toEqual(events2);

    // 5ターン分のTURN_STARTイベントが出ている
    const turnStartEvents = events1.filter((e) => e.type === PublicEventType.TURN_START);
    expect(turnStartEvents).toHaveLength(5);
    expect(turnStartEvents[0].turnNumber).toBe(1);
    expect(turnStartEvents[4].turnNumber).toBe(5);

    // 各ターンでUSE_MOVEイベントが2つ出ている
    const useMoveEvents = events1.filter((e) => e.type === PublicEventType.USE_MOVE);
    expect(useMoveEvents).toHaveLength(10); // 5ターン × 2体
  });

  it('ターン番号が正しくインクリメントされる', () => {
    const pokemon: Pokemon = {
      id: 0,
      speciesId: 'test',
      level: 50,
      hp: 100,
      maxHP: 100,
      status: null,
      stats: {
        hp: 100,
        attack: 100,
        defense: 100,
        spAttack: 100,
        spDefense: 100,
        speed: 100,
      },
      statStages: {
        attack: 0,
        defense: 0,
        spAttack: 0,
        spDefense: 0,
        speed: 0,
        accuracy: 0,
        evasion: 0,
      },
      types: ['normal'],
      ability: 'test',
      item: null,
      moves: ['tackle'],
    };

    const state: BattleState = {
      pokemon: {
        0: pokemon,
      },
      turnNumber: 0,
    };

    // 初期ターン番号: 0
    expect(state.turnNumber).toBe(0);

    // ターン1実行
    const turnPlan: TurnPlan = {
      actions: [{ type: 'USE_MOVE', pokemon: 0, moveId: 'tackle' }],
    };

    executeTurn(turnPlan, state);
    expect(state.turnNumber).toBe(1);

    // ターン2実行
    executeTurn(turnPlan, state);
    expect(state.turnNumber).toBe(2);

    // ターン3実行
    executeTurn(turnPlan, state);
    expect(state.turnNumber).toBe(3);
  });
});
