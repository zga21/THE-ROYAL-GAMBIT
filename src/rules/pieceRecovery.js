export const RECOVERY_VALUES = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: Infinity,
};

export function recoveryValue(piece) {
  return RECOVERY_VALUES[piece?.originalType ?? piece?.type] ?? 0;
}

export function pieceAt(pieces, square) {
  return pieces.find((piece) => piece.currentSquare === square && !piece.isCaptured);
}

export function canRecoverPiece(pieces, piece, owner = piece?.owner) {
  if (!piece || piece.owner !== owner || !piece.isCaptured || !piece.originalSquare) return false;
  if (piece.type === 'king' || piece.originalType === 'king') return false;
  return !pieceAt(pieces, piece.originalSquare);
}

export function recoverPieceToOriginalSquare(pieces, pieceId) {
  return pieces.map((piece) => {
    if (piece.id !== pieceId) return { ...piece };

    return {
      ...piece,
      isCaptured: false,
      currentSquare: piece.originalSquare,
      type: piece.originalType ?? piece.type,
      isPromoted: false,
    };
  });
}
