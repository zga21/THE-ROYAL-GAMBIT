import assert from 'node:assert/strict';
import test from 'node:test';
import {
  materialCentipawns,
  materialDeficitCentipawns,
  pieceCentipawnValue,
  pieceSimpleValue,
} from './materialValues.js';

test('piece values support simple and centipawn scales', () => {
  assert.equal(pieceCentipawnValue('queen'), 900);
  assert.equal(pieceSimpleValue('queen'), 9);
  assert.equal(pieceCentipawnValue({ type: 'pawn' }), 100);
  assert.equal(pieceSimpleValue({ originalType: 'rook', type: 'queen' }), 5);
});

test('material totals ignore captured pieces', () => {
  const pieces = [
    { owner: 'white', type: 'queen', isCaptured: false },
    { owner: 'white', type: 'rook', isCaptured: true },
    { owner: 'black', type: 'rook', isCaptured: false },
  ];

  assert.equal(materialCentipawns(pieces, 'white'), 900);
  assert.equal(materialDeficitCentipawns(pieces, 'black', (color) => (color === 'white' ? 'black' : 'white')), 400);
});
