import { canRecoverPiece, recoverPieceToOriginalSquare, recoveryValue } from './pieceRecovery.js';

export { canRecoverPiece, recoverPieceToOriginalSquare, recoveryValue };

export function recoverPiecesToOriginalSquares(pieces, pieceIds) {
  return pieceIds.reduce((nextPieces, pieceId) => recoverPieceToOriginalSquare(nextPieces, pieceId), pieces);
}
