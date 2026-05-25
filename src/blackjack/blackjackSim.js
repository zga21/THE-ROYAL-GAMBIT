import { chooseBlackjackAction } from './blackjackStrategies.js';

const CARD_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10];

export function drawCard() {
  return CARD_VALUES[Math.floor(Math.random() * CARD_VALUES.length)];
}

export function handValue(hand) {
  let total = hand.reduce((sum, card) => sum + card, 0);
  let aces = hand.filter((card) => card === 1).length;

  while (aces > 0 && total + 10 <= 21) {
    total += 10;
    aces -= 1;
  }

  return total;
}

function playPlayer(playerHand, dealerHand, strategy) {
  const hand = [...playerHand];

  while (true) {
    const total = handValue(hand);
    if (total >= 21) break;

    const action = chooseBlackjackAction({ playerHand: hand, dealerHand, strategy });
    if (action !== 'hit') break;

    hand.push(drawCard());
    if (handValue(hand) > 21) break;
  }

  return hand;
}

function playDealer(dealerHand) {
  const hand = [...dealerHand];
  while (handValue(hand) < 17) {
    hand.push(drawCard());
  }
  return hand;
}

export function simulateBlackjackRound({ strategy = 'simple-threshold' } = {}) {
  const playerStart = [drawCard(), drawCard()];
  const dealerStart = [drawCard(), drawCard()];

  const playerFinal = playPlayer(playerStart, dealerStart, strategy);
  const playerTotal = handValue(playerFinal);
  if (playerTotal > 21) return 'loss';

  const dealerFinal = playDealer(dealerStart);
  const dealerTotal = handValue(dealerFinal);

  if (dealerTotal > 21) return 'win';
  if (playerTotal > dealerTotal) return 'win';
  if (playerTotal < dealerTotal) return 'loss';
  return 'tie';
}
