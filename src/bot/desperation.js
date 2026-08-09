export function desperationFactor(materialDeficitCentipawns) {
  const pawnsDown = materialDeficitCentipawns / 100;

  if (pawnsDown < 5) return 0;

  return Math.min(1.5, Math.pow((pawnsDown - 4) / 8, 1.4));
}

export function desperationBonus(materialDeficitCentipawns, profile = {}) {
  const scale = profile.desperationScale ?? 150;
  return desperationFactor(materialDeficitCentipawns) * scale;
}
