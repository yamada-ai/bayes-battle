import { describe, it, expect } from 'vitest';
import { runQueue } from '../src/engine/effect-queue';
import type { BattleState } from '../src/types/battle-state';
import type { Pokemon } from '../src/types/state';
import { EffectType, type Effect } from '../src/types/effect';
import { PublicEventType, RngEventType } from '../src/types/event';
import type { RngContext } from '../src/types/rng-context';

describe('Critical Hit', () => {
  it('通常時: criticalRoll の RngEvent が記録される（急所なし）', () => {
    // テスト用のポケモン（2体）
    const pokemon1: Pokemon = {
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

    const pokemon2: Pokemon = {
      id: 1,
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
      moves: [],
    };

    const state: BattleState = {
      pokemon: {
        0: pokemon1,
        1: pokemon2,
      },
      turnNumber: 0,
    };

    // 初期Effect: USE_MOVE (tackle)
    const initialEffects: Effect[] = [
      {
        type: EffectType.USE_MOVE,
        id: 'use-move-1',
        pokemon: 0,
        moveId: 'tackle',
      },
    ];

    // runQueue を実行
    const result = runQueue(initialEffects, state);

    // RngEvent を確認: accuracyRoll + criticalRoll + damageRoll の3件
    expect(result.rngEvents).toHaveLength(3);
    expect(result.rngEvents[0]).toMatchObject({
      type: RngEventType.RNG_ROLL,
      purpose: 'accuracyRoll',
      value: 1,
    });
    expect(result.rngEvents[1]).toMatchObject({
      type: RngEventType.RNG_ROLL,
      purpose: 'criticalRoll',
      value: 16, // 固定値（急所なし）
    });
    expect(result.rngEvents[2]).toMatchObject({
      type: RngEventType.RNG_ROLL,
      purpose: 'damageRoll',
      value: 100,
    });

    // イベント確認: USE_MOVE → DAMAGE_DEALT（CRITICAL_HITは出ない）
    expect(result.events).toHaveLength(2);
    expect(result.events[0]).toMatchObject({
      type: PublicEventType.USE_MOVE,
      pokemon: 0,
      moveId: 'tackle',
    });
    expect(result.events[1]).toMatchObject({
      type: PublicEventType.DAMAGE_DEALT,
      target: 1,
    });
  });

  it('急所時: CRITICAL_HIT イベントが出る', () => {
    // テスト用のポケモン（2体）
    const pokemon1: Pokemon = {
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

    const pokemon2: Pokemon = {
      id: 1,
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
      moves: [],
    };

    const state: BattleState = {
      pokemon: {
        0: pokemon1,
        1: pokemon2,
      },
      turnNumber: 0,
    };

    // カスタムRngContext: criticalRollを1に設定（急所）
    const customRngContext: RngContext = {
      mode: 'replay',
      rngEvents: [
        {
          type: RngEventType.RNG_ROLL,
          purpose: 'accuracyRoll',
          value: 100,
        },
        {
          type: RngEventType.RNG_ROLL,
          purpose: 'criticalRoll',
          value: 1, // 急所
        },
        {
          type: RngEventType.RNG_ROLL,
          purpose: 'damageRoll',
          value: 100,
        },
      ],
      consumeIndex: 0,
    };

    // 初期Effect: USE_MOVE (tackle)
    const initialEffects: Effect[] = [
      {
        type: EffectType.USE_MOVE,
        id: 'use-move-1',
        pokemon: 0,
        moveId: 'tackle',
      },
    ];

    // runQueue を実行（replayモード）
    const result = runQueue(initialEffects, state, customRngContext);

    // イベント確認: USE_MOVE → CRITICAL_HIT → DAMAGE_DEALT
    expect(result.events).toHaveLength(3);
    expect(result.events[0]).toMatchObject({
      type: PublicEventType.USE_MOVE,
      pokemon: 0,
      moveId: 'tackle',
    });
    expect(result.events[1]).toMatchObject({
      type: PublicEventType.CRITICAL_HIT,
      pokemon: 0,
    });
    expect(result.events[2]).toMatchObject({
      type: PublicEventType.DAMAGE_DEALT,
      target: 1,
    });

    // 全RngEventが消費されている
    expect(customRngContext.consumeIndex).toBe(3);
  });

  it('Replay実行で state が一致する（急所パターン）', () => {
    // テスト用のポケモン（2体）
    const pokemon1: Pokemon = {
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

    const pokemon2: Pokemon = {
      id: 1,
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
      moves: [],
    };

    const state1: BattleState = {
      pokemon: {
        0: { ...pokemon1 },
        1: { ...pokemon2 },
      },
      turnNumber: 0,
    };

    // 初期Effect
    const initialEffects: Effect[] = [
      {
        type: EffectType.USE_MOVE,
        id: 'use-move-1',
        pokemon: 0,
        moveId: 'tackle',
      },
    ];

    // 1回目: Live実行
    const result1 = runQueue(initialEffects, state1);

    // RngEventを記録: accuracyRoll + criticalRoll + damageRoll = 3件
    const rngEvents = result1.rngEvents;
    expect(rngEvents).toHaveLength(3);

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

    const result2 = runQueue(initialEffects, state2, replayContext);

    // 最終状態が一致することを確認
    expect(state1.pokemon[0].hp).toBe(state2.pokemon[0].hp);
    expect(state1.pokemon[1].hp).toBe(state2.pokemon[1].hp);

    // イベントが一致することを確認
    expect(result1.events).toEqual(result2.events);

    // RNG consumeIndex が3つ消費されていることを確認
    expect(replayContext.consumeIndex).toBe(3);
  });
});
