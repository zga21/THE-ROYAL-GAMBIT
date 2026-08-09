import { runBlackjackMonteCarlo } from './blackjackMonteCarlo.js';

const oddsCache = new Map();

export function getBlackjackOdds(profile, state = {}) {
  const simulations = profile.blackjackSims ?? 1000;
  const strategy = profile.blackjackStrategy ?? 'simple-threshold';
  const {
    dealerUpcard = 'unknown',
    playerTotal = 'unknown',
    isSoft = false,
    rulesProfile = 'default',
  } = state;
  const cacheKey = [strategy, simulations, dealerUpcard, playerTotal, isSoft ? 'soft' : 'hard', rulesProfile].join(':');

  if (!oddsCache.has(cacheKey)) {
    oddsCache.set(cacheKey, runBlackjackMonteCarlo({ simulations, strategy }));
  }

  return oddsCache.get(cacheKey);
}

export function clearBlackjackOddsCache() {
  oddsCache.clear();
}
