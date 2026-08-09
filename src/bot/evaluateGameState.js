import {
  materialCentipawns,
  materialDeficitCentipawns,
  pieceCentipawnValue,
} from '../rules/materialValues.js';
import { getNormalBlackjackRemaining } from '../rules/blackjackLimits.js';
import { getLegalRecoveryOptions, getTurnColor, opposite } from './chooseRecoveryTarget.js';

function chessWithTurn(gameState, color) {
  if (!gameState?.chess?.fen) return null;
  try {
    const fen = gameState.chess.fen().split(' ');
    fen[1] = color === 'black' ? 'b' : 'w';
    return new gameState.chess.constructor(fen.join(' '));
  } catch {
    return null;
  }
}

export function materialScore(gameState, color, profile = {}) {
  const deficit = materialDeficitCentipawns(gameState?.pieces, color, opposite);
  return -deficit * (profile.materialAwareness ?? 1);
}

export function kingSafetyScore(gameState, color, profile = {}) {
  const own = chessWithTurn(gameState, color);
  const enemy = chessWithTurn(gameState, opposite(color));
  let score = 0;
  if (own?.isCheck?.()) score -= 350;
  if (enemy?.isCheck?.()) score += 120;
  if (own?.isCheckmate?.()) score -= 10000;
  if (enemy?.isCheckmate?.()) score += 10000;
  return score * (profile.kingSafetyAwareness ?? 1);
}

export function mobilityScore(gameState, color, profile = {}) {
  const own = chessWithTurn(gameState, color);
  const enemy = chessWithTurn(gameState, opposite(color));
  const ownMoves = own?.moves?.().length ?? 0;
  const enemyMoves = enemy?.moves?.().length ?? 0;
  return (ownMoves - enemyMoves) * 4 * (profile.mobilityAwareness ?? 1);
}

export function threatScore(gameState, color, profile = {}) {
  const enemy = opposite(color);
  const enemyMoves = chessWithTurn(gameState, enemy)?.moves?.({ verbose: true }) ?? [];
  const ownPieces = gameState?.pieces ?? [];
  const hangingValue = enemyMoves.reduce((sum, move) => {
    const victim = ownPieces.find((piece) => piece.currentSquare === move.to && piece.owner === color && !piece.isCaptured);
    return sum + (victim ? pieceCentipawnValue(victim) * 0.25 : 0);
  }, 0);
  return -hangingValue * (profile.opponentThreatAwareness ?? 1);
}

export function recoveryPotentialScore(gameState, color, profile = {}) {
  const potential = getLegalRecoveryOptions(gameState, color)
    .slice(0, 5)
    .reduce((sum, piece) => sum + pieceCentipawnValue(piece) * 0.08, 0);
  return potential * (profile.recoveryUtilityAwareness ?? 1);
}

export function blackjackResourceScore(gameState, color, profile = {}) {
  return getNormalBlackjackRemaining(gameState, color) * 12 * (profile.blackjackRemainingAwareness ?? 1);
}

export function positionalScore() {
  return 0;
}

export function evaluateGameState(gameState, color = getTurnColor(gameState), profile = {}) {
  return (
    materialScore(gameState, color, profile) +
    kingSafetyScore(gameState, color, profile) +
    mobilityScore(gameState, color, profile) +
    threatScore(gameState, color, profile) +
    recoveryPotentialScore(gameState, color, profile) +
    blackjackResourceScore(gameState, color, profile) +
    positionalScore(gameState, color, profile)
  );
}

export { materialCentipawns };
