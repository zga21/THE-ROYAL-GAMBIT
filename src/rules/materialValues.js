export const CENTIPAWN_VALUES = {
  pawn: 100,
  knight: 300,
  bishop: 300,
  rook: 500,
  queen: 900,
  king: 10000,
};

export const SIMPLE_PIECE_VALUES = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 100,
};

export function pieceType(piece) {
  return piece?.originalType ?? piece?.type ?? null;
}

export function pieceCentipawnValue(pieceOrType) {
  const type = typeof pieceOrType === 'string' ? pieceOrType : pieceType(pieceOrType);
  return CENTIPAWN_VALUES[type] ?? 0;
}

export function pieceSimpleValue(pieceOrType) {
  const type = typeof pieceOrType === 'string' ? pieceOrType : pieceType(pieceOrType);
  return SIMPLE_PIECE_VALUES[type] ?? 0;
}

export function materialCentipawns(pieces, color) {
  return (pieces ?? [])
    .filter((piece) => piece.owner === color && !piece.isCaptured)
    .reduce((sum, piece) => sum + pieceCentipawnValue(piece), 0);
}

export function materialDeficitCentipawns(pieces, color, oppositeFn) {
  const enemy = oppositeFn(color);
  return materialCentipawns(pieces, enemy) - materialCentipawns(pieces, color);
}
