export function stockfishCentipawnsToScore(centipawns, profile = {}) {
  if (!Number.isFinite(centipawns)) return 0;

  const awareness = profile.stockfishAwareness ?? profile.skill ?? 1;
  return centipawns * awareness;
}

export function stockfishMateToScore(mate) {
  if (!Number.isFinite(mate)) return 0;

  if (mate > 0) return 10000 - Math.min(999, Math.abs(mate));
  return -10000 + Math.min(999, Math.abs(mate));
}

export function stockfishResultToScore(result, profile = {}) {
  if (Number.isFinite(result?.mate)) {
    return stockfishMateToScore(result.mate);
  }

  return stockfishCentipawnsToScore(result?.centipawns, profile);
}

export function simpleMaterialToCentipawns(value) {
  return value * 100;
}

export function scoreWithRiskMargin(score, profile = {}) {
  return score - (profile.riskTolerance ?? 0);
}
