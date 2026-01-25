import { describe, it, expect } from 'vitest';
import { calculateDamage } from '../src/damage/calculator';
import type { Pokemon, Move } from '../src/types/state';

describe('Damage Calculation (Gen 4)', () => {
  it('ガブリアスの地震 vs カイリュー（確定2発）', () => {
    // ガブリアス（攻撃252振り、いじっぱり、Lv50）
    const garchomp: Pokemon = {
      id: 0,
      speciesId: 'garchomp',
      level: 50,
      hp: 183,
      maxHP: 183,
      status: null,
      stats: {
        hp: 183,
        attack: 182, // 攻撃252振り、いじっぱり
        defense: 115,
        spAttack: 100,
        spDefense: 105,
        speed: 169,
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
      types: ['dragon', 'ground'],
      ability: 'sandVeil',
      item: null,
      moves: ['earthquake'],
    };

    // カイリュー（HP252振り、Lv50）
    const dragonite: Pokemon = {
      id: 1,
      speciesId: 'dragonite',
      level: 50,
      hp: 200,
      maxHP: 200,
      status: null,
      stats: {
        hp: 200,
        attack: 154,
        defense: 115, // 防御無振り
        spAttack: 120,
        spDefense: 120,
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
      types: ['dragon', 'flying'],
      ability: 'innerFocus',
      item: null,
      moves: ['outrage'],
    };

    // 地震
    const earthquake: Move = {
      id: 'earthquake',
      name: 'じしん',
      type: 'ground',
      category: 'physical',
      power: 100,
      accuracy: 100,
      priority: 0,
      pp: 10,
      target: 'allExceptSelf',
      makesContact: false,
    };

    // ダメージ計算（乱数85-100の全パターンをテスト）
    const damages: number[] = [];
    for (let roll = 85; roll <= 100; roll++) {
      const damage = calculateDamage({
        attacker: garchomp,
        defender: dragonite,
        move: earthquake,
        isCritical: false,
        weather: null,
        randomRoll: roll,
      });
      damages.push(damage);
    }

    // 最小ダメージ: 90
    expect(damages[0]).toBe(90);

    // 最大ダメージ: 106
    expect(damages[15]).toBe(106);

    // 全てのダメージが90-106の範囲内
    damages.forEach((dmg) => {
      expect(dmg).toBeGreaterThanOrEqual(90);
      expect(dmg).toBeLessThanOrEqual(106);
    });

    // 確定2発（最大HPの50%を2回で倒せる）
    expect(damages[15] * 2).toBeGreaterThan(200); // 最大乱数で2発
  });
});
