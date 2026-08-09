export function buildBotDecisionDebug({
  chosen,
  profile,
  chess,
  normalBlackjack,
  kingGamble,
  candidates,
}) {
  return {
    chosen,
    profileId: profile.id,
    elo: profile.approxElo,
    chessScore: chess?.score,
    stockfishMove: chess?.uci,
    stockfishCentipawns: chess?.centipawns,
    stockfishMate: chess?.mate,
    normalBlackjackScore: normalBlackjack?.score ?? normalBlackjack?.adjustedEV,
    kingGambleScore: kingGamble?.score ?? kingGamble?.adjustedEV,
    normalBlackjackOdds: normalBlackjack?.odds,
    kingGambleOdds: kingGamble?.odds,
    materialDeficit: normalBlackjack?.debug?.materialDeficitCentipawns,
    decisionMargin: chosen?.score - (chess?.score ?? 0),
    candidates,
  };
}

export function logBotDecision(debug) {
  if (import.meta.env?.DEV && import.meta.env?.VITE_BOT_DEBUG === 'true') {
    console.table([debug]);
  }
}
