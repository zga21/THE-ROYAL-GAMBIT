import assert from 'node:assert/strict';
import test from 'node:test';
import { Chess } from 'chess.js';
import {
  createInitialPositionHistory,
  isThreefoldRepetition,
  positionKey,
  recordPositionAndApplyDraw,
} from './repetition.js';

function makeGame(fen = undefined) {
  const game = {
    chess: new Chess(fen),
    protection: { pieceIds: [], protectedAgainst: null },
    status: 'active',
  };
  return {
    ...game,
    positionHistory: createInitialPositionHistory(game),
  };
}

test('position key ignores move counters but includes protection state', () => {
  const first = makeGame('8/8/8/8/8/8/8/K6k w - - 0 1');
  const second = makeGame('8/8/8/8/8/8/8/K6k w - - 14 92');
  const protectedGame = {
    ...first,
    protection: { pieceIds: ['b', 'a'], protectedAgainst: 'black' },
  };

  assert.equal(positionKey(first), positionKey(second));
  assert.notEqual(positionKey(first), positionKey(protectedGame));
});

test('third repeated playable position becomes a draw', () => {
  let game = makeGame('8/8/8/8/8/8/8/K6k w - - 0 1');
  game = recordPositionAndApplyDraw(game);
  assert.equal(game.status, 'active');
  game = recordPositionAndApplyDraw(game);

  assert.equal(isThreefoldRepetition(game), true);
  assert.equal(game.status, 'draw');
  assert.equal(game.drawReason, 'threefold-repetition');
});
