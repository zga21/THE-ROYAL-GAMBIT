import { pieceCentipawnValue } from '../rules/materialValues.js';

function defendsKing() {
  // TODO: detect piece-specific king defense.
  return false;
}

function defendsQueen() {
  // TODO: detect queen defense and tactical overload.
  return false;
}

function isPinned() {
  // TODO: reuse stake-safety ray checks to grade pinned-but-legal pieces.
  return false;
}

function isTrapped() {
  // TODO: detect trapped/low-mobility pieces.
  return false;
}

export function lostStakeUtility(stakePieces, gameState, profile = {}) {
  return (
    (stakePieces ?? []).reduce((score, piece) => {
      let pieceScore = pieceCentipawnValue(piece);

      if (defendsKing(piece, gameState)) pieceScore += 200;
      if (defendsQueen(piece, gameState)) pieceScore += 80;
      if (isPinned(piece, gameState)) pieceScore += 150;
      if (isTrapped(piece, gameState)) pieceScore -= 40;

      return score + pieceScore;
    }, 0) * (profile.stakeDiscipline ?? profile.stakeAwareness ?? 1)
  );
}
