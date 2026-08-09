import assert from 'node:assert/strict';
import test from 'node:test';
import { Chess } from 'chess.js';
import { evaluateKingGambleOption } from './evaluateKingGambleOption.js';

const profile = {
  id: 'test',
  skill: 0.4,
  blackjackSims: 25,
  blackjackStrategy: 'simple-threshold',
  blackjackRiskTolerance: 0.8,
  recoveryUtilityAwareness: 1,
  desperationScale: 120,
  kingGambleBias: 0,
};

function kingGambleGame(overrides = {}) {
  return {
    chess: new Chess('3qk3/8/8/8/8/8/8/4K3 w - - 0 1'),
    status: 'active',
    protection: { pieceIds: [], protectedAgainst: null },
    kingGamble: { cooldown: { white: false, black: false } },
    pieces: [
      { id: 'wk', owner: 'white', type: 'king', originalType: 'king', originalSquare: 'e1', currentSquare: 'e1', isCaptured: false },
      { id: 'wp-a', owner: 'white', type: 'pawn', originalType: 'pawn', originalSquare: 'a2', currentSquare: null, isCaptured: true },
      { id: 'wp-b', owner: 'white', type: 'pawn', originalType: 'pawn', originalSquare: 'b2', currentSquare: null, isCaptured: true },
      { id: 'bk', owner: 'black', type: 'king', originalType: 'king', originalSquare: 'e8', currentSquare: 'e8', isCaptured: false },
      { id: 'bq', owner: 'black', type: 'queen', originalType: 'queen', originalSquare: 'd8', currentSquare: 'd8', isCaptured: false },
    ],
    ...overrides,
  };
}

test('king gamble is available for a safe lone king with recoverable material', () => {
  const option = evaluateKingGambleOption(kingGambleGame(), profile);

  assert.equal(option.available, true);
  assert.equal(option.mode, 'king');
  assert.equal(option.budget, 2);
  assert.equal(option.targetPieces.length, 2);
  assert.equal(Number.isFinite(option.score), true);
});

test('king gamble is blocked by cooldown', () => {
  const option = evaluateKingGambleOption(
    kingGambleGame({ kingGamble: { cooldown: { white: true, black: false } } }),
    profile,
  );

  assert.equal(option.available, false);
  assert.equal(option.reason, 'king gamble cooldown is active');
});
