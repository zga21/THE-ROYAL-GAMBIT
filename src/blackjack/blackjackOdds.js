import { runBlackjackMonteCarlo } from './blackjackMonteCarlo.js';

const oddsCache = new Map();

export function getBlackjackOdds(profile) {
  const simulations = profile.blackjackSims ?? 1000;
  const strategy = profile.blackjackStrategy ?? 'simple-threshold';
  const cacheKey = `${strategy}:${simulations}`;

  if (!oddsCache.has(cacheKey)) {
    oddsCache.set(cacheKey, runBlackjackMonteCarlo({ simulations, strategy }));
  }

  return oddsCache.get(cacheKey);
}

export function clearBlackjackOddsCache() {
  oddsCache.clear();
}
