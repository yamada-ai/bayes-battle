import { describe, it, expect } from 'vitest';
import { runQueue } from '../src/engine/effect-queue';
import type { BattleState } from '../src/types/battle-state';
import type { Pokemon } from '../src/types/state';
import { EffectType, type Effect } from '../src/types/effect';
import { PublicEventType } from '../src/types/event';

describe('TriggerSystem (B2)', () => {
  it('オボンのみ: HP 1/2以下でダメージ → 回復', () => {
    // テスト用のポケモン（オボンのみ所持、HP 100/200）
    const pokemon: Pokemon = {
      id: 0,
      speciesId: 'test',
      level: 50,
      hp: 100,
      maxHP: 200,
      status: null,
      stats: {
        hp: 200,
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
      item: 'oranBerry',
      moves: [],
    };

    const state: BattleState = {
      pokemon: {
        0: pokemon,
      },
      turnNumber: 0,
    };

    // 初期Effect: 10ダメージ（HP 100 → 90、1/2以下になる）
    const initialEffects: Effect[] = [
      {
        type: EffectType.APPLY_DAMAGE,
        id: 'damage-1',
        target: 0,
        amount: 10,
      },
    ];

    // runQueue を実行
    const result = runQueue(initialEffects, state);

    // イベントを確認
    expect(result.events).toHaveLength(4);

    // 1. DAMAGE_DEALT（HP 100 → 90）
    expect(result.events[0]).toMatchObject({
      type: PublicEventType.DAMAGE_DEALT,
      target: 0,
      amount: 10,
      newHP: 90,
    });

    // 2. ITEM_ACTIVATED（オボンのみ発動）
    expect(result.events[1]).toMatchObject({
      type: PublicEventType.ITEM_ACTIVATED,
      pokemon: 0,
      item: 'oranBerry',
    });

    // 3. HEALED（HP 90 → 100）
    // HEAL Effect が先に処理される
    expect(result.events[2]).toMatchObject({
      type: PublicEventType.HEALED,
      pokemon: 0,
      amount: 10,
      newHP: 100,
    });

    // 4. ITEM_CONSUMED（オボンのみ消費）
    // CONSUME_ITEM Effect が後に処理される
    expect(result.events[3]).toMatchObject({
      type: PublicEventType.ITEM_CONSUMED,
      pokemon: 0,
      item: 'oranBerry',
    });

    // ポケモンのアイテムが削除されている
    expect(pokemon.item).toBeNull();

    // 最終HP: 100
    expect(pokemon.hp).toBe(100);
  });

  it('オボンのみ: HP 1/2より上ではダメージでも発動しない', () => {
    // テスト用のポケモン（オボンのみ所持、HP 150/200）
    const pokemon: Pokemon = {
      id: 0,
      speciesId: 'test',
      level: 50,
      hp: 150,
      maxHP: 200,
      status: null,
      stats: {
        hp: 200,
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
      item: 'oranBerry',
      moves: [],
    };

    const state: BattleState = {
      pokemon: {
        0: pokemon,
      },
      turnNumber: 0,
    };

    // 初期Effect: 10ダメージ（HP 150 → 140、1/2より上）
    const initialEffects: Effect[] = [
      {
        type: EffectType.APPLY_DAMAGE,
        id: 'damage-1',
        target: 0,
        amount: 10,
      },
    ];

    // runQueue を実行
    const result = runQueue(initialEffects, state);

    // イベントを確認（ダメージのみ、オボンのみ発動なし）
    expect(result.events).toHaveLength(1);

    // DAMAGE_DEALT のみ
    expect(result.events[0]).toMatchObject({
      type: PublicEventType.DAMAGE_DEALT,
      target: 0,
      amount: 10,
      newHP: 140,
    });

    // ポケモンのアイテムはそのまま
    expect(pokemon.item).toBe('oranBerry');

    // 最終HP: 140
    expect(pokemon.hp).toBe(140);
  });

  it('オボンのみ: 瀕死時は発動しない', () => {
    // テスト用のポケモン（オボンのみ所持、HP 10/200）
    const pokemon: Pokemon = {
      id: 0,
      speciesId: 'test',
      level: 50,
      hp: 10,
      maxHP: 200,
      status: null,
      stats: {
        hp: 200,
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
      item: 'oranBerry',
      moves: [],
    };

    const state: BattleState = {
      pokemon: {
        0: pokemon,
      },
      turnNumber: 0,
    };

    // 初期Effect: 20ダメージ（HP 10 → 0、瀕死）
    const initialEffects: Effect[] = [
      {
        type: EffectType.APPLY_DAMAGE,
        id: 'damage-1',
        target: 0,
        amount: 20,
      },
    ];

    // runQueue を実行
    const result = runQueue(initialEffects, state);

    // イベントを確認（ダメージ + 瀕死のみ、オボンのみ発動なし）
    expect(result.events).toHaveLength(2);

    // 1. DAMAGE_DEALT
    expect(result.events[0]).toMatchObject({
      type: PublicEventType.DAMAGE_DEALT,
      target: 0,
      amount: 10, // 過剰ダメージは切る
      newHP: 0,
    });

    // 2. FAINTED
    expect(result.events[1]).toMatchObject({
      type: PublicEventType.FAINTED,
      pokemon: 0,
    });

    // ポケモンのアイテムはそのまま（瀕死時は発動しない）
    expect(pokemon.item).toBe('oranBerry');

    // 最終HP: 0
    expect(pokemon.hp).toBe(0);
  });

  it('オボンのみ: 消費後は再度発動しない', () => {
    // テスト用のポケモン（オボンのみ所持、HP 100/200）
    const pokemon: Pokemon = {
      id: 0,
      speciesId: 'test',
      level: 50,
      hp: 100,
      maxHP: 200,
      status: null,
      stats: {
        hp: 200,
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
      item: 'oranBerry',
      moves: [],
    };

    const state: BattleState = {
      pokemon: {
        0: pokemon,
      },
      turnNumber: 0,
    };

    // 初期Effect: 10ダメージ（HP 100 → 90、1/2以下になる）→ オボンのみ発動
    const initialEffects: Effect[] = [
      {
        type: EffectType.APPLY_DAMAGE,
        id: 'damage-1',
        target: 0,
        amount: 10,
      },
    ];

    // runQueue を実行
    const result1 = runQueue(initialEffects, state);

    // オボンのみが発動して消費される
    expect(result1.events).toHaveLength(4);
    expect(pokemon.item).toBeNull();
    expect(pokemon.hp).toBe(100);

    // 2回目のダメージ（HP 100 → 90、1/2以下だがオボンのみはない）
    const initialEffects2: Effect[] = [
      {
        type: EffectType.APPLY_DAMAGE,
        id: 'damage-2',
        target: 0,
        amount: 10,
      },
    ];

    // runQueue を実行
    const result2 = runQueue(initialEffects2, state);

    // オボンのみは発動しない（既に消費済み）
    expect(result2.events).toHaveLength(1);
    expect(result2.events[0]).toMatchObject({
      type: PublicEventType.DAMAGE_DEALT,
      target: 0,
      amount: 10,
      newHP: 90,
    });

    // 最終HP: 90
    expect(pokemon.hp).toBe(90);
  });
});
