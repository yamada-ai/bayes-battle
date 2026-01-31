import { describe, it, expect } from 'vitest';
import { MOVE_DATABASE, getMoveData } from '../src/data/move-db';

describe('Move Database', () => {
  it('すべての技が有効なデータを持つ', () => {
    for (const [id, move] of Object.entries(MOVE_DATABASE)) {
      // id が一致
      expect(move.id).toBe(id);

      // 必須フィールドが存在
      expect(move.name).toBeTruthy();
      expect(move.type).toBeTruthy();

      // category が有効
      expect(['physical', 'special', 'status']).toContain(move.category);

      // ダメージ技は power が必須
      if (move.category !== 'status') {
        expect(move.power).not.toBeNull();
        expect(move.power).toBeGreaterThan(0);
      } else {
        // 変化技は power が null
        expect(move.power).toBeNull();
      }

      // accuracy の範囲チェック
      if (move.accuracy !== null) {
        expect(move.accuracy).toBeGreaterThanOrEqual(0);
        expect(move.accuracy).toBeLessThanOrEqual(100);
      }

      // priority の範囲チェック（Gen4: -7 ~ 5）
      expect(move.priority).toBeGreaterThanOrEqual(-7);
      expect(move.priority).toBeLessThanOrEqual(5);

      // pp が正の数
      expect(move.pp).toBeGreaterThan(0);

      // target が存在
      expect(move.target).toBeTruthy();

      // makesContact がboolean
      expect(typeof move.makesContact).toBe('boolean');
    }
  });

  it('getMoveData は正しい技を返す', () => {
    const tackle = getMoveData('tackle');
    expect(tackle).not.toBeNull();
    expect(tackle?.name).toBe('たいあたり');
    expect(tackle?.category).toBe('physical');
    expect(tackle?.power).toBe(40);

    const earthquake = getMoveData('earthquake');
    expect(earthquake).not.toBeNull();
    expect(earthquake?.name).toBe('じしん');
    expect(earthquake?.power).toBe(100);

    const thunderbolt = getMoveData('thunderbolt');
    expect(thunderbolt).not.toBeNull();
    expect(thunderbolt?.name).toBe('10まんボルト');
    expect(thunderbolt?.category).toBe('special');
    expect(thunderbolt?.power).toBe(90);
  });

  it('未登録の技は null を返す', () => {
    expect(getMoveData('nonexistent')).toBeNull();
    expect(getMoveData('')).toBeNull();
    expect(getMoveData('unknown_move')).toBeNull();
  });

  it('先制技の priority が正しい', () => {
    const aquaJet = getMoveData('aqua_jet');
    expect(aquaJet).not.toBeNull();
    expect(aquaJet?.priority).toBe(1);
    expect(aquaJet?.name).toBe('アクアジェット');
  });

  it('変化技は power が null', () => {
    const swordsDance = getMoveData('swords_dance');
    expect(swordsDance).not.toBeNull();
    expect(swordsDance?.category).toBe('status');
    expect(swordsDance?.power).toBeNull();
    expect(swordsDance?.accuracy).toBeNull(); // 必中

    const recover = getMoveData('recover');
    expect(recover).not.toBeNull();
    expect(recover?.category).toBe('status');
    expect(recover?.power).toBeNull();
  });

  it('物理技と特殊技の分類が正しい', () => {
    // 物理技
    const earthquake = getMoveData('earthquake');
    expect(earthquake?.category).toBe('physical');

    const stoneEdge = getMoveData('stone_edge');
    expect(stoneEdge?.category).toBe('physical');

    // 特殊技
    const iceBeam = getMoveData('ice_beam');
    expect(iceBeam?.category).toBe('special');

    const hydroPump = getMoveData('hydro_pump');
    expect(hydroPump?.category).toBe('special');
  });

  it('命中率が異なる技が正しく登録されている', () => {
    // 命中100
    const tackle = getMoveData('tackle');
    expect(tackle?.accuracy).toBe(100);

    // 命中80
    const stoneEdge = getMoveData('stone_edge');
    expect(stoneEdge?.accuracy).toBe(80);

    const hydroPump = getMoveData('hydro_pump');
    expect(hydroPump?.accuracy).toBe(80);
  });

  it('MoveDBに技が登録されている', () => {
    const moveCount = Object.keys(MOVE_DATABASE).length;
    expect(moveCount).toBeGreaterThan(0); // 最低1技は存在
  });
});
