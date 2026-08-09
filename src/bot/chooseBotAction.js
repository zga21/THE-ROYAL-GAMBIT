import { getBotProfile } from './botProfiles.js';
import { buildBotAction } from './buildBotAction.js';
import { buildBotDecisionDebug, logBotDecision } from './botDecisionDebug.js';
import { evaluateBestBlackjackOption } from './evaluateBlackjackOption.js';
import { evaluateKingGambleOption } from './evaluateKingGambleOption.js';
import { evaluateBestStockfishMove } from './evaluateStockfishMove.js';
import { stockfishResultToScore } from './normaliseDecisionScores.js';

export async function chooseBotAction(gameState, profileIdOrElo) {
  const profile = getBotProfile(profileIdOrElo);
  const bestChessMove = await evaluateBestStockfishMove(gameState, profile);
  const chessScore = stockfishResultToScore(bestChessMove, profile);
  const blackjackOption = evaluateBestBlackjackOption(gameState, profile);
  const kingGamble = evaluateKingGambleOption(gameState, profile);
  const candidates = [
    {
      type: 'move',
      mode: 'chess',
      score: chessScore,
      payload: { ...bestChessMove, score: chessScore },
    },
  ];

  if (blackjackOption.available) {
    candidates.push({
      type: 'blackjack',
      mode: 'standard',
      score: blackjackOption.adjustedEV ?? blackjackOption.score,
      payload: blackjackOption,
    });
  }

  if (kingGamble.available) {
    candidates.push({
      type: 'blackjack',
      mode: 'king',
      score: kingGamble.adjustedEV ?? kingGamble.score,
      payload: kingGamble,
    });
  }

  const blackjackCandidates = candidates
    .filter((candidate) => candidate.type === 'blackjack')
    .sort((a, b) => b.score - a.score);
  const bestBlackjack = blackjackCandidates[0] ?? null;
  const riskMargin = profile.riskTolerance ?? 0;
  const chosen =
    bestBlackjack && bestBlackjack.score > chessScore + riskMargin
      ? bestBlackjack
      : candidates[0];
  const sortedCandidates = [...candidates].sort((a, b) => b.score - a.score);
  const debug = buildBotDecisionDebug({
    chosen,
    profile,
    chess: { ...bestChessMove, score: chessScore },
    normalBlackjack: blackjackOption,
    kingGamble,
    candidates: sortedCandidates.map(({ type, mode, score }) => ({ type, mode, score })),
  });

  logBotDecision(debug);

  return buildBotAction(chosen, {
    profile,
    debug: {
      ...debug,
      profile,
      bestChessMove,
      normalBlackjack: blackjackOption,
      kingGamble,
      decisionMargin: chosen.score - chessScore,
      riskMargin,
    },
  });
}
