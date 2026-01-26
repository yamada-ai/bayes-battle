import type { RngEvent } from './event';

/**
 * RNG Context: 乱数を生成する際のコンテキスト
 *
 * - live: 実際にRNGから値を生成し、RngEventを記録
 * - replay: RngEventログから値を消費（再現実行）
 */
export type RngContext =
  | {
      mode: 'live';
      /** RngEventを追加するための配列（参照渡し） */
      rngEvents: RngEvent[];
    }
  | {
      mode: 'replay';
      /** 消費するRngEventの配列 */
      rngEvents: RngEvent[];
      /** 次に消費するインデックス */
      consumeIndex: number;
    };
