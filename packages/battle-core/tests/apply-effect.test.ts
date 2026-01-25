import { describe, it, expect, beforeEach } from 'vitest';
import { applyEffect } from '../src/engine/apply-effect';
import type { Pokemon } from '../src/types/state';
import type { Effect } from '../src/types/effect';

describe('applyEffect (Core Architecture)', () => {
  let pokemon: Pokemon;

  beforeEach(() => {
    // テスト用ポケモン
    pokemon = {
      id: 0,
      speciesId: 'test-pokemon',
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
      ability: 'none',
      item: null,
      moves: [],
    };
  });

  describe('Test 1: APPLY_DAMAGE returns DAMAGE_DEALT', () => {
    it('hp: 100 → 40 のとき DAMAGE_DEALT(amount=60, newHP=40) が出る', () => {
      const effect: Effect = {
        type: 'APPLY_DAMAGE',
        id: 'dmg-1',
        target: 0,
        amount: 60,
      };

      const result = applyEffect(pokemon, effect);

      // State更新を確認
      expect(pokemon.hp).toBe(40);

      // Eventを確認
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toEqual({
        type: 'DAMAGE_DEALT',
        target: 0,
        amount: 60,
        newHP: 40,
        newHPPercent: 40.0,
      });

      // TriggerRequest（ON_DAMAGE）が生成される
      expect(result.triggerRequests).toHaveLength(1);
      expect(result.triggerRequests[0]).toMatchObject({
        timing: 'ON_DAMAGE',
        subjects: [0],
        causeId: 'dmg-1',
      });
    });

    it('過剰ダメージは切り捨てる（hp: 30 → 0 で amount=100）', () => {
      pokemon.hp = 30;

      const effect: Effect = {
        type: 'APPLY_DAMAGE',
        id: 'dmg-2',
        target: 0,
        amount: 100, // 過剰
      };

      const result = applyEffect(pokemon, effect);

      // State更新（0で止まる）
      expect(pokemon.hp).toBe(0);

      // Eventの amount は実ダメージ
      expect(result.events[0]).toMatchObject({
        type: 'DAMAGE_DEALT',
        amount: 30, // 過剰ダメは切る
        newHP: 0,
      });
    });
  });

  describe('Test 2: Faint immediate after APPLY_DAMAGE', () => {
    it('hp: 30 → 0 のとき DAMAGE_DEALT の直後に FAINTED が出る', () => {
      pokemon.hp = 30;

      const effect: Effect = {
        type: 'APPLY_DAMAGE',
        id: 'dmg-3',
        target: 0,
        amount: 30,
      };

      const result = applyEffect(pokemon, effect);

      // Eventは2つ（DAMAGE_DEALT + FAINTED）
      expect(result.events).toHaveLength(2);
      expect(result.events[0].type).toBe('DAMAGE_DEALT');
      expect(result.events[1]).toEqual({
        type: 'FAINTED',
        pokemon: 0,
      });

      // 瀕死なので TriggerRequest は出ない
      expect(result.triggerRequests).toHaveLength(0);
    });
  });

  describe('Test 3: HEAL clips at maxHP', () => {
    it('hp: 90/max: 100 に 30回復 → 100（実回復量=10）', () => {
      pokemon.hp = 90;

      const effect: Effect = {
        type: 'HEAL',
        id: 'heal-1',
        pokemon: 0,
        amount: 30, // 過剰
      };

      const result = applyEffect(pokemon, effect);

      // State更新（上限でクリップ）
      expect(pokemon.hp).toBe(100);

      // Eventの amount は実回復量
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toEqual({
        type: 'HEALED',
        pokemon: 0,
        amount: 10, // 実回復量（要求量ではない）
        newHP: 100,
      });
    });

    it('hp: 50/max: 100 に 30回復 → 80（実回復量=30）', () => {
      pokemon.hp = 50;

      const effect: Effect = {
        type: 'HEAL',
        id: 'heal-2',
        pokemon: 0,
        amount: 30,
      };

      const result = applyEffect(pokemon, effect);

      expect(pokemon.hp).toBe(80);

      expect(result.events[0]).toEqual({
        type: 'HEALED',
        pokemon: 0,
        amount: 30,
        newHP: 80,
      });
    });
  });

  describe('Test 4: SET_STATUS rejects duplicate', () => {
    it('既に burn の相手に burn → 何も起きない（イベントなし）', () => {
      pokemon.status = 'burn';

      const effect: Effect = {
        type: 'SET_STATUS',
        id: 'status-1',
        pokemon: 0,
        status: 'burn',
      };

      const result = applyEffect(pokemon, effect);

      // Stateは変わらない
      expect(pokemon.status).toBe('burn');

      // Eventは出ない（Phase 1仕様）
      expect(result.events).toHaveLength(0);
    });

    it('状態異常なしに burn → STATUS_INFLICTED が出る', () => {
      const effect: Effect = {
        type: 'SET_STATUS',
        id: 'status-2',
        pokemon: 0,
        status: 'burn',
      };

      const result = applyEffect(pokemon, effect);

      // State更新
      expect(pokemon.status).toBe('burn');

      // Event
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toEqual({
        type: 'STATUS_INFLICTED',
        target: 0,
        status: 'burn',
      });
    });
  });
});
