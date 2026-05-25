import { getTurnColor } from './chooseRecoveryTarget.js';
import {
  estimateCaptureDetails,
  estimateDevelopmentValue,
  estimateForcingValue,
  estimateHangingPenalty,
  estimateKingSafetyChange,
  estimateMaterialGain,
  estimateMobilityChange,
  estimateOpponentReplyPenalty,
  estimateTacticValue,
  isKingInCheck,
  moveGivesCheck,
  moveGivesCheckmate,
  randomBetween,
  randomNoise,
  simulateMove,
} from './chessHeuristics.js';

function legalMovesForState(gameState) {
  const moves = gameState.chess.moves({ verbose: true });
  const protection = gameState.protection ?? { pieceIds: [], protectedAgainst: null };
  if (!protection.pieceIds?.length || getTurnColor(gameState) !== protection.protectedAgainst) return moves;

  const protectedSquares = protection.pieceIds
    .map((id) => gameState.pieces.find((piece) => piece.id === id)?.currentSquare)
    .filter(Boolean);
  return moves.filter((move) => !protectedSquares.includes(move.to));
}

export function evaluateMove(gameState, move, profile) {
  const moverColor = getTurnColor(gameState);
  const simulated = simulateMove(gameState, move);
  const givesCheckmate = moveGivesCheckmate(gameState, move);
  const givesCheck = givesCheckmate || moveGivesCheck(gameState, move);

  if (!simulated || isKingInCheck(simulated, moverColor)) {
    return {
      move,
      totalScore: -100000,
      materialScore: 0,
      netCaptureValue: 0,
      recaptureRisk: 0,
      tacticScore: 0,
      kingSafetyScore: 0,
      developmentScore: 0,
      mobilityScore: 0,
      forcingScore: 0,
      noise: 0,
      blunderPenalty: 0,
      mistakePenalty: 0,
      lookaheadPenalty: 100000,
      opponentReplyPenalty: 100000,
      opponentBestReplyValue: 100000,
      hangingPenalty: 0,
      givesCheck,
      givesCheckmate,
      allowsMateInOne: false,
    };
  }

  if (givesCheckmate) {
    return {
      move,
      totalScore: 100000,
      materialScore: 0,
      netCaptureValue: 0,
      recaptureRisk: 0,
      tacticScore: 0,
      kingSafetyScore: 0,
      developmentScore: 0,
      mobilityScore: 0,
      forcingScore: 100000,
      noise: 0,
      blunderPenalty: 0,
      mistakePenalty: 0,
      lookaheadPenalty: 0,
      opponentReplyPenalty: 0,
      opponentBestReplyValue: 0,
      hangingPenalty: 0,
      givesCheck: true,
      givesCheckmate: true,
      allowsMateInOne: false,
    };
  }

  const { netCaptureValue, recaptureRisk } = estimateCaptureDetails(gameState, move);
  const materialScore = estimateMaterialGain(gameState, move) * profile.materialAwareness;
  const tacticScore = estimateTacticValue(gameState, move) * profile.tacticAwareness;
  const kingSafetyScore = estimateKingSafetyChange(gameState, move) * profile.kingSafetyAwareness;
  const developmentScore = estimateDevelopmentValue(gameState, move) * profile.developmentAwareness;
  const mobilityScore = estimateMobilityChange(gameState, move) * profile.mobilityAwareness;
  const forcingScore = estimateForcingValue(gameState, move, profile);
  const noise = randomNoise(profile.evalNoise);
  const blunderPenalty = Math.random() < profile.blunderChance ? randomBetween(3, 10) : 0;
  const mistakePenalty = Math.random() < profile.mistakeChance ? randomBetween(1, 4) : 0;
  const { opponentBestReplyValue, opponentReplyPenalty, allowsMateInOne } = estimateOpponentReplyPenalty(
    gameState,
    move,
    profile,
  );
  const hangingPenalty = estimateHangingPenalty(gameState, move, profile);
  // The tactical one-ply penalties carry the practical strength; full minimax was too slow in browser bot turns.
  const searchScore = 0;
  const lookaheadPenalty = opponentReplyPenalty + hangingPenalty;

  const totalScore =
    materialScore +
    tacticScore +
    kingSafetyScore +
    developmentScore +
    mobilityScore +
    forcingScore +
    searchScore +
    noise -
    blunderPenalty -
    mistakePenalty -
    lookaheadPenalty;

  return {
    move,
    totalScore,
    materialScore,
    netCaptureValue,
    recaptureRisk,
    tacticScore,
    kingSafetyScore,
    developmentScore,
    mobilityScore,
    forcingScore,
    searchScore,
    noise,
    blunderPenalty,
    mistakePenalty,
    lookaheadPenalty,
    opponentReplyPenalty,
    opponentBestReplyValue,
    hangingPenalty,
    givesCheck,
    givesCheckmate,
    allowsMateInOne,
  };
}

export function chooseMoveSoftmax(scoredMoves, temperature) {
  if (!scoredMoves.length) return null;
  if (temperature <= 0.03) return scoredMoves[0];
  const maxScore = Math.max(...scoredMoves.map((move) => move.totalScore));
  const weights = scoredMoves.map((move) => Math.exp((move.totalScore - maxScore) / temperature));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = Math.random() * totalWeight;

  for (let index = 0; index < scoredMoves.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) return scoredMoves[index];
  }
  return scoredMoves[scoredMoves.length - 1];
}

export function evaluateBestChessMove(gameState, profile) {
  if (gameState.status !== 'active') return { move: null, score: -Infinity, debug: { reason: 'game-over' } };

  const legalMoves = legalMovesForState(gameState);
  if (!legalMoves.length) return { move: null, score: -Infinity, debug: { reason: 'no-legal-moves' } };

  const scoredMoves = legalMoves.map((move) => evaluateMove(gameState, move, profile));

  // Scores are from the bot/side-to-move perspective, so both colors sort descending.
  const sortedMoves = [...scoredMoves].sort((a, b) => b.totalScore - a.totalScore);
  const temperature = Math.max(0.03, 2.5 * (1 - (profile.skill ?? 0)) + 0.05);
  const usedSoftmax = (profile.skill ?? 0) <= 0.85;
  const selectedMove = usedSoftmax ? chooseMoveSoftmax(sortedMoves, temperature) ?? sortedMoves[0] : sortedMoves[0];

  return {
    move: selectedMove.move,
    score: selectedMove.totalScore,
    debug: {
      selectedMove,
      bestRawMove: sortedMoves[0],
      scoredMoves: sortedMoves,
      temperature,
      usedSoftmax,
      profileId: profile.id,
      approxElo: profile.approxElo,
    },
  };
}
