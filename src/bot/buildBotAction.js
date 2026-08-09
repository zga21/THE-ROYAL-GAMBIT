export function buildBotAction(chosen, { profile, debug }) {
  if (chosen.type === 'blackjack' && chosen.mode === 'standard') {
    const option = chosen.payload;
    return {
      type: 'blackjack',
      mode: 'standard',
      target: option.target,
      stake: option.stake,
      score: chosen.score,
      ev: option.ev,
      adjustedEV: option.adjustedEV,
      profileId: profile.id,
      debug,
    };
  }

  if (chosen.type === 'blackjack' && chosen.mode === 'king') {
    const option = chosen.payload;
    return {
      type: 'blackjack',
      mode: 'king',
      targets: option.targetPieces,
      budget: option.budget,
      score: chosen.score,
      ev: option.ev,
      adjustedEV: option.adjustedEV,
      profileId: profile.id,
      debug,
    };
  }

  const move = chosen.payload;
  return {
    type: 'move',
    move: move.move,
    score: chosen.score,
    profileId: profile.id,
    debug,
  };
}
