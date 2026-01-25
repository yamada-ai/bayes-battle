import { describe, it, expect } from 'vitest';
import { calculateDamage } from '../src/damage/calculator';
import type { Pokemon, Move } from '../src/types/state';

describe('Damage Calculation (Gen 4)', () => {
  it('ガブリアスの地震 vs ヒードラン（4倍弱点、確定1発）', () => {
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

    // ヒードラン（HP252振り、Lv50）
    const heatran: Pokemon = {
      id: 1,
      speciesId: 'heatran',
      level: 50,
      hp: 167,
      maxHP: 167,
      status: null,
      stats: {
        hp: 167,
        attack: 110,
        defense: 126, // 防御無振り
        spAttack: 150,
        spDefense: 126,
        speed: 97,
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
      types: ['fire', 'steel'],
      ability: 'flashFire',
      item: null,
      moves: ['lavaplume'],
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
        defender: heatran,
        move: earthquake,
        isCritical: false,
        weather: null,
        randomRoll: roll,
      });
      damages.push(damage);
    }

    // 地面 → 炎/鋼 = 4倍弱点
    // STAB（タイプ一致）: 1.5倍
    // 期待ダメージ範囲: 328-388 (確定1発)

    // 最小ダメージ: 328
    expect(damages[0]).toBe(328);

    // 最大ダメージ: 388
    expect(damages[15]).toBe(388);

    // 全てのダメージが328-388の範囲内
    damages.forEach((dmg) => {
      expect(dmg).toBeGreaterThanOrEqual(328);
      expect(dmg).toBeLessThanOrEqual(388);
    });

    // 確定1発（最小乱数でもHP以上のダメージ）
    expect(damages[0]).toBeGreaterThan(167); // 最小乱数でも確定1発
  });

  it('地震が飛行タイプに無効（ダメージ0）', () => {
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
        attack: 182,
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
        defense: 115,
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

    // 地面 → 飛行 = 無効（0倍）
    const damage = calculateDamage({
      attacker: garchomp,
      defender: dragonite,
      move: earthquake,
      isCritical: false,
      weather: null,
      randomRoll: 100,
    });

    expect(damage).toBe(0);
  });
});
