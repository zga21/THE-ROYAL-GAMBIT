import { getMaterialDeficit, getTurnColor } from './chooseRecoveryTarget.js';

export function estimateSkipTurnCost(gameState, color = getTurnColor(gameState), profile = {}) {
  if (gameState?.chess?.isCheck?.()) return 999;

  const baseTempoCost = 1.25;
  const deficit = Math.max(0, getMaterialDeficit(gameState, color));
  const tacticalUrgencyPenalty = deficit * 0.05;

  return baseTempoCost * (profile.turnCostAwareness ?? 1) + tacticalUrgencyPenalty;
}
