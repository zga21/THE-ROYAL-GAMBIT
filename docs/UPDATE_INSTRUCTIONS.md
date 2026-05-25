# Update Instructions: Repetition Rule, Stockfish + Monte Carlo Bot, and Bot King Gambit

These instructions define the next major update set for **The Royal Gambit**.

The goal is not to simply make the bot stronger. The goal is to make the bot make legitimate Royal Gambit decisions:

```text
Stockfish evaluates normal chess moves.
Monte Carlo estimates blackjack odds.
Royal Gambit logic compares chess value vs blackjack recovery value.
Bot Elo controls how intelligently the bot uses both.
```

---

## 1. Repetition Rule

### Rule Target

Implement repetition like Chess.com-style online play:

> If the same position appears for the third time, the game should automatically be declared a draw.

This is stricter/more automatic than over-the-board FIDE-style threefold repetition, where a player normally claims the draw. For this app, use the online-friendly automatic version.

### Important Definition

A repeated position must include:

1. Same pieces on the same squares.
2. Same side to move.
3. Same castling rights.
4. Same en-passant availability.
5. Same Royal Gambit custom protection state if protected pieces currently affect legal movement.

Do **not** include these in the repetition key:

- Halfmove clock.
- Fullmove number.
- Blackjack attempt count.
- King-gamble cooldown.
- Bot rating.
- UI theme.
- Selected pieces in the UI.

Reason: repetition is about whether the playable position has repeated, not whether the interface or historical resources are identical.

### Why Custom Tracking Is Needed

Do not rely only on `chess.js` history.

The app serializes game state through FEN, passes turns after blackjack, syncs rooms over WebSockets, and hydrates state from shared URLs. That can break engine-internal move history. Therefore, the app needs its own `positionHistory` stored in `game`.

### New File

Create:

```text
src/rules/repetition.js
```

Suggested implementation:

```js
export function positionKey(gameState) {
  const fen = gameState.chess.fen();
  const [board, turn, castling, enPassant] = fen.split(' ');

  const protection = gameState.protection ?? { pieceIds: [], protectedAgainst: null };
  const protectionKey = JSON.stringify({
    pieceIds: [...(protection.pieceIds ?? [])].sort(),
    protectedAgainst: protection.protectedAgainst ?? null,
  });

  return [board, turn, castling, enPassant, protectionKey].join('|');
}

export function createInitialPositionHistory(gameState) {
  const key = positionKey(gameState);
  return {
    entries: [key],
    counts: { [key]: 1 },
  };
}

export function normalizePositionHistory(history, gameState) {
  if (history?.entries && history?.counts) return history;
  return createInitialPositionHistory(gameState);
}

export function recordPosition(gameState) {
  const history = normalizePositionHistory(gameState.positionHistory, gameState);
  const key = positionKey(gameState);
  const nextCount = (history.counts[key] ?? 0) + 1;

  return {
    ...gameState,
    positionHistory: {
      entries: [...history.entries, key],
      counts: {
        ...history.counts,
        [key]: nextCount,
      },
    },
  };
}

export function getRepetitionCount(gameState) {
  const history = normalizePositionHistory(gameState.positionHistory, gameState);
  return history.counts[positionKey(gameState)] ?? 0;
}

export function isThreefoldRepetition(gameState) {
  return getRepetitionCount(gameState) >= 3;
}

export function applyRepetitionDraw(gameState) {
  if (isThreefoldRepetition(gameState)) {
    return {
      ...gameState,
      status: 'draw',
      drawReason: 'threefold-repetition',
    };
  }
  return gameState;
}
```

### App State Changes

Update `initialGameState()`:

```js
function initialGameState() {
  const chess = new Chess();
  const game = {
    chess,
    pieces: createInitialPieces(),
    status: 'active',
    protection: { pieceIds: [], protectedAgainst: null },
    kingGamble: normalizeKingGambleTracker(),
    blackjackUsage: normalizeBlackjackUsage(),
  };

  return {
    ...game,
    positionHistory: createInitialPositionHistory(game),
  };
}
```

Update all serialization/hydration functions to include:

```js
positionHistory: game.positionHistory,
drawReason: game.drawReason,
```

This includes:

- `stateForUrl`
- `serializeGame`
- `hydrateGame`
- `decodeShareState`
- `sharedStatePayload`
- room sync payloads if needed

### When to Record Repetition

After every successful state-changing turn, run:

```js
const withRecordedPosition = recordPosition(nextGame);
const withRepetitionDraw = applyRepetitionDraw(withRecordedPosition);
setGame(withRepetitionDraw);
```

Apply this after:

- Normal chess moves.
- Castling.
- Promotion moves.
- Blackjack round resolution that changes board state.
- Blackjack round resolution that passes the turn without changing board state.
- Bot moves.
- Bot blackjack decisions.
- Friend-mode received syncs, but avoid double-counting the same state. Prefer syncing the sender's already-recorded history.

### UI Requirement

When repetition triggers, display:

```text
Draw by threefold repetition.
```

Do not display only `Game status: draw`, because that hides the reason.

---

## 2. Stockfish + Monte Carlo Hybrid Bot

### Correct Architecture

Do **not** replace the current bot with Stockfish completely.

Stockfish understands normal chess. It does not understand:

- Captured-piece recovery.
- Blackjack attempt limits.
- Staked pieces.
- King-gamble cooldown.
- Protected recovered pieces.
- Royal Gambit comeback mechanics.

Therefore the bot must become a hybrid:

```text
Stockfish: best normal chess move + chess evaluation.
Monte Carlo: blackjack odds.
Royal Gambit EV layer: compare chess value vs blackjack value.
Bot profile/Elo: decide how accurate, risky, and disciplined the bot is.
```

### New Files

Create:

```text
src/bot/stockfishEngine.js
src/bot/evaluateStockfishMove.js
src/bot/normaliseDecisionScores.js
```

### Stockfish Engine Wrapper

The engine should run as a Web Worker. Recommended structure:

```text
public/stockfish/stockfish.js
```

Then load it from:

```js
new Worker('/stockfish/stockfish.js')
```

The wrapper must support:

- `position fen ...`
- `go depth ...`
- `setoption name Skill Level value ...`
- parsing `bestmove`
- parsing `score cp ...`
- parsing `score mate ...`

Do not only return the best move. Return an object:

```js
{
  move: legalMove,
  uci: 'e2e4',
  centipawns: 34,
  mate: null,
  depth: 10,
  skillLevel: 12,
  source: 'stockfish'
}
```

### Elo-to-Stockfish Mapping

Use bot rating to control Stockfish settings:

```js
export function ratingToStockfishSettings(rating) {
  const elo = Number(rating) || 800;

  if (elo <= 400) return { depth: 2, skillLevel: 0, moveErrorChance: 0.55 };
  if (elo <= 800) return { depth: 4, skillLevel: 2, moveErrorChance: 0.35 };
  if (elo <= 1200) return { depth: 6, skillLevel: 5, moveErrorChance: 0.20 };
  if (elo <= 1600) return { depth: 8, skillLevel: 8, moveErrorChance: 0.10 };
  if (elo <= 2000) return { depth: 10, skillLevel: 12, moveErrorChance: 0.05 };
  if (elo <= 2400) return { depth: 13, skillLevel: 16, moveErrorChance: 0.02 };

  return { depth: 16, skillLevel: 20, moveErrorChance: 0.00 };
}
```

### Convert Stockfish Evaluation to Royal Gambit Score

The existing blackjack EV is not naturally on the same scale as Stockfish centipawns.

Add:

```text
src/bot/normaliseDecisionScores.js
```

Suggested conversion:

```js
export function centipawnsToRoyalScore(centipawns, profile) {
  if (!Number.isFinite(centipawns)) return 0;

  // 100 centipawns = roughly one pawn.
  const pawns = centipawns / 100;

  // Convert to the same approximate material scale used by blackjack recovery.
  const awareness = profile.stockfishAwareness ?? profile.skill ?? 1;
  return pawns * awareness;
}

export function mateToRoyalScore(mate) {
  if (!Number.isFinite(mate)) return 0;
  if (mate > 0) return 10000 - Math.abs(mate);
  return -10000 + Math.abs(mate);
}

export function stockfishResultToRoyalScore(result, profile) {
  if (Number.isFinite(result.mate)) return mateToRoyalScore(result.mate);
  return centipawnsToRoyalScore(result.centipawns, profile);
}
```

### Updated `chooseBotAction`

Change `chooseBotAction` to async.

Current concept:

```js
const bestChessMove = evaluateBestChessMove(gameState, profile);
const blackjackOption = evaluateBestBlackjackOption(gameState, profile);
```

New concept:

```js
const bestChessMove = await evaluateBestStockfishMove(gameState, profile);
const blackjackOption = evaluateBestBlackjackOption(gameState, profile);
```

Then compare:

```js
const chessScore = stockfishResultToRoyalScore(bestChessMove, profile);
const blackjackScore = blackjackOption.adjustedEV ?? blackjackOption.ev;
const decisionMargin = blackjackScore - chessScore - blackjackThreshold;
const shouldUseBlackjack = blackjackOption.available && decisionMargin > 0;
```

### Elo-Based Blackjack Discipline

Low-rated bots should gamble too much.
High-rated bots should gamble only when the EV is clearly good.

Add/verify in `botProfiles.js`:

```js
blackjackThreshold: -1.2 + 3.7 * config.skill,
blackjackUseBias: 1.2 - 1.9 * config.skill,
blackjackResourceDiscipline: 0.15 + 2.35 * Math.pow(config.skill, 1.2),
blackjackScarcityExponent: 1.0 + 1.5 * config.skill,
blackjackRemainingAwareness: 0.15 + 0.85 * Math.pow(config.skill, 0.8),
stockfishAwareness: 0.25 + 0.75 * config.skill,
```

This means:

- Weak bots may overuse blackjack.
- Strong bots preserve attempts.
- Strong bots trust Stockfish more.
- Weak bots are noisier and less disciplined.

### Debug Panel Requirement

Add a bot decision debug panel in development mode:

```text
Stockfish best move: ...
Stockfish eval: ... cp / mate
Converted chess score: ...
Blackjack EV: ...
Blackjack adjusted EV: ...
Monte Carlo win/loss/tie: ...
Decision margin: ...
Final bot action: chess move / blackjack / king gamble
```

This will make the project look much more engineering-heavy.

---

## 3. Bot King Gambit / Lone-King Blackjack

### Requirement

Bots must be able to use the king-gamble / lone-king blackjack mechanic.

Currently, the UI exposes lone-king blackjack to the player. The bot decision layer must also consider it.

### New Bot Evaluation File

Create:

```text
src/bot/evaluateKingGambleOption.js
```

### Availability Rules

The bot can consider king gamble when:

- Game is active.
- It is the bot's turn.
- Bot is not in check.
- Bot is in lone-king mode, or the current rules explicitly allow king gamble.
- There are recoverable pieces available.
- King-gamble cooldown is not active.
- The recovery selection fits the king-gamble budget/points rules.

### Suggested Return Shape

```js
{
  available: true,
  mode: 'king',
  targetPieces,
  budget,
  odds,
  ev,
  adjustedEV,
  riskPenalty,
  cooldownPenalty,
  debug: {
    reason,
    winRate,
    lossRate,
    tieRate,
    recoveryUtility,
    kingRisk,
    materialPressure,
  }
}
```

### Evaluation Logic

Use the same Monte Carlo odds from:

```js
getBlackjackOdds(profile)
```

Then estimate:

```js
const recoveryEV = odds.winRate * recoveryUtility;
const lossPenalty = odds.lossRate * kingRiskPenalty;
const adjustedEV = recoveryEV - lossPenalty + materialPressure + profile.blackjackUseBias;
```

King gamble should be more desperate than normal blackjack. Use material pressure heavily.

Suggested logic:

```js
const materialPressure = Math.max(0, materialDeficit) * (profile.blackjackRiskTolerance ?? 0);
const kingRiskPenalty = 2.5 + 4.0 * (profile.skill ?? 0);
```

This makes weak bots risk the king more easily, while strong bots only do it when desperate or clearly justified.

### Update `chooseBotAction`

Instead of only comparing two actions:

```text
chess move vs normal blackjack
```

Compare three actions:

```text
Stockfish chess move
Normal blackjack recovery
King-gamble blackjack
```

Pseudo-code:

```js
const stockfishMove = await evaluateBestStockfishMove(gameState, profile);
const chessScore = stockfishResultToRoyalScore(stockfishMove, profile);

const normalBlackjack = evaluateBestBlackjackOption(gameState, profile);
const kingGamble = evaluateKingGambleOption(gameState, profile);

const candidates = [
  {
    type: 'move',
    score: chessScore,
    payload: stockfishMove,
  },
  normalBlackjack.available && {
    type: 'blackjack',
    score: normalBlackjack.adjustedEV,
    payload: normalBlackjack,
  },
  kingGamble.available && {
    type: 'blackjack',
    mode: 'king',
    score: kingGamble.adjustedEV,
    payload: kingGamble,
  },
].filter(Boolean);

candidates.sort((a, b) => b.score - a.score);
return buildBotAction(candidates[0], profile);
```

### Important UI/Game Flow Requirement

The app must be able to execute a bot king-gamble action without relying on manual UI selection.

That means the bot action payload must contain everything needed:

- mode: `'king'`
- selected recovery target IDs
- budget/points
- stake implied as king
- chosen blackjack strategy

If bot king-gamble still depends on `selectedKingRecoveryIds`, the implementation is wrong. Bot decisions should be data-driven, not UI-state-driven.

---

## 4. Tests Required

Add tests before calling this feature done.

Create tests for:

```text
src/rules/repetition.test.js
src/blackjack/blackjackMonteCarlo.test.js
src/bot/evaluateKingGambleOption.test.js
```

### Repetition Tests

Test:

- Initial position count is 1.
- Same position repeated three times triggers draw.
- Same board with different side to move is not the same key.
- Same board with different castling rights is not the same key.
- Same board with different en-passant square is not the same key.
- Protection state changes the key.

### Monte Carlo Tests

Test:

- Simulation count is respected.
- Win/loss/tie rates sum approximately to 1.
- Raw counts sum to number of simulations.
- Invalid simulation count defaults safely.

### King Gamble Bot Tests

Test:

- Bot cannot king-gamble while in check.
- Bot cannot king-gamble during cooldown.
- Bot can evaluate king-gamble in lone-king mode with recoverable pieces.
- Strong bots require better EV than weak bots.

---

## 5. Done Definition

This update is complete only when:

- Threefold repetition auto-draw works like Chess.com-style online play.
- Repetition history survives share links and room sync.
- Stockfish supplies best normal chess move and evaluation.
- Monte Carlo supplies blackjack odds.
- Bot compares Stockfish chess score against blackjack EV.
- Bot Elo affects depth, skill, risk, and blackjack discipline.
- Bot can choose normal blackjack.
- Bot can choose king-gamble blackjack.
- Bot king-gamble does not rely on manual UI-selected pieces.
- Tests cover repetition, Monte Carlo, and king-gamble decision logic.

---

## Brutal Warning

Do not implement these as random patches inside `App.jsx`.

If repetition, Stockfish, Monte Carlo, and king-gamble all get stuffed directly into `App.jsx`, the project will become fragile. The whole point now is to move toward a real architecture:

```text
rules/       = game legality and repetition
blackjack/   = card round + simulations
bot/         = decision-making
components/  = UI only
App.jsx      = orchestration, not everything
```
