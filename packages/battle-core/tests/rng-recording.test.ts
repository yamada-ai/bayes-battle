import { describe, it, expect } from 'vitest';
import { runQueue } from '../src/engine/effect-queue';
import type { BattleState } from '../src/types/battle-state';
import type { Pokemon } from '../src/types/state';
import { EffectType, type Effect } from '../src/types/effect';
import { RngEventType } from '../src/types/event';
import type { RngContext } from '../src/types/rng-context';
import { applyEffect } from '../src/engine/apply-effect';

describe('RNG Recording (damageRoll)', () => {
  it('USE_MOVE すると damageRoll の RngEvent が 1件出る', () => {
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
      moves: [{ id: 'tackle', pp: 35 }],
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

    // RngEvent を確認
    expect(result.rngEvents).toHaveLength(1);
    expect(result.rngEvents[0]).toMatchObject({
      type: RngEventType.RNG_ROLL,
      purpose: 'damageRoll',
      value: 100, // 固定値
    });
  });

  it('複数の USE_MOVE で複数の damageRoll が記録される', () => {
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
      moves: [{ id: 'tackle', pp: 35 }],
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
      moves: [{ id: 'tackle', pp: 35 }],
    };

    const state: BattleState = {
      pokemon: {
        0: pokemon1,
        1: pokemon2,
      },
      turnNumber: 0,
    };

    // 初期Effect: 2つの USE_MOVE
    const initialEffects: Effect[] = [
      {
        type: EffectType.USE_MOVE,
        id: 'use-move-1',
        pokemon: 0,
        moveId: 'tackle',
      },
      {
        type: EffectType.USE_MOVE,
        id: 'use-move-2',
        pokemon: 1,
        moveId: 'tackle',
      },
    ];

    // runQueue を実行
    const result = runQueue(initialEffects, state);

    // RngEvent を確認（2件）
    expect(result.rngEvents).toHaveLength(2);
    expect(result.rngEvents[0]).toMatchObject({
      type: RngEventType.RNG_ROLL,
      purpose: 'damageRoll',
      value: 100,
    });
    expect(result.rngEvents[1]).toMatchObject({
      type: RngEventType.RNG_ROLL,
      purpose: 'damageRoll',
      value: 100,
    });
  });

  it('Replay実行で state が一致する（damageRollがログから消費される）', () => {
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
      moves: [{ id: 'tackle', pp: 35 }],
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
      moves: [{ id: 'tackle', pp: 35 }],
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

    // RngEventを記録
    const rngEvents = result1.rngEvents;
    expect(rngEvents).toHaveLength(1);

    // 2回目: Replay実行（同じ初期状態）
    const state2: BattleState = {
      pokemon: {
        0: { ...pokemon1 },
        1: { ...pokemon2 },
      },
      turnNumber: 0,
    };

    // Replay用のカスタムapplyEffect（RNG contextをreplayモードで作成）
    const replayContext: RngContext = {
      mode: 'replay',
      rngEvents,
      consumeIndex: 0,
    };

    const applyEffectReplay = (pokemon: Pokemon, effect: Effect, state: BattleState, _ctx: RngContext) => {
      // replayContext を使用（_ctx は無視）
      return applyEffect(pokemon, effect, state, replayContext);
    };

    const result2 = runQueue(initialEffects, state2, applyEffectReplay);

    // 最終状態が一致することを確認
    expect(state1.pokemon[0].hp).toBe(state2.pokemon[0].hp);
    expect(state1.pokemon[1].hp).toBe(state2.pokemon[1].hp);

    // イベントが一致することを確認
    expect(result1.events).toEqual(result2.events);

    // RNG consumeIndex がインクリメントされていることを確認
    expect(replayContext.consumeIndex).toBe(1);
  });
});
