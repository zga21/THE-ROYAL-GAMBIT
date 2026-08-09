export function positionKey(gameState) {
  const fen = gameState.chess.fen();
  const [board, turn, castling, enPassant] = fen.split(' ');
  const protection = gameState.protection ?? { pieceIds: [], protectedAgainst: null };
  const protectionKey = JSON.stringify({
    pieceIds: [...(protection.pieceIds ?? [])].sort(),
    protectedAgainst: protection.protectedAgainst ?? null,
  });

  return [board, turn, castling, enPassant, protectionKey].join('|');
}

export function createInitialPositionHistory(gameState) {
  const key = positionKey(gameState);

  return {
    entries: [key],
    counts: {
      [key]: 1,
    },
  };
}

export function normalizePositionHistory(history, gameState) {
  if (history?.entries && history?.counts) return history;
  return createInitialPositionHistory(gameState);
}

export function recordPosition(gameState) {
  const history = normalizePositionHistory(gameState.positionHistory, gameState);
  const key = positionKey(gameState);
  const nextCount = (history.counts[key] ?? 0) + 1;

  return {
    ...gameState,
    positionHistory: {
      entries: [...history.entries, key],
      counts: {
        ...history.counts,
        [key]: nextCount,
      },
    },
  };
}

export function getRepetitionCount(gameState) {
  const history = normalizePositionHistory(gameState.positionHistory, gameState);
  return history.counts[positionKey(gameState)] ?? 0;
}

export function isThreefoldRepetition(gameState) {
  return getRepetitionCount(gameState) >= 3;
}

export function applyRepetitionDraw(gameState) {
  if (gameState.status && gameState.status !== 'active') return gameState;
  if (!isThreefoldRepetition(gameState)) return gameState;

  return {
    ...gameState,
    status: 'draw',
    drawReason: 'threefold-repetition',
  };
}

export function recordPositionAndApplyDraw(gameState) {
  return applyRepetitionDraw(recordPosition(gameState));
}
