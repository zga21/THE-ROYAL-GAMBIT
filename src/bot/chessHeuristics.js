import { Chess } from 'chess.js';

export const PIECE_VALUES = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 1000,
};

const TYPE_FROM_CHESS = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

const CHESS_FROM_TYPE = {
  pawn: 'p',
  knight: 'n',
  bishop: 'b',
  rook: 'r',
  queen: 'q',
  king: 'k',
};

const CHESS_FROM_COLOR = {
  white: 'w',
  black: 'b',
};

const COLOR_FROM_CHESS = {
  w: 'white',
  b: 'black',
};

function opposite(color) {
  return color === 'white' ? 'black' : 'white';
}

function cloneChess(chess) {
  return new Chess(chess.fen());
}

function fenWithTurn(fen, color) {
  const parts = fen.split(' ');
  parts[1] = CHESS_FROM_COLOR[color];
  parts[3] = '-';
  return parts.join(' ');
}

function pieceAt(pieces, square) {
  return pieces?.find((piece) => piece.currentSquare === square && !piece.isCaptured) ?? null;
}

function pieceValueFromType(type) {
  return PIECE_VALUES[TYPE_FROM_CHESS[type] ?? type] ?? 0;
}

export function getOpponentColor(color) {
  return opposite(color);
}

export function getPieceValue(piece) {
  if (!piece) return 0;
  return PIECE_VALUES[piece.originalType ?? piece.type] ?? pieceValueFromType(piece.type) ?? 0;
}

export function getMovingPiece(gameState, move) {
  return pieceAt(gameState?.pieces ?? [], move.from);
}

export function getCapturedPiece(gameState, move) {
  if (move.captured) {
    return {
      type: TYPE_FROM_CHESS[move.captured] ?? move.captured,
      owner: opposite(COLOR_FROM_CHESS[move.color ?? gameState.chess.turn()]),
    };
  }

  const captureSquare = move.flags?.includes('e') ? `${move.to[0]}${move.from[1]}` : move.to;
  const target = pieceAt(gameState?.pieces ?? [], captureSquare);
  const moverColor = COLOR_FROM_CHESS[move.color ?? gameState.chess.turn()];
  return target?.owner && target.owner !== moverColor ? target : null;
}

function applyMoveToPieces(pieces, move) {
  const nextPieces = pieces.map((piece) => ({ ...piece }));
  const mover = nextPieces.find((piece) => piece.currentSquare === move.from && !piece.isCaptured);
  if (!mover) return nextPieces;

  const captureSquare = move.flags?.includes('e') ? `${move.to[0]}${move.from[1]}` : move.to;
  const captured = nextPieces.find((piece) => piece.currentSquare === captureSquare && !piece.isCaptured);
  if (captured && captured.owner !== mover.owner) {
    captured.isCaptured = true;
    captured.currentSquare = null;
    if (captured.isPromoted) {
      captured.type = captured.originalType;
      captured.isPromoted = false;
    }
  }

  mover.currentSquare = move.to;
  if (move.promotion) {
    mover.type = TYPE_FROM_CHESS[move.promotion];
    mover.isPromoted = true;
  }

  if (move.flags?.includes('k') || move.flags?.includes('q')) {
    const rookMove =
      move.to === 'g1'
        ? ['h1', 'f1']
        : move.to === 'c1'
          ? ['a1', 'd1']
          : move.to === 'g8'
            ? ['h8', 'f8']
            : ['a8', 'd8'];
    const rook = nextPieces.find((piece) => piece.currentSquare === rookMove[0] && !piece.isCaptured);
    if (rook) rook.currentSquare = rookMove[1];
  }

  return nextPieces;
}

export function randomNoise(scale) {
  return (Math.random() - 0.5) * 2 * scale;
}

export function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function simulateMove(gameState, move) {
  const nextChess = cloneChess(gameState.chess);
  const played = nextChess.move(move);
  if (!played) return null;
  return {
    chess: nextChess,
    move: played,
    pieces: applyMoveToPieces(gameState.pieces ?? [], played),
  };
}

export function getLegalMovesForColor(gameState, color) {
  if (!gameState?.chess?.fen) return [];

  try {
    const chess = new Chess(fenWithTurn(gameState.chess.fen(), color));
    return chess.moves({ verbose: true });
  } catch {
    // Future extension: use the app's complete legal move helper when it is extracted from App.jsx.
    return [];
  }
}

export function isKingInCheck(gameState, color) {
  if (!gameState?.chess?.fen) return false;

  try {
    const chess = new Chess(fenWithTurn(gameState.chess.fen(), color));
    return chess.isCheck();
  } catch {
    return false;
  }
}

export function moveGivesCheck(gameState, move) {
  const simulated = simulateMove(gameState, move);
  return Boolean(simulated?.chess.isCheck());
}

export function moveGivesCheckmate(gameState, move) {
  const simulated = simulateMove(gameState, move);
  return Boolean(simulated?.chess.isCheckmate());
}

function opponentCanRecaptureDestination(simulated, moverColor, destination) {
  const mover = pieceAt(simulated.pieces, destination);
  if (!mover || mover.owner !== moverColor) return false;

  return simulated.chess.moves({ verbose: true }).some((reply) => {
    if (reply.to !== destination) return false;
    if (reply.captured) return true;
    const target = pieceAt(simulated.pieces, reply.to);
    return target?.owner === moverColor;
  });
}

export function estimateRecaptureRisk(gameState, move) {
  const moverColor = COLOR_FROM_CHESS[move.color ?? gameState.chess.turn()];
  const movingPiece = getMovingPiece(gameState, move) ?? { type: TYPE_FROM_CHESS[move.piece] ?? move.piece };
  const simulated = simulateMove(gameState, move);
  if (!simulated) return 0;
  return opponentCanRecaptureDestination(simulated, moverColor, move.to) ? getPieceValue(movingPiece) : 0;
}

export function estimateMaterialGain(gameState, move) {
  const capturedPiece = getCapturedPiece(gameState, move);
  const capturedPieceValue = capturedPiece ? getPieceValue(capturedPiece) : 0;
  const recaptureRisk = capturedPieceValue > 0 ? estimateRecaptureRisk(gameState, move) : 0;
  return capturedPieceValue - recaptureRisk;
}

export function estimateCaptureDetails(gameState, move) {
  const capturedPiece = getCapturedPiece(gameState, move);
  const capturedPieceValue = capturedPiece ? getPieceValue(capturedPiece) : 0;
  const recaptureRisk = capturedPieceValue > 0 ? estimateRecaptureRisk(gameState, move) : 0;

  return {
    capturedPiece,
    capturedPieceValue,
    recaptureRisk,
    netCaptureValue: capturedPieceValue - recaptureRisk,
  };
}

export function estimateTacticValue(gameState, move) {
  const simulated = simulateMove(gameState, move);
  if (!simulated) return 0;

  let score = 0;
  if (simulated.chess.isCheck()) score += 0.35;
  if (move.flags?.includes('c') && move.piece !== 'p') score += 0.15;
  return score;
}

export function estimateKingSafetyChange(gameState, move) {
  if (move.flags?.includes('k') || move.flags?.includes('q')) return 0.9;
  if (move.piece === 'k') return -0.2;
  return 0;
}

export function estimateDevelopmentValue(gameState, move) {
  const startingMinorSquares = new Set(['b1', 'g1', 'c1', 'f1', 'b8', 'g8', 'c8', 'f8']);
  if ((move.piece === 'n' || move.piece === 'b') && startingMinorSquares.has(move.from)) return 0.45;
  if (move.flags?.includes('k') || move.flags?.includes('q')) return 0.8;
  if (move.piece === 'p' && ['d', 'e'].includes(move.from[0]) && Math.abs(Number(move.to[1]) - Number(move.from[1])) <= 2) {
    return 0.15;
  }
  if (move.piece === 'q' && (move.from === 'd1' || move.from === 'd8')) return -0.35;
  return 0;
}

export function estimateMobilityChange(gameState, move) {
  const moverColor = COLOR_FROM_CHESS[move.color ?? gameState.chess.turn()];
  const before = gameState.chess.moves({ verbose: true }).length;
  const simulated = simulateMove(gameState, move);
  if (!simulated) return 0;

  try {
    const ownTurnChess = new Chess(fenWithTurn(simulated.chess.fen(), moverColor));
    return (ownTurnChess.moves().length - before) / 20;
  } catch {
    return 0;
  }
}

export function estimateForcingValue(gameState, move, profile) {
  const simulated = simulateMove(gameState, move);
  if (!simulated) return 0;
  if (simulated.chess.isCheckmate()) return 1000;

  let score = simulated.chess.isCheck() ? 0.6 : 0;
  if (move.promotion) score += pieceValueFromType(move.promotion) - PIECE_VALUES.pawn;
  return score * (0.75 + profile.skill * 0.25);
}

function attackedPieceAfterMove(simulated, reply, moverColor) {
  if (reply.captured) {
    return { type: TYPE_FROM_CHESS[reply.captured] ?? reply.captured, owner: moverColor };
  }
  const target = pieceAt(simulated.pieces, reply.to);
  return target?.owner === moverColor ? target : null;
}

function replyGivesCheckOrMate(chess, reply) {
  const next = cloneChess(chess);
  next.move(reply);
  return {
    givesCheck: next.isCheck(),
    givesCheckmate: next.isCheckmate(),
  };
}

export function estimateOpponentBestReplyValue(simulated, moverColor) {
  const replies = simulated.chess.moves({ verbose: true });
  let best = 0;
  for (const reply of replies) {
    const attackedPiece = attackedPieceAfterMove(simulated, reply, moverColor);
    const materialGain = getPieceValue(attackedPiece);
    const { givesCheck, givesCheckmate } = replyGivesCheckOrMate(simulated.chess, reply);
    const checkBonus = givesCheck ? 1.5 : 0;
    const mateBonus = givesCheckmate ? 100000 : 0;
    const highValueAttackBonus = materialGain >= 3 ? materialGain * 0.5 : 0;
    best = Math.max(best, materialGain + checkBonus + mateBonus + highValueAttackBonus);
  }
  return best;
}

export function estimateOpponentReplyPenalty(gameState, move, profile) {
  if (profile.searchDepth < 2) return { opponentBestReplyValue: 0, opponentReplyPenalty: 0, allowsMateInOne: false };

  const moverColor = COLOR_FROM_CHESS[move.color ?? gameState.chess.turn()];
  const simulated = simulateMove(gameState, move);
  if (!simulated) return { opponentBestReplyValue: 100000, opponentReplyPenalty: 100000, allowsMateInOne: true };

  const opponentBestReplyValue = estimateOpponentBestReplyValue(simulated, moverColor);
  const allowsMateInOne = opponentBestReplyValue >= 100000;
  const matePenalty = allowsMateInOne && profile.searchDepth >= 4 ? 50000 * profile.skill : 0;
  return {
    opponentBestReplyValue,
    opponentReplyPenalty: opponentBestReplyValue * profile.skill + matePenalty,
    allowsMateInOne,
  };
}

export function estimateHangingPenalty(gameState, move, profile) {
  if (profile.searchDepth < 3) return 0;

  const moverColor = COLOR_FROM_CHESS[move.color ?? gameState.chess.turn()];
  const simulated = simulateMove(gameState, move);
  if (!simulated) return 100000;
  const opponent = opposite(moverColor);
  let opponentTurn;
  try {
    opponentTurn = new Chess(fenWithTurn(simulated.chess.fen(), opponent));
  } catch {
    return 0;
  }

  const attackedSquares = new Set(opponentTurn.moves({ verbose: true }).map((reply) => reply.to));
  return simulated.pieces
    .filter((piece) => piece.owner === moverColor && !piece.isCaptured && attackedSquares.has(piece.currentSquare))
    .reduce((sum, piece) => sum + getPieceValue(piece) * 1.2 * profile.skill, 0);
}

function opponentCanCheck(simulated) {
  return simulated.chess.moves({ verbose: true }).some((reply) => {
    const next = cloneChess(simulated.chess);
    next.move(reply);
    return next.isCheck();
  });
}

function opponentCanMate(simulated) {
  return simulated.chess.moves({ verbose: true }).some((reply) => {
    const next = cloneChess(simulated.chess);
    next.move(reply);
    return next.isCheckmate();
  });
}

export function estimateLookaheadPenalty(gameState, move, profile) {
  if (profile.searchDepth < 2) return 0;

  const moverColor = COLOR_FROM_CHESS[move.color ?? gameState.chess.turn()];
  const simulated = simulateMove(gameState, move);
  if (!simulated) return 0;

  let penalty = estimateOpponentBestReplyValue(simulated, moverColor) * profile.skill;
  if (profile.searchDepth >= 3) penalty += estimateHangingPenalty(gameState, move, profile);
  if (profile.searchDepth >= 4 && opponentCanCheck(simulated)) penalty += 0.7 * profile.skill;
  if (profile.searchDepth >= 5 && opponentCanMate(simulated)) penalty += 1000;
  return penalty;
}

function materialFromChess(chess, color) {
  return chess
    .board()
    .flat()
    .filter((piece) => piece?.color === CHESS_FROM_COLOR[color])
    .reduce((sum, piece) => sum + pieceValueFromType(piece.type), 0);
}

function evaluateBoard(chess, color) {
  if (chess.isCheckmate()) return COLOR_FROM_CHESS[chess.turn()] === color ? -100000 : 100000;
  if (chess.isDraw() || chess.isStalemate()) return 0;

  const materialBalance = materialFromChess(chess, color) - materialFromChess(chess, opposite(color));
  const mobility = new Chess(fenWithTurn(chess.fen(), color)).moves().length * 0.03;
  const opponentMobility = new Chess(fenWithTurn(chess.fen(), opposite(color))).moves().length * 0.03;
  const kingSafety = new Chess(fenWithTurn(chess.fen(), color)).isCheck() ? -1.5 : 0;
  const checkThreat = new Chess(fenWithTurn(chess.fen(), opposite(color))).isCheck() ? 1.5 : 0;

  return materialBalance + mobility - opponentMobility + kingSafety + checkThreat;
}

export function minimax(gameState, depth, color, profile, alpha = -Infinity, beta = Infinity) {
  const chess = gameState.chess;
  if (depth <= 0 || chess.isGameOver()) return evaluateBoard(chess, color);

  const side = COLOR_FROM_CHESS[chess.turn()];
  const maximizing = side === color;
  const moves = chess.moves({ verbose: true });
  let best = maximizing ? -Infinity : Infinity;

  for (const move of moves) {
    const next = cloneChess(chess);
    next.move(move);
    const score = minimax({ ...gameState, chess: next }, depth - 1, color, profile, alpha, beta);

    if (maximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, best);
    }

    if (beta <= alpha) break;
  }

  return best;
}
