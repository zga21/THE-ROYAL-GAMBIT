import { getBotProfile } from './botProfiles.js';
import { evaluateBestBlackjackOption } from './evaluateBlackjackOption.js';
import { evaluateBestChessMove } from './evaluateChessMove.js';

const BOT_DEBUG_ENABLED = Boolean(import.meta.env?.DEV && import.meta.env?.VITE_BOT_DEBUG === 'true');

function selectedMoveName(bestChessMove) {
  return bestChessMove.move?.san ?? `${bestChessMove.move?.from ?? '?'}-${bestChessMove.move?.to ?? '?'}`;
}

function recoveryTargetName(target) {
  if (!target) return undefined;
  return target.originalType ?? target.type ?? target.id;
}

export function chooseBotAction(gameState, profileIdOrElo) {
  const profile = getBotProfile(profileIdOrElo);
  const bestChessMove = evaluateBestChessMove(gameState, profile);
  const blackjackOption = evaluateBestBlackjackOption(gameState, profile);
  const blackjackThreshold = profile.blackjackThreshold ?? 0;
  const blackjackScore = blackjackOption.adjustedEV ?? blackjackOption.ev;
  const decisionMargin = blackjackScore - bestChessMove.score - blackjackThreshold;
  const shouldUseBlackjack = blackjackOption.available && decisionMargin > 0;
  const selectedAction = shouldUseBlackjack ? 'blackjack' : 'move';
  const selected = bestChessMove.debug?.selectedMove ?? {};
  const bestRaw = bestChessMove.debug?.bestRawMove ?? {};

  if (BOT_DEBUG_ENABLED) {
    console.table([
      {
        selectedAction,
        elo: profile.approxElo,
        skill: profile.skill,
        chessScore: bestChessMove?.score,
        blackjackBaseEV: blackjackOption?.ev,
        blackjackAdjustedEV: blackjackOption?.adjustedEV,
        blackjackThreshold,
        decisionMargin,
        blackjackAvailable: blackjackOption?.available,
        unavailableReason: blackjackOption?.reason,
        attemptsUsed: blackjackOption?.attemptsUsed,
        attemptsRemaining: blackjackOption?.attemptsRemaining,
        attemptLimit: blackjackOption?.attemptLimit,
        resourceCost: blackjackOption?.resourceCost,
        blackjackResourceDiscipline: profile.blackjackResourceDiscipline,
        blackjackScarcityExponent: profile.blackjackScarcityExponent,
        blackjackRemainingAwareness: profile.blackjackRemainingAwareness,
        blackjackSims: profile.blackjackSims,
        blackjackStrategy: profile.blackjackStrategy,
        winRate: blackjackOption?.odds?.winRate,
        lossRate: blackjackOption?.odds?.lossRate,
        tieRate: blackjackOption?.odds?.tieRate,
        recoveryTarget: recoveryTargetName(blackjackOption?.target),
        recoveryUtility: blackjackOption?.debug?.recoveryUtility,
        stakeValue: blackjackOption?.stake?.totalValue,
        stakeCost: blackjackOption?.debug?.stakeCost,
        skipTurnCost: blackjackOption?.debug?.skipTurnCost,
        opponentThreatPenalty: blackjackOption?.debug?.opponentThreatPenalty,
        deficitPressure: blackjackOption?.debug?.deficitPressure,
        blackjackUseBias: blackjackOption?.debug?.blackjackUseBias,
        selectedMove: selectedMoveName(bestChessMove),
        bestRawMove: bestRaw.move?.san ?? `${bestRaw.move?.from ?? '?'}-${bestRaw.move?.to ?? '?'}`,
        finalScore: selected.totalScore,
        materialScore: selected.materialScore,
        netCaptureValue: selected.netCaptureValue,
        recaptureRisk: selected.recaptureRisk,
        opponentReplyPenalty: selected.opponentReplyPenalty,
        opponentBestReplyValue: selected.opponentBestReplyValue,
        hangingPenalty: selected.hangingPenalty,
        givesCheck: selected.givesCheck,
        givesCheckmate: selected.givesCheckmate,
        allowsMateInOne: selected.allowsMateInOne,
        temperature: bestChessMove.debug?.temperature,
        usedSoftmax: bestChessMove.debug?.usedSoftmax,
      },
    ]);
  }

  if (shouldUseBlackjack) {
    return {
      type: 'blackjack',
      mode: blackjackOption.mode,
      target: blackjackOption.target,
      stake: blackjackOption.stake,
      ev: blackjackOption.ev,
      adjustedEV: blackjackOption.adjustedEV,
      profileId: profile.id,
      debug: {
        profile,
        bestChessMove,
        blackjackOption,
        decisionMargin,
      },
    };
  }

  return {
    type: 'move',
    move: bestChessMove.move,
    score: bestChessMove.score,
    profileId: profile.id,
    debug: {
      profile,
      bestChessMove,
      blackjackOption,
      decisionMargin,
    },
  };
}
