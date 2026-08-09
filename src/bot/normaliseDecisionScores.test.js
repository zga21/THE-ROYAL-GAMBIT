import assert from 'node:assert/strict';
import test from 'node:test';
import {
  simpleMaterialToCentipawns,
  stockfishMateToScore,
  stockfishResultToScore,
} from './normaliseDecisionScores.js';

test('stockfish centipawns are awareness adjusted', () => {
  assert.equal(stockfishResultToScore({ centipawns: 200 }, { stockfishAwareness: 0.5 }), 100);
});

test('mate scores dominate normal material scores', () => {
  assert.ok(stockfishMateToScore(2) > 9000);
  assert.ok(stockfishMateToScore(-1) < -9000);
});

test('simple material converts to centipawns', () => {
  assert.equal(simpleMaterialToCentipawns(9), 900);
});
