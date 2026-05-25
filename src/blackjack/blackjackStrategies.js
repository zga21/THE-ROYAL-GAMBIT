import { handValue } from './blackjackSim.js';

export function chooseBlackjackAction({ playerHand, dealerHand, strategy = 'simple-threshold' }) {
  const playerTotal = handValue(playerHand);
  const dealerTotal = handValue(dealerHand);

  if (playerTotal >= 21) return 'stand';

  if (strategy === 'random') {
    return Math.random() < 0.5 ? 'hit' : 'stand';
  }

  if (strategy === 'random-plus') {
    if (playerTotal <= 13) return 'hit';
    if (playerTotal >= 18) return 'stand';
    return Math.random() < 0.5 ? 'hit' : 'stand';
  }

  if (strategy === 'dealer-aware') {
    if (playerTotal <= 11) return 'hit';
    if (playerTotal <= 16 && dealerTotal >= 17) return 'hit';
    return 'stand';
  }

  if (strategy === 'basic-strategy-lite') {
    if (playerTotal <= 11) return 'hit';
    if (playerTotal <= 16 && dealerTotal >= 17) return 'hit';
    if (playerTotal <= 12 && dealerTotal <= 16) return 'hit';
    return 'stand';
  }

  if (playerTotal < 16) return 'hit';
  return 'stand';
}
