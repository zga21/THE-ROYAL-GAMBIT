import React from 'react';
import { BadgeAlert, CircleDot, Copy, Crown, Link, Spade, Swords } from 'lucide-react';
import { canStakePieceWithoutExposingKing } from '../rules/stakeSafety.js';

function ModePanel({
  botRating,
  botRatings,
  confirmBotRating,
  copyFriendLink,
  copyLinkToClipboard,
  friendOrigin,
  labelColor,
  pendingBotRating,
  playMode,
  playerColor,
  roomPlayers,
  roomStatus,
  setPendingBotRating,
  shareLink,
}) {
  return (
    <div className="mode-panel">
      {playMode === 'bot' ? (
        <>
          <div className="select-row">
            <label htmlFor="bot-rating">Bot strength</label>
            <div className="bot-rating-controls">
              <select
                id="bot-rating"
                value={pendingBotRating}
                onChange={(event) => setPendingBotRating(Number(event.target.value))}
              >
                {botRatings.map((rating) => (
                  <option key={rating} value={rating}>
                    {rating}
                  </option>
                ))}
              </select>
              <button type="button" className="rating-confirm-button" onClick={confirmBotRating}>
                Confirm
              </button>
            </div>
          </div>
          <p className="small-copy">Active bot: {botRating}. Confirming a rating starts a fresh board.</p>
        </>
      ) : (
        <>
          <p className="room-status">
            Room server: {roomStatus === 'connected' ? 'connected' : friendOrigin ? 'ready' : 'offline'}
            {playerColor ? ` | You are ${labelColor(playerColor)}` : ''}
            {roomPlayers ? ` | Players ${Math.min(roomPlayers, 2)}/2` : ''}
          </p>
          <button type="button" className="link-button" onClick={copyFriendLink}>
            <Link size={16} aria-hidden="true" />
            Create friend link
          </button>
          {shareLink && (
            <>
              <div className="share-box">
                <Copy size={15} aria-hidden="true" />
                <span>{shareLink}</span>
              </div>
              <button type="button" className="copy-link-button" onClick={() => copyLinkToClipboard(shareLink)}>
                <Copy size={16} aria-hidden="true" />
                Copy link
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

function StatusPanel(props) {
  const {
    blackjackAvailable,
    botRating,
    botRatings,
    confirmBotRating,
    copyFriendLink,
    copyLinkToClipboard,
    currentTurn,
    deficit,
    friendOrigin,
    game,
    labelColor,
    material,
    message,
    pendingBotRating,
    playMode,
    playerColor,
    playerInCheck,
    roomPlayers,
    roomStatus,
    setPendingBotRating,
    shareLink,
  } = props;

  return (
    <section className="status-panel">
      <div className="status-line">
        <CircleDot size={18} aria-hidden="true" />
        <strong>{message}</strong>
      </div>
      <div className="metrics">
        <div>
          <span>Turn</span>
          <strong>{labelColor(currentTurn)}</strong>
        </div>
        <div>
          <span>White</span>
          <strong>{material.white}</strong>
        </div>
        <div>
          <span>Black</span>
          <strong>{material.black}</strong>
        </div>
        <div>
          <span>Deficit</span>
          <strong>{Math.max(0, deficit)}</strong>
        </div>
      </div>
      {blackjackAvailable && (
        <div className="blackjack-available">
          <Spade size={16} aria-hidden="true" />
          <strong>Blackjack Available</strong>
          <span>Down 5+ Material</span>
        </div>
      )}
      <ModePanel
        botRating={botRating}
        botRatings={botRatings}
        confirmBotRating={confirmBotRating}
        copyFriendLink={copyFriendLink}
        copyLinkToClipboard={copyLinkToClipboard}
        friendOrigin={friendOrigin}
        labelColor={labelColor}
        pendingBotRating={pendingBotRating}
        playMode={playMode}
        playerColor={playerColor}
        roomPlayers={roomPlayers}
        roomStatus={roomStatus}
        setPendingBotRating={setPendingBotRating}
        shareLink={shareLink}
      />
      {game.status !== 'active' && (
        <p className="notice">
          <BadgeAlert size={16} aria-hidden="true" />
          {game.drawReason === 'threefold-repetition'
            ? 'Draw by threefold repetition.'
            : `Game status: ${game.status}.`}
        </p>
      )}
      {playerInCheck && game.status === 'active' && (
        <p className="notice">
          <BadgeAlert size={16} aria-hidden="true" />
          Blackjack is locked while the king is in check.
        </p>
      )}
    </section>
  );
}

function BlackjackRecoveryPanel({
  beginRound,
  blackjackBaseAllowed,
  blackjackCooldownActive,
  canAct,
  capturedTargets,
  currentActivePieces,
  currentTurn,
  deficit,
  game,
  kingChallengeReady,
  kingRecoveryPieces,
  kingRecoveryValue,
  labelColor,
  loneKingMode,
  normalBlackjackBaseAllowed,
  normalBlackjackLimit,
  normalBlackjackLimitAvailable,
  normalBlackjackRemaining,
  normalBlackjackUsed,
  openKingGamble,
  pieceGlyphs,
  pieceValues,
  playerInCheck,
  recoveryValue,
  round,
  selectedKingRecoveryIds,
  selectedStakeIds,
  selectedTargetIds,
  selectedTargets,
  stakeTotal,
  standardChallengeReady,
  targetValue,
  toggleKingRecovery,
  toggleStake,
  toggleTarget,
  isLiveRoom,
}) {
  return (
    <section className="challenge-panel">
      <div className="panel-heading">
        <Swords size={18} aria-hidden="true" />
        <h2>Blackjack Recovery</h2>
      </div>
      <p className="small-copy">
        When behind by 5 or more, recover one or many captured pieces by matching their total value exactly.
      </p>
      <div className="usage-meter">
        <span>{labelColor(currentTurn)} normal blackjack attempts</span>
        <strong>
          {normalBlackjackRemaining} / {normalBlackjackLimit}
        </strong>
        <small>Used {normalBlackjackUsed}</small>
      </div>

      {(!blackjackBaseAllowed || (!loneKingMode && !normalBlackjackLimitAvailable)) && (
        <div className="disabled-reason">
          {game.status !== 'active'
            ? 'The game is over.'
            : playerInCheck
              ? 'Your king is in check.'
              : blackjackCooldownActive
                ? 'Move the king one square before another blackjack.'
                : !loneKingMode && !normalBlackjackLimitAvailable
                  ? 'Normal blackjack limit reached.'
                  : isLiveRoom && !canAct
                    ? `Waiting for ${labelColor(currentTurn)} to move.`
                    : `Need a deficit of at least 5. Current deficit: ${Math.max(0, deficit)}.`}
        </div>
      )}

      <div className="target-list">
        <h3>Captured pieces</h3>
        {capturedTargets.length ? (
          capturedTargets.map((piece) => (
            <button
              type="button"
              key={piece.id}
              className={selectedTargetIds.includes(piece.id) ? 'selected-row' : ''}
              onClick={() => toggleTarget(piece.id)}
              disabled={!normalBlackjackBaseAllowed || loneKingMode}
            >
              <span>{pieceGlyphs[piece.owner][piece.originalType]}</span>
              <strong>{piece.originalType}</strong>
              <em>{piece.originalSquare}</em>
              <b>{recoveryValue(piece)}</b>
            </button>
          ))
        ) : (
          <p className="empty">No recoverable captured pieces.</p>
        )}
      </div>

      {!loneKingMode && (
        <div className="stake-list">
          <h3>Stake active pieces</h3>
          <div className="stake-grid">
            {currentActivePieces
              .filter((piece) => piece.type !== 'king')
              .map((piece) => {
                const stakeIsKingSafe = canStakePieceWithoutExposingKing(game, piece, currentTurn);
                return (
                  <button
                    type="button"
                    key={piece.id}
                    className={selectedStakeIds.includes(piece.id) ? 'selected-row' : ''}
                    onClick={() => toggleStake(piece.id)}
                    disabled={!normalBlackjackBaseAllowed || !selectedTargets.length || !stakeIsKingSafe}
                    title={!stakeIsKingSafe ? 'Pinned piece: staking it would expose your king.' : undefined}
                  >
                    <span>{pieceGlyphs[piece.owner][piece.type]}</span>
                    <small>{piece.currentSquare}</small>
                    <b>{pieceValues[piece.type]}</b>
                  </button>
                );
              })}
          </div>
          <div className="stake-total">
            <span>Stake {stakeTotal}</span>
            <span>Recovery {targetValue}</span>
          </div>
          <button
            type="button"
            className="primary full"
            disabled={!standardChallengeReady || Boolean(round)}
            onClick={() => beginRound('standard')}
          >
            Start challenge
          </button>
        </div>
      )}

      {loneKingMode && (
        <div className="stake-list">
          <div className="lone-king-title">
            <Crown size={18} aria-hidden="true" />
            <h3>Lone-king blackjack</h3>
          </div>
          <p className="small-copy">
            Risk the crown. Each win adds 2 recovery points; a loss passes the turn. Only checkmate ends the crown.
          </p>
          <div className="stake-grid">
            {kingRecoveryPieces.map((piece) => (
              <button
                type="button"
                key={piece.id}
                className={selectedKingRecoveryIds.includes(piece.id) ? 'selected-row' : ''}
                onClick={() => toggleKingRecovery(piece.id)}
                disabled={!blackjackBaseAllowed}
              >
                <span>{pieceGlyphs[piece.owner][piece.originalType]}</span>
                <small>{piece.originalSquare}</small>
                <b>{recoveryValue(piece)}</b>
              </button>
            ))}
          </div>
          <div className="stake-total">
            <span>King staked</span>
            <span>Opening claim {kingRecoveryValue}/2</span>
          </div>
          <button
            type="button"
            className="primary full"
            disabled={!kingChallengeReady || Boolean(round)}
            onClick={openKingGamble}
          >
            The King's Gamble
          </button>
        </div>
      )}
    </section>
  );
}

export function SidePanel({
  BlackjackTableComponent,
  actionsLocked,
  beginRound,
  blackjackAvailable,
  blackjackBaseAllowed,
  blackjackCooldownActive,
  botColor,
  botRating,
  botRatings,
  canAct,
  canControlRound,
  capturedTargets,
  closeResolvedRound,
  confirmBotRating,
  copyFriendLink,
  copyLinkToClipboard,
  currentActivePieces,
  currentTurn,
  deficit,
  friendOrigin,
  game,
  hit,
  isLiveRoom,
  kingChallengeReady,
  kingGambleDecision,
  kingRecoveryPieces,
  kingRecoveryValue,
  labelColor,
  loneKingMode,
  material,
  message,
  normalBlackjackBaseAllowed,
  normalBlackjackLimit,
  normalBlackjackLimitAvailable,
  normalBlackjackRemaining,
  normalBlackjackUsed,
  openKingGamble,
  pendingBotRating,
  pieceGlyphs,
  pieceValues,
  playMode,
  playerColor,
  playerInCheck,
  recoveryValue,
  roomPlayers,
  roomStatus,
  round,
  royalCinematicActive,
  selectedKingRecoveryIds,
  selectedStakeIds,
  selectedTargetIds,
  selectedTargets,
  setPendingBotRating,
  shareLink,
  stakeTotal,
  stand,
  standardChallengeReady,
  targetValue,
  toggleKingRecovery,
  toggleStake,
  toggleTarget,
}) {
  return (
    <aside className="side-panel">
      <StatusPanel
        blackjackAvailable={blackjackAvailable}
        botRating={botRating}
        botRatings={botRatings}
        confirmBotRating={confirmBotRating}
        copyFriendLink={copyFriendLink}
        copyLinkToClipboard={copyLinkToClipboard}
        currentTurn={currentTurn}
        deficit={deficit}
        friendOrigin={friendOrigin}
        game={game}
        labelColor={labelColor}
        material={material}
        message={message}
        pendingBotRating={pendingBotRating}
        playMode={playMode}
        playerColor={playerColor}
        playerInCheck={playerInCheck}
        roomPlayers={roomPlayers}
        roomStatus={roomStatus}
        setPendingBotRating={setPendingBotRating}
        shareLink={shareLink}
      />

      {round && (
        <BlackjackTableComponent
          round={round}
          onHit={hit}
          onStand={stand}
          onClose={closeResolvedRound}
          isAutoPlayer={playMode === 'bot' && round.player === botColor}
          actionsLocked={actionsLocked ?? !canControlRound}
          lockedLabel={`Waiting for ${labelColor(round.player)} to play blackjack.`}
          cinematicActive={royalCinematicActive}
        />
      )}

      {!kingGambleDecision && (
        <BlackjackRecoveryPanel
          beginRound={beginRound}
          blackjackBaseAllowed={blackjackBaseAllowed}
          blackjackCooldownActive={blackjackCooldownActive}
          canAct={canAct}
          capturedTargets={capturedTargets}
          currentActivePieces={currentActivePieces}
          currentTurn={currentTurn}
          deficit={deficit}
          game={game}
          isLiveRoom={isLiveRoom}
          kingChallengeReady={kingChallengeReady}
          kingRecoveryPieces={kingRecoveryPieces}
          kingRecoveryValue={kingRecoveryValue}
          labelColor={labelColor}
          loneKingMode={loneKingMode}
          normalBlackjackBaseAllowed={normalBlackjackBaseAllowed}
          normalBlackjackLimit={normalBlackjackLimit}
          normalBlackjackLimitAvailable={normalBlackjackLimitAvailable}
          normalBlackjackRemaining={normalBlackjackRemaining}
          normalBlackjackUsed={normalBlackjackUsed}
          openKingGamble={openKingGamble}
          pieceGlyphs={pieceGlyphs}
          pieceValues={pieceValues}
          playerInCheck={playerInCheck}
          recoveryValue={recoveryValue}
          round={round}
          selectedKingRecoveryIds={selectedKingRecoveryIds}
          selectedStakeIds={selectedStakeIds}
          selectedTargetIds={selectedTargetIds}
          selectedTargets={selectedTargets}
          stakeTotal={stakeTotal}
          standardChallengeReady={standardChallengeReady}
          targetValue={targetValue}
          toggleKingRecovery={toggleKingRecovery}
          toggleStake={toggleStake}
          toggleTarget={toggleTarget}
        />
      )}
    </aside>
  );
}
