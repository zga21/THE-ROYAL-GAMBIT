import { evaluateBestChessMove } from './evaluateChessMove.js';
import { getStockfishBestMove } from './stockfishEngine.js';

function uciToMoveObject(uci) {
  if (!uci || uci === '(none)') return null;

  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotionLetter = uci.slice(4, 5);
  const promotionMap = {
    q: 'q',
    r: 'r',
    b: 'b',
    n: 'n',
  };

  return {
    from,
    to,
    promotion: promotionMap[promotionLetter],
  };
}

export function ratingToStockfishSettings(rating) {
  const numeric = Number(rating) || 800;

  if (numeric <= 400) return { depth: 2, skillLevel: 0, moveErrorChance: 0.55 };
  if (numeric <= 800) return { depth: 4, skillLevel: 2, moveErrorChance: 0.35 };
  if (numeric <= 1200) return { depth: 6, skillLevel: 5, moveErrorChance: 0.2 };
  if (numeric <= 1600) return { depth: 8, skillLevel: 8, moveErrorChance: 0.1 };
  if (numeric <= 2000) return { depth: 10, skillLevel: 12, moveErrorChance: 0.05 };
  if (numeric <= 2400) return { depth: 13, skillLevel: 16, moveErrorChance: 0.02 };

  return { depth: 16, skillLevel: 20, moveErrorChance: 0 };
}

function fallbackMove(gameState, profile, reason, extra = {}) {
  const fallback = evaluateBestChessMove(gameState, profile);
  return {
    type: 'move',
    ...fallback,
    uci: fallback.move ? `${fallback.move.from}${fallback.move.to}${fallback.move.promotion ?? ''}` : null,
    centipawns: Number.isFinite(fallback.score) ? fallback.score * 100 : null,
    mate: null,
    source: 'heuristic-fallback',
    debug: {
      ...fallback.debug,
      source: 'heuristic-fallback',
      reason,
      ...extra,
    },
  };
}

export async function evaluateBestStockfishMove(gameState, profile) {
  if (gameState.status !== 'active') {
    return {
      move: null,
      score: -Infinity,
      debug: { reason: 'game-over', source: 'stockfish' },
    };
  }

  if (!gameState?.chess?.fen) {
    return fallbackMove(gameState, profile, 'missing-chess-state');
  }

  const settings = ratingToStockfishSettings(profile.approxElo ?? profile.rating);
  const fen = gameState.chess.fen();

  try {
    const stockfishResult = await getStockfishBestMove(fen, settings);
    const uci = typeof stockfishResult === 'string' ? stockfishResult : stockfishResult?.uci ?? stockfishResult?.bestMove;
    const moveObject = uciToMoveObject(uci);

    if (!moveObject) {
      return fallbackMove(gameState, profile, 'no-stockfish-move', { uci });
    }

    const legalMove = gameState.chess.moves({ verbose: true }).find((move) => {
      const sameFrom = move.from === moveObject.from;
      const sameTo = move.to === moveObject.to;
      const samePromotion = !moveObject.promotion || move.promotion === moveObject.promotion;

      return sameFrom && sameTo && samePromotion;
    });

    if (!legalMove) {
      return fallbackMove(gameState, profile, 'stockfish-move-not-legal-in-current-state', {
        uci,
        moveObject,
      });
    }

    return {
      type: 'move',
      move: legalMove,
      uci,
      centipawns: stockfishResult?.centipawns ?? null,
      mate: stockfishResult?.mate ?? null,
      source: 'stockfish',
      score: Number.isFinite(stockfishResult?.centipawns) ? stockfishResult.centipawns : 100,
      debug: {
        source: 'stockfish',
        uci,
        settings,
        legalMove,
        rawStockfish: stockfishResult,
      },
    };
  } catch (error) {
    return fallbackMove(gameState, profile, 'stockfish-error', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
