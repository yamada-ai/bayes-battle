import { describe, it, expect } from 'vitest';
import { executeTurn } from '../src/engine/phase';
import type { BattleState } from '../src/types/battle-state';
import type { Pokemon } from '../src/types/state';
import type { TurnPlan } from '../src/types/turn-plan';
import { PublicEventType, RngEventType } from '../src/types/event';
import type { RngContext } from '../src/types/rng-context';

describe('Speed Tie', () => {
  it('同速時: speedTie の RngEvent が記録される', () => {
    // テスト用のポケモン（同じ speed）
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
        speed: 100, // 同速
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
        speed: 100, // 同速
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
        0: pokemon1,
        1: pokemon2,
      },
      turnNumber: 0,
    };

    const turnPlan: TurnPlan = {
      actions: [
        { type: 'USE_MOVE', pokemon: 0, moveId: 'tackle' },
        { type: 'USE_MOVE', pokemon: 1, moveId: 'tackle' },
      ],
    };

    // executeTurn を実行
    const result = executeTurn(turnPlan, state);

    // RngEvent を確認: speedTie が1件含まれる
    const speedTieEvents = result.rngEvents.filter((e) => e.purpose === 'speedTie');
    expect(speedTieEvents).toHaveLength(1);
    expect(speedTieEvents[0]).toMatchObject({
      type: RngEventType.RNG_ROLL,
      purpose: 'speedTie',
      value: 0, // 固定値（pokemon0が先）
    });

    // USE_MOVEイベントの順序を確認: pokemon0が先
    const useMoveEvents = result.events.filter((e) => e.type === PublicEventType.USE_MOVE);
    expect(useMoveEvents).toHaveLength(2);
    expect(useMoveEvents[0].pokemon).toBe(0);
    expect(useMoveEvents[1].pokemon).toBe(1);
  });

  it('速度差がある場合: speedTie RngEvent は出ない', () => {
    // テスト用のポケモン（異なる speed）
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
        speed: 50, // 遅い
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
        speed: 100, // 速い
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
        0: pokemon1,
        1: pokemon2,
      },
      turnNumber: 0,
    };

    const turnPlan: TurnPlan = {
      actions: [
        { type: 'USE_MOVE', pokemon: 0, moveId: 'tackle' },
        { type: 'USE_MOVE', pokemon: 1, moveId: 'tackle' },
      ],
    };

    // executeTurn を実行
    const result = executeTurn(turnPlan, state);

    // RngEvent を確認: speedTie は出ない
    const speedTieEvents = result.rngEvents.filter((e) => e.purpose === 'speedTie');
    expect(speedTieEvents).toHaveLength(0);

    // USE_MOVEイベントの順序を確認: pokemon1（速い方）が先
    const useMoveEvents = result.events.filter((e) => e.type === PublicEventType.USE_MOVE);
    expect(useMoveEvents).toHaveLength(2);
    expect(useMoveEvents[0].pokemon).toBe(1); // 速い方が先
    expect(useMoveEvents[1].pokemon).toBe(0); // 遅い方が後
  });

  it('Replay実行で行動順が一致する（同速パターン）', () => {
    // テスト用のポケモン（同じ speed）
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

    const state1: BattleState = {
      pokemon: {
        0: { ...pokemon1 },
        1: { ...pokemon2 },
      },
      turnNumber: 0,
    };

    const turnPlan: TurnPlan = {
      actions: [
        { type: 'USE_MOVE', pokemon: 0, moveId: 'tackle' },
        { type: 'USE_MOVE', pokemon: 1, moveId: 'tackle' },
      ],
    };

    // 1回目: Live実行
    const result1 = executeTurn(turnPlan, state1);

    // RngEventを記録
    const rngEvents = result1.rngEvents;
    expect(rngEvents.length).toBeGreaterThan(0);

    // 2回目: Replay実行（同じ初期状態）
    const state2: BattleState = {
      pokemon: {
        0: { ...pokemon1 },
        1: { ...pokemon2 },
      },
      turnNumber: 0,
    };

    // Replay用のRngContext
    const replayContext: RngContext = {
      mode: 'replay',
      rngEvents,
      consumeIndex: 0,
    };

    const result2 = executeTurn(turnPlan, state2, replayContext);

    // 最終状態が一致することを確認
    expect(state1.pokemon[0].hp).toBe(state2.pokemon[0].hp);
    expect(state1.pokemon[1].hp).toBe(state2.pokemon[1].hp);

    // イベントが一致することを確認
    expect(result1.events).toEqual(result2.events);

    // RNG consumeIndex が全て消費されていることを確認
    expect(replayContext.consumeIndex).toBe(rngEvents.length);
  });

  it('Replay実行でspeedTieを反転させると行動順が逆になる', () => {
    // テスト用のポケモン（同じ speed）
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

    const state: BattleState = {
      pokemon: {
        0: { ...pokemon1 },
        1: { ...pokemon2 },
      },
      turnNumber: 0,
    };

    const turnPlan: TurnPlan = {
      actions: [
        { type: 'USE_MOVE', pokemon: 0, moveId: 'tackle' },
        { type: 'USE_MOVE', pokemon: 1, moveId: 'tackle' },
      ],
    };

    // カスタムRngContext: speedTieを1に設定（pokemon1が先）
    const customRngContext: RngContext = {
      mode: 'replay',
      rngEvents: [
        {
          type: RngEventType.RNG_ROLL,
          purpose: 'speedTie',
          value: 1, // pokemon1が先
        },
        // accuracyRoll + criticalRoll + damageRoll for pokemon1's tackle
        {
          type: RngEventType.RNG_ROLL,
          purpose: 'accuracyRoll',
          value: 1,
        },
        {
          type: RngEventType.RNG_ROLL,
          purpose: 'criticalRoll',
          value: 16,
        },
        {
          type: RngEventType.RNG_ROLL,
          purpose: 'damageRoll',
          value: 100,
        },
        // accuracyRoll + criticalRoll + damageRoll for pokemon0's tackle
        {
          type: RngEventType.RNG_ROLL,
          purpose: 'accuracyRoll',
          value: 1,
        },
        {
          type: RngEventType.RNG_ROLL,
          purpose: 'criticalRoll',
          value: 16,
        },
        {
          type: RngEventType.RNG_ROLL,
          purpose: 'damageRoll',
          value: 100,
        },
      ],
      consumeIndex: 0,
    };

    // Replay実行
    const result = executeTurn(turnPlan, state, customRngContext);

    // USE_MOVEイベントの順序を確認: pokemon1が先（speedTie=1）
    const useMoveEvents = result.events.filter((e) => e.type === PublicEventType.USE_MOVE);
    expect(useMoveEvents).toHaveLength(2);
    expect(useMoveEvents[0].pokemon).toBe(1); // speedTie=1 なら pokemon1 が先
    expect(useMoveEvents[1].pokemon).toBe(0);

    // 全RngEventが消費されている
    expect(customRngContext.consumeIndex).toBe(7);
  });

  it('同速3体以上: RNG消費が1回のみで、順序が決定的に再現される', () => {
    // テスト用のポケモン（3体、全て同速）
    const pokemon0: Pokemon = {
      id: 0,
      speciesId: 'test0',
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
        speed: 100, // 同速
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

    const pokemon1: Pokemon = {
      id: 1,
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
        speed: 100, // 同速
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
      id: 2,
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
        speed: 100, // 同速
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

    const state1: BattleState = {
      pokemon: {
        0: { ...pokemon0 },
        1: { ...pokemon1 },
        2: { ...pokemon2 },
      },
      turnNumber: 0,
    };

    const turnPlan: TurnPlan = {
      actions: [
        { type: 'USE_MOVE', pokemon: 0, moveId: 'tackle' },
        { type: 'USE_MOVE', pokemon: 1, moveId: 'tackle' },
        { type: 'USE_MOVE', pokemon: 2, moveId: 'tackle' },
      ],
    };

    // 1回目: Live実行
    const result1 = executeTurn(turnPlan, state1);

    // RngEvent を確認: speedTie が1回のみ（3体でも1回）
    const speedTieEvents = result1.rngEvents.filter((e) => e.purpose === 'speedTie');
    expect(speedTieEvents).toHaveLength(1);
    expect(speedTieEvents[0].value).toBe(0); // 固定値

    // 行動順を確認: speedTieRoll=0 なら ID昇順（0, 1, 2）
    const useMoveEvents = result1.events.filter((e) => e.type === PublicEventType.USE_MOVE);
    expect(useMoveEvents).toHaveLength(3);
    expect(useMoveEvents[0].pokemon).toBe(0);
    expect(useMoveEvents[1].pokemon).toBe(1);
    expect(useMoveEvents[2].pokemon).toBe(2);

    // 2回目: Replay実行（同じRngEvents）
    const state2: BattleState = {
      pokemon: {
        0: { ...pokemon0 },
        1: { ...pokemon1 },
        2: { ...pokemon2 },
      },
      turnNumber: 0,
    };

    const replayContext: RngContext = {
      mode: 'replay',
      rngEvents: result1.rngEvents,
      consumeIndex: 0,
    };

    const result2 = executeTurn(turnPlan, state2, replayContext);

    // 行動順が一致
    const useMoveEvents2 = result2.events.filter((e) => e.type === PublicEventType.USE_MOVE);
    expect(useMoveEvents2).toHaveLength(3);
    expect(useMoveEvents2[0].pokemon).toBe(0);
    expect(useMoveEvents2[1].pokemon).toBe(1);
    expect(useMoveEvents2[2].pokemon).toBe(2);

    // 全RngEventが消費されている
    expect(replayContext.consumeIndex).toBe(result1.rngEvents.length);
  });

  it('同速3体: speedTie=1で逆順になる', () => {
    const pokemon0: Pokemon = {
      id: 0,
      speciesId: 'test0',
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

    const pokemon1: Pokemon = {
      id: 1,
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
      id: 2,
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

    const state: BattleState = {
      pokemon: {
        0: { ...pokemon0 },
        1: { ...pokemon1 },
        2: { ...pokemon2 },
      },
      turnNumber: 0,
    };

    const turnPlan: TurnPlan = {
      actions: [
        { type: 'USE_MOVE', pokemon: 0, moveId: 'tackle' },
        { type: 'USE_MOVE', pokemon: 1, moveId: 'tackle' },
        { type: 'USE_MOVE', pokemon: 2, moveId: 'tackle' },
      ],
    };

    // カスタムRngContext: speedTie=1（逆順）
    const customRngContext: RngContext = {
      mode: 'replay',
      rngEvents: [
        { type: RngEventType.RNG_ROLL, purpose: 'speedTie', value: 1 }, // 逆順
        // accuracyRoll + criticalRoll + damageRoll for each pokemon
        { type: RngEventType.RNG_ROLL, purpose: 'accuracyRoll', value: 1 },
        { type: RngEventType.RNG_ROLL, purpose: 'criticalRoll', value: 16 },
        { type: RngEventType.RNG_ROLL, purpose: 'damageRoll', value: 100 },
        { type: RngEventType.RNG_ROLL, purpose: 'accuracyRoll', value: 1 },
        { type: RngEventType.RNG_ROLL, purpose: 'criticalRoll', value: 16 },
        { type: RngEventType.RNG_ROLL, purpose: 'damageRoll', value: 100 },
        { type: RngEventType.RNG_ROLL, purpose: 'accuracyRoll', value: 1 },
        { type: RngEventType.RNG_ROLL, purpose: 'criticalRoll', value: 16 },
        { type: RngEventType.RNG_ROLL, purpose: 'damageRoll', value: 100 },
      ],
      consumeIndex: 0,
    };

    const result = executeTurn(turnPlan, state, customRngContext);

    // USE_MOVEイベントの順序を確認: speedTie=1 なら逆順（2, 1, 0）
    const useMoveEvents = result.events.filter((e) => e.type === PublicEventType.USE_MOVE);
    expect(useMoveEvents).toHaveLength(3);
    expect(useMoveEvents[0].pokemon).toBe(2); // 逆順
    expect(useMoveEvents[1].pokemon).toBe(1);
    expect(useMoveEvents[2].pokemon).toBe(0);

    // 全RngEventが消費されている
    expect(customRngContext.consumeIndex).toBe(10);
  });

  it('範囲外のspeedTieでエラーになる（replay検証）', () => {
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

    const state: BattleState = {
      pokemon: {
        0: pokemon1,
        1: pokemon2,
      },
      turnNumber: 0,
    };

    const turnPlan: TurnPlan = {
      actions: [
        { type: 'USE_MOVE', pokemon: 0, moveId: 'tackle' },
        { type: 'USE_MOVE', pokemon: 1, moveId: 'tackle' },
      ],
    };

    // カスタムRngContext: speedTieを2に設定（範囲外: 0 or 1）
    const customRngContext: RngContext = {
      mode: 'replay',
      rngEvents: [
        {
          type: RngEventType.RNG_ROLL,
          purpose: 'speedTie',
          value: 2, // 範囲外の値
        },
      ],
      consumeIndex: 0,
    };

    // executeTurn を実行（replayモード）→ エラーになることを確認
    expect(() => {
      executeTurn(turnPlan, state, customRngContext);
    }).toThrow('RNG replay error: speedTie value must be 0 or 1: 2');
  });
});
