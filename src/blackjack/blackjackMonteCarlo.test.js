import assert from 'node:assert/strict';
import test from 'node:test';
import { runBlackjackMonteCarlo } from './blackjackMonteCarlo.js';

test('monte carlo rates sum to one', () => {
  const odds = runBlackjackMonteCarlo({ simulations: 50, strategy: 'simple-threshold' });
  const total = odds.winRate + odds.lossRate + odds.tieRate;

  assert.equal(odds.simulations, 50);
  assert.ok(Math.abs(total - 1) < 0.000001);
  assert.equal(odds.raw.wins + odds.raw.losses + odds.raw.ties, 50);
});

test('invalid simulation count falls back to a safe default', () => {
  const odds = runBlackjackMonteCarlo({ simulations: 0, strategy: 'random' });
  assert.equal(odds.simulations, 1000);
});
