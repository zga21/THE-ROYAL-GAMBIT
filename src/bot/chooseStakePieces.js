import { getTurnColor, pieceValue } from './chooseRecoveryTarget.js';
import { canStakePieceWithoutExposingKing } from '../rules/stakeSafety.js';
import { lostStakeUtility } from './evaluateStakeSet.js';

export function getLegalStakePieces(gameState, color = getTurnColor(gameState)) {
  return (gameState?.pieces ?? [])
    .filter(
      (piece) =>
        piece.owner === color &&
        !piece.isCaptured &&
        piece.currentSquare &&
        piece.type !== 'king' &&
        canStakePieceWithoutExposingKing(gameState, piece, color),
    )
    .sort((a, b) => pieceValue(a) - pieceValue(b));
}

export function generateStakeCombinations(pieces, targetValue, maxCombos = 600) {
  const sorted = [...pieces].sort((a, b) => pieceValue(a) - pieceValue(b));
  const combinations = [];

  function walk(index, combo, total) {
    if (combinations.length >= maxCombos) return;
    if (total >= targetValue && combo.length) {
      combinations.push({ pieces: combo, totalValue: total });
      return;
    }

    for (let i = index; i < sorted.length; i += 1) {
      walk(i + 1, [...combo, sorted[i]], total + pieceValue(sorted[i]));
    }
  }

  walk(0, [], 0);
  return combinations.sort((a, b) => a.totalValue - b.totalValue || a.pieces.length - b.pieces.length);
}

export function estimateStakeCost(stake, gameState, profile = {}) {
  const pieces = Array.isArray(stake) ? stake : stake?.pieces ?? [];
  const stakeMaterialValue = pieces.reduce((sum, piece) => sum + pieceValue(piece), 0);
  const stakePositionalImportance = 0;
  // TODO: add king defender, active piece, passed pawn, and attacking piece penalties.
  return {
    stakeCost: lostStakeUtility(pieces, gameState, profile) + stakePositionalImportance,
    debug: {
      stakeMaterialValue,
      stakeMaterialCentipawns: stakeMaterialValue * 100,
      stakePositionalImportance,
    },
  };
}

export function chooseBestStakeForTarget(gameState, color = getTurnColor(gameState), target, profile) {
  const targetValue = pieceValue(target);
  const combinations = generateStakeCombinations(getLegalStakePieces(gameState, color), targetValue);
  if (!combinations.length) return null;

  const scored = combinations.map((combo) => {
    const cost = estimateStakeCost(combo.pieces, gameState, profile);
    return {
      pieces: combo.pieces,
      totalValue: combo.totalValue,
      stakeCost: cost.stakeCost,
      debug: cost.debug,
    };
  });

  scored.sort((a, b) => a.stakeCost - b.stakeCost || a.totalValue - b.totalValue);
  return scored[0] ?? null;
}

export function getLegalStakeOptions(gameState, color = getTurnColor(gameState), targetValue = 0) {
  return generateStakeCombinations(getLegalStakePieces(gameState, color), targetValue).map((combo) => ({
    pieces: combo.pieces,
    value: combo.totalValue,
  }));
}

export function chooseStakePieces(gameState, color = getTurnColor(gameState), targetValue = 0) {
  return getLegalStakeOptions(gameState, color, targetValue)[0]?.pieces ?? [];
}
