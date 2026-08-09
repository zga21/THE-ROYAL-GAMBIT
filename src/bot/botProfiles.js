import { BOT_LEVELS, getBotConfig } from './botLevels.js';

function profileFromConfig(config) {
  const strategy =
    config.skill < 0.18
      ? 'random'
      : config.skill < 0.35
        ? 'random-plus'
        : config.skill < 0.55
          ? 'simple-threshold'
          : config.skill < 0.78
            ? 'dealer-aware'
            : 'basic-strategy-lite';

  return {
    id: `elo-${config.rating}`,
    label: `${config.rating} ${config.label}`,
    approxElo: config.rating,
    ...config,
    blackjackSims: Math.round(100 + 9900 * Math.pow(config.skill, 1.5)),
    blackjackStrategy: strategy,
    riskTolerance: -80 + 160 * config.skill,
    stockfishAwareness: 0.25 + 0.75 * config.skill,
    blackjackRiskTolerance: 1.15 - 0.95 * config.skill,
    blackjackThreshold: -120 + 370 * config.skill,
    blackjackUseBias: 120 - 190 * config.skill,
    blackjackResourceDiscipline: 0.15 + 2.35 * Math.pow(config.skill, 1.2),
    blackjackScarcityExponent: 1.0 + 1.5 * config.skill,
    blackjackRemainingAwareness: 0.15 + 0.85 * Math.pow(config.skill, 0.8),
    stakeDiscipline: 0.25 + 0.75 * Math.pow(config.skill, 0.85),
    stakeAwareness: 0.25 + 0.75 * Math.pow(config.skill, 0.85),
    turnCostAwareness: 0.2 + 0.8 * Math.pow(config.skill, 0.85),
    recoveryUtilityAwareness: 0.45 + 0.55 * Math.pow(config.skill, 0.85),
    opponentThreatAwareness: 0.15 + 0.85 * Math.pow(config.skill, 0.9),
    desperationScale: 80 + 120 * (1 - config.skill),
    kingGambleBias: 80 * (1 - config.skill),
    queenBias: 1.5 * (1 - config.skill),
  };
}

export const BOT_PROFILES = Object.fromEntries(
  Object.values(BOT_LEVELS).map((config) => [String(config.rating), profileFromConfig(config)]),
);

BOT_PROFILES.squire = { ...BOT_PROFILES['600'], id: 'squire', label: 'Squire', approxElo: 600 };
BOT_PROFILES.knight = { ...BOT_PROFILES['1000'], id: 'knight', label: 'Knight', approxElo: 1000 };
BOT_PROFILES.baron = { ...BOT_PROFILES['1600'], id: 'baron', label: 'Baron', approxElo: 1600 };
BOT_PROFILES.duke = { ...BOT_PROFILES['2000'], id: 'duke', label: 'Duke', approxElo: 2000 };

export const BOT_PROFILE_LIST = Object.values(BOT_PROFILES);

export function getBotProfile(profileIdOrElo) {
  if (!profileIdOrElo) return BOT_PROFILES['800'];
  if (typeof profileIdOrElo === 'object') return profileIdOrElo;
  if (BOT_PROFILES[profileIdOrElo]) return BOT_PROFILES[profileIdOrElo];

  const config = getBotConfig(profileIdOrElo);
  return BOT_PROFILES[String(config.rating)] ?? BOT_PROFILES['800'];
}

export const resolveBotProfile = getBotProfile;
