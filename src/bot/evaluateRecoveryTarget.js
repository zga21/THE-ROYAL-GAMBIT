import { pieceCentipawnValue } from '../rules/materialValues.js';

export function recoveredPieceUtility(piece, gameState, profile = {}) {
  let score = pieceCentipawnValue(piece);
  const type = piece?.originalType ?? piece?.type;

  if (type === 'queen') score += 80;
  if (type === 'rook') score += 40;
  if (type === 'knight') score += 25;
  if (type === 'bishop') score += 25;

  // TODO: add mobility-after-recovery, check potential, and tactical disaster checks.
  return score * (profile.recoveryUtilityAwareness ?? 1);
}
