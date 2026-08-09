import { Chess } from 'chess.js';
import { getTurnColor, opposite, pieceAt, pieceValue } from './chooseRecoveryTarget.js';

function fenWithTurn(fen, color) {
  const parts = fen.split(' ');
  parts[1] = color === 'white' ? 'w' : 'b';
  parts[3] = '-';
  return parts.join(' ');
}

export function estimateOpponentThreatPenalty(gameState, color = getTurnColor(gameState), profile = {}) {
  if (!gameState?.chess?.fen) return 0;

  try {
    const opponent = opposite(color);
    const chess = new Chess(fenWithTurn(gameState.chess.fen(), opponent));
    const moves = chess.moves({ verbose: true });
    let opponentThreatScore = 0;

    for (const move of moves) {
      if (move.san?.includes('#')) {
        opponentThreatScore = Math.max(opponentThreatScore, 1000);
        continue;
      }

      if (move.san?.includes('+')) {
        opponentThreatScore = Math.max(opponentThreatScore, 2);
      }

      const capturedPiece = move.captured
        ? { type: { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }[move.captured] }
        : pieceAt(gameState.pieces, move.to);
      const capturedValue = pieceValue(capturedPiece);
      if (Number.isFinite(capturedValue) && capturedValue > 0) {
        opponentThreatScore = Math.max(opponentThreatScore, Math.min(9, capturedValue));
      }
    }

    return opponentThreatScore * (profile.opponentThreatAwareness ?? 1);
  } catch {
    // Future extension: use the app's full move generator when it is exposed outside App.jsx.
    return 0;
  }
}
