import React from 'react';
import { Shield } from 'lucide-react';

function pieceAt(pieces, square) {
  return pieces.find((piece) => piece.currentSquare === square && !piece.isCaptured);
}

export function ChessBoard({
  boardFiles,
  boardRanks,
  boardSquares,
  currentTurn,
  endgameFocusSquare,
  files,
  game,
  onSquareClick,
  pieceGlyphs,
  protectedSquares,
  ranks,
  recoverySquares,
  round,
  royalCinematicActive,
  selectedCastlePartnerSquares,
  selectedKingRecovery,
  selectedMoves,
  selectedSquare,
  selectedTargets,
  stakedSquares,
  kingSpotlightSquare,
}) {
  return (
    <div className={['board-wrap', royalCinematicActive ? 'board-tilted' : ''].join(' ')}>
      <div className="rank-labels" aria-hidden="true">
        {boardRanks.map((rank) => (
          <span key={rank}>{rank}</span>
        ))}
      </div>
      <div className="board" aria-label="Chess board">
        {boardSquares.map((square) => {
          const fileIndex = files.indexOf(square[0]);
          const rankIndex = ranks.indexOf(square[1]);
          const squarePiece = pieceAt(game.pieces, square);
          const isLight = (fileIndex + rankIndex) % 2 === 0;
          const isSelected = selectedSquare === square;
          const canMoveHere = selectedMoves.some((move) => move.to === square);
          const canCastleHere = selectedCastlePartnerSquares.includes(square);
          const protectedHere = protectedSquares.includes(square);
          const stakedHere = stakedSquares.includes(square);
          const recoveryHere = recoverySquares.includes(square);
          const endgameFocusHere = endgameFocusSquare === square;
          const recoveryPiece =
            (round?.targets ?? selectedTargets).find((piece) => piece.originalSquare === square) ??
            selectedKingRecovery.find((piece) => piece.originalSquare === square);
          const kingSpotlightHere = kingSpotlightSquare === square;

          return (
            <button
              type="button"
              key={square}
              className={[
                'square',
                isLight ? 'light' : 'dark',
                isSelected ? 'selected' : '',
                canMoveHere ? 'destination' : '',
                canCastleHere ? 'castle-partner' : '',
                protectedHere ? 'protected' : '',
                stakedHere ? 'staked-square' : '',
                recoveryHere ? 'recovery-square' : '',
                kingSpotlightHere ? 'king-spotlight' : '',
                endgameFocusHere && game.status === 'checkmate' ? 'endgame-king-lost' : '',
                endgameFocusHere && game.status === 'stalemate' ? 'endgame-king-stalemate' : '',
              ].join(' ')}
              onClick={() => onSquareClick(square)}
              aria-label={`${square}${squarePiece ? ` ${squarePiece.owner} ${squarePiece.type}` : ''}`}
            >
              <span className="coord">{square}</span>
              {protectedHere && <Shield size={16} className="shield" aria-hidden="true" />}
              {royalCinematicActive && stakedHere && <span className="square-cinematic-label stake-label">Stake</span>}
              {royalCinematicActive && recoveryHere && (
                <>
                  <span className="square-cinematic-label recovery-label">Recovery</span>
                  <span className="recovery-ghost">
                    {pieceGlyphs[recoveryPiece?.owner ?? currentTurn][recoveryPiece?.originalType ?? 'pawn']}
                  </span>
                </>
              )}
              {squarePiece && (
                <span className={`piece ${squarePiece.owner}`}>
                  {pieceGlyphs[squarePiece.owner][squarePiece.type]}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="file-labels" aria-hidden="true">
        {boardFiles.map((file) => (
          <span key={file}>{file}</span>
        ))}
      </div>
    </div>
  );
}
