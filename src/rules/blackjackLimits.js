export const NORMAL_BLACKJACK_LIMIT = 5;

export function normalizeBlackjackUsage(usage) {
  return {
    white: {
      normalUsed: Math.max(0, usage?.white?.normalUsed ?? 0),
      normalLimit: usage?.white?.normalLimit ?? NORMAL_BLACKJACK_LIMIT,
    },
    black: {
      normalUsed: Math.max(0, usage?.black?.normalUsed ?? 0),
      normalLimit: usage?.black?.normalLimit ?? NORMAL_BLACKJACK_LIMIT,
    },
  };
}

export function getBlackjackUsage(gameState, color) {
  return normalizeBlackjackUsage(gameState?.blackjackUsage)[color];
}

export function getNormalBlackjackUsed(gameState, color) {
  return getBlackjackUsage(gameState, color).normalUsed;
}

export function getNormalBlackjackLimit(gameState, color) {
  return getBlackjackUsage(gameState, color).normalLimit;
}

export function getNormalBlackjackRemaining(gameState, color) {
  return Math.max(0, getNormalBlackjackLimit(gameState, color) - getNormalBlackjackUsed(gameState, color));
}

export function canUseNormalBlackjackByLimit(gameState, color) {
  return getNormalBlackjackRemaining(gameState, color) > 0;
}

export function recordNormalBlackjackUse(gameState, color) {
  const usage = normalizeBlackjackUsage(gameState?.blackjackUsage);
  const playerUsage = usage[color] ?? { normalUsed: 0, normalLimit: NORMAL_BLACKJACK_LIMIT };

  return {
    ...gameState,
    blackjackUsage: {
      ...usage,
      [color]: {
        ...playerUsage,
        normalUsed: Math.min(playerUsage.normalLimit, playerUsage.normalUsed + 1),
      },
    },
  };
}
