export function createBlackjackRound({
  budget = null,
  dealerHand,
  deck,
  handCount = 0,
  mode,
  player,
  playerHand,
  points = 0,
  stakes,
  targets,
}) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    mode,
    player,
    budget,
    points,
    handCount,
    deck,
    playerHand: [...playerHand],
    dealerHand: [...dealerHand],
    revealDealer: false,
    playerStood: false,
    dealerPlaying: false,
    result: null,
    targets,
    stakes,
  };
}

export function playerHit(round, card, deck) {
  return {
    ...round,
    deck,
    playerHand: [...round.playerHand, card],
  };
}

export function revealDealer(round) {
  return {
    ...round,
    revealDealer: true,
    playerStood: true,
    dealerPlaying: true,
  };
}

export function applyDealerSnapshot(round, snapshot) {
  return {
    ...round,
    ...snapshot,
    dealerHand: [...(snapshot.dealerHand ?? round.dealerHand)],
  };
}

export function resolveRound(round, { deck = round.deck, dealerHand = round.dealerHand, result }) {
  return {
    ...round,
    deck,
    dealerHand: [...dealerHand],
    revealDealer: true,
    dealerPlaying: false,
    result,
  };
}
