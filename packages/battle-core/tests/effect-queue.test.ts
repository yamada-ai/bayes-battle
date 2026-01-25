import { describe, it, expect } from 'vitest';
import { runQueue } from '../src/engine/effect-queue';
import type { BattleState } from '../src/types/battle-state';
import type { Pokemon } from '../src/types/state';
import { EffectType, type Effect } from '../src/types/effect';
import type { ApplyResult } from '../src/types/apply-result';
import { applyEffect } from '../src/engine/apply-effect';
import { PublicEventType } from '../src/types/event';

describe('EffectQueue (B1)', () => {
  it('derivedEffects が immediate キューに積まれて優先的に処理される', () => {
    // テスト用のポケモン
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
      moves: [],
    };

    const state: BattleState = {
      pokemon: {
        0: pokemon,
      },
    };

    // カスタムの applyEffect: APPLY_DAMAGE の後に derivedEffects で HEAL を返す
    const customApplyEffect = (pokemon: Pokemon, effect: Effect): ApplyResult => {
      const result = applyEffect(pokemon, effect);

      // APPLY_DAMAGE の場合、derivedEffects で HEAL を追加
      if (effect.type === EffectType.APPLY_DAMAGE) {
        result.derivedEffects.push({
          type: EffectType.HEAL,
          id: 'heal-after-damage',
          pokemon: effect.target,
          amount: 20,
        });
      }

      return result;
    };

    // 初期Effect: APPLY_DAMAGE
    const initialEffects: Effect[] = [
      {
        type: EffectType.APPLY_DAMAGE,
        id: 'damage-1',
        target: 0,
        amount: 30,
      },
    ];

    // runQueue を実行
    const result = runQueue(initialEffects, state, customApplyEffect);

    // イベントの順序を確認
    expect(result.events).toHaveLength(2);

    // 1番目: DAMAGE_DEALT
    expect(result.events[0]).toMatchObject({
      type: PublicEventType.DAMAGE_DEALT,
      target: 0,
      amount: 30,
      newHP: 70,
    });

    // 2番目: HEALED（derivedEffects から immediate キューに積まれて処理）
    expect(result.events[1]).toMatchObject({
      type: PublicEventType.HEALED,
      pokemon: 0,
      amount: 20,
      newHP: 90,
    });
  });

  it('immediate キューが空になるまで deferred キューは処理されない', () => {
    // テスト用のポケモン
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
      moves: [],
    };

    const state: BattleState = {
      pokemon: {
        0: pokemon,
      },
    };

    // 初期Effect: 2つのダメージ
    const initialEffects: Effect[] = [
      {
        type: EffectType.APPLY_DAMAGE,
        id: 'damage-1',
        target: 0,
        amount: 10,
      },
      {
        type: EffectType.APPLY_DAMAGE,
        id: 'damage-2',
        target: 0,
        amount: 20,
      },
    ];

    // runQueue を実行
    const result = runQueue(initialEffects, state);

    // 2つのダメージイベントが順序通り処理される
    expect(result.events).toHaveLength(2);
    expect(result.events[0]).toMatchObject({
      type: PublicEventType.DAMAGE_DEALT,
      amount: 10,
      newHP: 90,
    });
    expect(result.events[1]).toMatchObject({
      type: PublicEventType.DAMAGE_DEALT,
      amount: 20,
      newHP: 70,
    });
  });

  it('derivedEffects が残りの初期Effectsより先に処理される', () => {
    // テスト用のポケモン
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
      moves: [],
    };

    const state: BattleState = {
      pokemon: {
        0: pokemon,
      },
    };

    // 処理順序を記録
    const processOrder: string[] = [];

    // カスタムの applyEffect: damage-1 のみ derivedEffects で heal-1 を返す
    const customApplyEffect = (pokemon: Pokemon, effect: Effect): ApplyResult => {
      processOrder.push(effect.id);
      const result = applyEffect(pokemon, effect);

      if (effect.id === 'damage-1') {
        result.derivedEffects.push({
          type: EffectType.HEAL,
          id: 'heal-1',
          pokemon: 0,
          amount: 10,
        });
      }

      return result;
    };

    // 初期Effect: damage-1, damage-2
    const initialEffects: Effect[] = [
      {
        type: EffectType.APPLY_DAMAGE,
        id: 'damage-1',
        target: 0,
        amount: 20,
      },
      {
        type: EffectType.APPLY_DAMAGE,
        id: 'damage-2',
        target: 0,
        amount: 10,
      },
    ];

    // runQueue を実行
    runQueue(initialEffects, state, customApplyEffect);

    // 処理順序を確認: damage-1 → heal-1 → damage-2
    // derivedEffects (heal-1) が残りの初期Effect (damage-2) より先に処理される
    expect(processOrder).toEqual(['damage-1', 'heal-1', 'damage-2']);
  });

  it('複数の derivedEffects が連鎖的に処理される', () => {
    // テスト用のポケモン
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
      moves: [],
    };

    const state: BattleState = {
      pokemon: {
        0: pokemon,
      },
    };

    // カスタムの applyEffect: 最初のダメージだけ derivedEffects で2つ目のダメージを返す
    const customApplyEffect = (pokemon: Pokemon, effect: Effect): ApplyResult => {
      const result = applyEffect(pokemon, effect);

      if (effect.type === EffectType.APPLY_DAMAGE && effect.id === 'damage-1') {
        result.derivedEffects.push({
          type: EffectType.APPLY_DAMAGE,
          id: 'damage-2',
          target: effect.target,
          amount: 10,
        });
      }

      return result;
    };

    // 初期Effect
    const initialEffects: Effect[] = [
      {
        type: EffectType.APPLY_DAMAGE,
        id: 'damage-1',
        target: 0,
        amount: 30,
      },
    ];

    // runQueue を実行
    const result = runQueue(initialEffects, state, customApplyEffect);

    // 2つのダメージイベント
    expect(result.events).toHaveLength(2);
    expect(result.events[0]).toMatchObject({
      type: PublicEventType.DAMAGE_DEALT,
      amount: 30,
      newHP: 70,
    });
    expect(result.events[1]).toMatchObject({
      type: PublicEventType.DAMAGE_DEALT,
      amount: 10,
      newHP: 60,
    });
  });
});
