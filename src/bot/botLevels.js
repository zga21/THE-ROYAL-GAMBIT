export const BOT_RATINGS = [
  200, 400, 600, 800, 1000, 1200,
  1400, 1600, 1800, 2000, 2200, 2400, 2600,
];

const BOT_LABELS = {
  200: 'Very weak beginner',
  400: 'Beginner',
  600: 'Weak casual',
  800: 'Casual',
  1000: 'Improving player',
  1200: 'Club beginner',
  1400: 'Intermediate',
  1600: 'Strong intermediate',
  1800: 'Advanced',
  2000: 'Expert',
  2200: 'Master-like',
  2400: 'Very strong',
  2600: 'Elite',
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function normaliseElo(elo) {
  return clamp((Number(elo) - 200) / 2400, 0, 1);
}

export function computeSearchDepth(skill) {
  return Math.min(5, 1 + Math.floor(skill * 5));
}

export function computeEvalNoise(skill) {
  return 7 * Math.pow(1 - skill, 2) + 0.05;
}

export function computeBlunderChance(skill) {
  return 0.55 * Math.exp(-4.5 * skill);
}

export function computeMistakeChance(skill) {
  return 0.8 * Math.exp(-3 * skill);
}

export function computeAwareness(skill, min, max) {
  return min + (max - min) * Math.pow(skill, 0.8);
}

export function computeSoftmaxTemperature(skill) {
  return 2.5 * (1 - skill) + 0.1;
}

function severityFromSkill(skill) {
  if (skill === 1) return 'none';
  if (skill < 0.15) return 'huge';
  if (skill < 0.3) return 'large';
  if (skill < 0.5) return 'medium';
  if (skill < 0.68) return 'small';
  if (skill < 0.85) return 'minor';
  return 'tiny';
}

// These ratings are difficulty labels generated from a mathematical strength curve.
// They are not official calibrated Elo ratings.
export function createBotConfig(elo) {
  const rating = BOT_RATINGS.includes(Number(elo)) ? Number(elo) : 800;
  const skill = normaliseElo(rating);

  return {
    rating,
    label: BOT_LABELS[rating],
    skill,
    weakness: 1 - skill,
    searchDepth: computeSearchDepth(skill),
    evalNoise: computeEvalNoise(skill),
    blunderChance: computeBlunderChance(skill),
    mistakeChance: computeMistakeChance(skill),
    materialAwareness: computeAwareness(skill, 0.35, 1),
    tacticAwareness: computeAwareness(skill, 0.08, 1),
    kingSafetyAwareness: computeAwareness(skill, 0.08, 1),
    developmentAwareness: computeAwareness(skill, 0.12, 0.9),
    mobilityAwareness: computeAwareness(skill, 0.08, 0.8),
    temperature: computeSoftmaxTemperature(skill),
    mistakeSeverity: severityFromSkill(skill),
  };
}

export const BOT_LEVELS = Object.fromEntries(BOT_RATINGS.map((rating) => [rating, createBotConfig(rating)]));

export function getBotConfig(rating) {
  return BOT_LEVELS[Number(rating)] ?? BOT_LEVELS[800];
}
