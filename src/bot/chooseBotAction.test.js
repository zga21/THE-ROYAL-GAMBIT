import assert from 'node:assert/strict';
import test from 'node:test';
import { Chess } from 'chess.js';
import { chooseBotAction } from './chooseBotAction.js';
import { normalizeBlackjackUsage } from '../rules/blackjackLimits.js';

function startingGame() {
  return {
    chess: new Chess(),
    status: 'active',
    protection: { pieceIds: [], protectedAgainst: null },
    kingGamble: { cooldown: { white: false, black: false } },
    blackjackUsage: normalizeBlackjackUsage(),
    pieces: [],
  };
}

test('chooseBotAction returns a legal move action when blackjack is unavailable', async () => {
  const game = startingGame();
  const action = await chooseBotAction(game, 800);

  assert.equal(action.type, 'move');
  assert.ok(action.move);
  assert.equal(game.chess.moves({ verbose: true }).some((move) => move.from === action.move.from && move.to === action.move.to), true);
});
