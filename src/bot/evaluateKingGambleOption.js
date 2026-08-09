import { getBlackjackOdds } from '../blackjack/blackjackOdds.js';
import { materialDeficitCentipawns, pieceSimpleValue } from '../rules/materialValues.js';
import { desperationBonus } from './desperation.js';
import { recoveredPieceUtility } from './evaluateRecoveryTarget.js';
import { getLegalRecoveryOptions, getTurnColor, opposite } from './chooseRecoveryTarget.js';

function unavailable(reason, debug = {}) {
  return {
    available: false,
    score: -Infinity,
    ev: -Infinity,
    adjustedEV: -Infinity,
    reason,
    debug,
  };
}

function isInCheck(gameState, color) {
  if (!gameState?.chess?.fen) return false;
  try {
    const fen = gameState.chess.fen().split(' ');
    fen[1] = color === 'black' ? 'b' : 'w';
    return new gameState.chess.constructor(fen.join(' ')).isCheck();
  } catch {
    return Boolean(gameState?.chess?.isCheck?.());
  }
}

function isLoneKing(gameState, color) {
  const active = (gameState?.pieces ?? []).filter((piece) => piece.owner === color && !piece.isCaptured);
  return active.length === 1 && active[0]?.type === 'king';
}

function chooseTargetsForBudget(gameState, color, budget, profile) {
  const targets = getLegalRecoveryOptions(gameState, color)
    .filter((piece) => pieceSimpleValue(piece) <= budget)
    .map((piece) => ({
      piece,
      utility: recoveredPieceUtility(piece, gameState, profile),
      value: pieceSimpleValue(piece),
    }))
    .sort((a, b) => b.utility - a.utility);

  const chosen = [];
  let used = 0;
  for (const target of targets) {
    if (used + target.value <= budget) {
      chosen.push(target.piece);
      used += target.value;
    }
  }
  return chosen;
}

export function evaluateKingGambleOption(gameState, profile) {
  const color = getTurnColor(gameState);
  const budget = 2;

  if (gameState?.status && gameState.status !== 'active') return unavailable('game is not active');
  if (!isLoneKing(gameState, color)) return unavailable('not lone king');
  if (isInCheck(gameState, color)) return unavailable('cannot king gamble while in check');
  if (gameState?.kingGamble?.cooldown?.[color]) return unavailable('king gamble cooldown is active');

  const targetPieces = chooseTargetsForBudget(gameState, color, budget, profile);
  if (!targetPieces.length) return unavailable('no king gamble recovery targets');

  const odds = getBlackjackOdds(profile);
  const materialDeficitCp = materialDeficitCentipawns(gameState?.pieces, color, opposite);
  const recoveryUtility = targetPieces.reduce((sum, piece) => sum + recoveredPieceUtility(piece, gameState, profile), 0);
  const kingRiskPenalty = 250 + 400 * (profile.skill ?? 0);
  const materialPressure = Math.max(0, materialDeficitCp) * (profile.blackjackRiskTolerance ?? 0);
  const desperation = desperationBonus(materialDeficitCp, profile);
  const cooldownPenalty = 0;

  const ev =
    odds.winRate * recoveryUtility +
    odds.tieRate * -20 -
    odds.lossRate * kingRiskPenalty +
    materialPressure +
    desperation -
    cooldownPenalty +
    (profile.kingGambleBias ?? 0);

  return {
    available: true,
    mode: 'king',
    score: ev,
    ev,
    adjustedEV: ev,
    targetPieces,
    budget,
    odds,
    debug: {
      winRate: odds.winRate,
      lossRate: odds.lossRate,
      tieRate: odds.tieRate,
      recoveryUtility,
      kingRiskPenalty,
      materialPressure,
      desperationBonus: desperation,
      cooldownPenalty,
      materialDeficitCentipawns: materialDeficitCp,
    },
  };
}
