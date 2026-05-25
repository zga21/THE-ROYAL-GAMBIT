import { simulateBlackjackRound } from './blackjackSim.js';

export function runBlackjackMonteCarlo({ simulations = 1000, strategy = 'simple-threshold' } = {}) {
  const n = Number.isFinite(simulations) && simulations >= 1 ? Math.floor(simulations) : 1000;
  const raw = { wins: 0, losses: 0, ties: 0 };

  for (let index = 0; index < n; index += 1) {
    const result = simulateBlackjackRound({ strategy });
    if (result === 'win') raw.wins += 1;
    else if (result === 'loss') raw.losses += 1;
    else raw.ties += 1;
  }

  return {
    simulations: n,
    winRate: raw.wins / n,
    lossRate: raw.losses / n,
    tieRate: raw.ties / n,
    raw,
  };
}
