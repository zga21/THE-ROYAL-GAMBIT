import { Chess } from 'chess.js';

const CHESS_FROM_COLOR = {
  white: 'w',
  black: 'b',
};

function fenWithTurn(fen, color) {
  const parts = fen.split(' ');
  parts[1] = CHESS_FROM_COLOR[color];
  parts[3] = '-';
  return parts.join(' ');
}

export function canStakePieceWithoutExposingKing(gameState, piece, color = piece?.owner) {
  if (!gameState?.chess?.fen || !piece?.currentSquare || piece.owner !== color || piece.type === 'king') return false;

  try {
    const simulation = new Chess(gameState.chess.fen());
    simulation.remove(piece.currentSquare);
    const ownTurn = new Chess(fenWithTurn(simulation.fen(), color));
    return !ownTurn.isCheck();
  } catch {
    return false;
  }
}

export function areStakePiecesKingSafe(gameState, pieces, color) {
  return pieces.every((piece) => canStakePieceWithoutExposingKing(gameState, piece, color));
}
