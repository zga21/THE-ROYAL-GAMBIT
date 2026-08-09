import { Chess } from 'chess.js';
import { pieceSimpleValue } from '../rules/materialValues.js';
import { recoveredPieceUtility } from './evaluateRecoveryTarget.js';

export const BOT_PIECE_VALUES = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: Infinity,
};

export function getTurnColor(gameState) {
  return gameState?.chess?.turn?.() === 'b' ? 'black' : 'white';
}

export function opposite(color) {
  return color === 'white' ? 'black' : 'white';
}

export function pieceValue(piece) {
  return pieceSimpleValue(piece);
}

export function pieceAt(pieces, square) {
  return pieces?.find((piece) => piece.currentSquare === square && !piece.isCaptured) ?? null;
}

export function getMaterial(gameState, color) {
  return (gameState?.pieces ?? [])
    .filter((piece) => piece.owner === color && !piece.isCaptured)
    .reduce((sum, piece) => {
      const value = BOT_PIECE_VALUES[piece.type] ?? 0;
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
}

export function getMaterialDeficit(gameState, color = getTurnColor(gameState)) {
  return getMaterial(gameState, opposite(color)) - getMaterial(gameState, color);
}

function canSafelyReturnPiece(gameState, piece) {
  if (!gameState?.chess || !piece?.originalSquare) return true;

  try {
    const test = new Chess(gameState.chess.fen());
    const type = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' }[piece.originalType];
    const color = piece.owner === 'white' ? 'w' : 'b';
    if (!type) return true;
    test.put({ type, color }, piece.originalSquare);
    return !test.isCheckmate();
  } catch {
    // TODO: replace with full game-rule validation for recovered material.
    return true;
  }
}

export function getLegalRecoveryOptions(gameState, color = getTurnColor(gameState)) {
  const pieces = gameState?.pieces ?? [];
  return pieces
    .filter((piece) => {
      if (piece.owner !== color || !piece.isCaptured) return false;
      if (!piece.originalSquare) return false;
      if (pieceAt(pieces, piece.originalSquare)) return false;
      return canSafelyReturnPiece(gameState, piece);
    })
    .sort((a, b) => pieceValue(b) - pieceValue(a));
}

export function scoreRecoveryTarget(target, gameState, profile) {
  const value = pieceValue(target);
  const returnSquareUtility = 0;
  const tacticalRecoveryBonus = 0;
  const queenBias = target?.originalType === 'queen' || target?.type === 'queen' ? (profile.queenBias ?? 0) * 100 : 0;
  const recoveryUtility = recoveredPieceUtility(target, gameState, profile) + returnSquareUtility + tacticalRecoveryBonus + queenBias;

  return {
    target,
    recoveryUtility,
    debug: {
      pieceValue: value,
      returnSquareUtility,
      tacticalRecoveryBonus,
      queenBias,
    },
  };
}

export function chooseBestRecoveryTarget(gameState, color = getTurnColor(gameState), profile) {
  const scored = getLegalRecoveryOptions(gameState, color).map((target) => scoreRecoveryTarget(target, gameState, profile));
  scored.sort((a, b) => b.recoveryUtility - a.recoveryUtility);
  return scored[0] ?? null;
}

export function estimateRecoveryUtility(target, gameState, profile = {}) {
  if (Array.isArray(target)) {
    return target.reduce((sum, piece) => sum + scoreRecoveryTarget(piece, gameState, profile).recoveryUtility, 0);
  }
  return scoreRecoveryTarget(target, gameState, profile).recoveryUtility;
}

export function chooseRecoveryTarget(gameState, color = getTurnColor(gameState), profile = {}) {
  return chooseBestRecoveryTarget(gameState, color, profile)?.target ?? null;
}
