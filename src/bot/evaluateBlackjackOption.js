import { getBlackjackOdds } from '../blackjack/blackjackOdds.js';
import { materialDeficitCentipawns } from '../rules/materialValues.js';
import {
  getNormalBlackjackLimit,
  getNormalBlackjackRemaining,
  getNormalBlackjackUsed,
} from '../rules/blackjackLimits.js';
import { desperationBonus } from './desperation.js';
import { recoveredPieceUtility } from './evaluateRecoveryTarget.js';
import { lostStakeUtility } from './evaluateStakeSet.js';
import {
  getLegalRecoveryOptions,
  getMaterialDeficit,
  getTurnColor,
  scoreRecoveryTarget,
} from './chooseRecoveryTarget.js';
import { chooseBestStakeForTarget } from './chooseStakePieces.js';
import { estimateOpponentThreatPenalty } from './estimateOpponentThreatPenalty.js';
import { estimateSkipTurnCost } from './estimateSkipTurnCost.js';

function isInCheck(gameState) {
  return Boolean(gameState?.chess?.isCheck?.());
}

function cooldownActive(gameState, color) {
  return Boolean(gameState?.kingGamble?.cooldown?.[color]);
}

function unavailable(reason, extra = {}) {
  return {
    available: false,
    ev: -Infinity,
    adjustedEV: -Infinity,
    reason,
    ...extra,
    debug: {
      reason,
      ...extra,
    },
  };
}

export function evaluateBestBlackjackOption(gameState, profile) {
  const color = getTurnColor(gameState);
  const materialDeficit = getMaterialDeficit(gameState, color);
  const materialDeficitCp = materialDeficitCentipawns(gameState?.pieces, color, (side) =>
    side === 'white' ? 'black' : 'white',
  );
  const attemptsRemaining = getNormalBlackjackRemaining(gameState, color);
  const attemptsUsed = getNormalBlackjackUsed(gameState, color);
  const attemptLimit = getNormalBlackjackLimit(gameState, color);

  if (gameState?.status && gameState.status !== 'active') {
    return unavailable('game is not active', { materialDeficit, attemptsRemaining, attemptsUsed, attemptLimit });
  }

  if (attemptsRemaining <= 0) {
    return unavailable('normal blackjack limit reached', {
      materialDeficit,
      attemptsRemaining,
      attemptsUsed,
      attemptLimit,
    });
  }

  if (materialDeficitCp < 500) {
    return unavailable('material deficit below blackjack threshold', {
      materialDeficit,
      attemptsRemaining,
      attemptsUsed,
      attemptLimit,
    });
  }

  if (isInCheck(gameState)) {
    return unavailable('cannot blackjack while in check', {
      materialDeficit,
      inCheck: true,
      attemptsRemaining,
      attemptsUsed,
      attemptLimit,
    });
  }

  if (cooldownActive(gameState, color)) {
    return unavailable('king gamble cooldown is active', {
      materialDeficit,
      cooldown: true,
      attemptsRemaining,
      attemptsUsed,
      attemptLimit,
    });
  }

  const odds = getBlackjackOdds(profile);
  const targets = getLegalRecoveryOptions(gameState, color);

  if (!targets.length) {
    return unavailable('no legal recovery targets', { materialDeficit, odds, attemptsRemaining, attemptsUsed, attemptLimit });
  }

  const skipTurnPenalty = estimateSkipTurnCost(gameState, color, profile) * 100;
  const opponentThreatPenalty = estimateOpponentThreatPenalty(gameState, color, profile) * 100;
  const kingSafetyPenalty = isInCheck(gameState) ? 10000 : 0;
  const deficitPressure = materialDeficitCp * (profile.blackjackRiskTolerance ?? 0);
  const desperation = desperationBonus(materialDeficitCp, profile);
  const blackjackUseBias = profile.blackjackUseBias ?? 0;
  const scarcityRatio = attemptLimit > 0 ? (attemptsUsed + 1) / attemptLimit : 1;
  const resourceCost =
    (profile.blackjackResourceDiscipline ?? 0) *
    Math.pow(scarcityRatio, profile.blackjackScarcityExponent ?? 1) *
    (profile.blackjackRemainingAwareness ?? 1) *
    100;

  let best = null;
  const allOptions = [];

  for (const target of targets) {
    const recovery = scoreRecoveryTarget(target, gameState, profile);
    const stake = chooseBestStakeForTarget(gameState, color, target, profile);

    if (!stake) continue;

    const winValue = recoveredPieceUtility(target, gameState, profile);
    const lossValue = -lostStakeUtility(stake.pieces, gameState, profile);
    const tieValue = -20;
    const baseEV =
      odds.winRate * winValue +
      odds.tieRate * tieValue +
      odds.lossRate * lossValue -
      skipTurnPenalty -
      opponentThreatPenalty -
      kingSafetyPenalty +
      desperation +
      deficitPressure +
      blackjackUseBias;
    const adjustedEV = baseEV - resourceCost;

    const option = {
      available: true,
      mode: 'standard',
      ev: baseEV,
      adjustedEV,
      score: adjustedEV,
      resourceCost,
      target,
      stake,
      odds,
      attemptsRemaining,
      attemptsUsed,
      attemptLimit,
      debug: {
        winValue,
        lossValue,
        tieValue,
        winRate: odds.winRate,
        lossRate: odds.lossRate,
        tieRate: odds.tieRate,
        recoveryUtility: recovery.recoveryUtility,
        recoveryDebug: recovery.debug,
        stakeCost: stake.stakeCost,
        stakeDebug: stake.debug,
        skipTurnCost: skipTurnPenalty,
        skipTurnPenalty,
        opponentThreatPenalty,
        kingSafetyPenalty,
        desperationBonus: desperation,
        deficitPressure,
        blackjackUseBias,
        resourceCost,
        blackjackResourceDiscipline: profile.blackjackResourceDiscipline,
        blackjackScarcityExponent: profile.blackjackScarcityExponent,
        blackjackRemainingAwareness: profile.blackjackRemainingAwareness,
        materialDeficit,
        materialDeficitCentipawns: materialDeficitCp,
      },
    };

    allOptions.push(option);
    if (!best || adjustedEV > best.adjustedEV) best = option;
  }

  if (!best) {
    return unavailable('no valid stake for recovery targets', {
      materialDeficit,
      odds,
      attemptsRemaining,
      attemptsUsed,
      attemptLimit,
    });
  }

  best.debug.allOptions = allOptions;
  return best;
}
