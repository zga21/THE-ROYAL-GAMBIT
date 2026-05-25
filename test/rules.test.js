import assert from 'node:assert/strict';
import test from 'node:test';
import { Chess } from 'chess.js';
import {
  canUseNormalBlackjackByLimit,
  getNormalBlackjackRemaining,
  normalizeBlackjackUsage,
  recordNormalBlackjackUse,
} from '../src/rules/blackjackLimits.js';
import { canStakePieceWithoutExposingKing } from '../src/rules/stakeSafety.js';
import {
  canRecoverPiece,
  recoverPieceToOriginalSquare,
  recoveryValue,
} from '../src/rules/pieceRecovery.js';
import { evaluateBestBlackjackOption } from '../src/bot/evaluateBlackjackOption.js';
import { getBotProfile } from '../src/bot/botProfiles.js';

function piece(overrides) {
  return {
    id: 'piece',
    owner: 'white',
    type: 'pawn',
    originalType: 'pawn',
    originalSquare: 'a2',
    currentSquare: 'a2',
    isCaptured: false,
    isPromoted: false,
    ...overrides,
  };
}

test('normal blackjack usage tracks the five-attempt limit', () => {
  let gameState = { blackjackUsage: normalizeBlackjackUsage() };

  for (let index = 0; index < 5; index += 1) {
    assert.equal(canUseNormalBlackjackByLimit(gameState, 'white'), true);
    gameState = recordNormalBlackjackUse(gameState, 'white');
  }

  assert.equal(getNormalBlackjackRemaining(gameState, 'white'), 0);
  assert.equal(canUseNormalBlackjackByLimit(gameState, 'white'), false);
  assert.equal(getNormalBlackjackRemaining(gameState, 'black'), 5);
});

test('blackjack evaluator reports when the normal challenge limit is reached', () => {
  const gameState = {
    chess: new Chess('4k3/8/8/8/8/8/8/4K3 w - - 0 1'),
    pieces: [
      piece({ id: 'white_king', type: 'king', originalType: 'king', originalSquare: 'e1', currentSquare: 'e1' }),
      piece({ id: 'white_queen', type: 'queen', originalType: 'queen', originalSquare: 'd1', currentSquare: null, isCaptured: true }),
      piece({ id: 'black_king', owner: 'black', type: 'king', originalType: 'king', originalSquare: 'e8', currentSquare: 'e8' }),
      piece({ id: 'black_queen', owner: 'black', type: 'queen', originalType: 'queen', originalSquare: 'd8', currentSquare: 'd8' }),
    ],
    blackjackUsage: {
      white: { normalUsed: 5, normalLimit: 5 },
      black: { normalUsed: 0, normalLimit: 5 },
    },
  };

  const option = evaluateBestBlackjackOption(gameState, getBotProfile(800));

  assert.equal(option.available, false);
  assert.equal(option.reason, 'normal blackjack limit reached');
  assert.equal(option.attemptsRemaining, 0);
});

test('pinned active pieces cannot be selected as blackjack stake', () => {
  const gameState = {
    chess: new Chess('4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1'),
  };
  const pinnedRook = piece({
    id: 'white_rook',
    type: 'rook',
    originalType: 'rook',
    originalSquare: 'e2',
    currentSquare: 'e2',
  });

  assert.equal(canStakePieceWithoutExposingKing(gameState, pinnedRook, 'white'), false);
});

test('captured pieces recover to their original square and reset promotion state', () => {
  const capturedQueen = piece({
    id: 'white_queen',
    type: 'queen',
    originalType: 'queen',
    originalSquare: 'd1',
    currentSquare: null,
    isCaptured: true,
    isPromoted: true,
  });
  const pieces = [
    piece({ id: 'white_king', type: 'king', originalType: 'king', originalSquare: 'e1', currentSquare: 'e1' }),
    capturedQueen,
  ];

  assert.equal(recoveryValue(capturedQueen), 9);
  assert.equal(canRecoverPiece(pieces, capturedQueen, 'white'), true);

  const recovered = recoverPieceToOriginalSquare(pieces, 'white_queen');
  const queen = recovered.find((item) => item.id === 'white_queen');

  assert.equal(queen.isCaptured, false);
  assert.equal(queen.currentSquare, 'd1');
  assert.equal(queen.type, 'queen');
  assert.equal(queen.isPromoted, false);
});

test('recovery is blocked when the original square is occupied', () => {
  const capturedRook = piece({
    id: 'white_rook',
    type: 'rook',
    originalType: 'rook',
    originalSquare: 'a1',
    currentSquare: null,
    isCaptured: true,
  });
  const pieces = [
    capturedRook,
    piece({ id: 'white_knight', type: 'knight', originalType: 'knight', originalSquare: 'b1', currentSquare: 'a1' }),
  ];

  assert.equal(canRecoverPiece(pieces, capturedRook, 'white'), false);
});
