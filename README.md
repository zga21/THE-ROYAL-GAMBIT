# The Royal Gambit

**The Royal Gambit** is a browser-based chess variant that combines classical chess with a blackjack-style recovery system. It keeps the foundation of legal chess, then adds a risk/reward layer where a player who falls behind can gamble to recover captured material.

The project is built with **React + Vite**, uses **chess.js** for legal chess rules, includes a custom blackjack engine, uses **Monte Carlo simulation** to estimate blackjack odds for bot decisions, and supports local friend-room multiplayer through an **Express + WebSocket** server.

> This is not just a chess skin. The core idea is a new chess variant: material loss can create a comeback path, but only if the player is willing to risk active pieces.

---

## Screenshot / Media Guide

Create this folder before adding images:

```text
docs/images/
```

Then add the images below and replace the placeholders with the real screenshots.

### 1. Main Gameplay View

> **Add image here:** full board screenshot showing the Royal theme, right-side status panel, material values, and turn indicator.

```md
![Main gameplay view](docs/images/main-gameplay-royal.png)
```

### 2. Blackjack Recovery Panel

> **Add image here:** screenshot where a player is behind by 5+ material and the Blackjack Recovery panel is active. Show captured pieces, stake selection, and the Start Challenge button.

```md
![Blackjack recovery panel](docs/images/blackjack-recovery-panel.png)
```

### 3. Blackjack Table / Card Round

> **Add image here:** screenshot of the blackjack card table during a challenge, ideally showing player cards, dealer cards, Hit/Stand buttons, and the recovery/stake context.

```md
![Blackjack card round](docs/images/blackjack-card-round.png)
```

### 4. Theme Comparison

> **Add image here:** one combined image or three small screenshots showing Royal, Pink & White, and Orange & Black themes.

```md
![Theme comparison](docs/images/theme-comparison.png)
```

### 5. Friend Mode / Multiplayer Link

> **Add image here:** screenshot showing friend mode with a generated room link, connection status, and player assignment.

```md
![Friend mode room link](docs/images/friend-mode-room-link.png)
```

### 6. Bot Difficulty Selection

> **Add image here:** screenshot showing bot mode with the rating selector and active bot strength.

```md
![Bot difficulty selection](docs/images/bot-difficulty-selection.png)
```

---

## Current Features

- Playable chess interface with standard move legality.
- Custom piece-state tracking for captured pieces, promoted pieces, original squares, and recovery logic.
- Blackjack recovery system for players who are behind in material.
- Stake matching system: recovered material must be matched by active staked material.
- Safety checks preventing illegal staking that exposes the king.
- Special lone-king / king-gamble behaviour.
- Bot mode with multiple strength levels.
- Bot decision-making across both chess moves and blackjack recovery options.
- Monte Carlo blackjack odds simulation used by bot expected-value calculations.
- Friend mode using local WebSocket rooms.
- Shareable room links and game-state sync.
- Three themes: Royal, Pink & White, and Orange & Black.
- Separated board and side-panel components.
- Basic Node test command configured through `npm test`.

---

## Tech Stack

| Area | Technology |
|---|---|
| Frontend | React 19 |
| Build Tool | Vite 6 |
| Chess Rules | chess.js |
| Icons | lucide-react |
| Local Server | Express |
| Multiplayer Sync | ws / WebSockets |
| Tests | Node test runner |
| Language | JavaScript / JSX / CSS |

---

## Game Concept

Normal chess has a brutal property: once you lose too much material, the game often becomes strategically dead. **The Royal Gambit** changes that.

When a player is behind by enough material, they can attempt a blackjack challenge. If they win, they recover captured material. If they lose, they sacrifice the staked material and give the opponent even more advantage.

The result is a hybrid strategy game:

```text
Chess position + material imbalance + blackjack odds + stake risk = decision pressure
```

The best move is not always a chess move. Sometimes the best move is to gamble. Sometimes gambling is bait. That is the central tension of the project.

---

## How the Rules Work

### 1. Chess Foundation

The chess layer uses `chess.js` for legal move generation and game-state validation. The app handles normal chess concepts including:

- Legal moves.
- Captures.
- Check.
- Checkmate.
- Stalemate.
- Draw states.
- Castling.
- Promotion.
- Turn control.

The app also maintains its own custom piece model so it can track information that normal chess engines do not need, such as original square, original type, captured status, and recovery eligibility.

### 2. Blackjack Recovery

A player can normally start a blackjack recovery challenge only when the rules allow it. The key conditions are:

- The game must still be active.
- It must be that player's turn.
- The player must not be in check.
- The player must be behind by at least 5 material.
- The player must have recoverable captured pieces.
- The recovery square must be empty.
- The player must stake active material against the recovery.
- The stake must be legal and must not expose the king.
- The player must still have blackjack attempts remaining.

The default normal blackjack limit is currently **5 attempts per player**.

### 3. Stake Matching

The recovery system is not free. To recover captured material, the player must stake active pieces.

Example:

```text
Recovering a rook = recovery value 5
Required stake = active material worth 5
```

A player could stake a rook, or a bishop + knight + pawn-style combination if the values match the logic used by the app.

### 4. Stake Safety

The app checks whether staking a piece would expose the player's king. If removing the piece would leave the king in check, that piece cannot be used as a stake.

This prevents cheap or illegal sacrifice loops where pinned pieces are gambled away even though they are still needed for king safety.

### 5. Lone-King / King Gamble

The project includes special logic for lone-king situations. In this mode, the king itself becomes part of the recovery drama. The app tracks:

- Loss streaks.
- Cooldown state.
- Whether the king must move before another blackjack attempt.
- Recovery points in king-gamble flow.

This is one of the most distinctive mechanics in the project, but it is also one of the most dangerous from a balancing perspective. It needs careful playtesting.

---

## Monte Carlo Blackjack Simulation

The project includes a Monte Carlo simulation system for blackjack odds.

The flow is:

```text
blackjackSim.js
    ↓
blackjackMonteCarlo.js
    ↓
blackjackOdds.js
    ↓
evaluateBlackjackOption.js
    ↓
chooseBotAction.js
```

### What it does

`blackjackMonteCarlo.js` runs many simulated blackjack rounds and estimates:

- Win rate.
- Loss rate.
- Tie rate.
- Raw number of wins, losses, and ties.

These odds are cached in `blackjackOdds.js` so the bot does not repeatedly rerun the same simulation.

### Why it matters

The bot uses these odds when deciding whether to make a normal chess move or start a blackjack recovery challenge. This means the bot is not blindly gambling. It compares:

```text
Expected blackjack value vs best chess move score
```

That is a strong feature. It makes the game more than random cards pasted onto chess.

### Current limitation

The Monte Carlo system currently models simplified blackjack strategy profiles. It is useful for bot decision-making, but it is not yet a full casino-grade blackjack simulator with deck counting, exact composition-dependent strategy, or advanced dealer-rule variations.

---

## Bot AI

The bot is custom-built. It is not Stockfish.

Bot strength is controlled through rating-style levels from **200** to **2600**. These are gameplay difficulty labels, not official calibrated Elo ratings.

The bot evaluates chess moves using practical heuristics such as:

- Material gain.
- Capture value.
- Recapture risk.
- King safety.
- Development.
- Mobility.
- Forcing moves.
- Checks and checkmates.
- Hanging-piece risk.
- Opponent reply danger.

The bot also evaluates blackjack options using:

- Monte Carlo win/loss/tie rates.
- Recovery utility.
- Stake cost.
- Skip-turn cost.
- Opponent threat penalty.
- Material deficit pressure.
- Remaining blackjack attempts.
- Bot risk tolerance and resource discipline.

This means stronger bots should be less reckless with blackjack, while weaker bots can behave more chaotically.

---

## Friend Mode / Multiplayer

The project includes a local friend-room server.

The server:

- Serves the production build from `dist/`.
- Opens a WebSocket endpoint at `/ws`.
- Creates and stores rooms in memory.
- Assigns users as white, black, or spectator.
- Syncs game state between clients.
- Provides LAN origins through `/api/info`.

This is currently designed for local/LAN or simple hosted usage. Rooms are not persisted to a database.

---

## Themes

The game currently includes three visual themes:

1. **Royal** — dark/gold luxury theme.
2. **Pink & White** — bright pink/white theme.
3. **Orange & Black** — high-contrast orange/black theme.

The themes are implemented using CSS custom properties in `src/styles.css`, making it straightforward to add more themes later.

---

## Repository Structure

```text
.
├── index.html
├── package.json
├── package-lock.json
├── server.js
├── src
│   ├── App.jsx
│   ├── main.jsx
│   ├── styles.css
│   ├── blackjack
│   │   ├── blackjackMonteCarlo.js
│   │   ├── blackjackOdds.js
│   │   ├── blackjackRoundMachine.js
│   │   ├── blackjackSim.js
│   │   └── blackjackStrategies.js
│   ├── bot
│   │   ├── botLevels.js
│   │   ├── botProfiles.js
│   │   ├── chooseBotAction.js
│   │   ├── chooseRecoveryTarget.js
│   │   ├── chooseStakePieces.js
│   │   ├── evaluateBlackjackOption.js
│   │   ├── evaluateChessMove.js
│   │   └── supporting heuristic files
│   ├── components
│   │   ├── ChessBoard.jsx
│   │   └── SidePanel.jsx
│   └── rules
│       ├── blackjackLimits.js
│       └── stakeSafety.js
└── README.md
```

---

## Important Files

### `src/App.jsx`

The main game container. It coordinates game state, chess logic, blackjack flow, bot turns, friend-room sync, themes, and high-level UI state.

This file has improved because the board and side panel are now separated into components. However, it is still the central brain of the app and should eventually be broken down further into custom hooks.

### `src/components/ChessBoard.jsx`

Renders the chessboard. It handles square rendering, pieces, legal destination styling, protected squares, stake highlights, recovery squares, king spotlight visuals, and cinematic board states.

### `src/components/SidePanel.jsx`

Renders the right-side interface, including status, material metrics, bot/friend mode controls, blackjack recovery controls, captured pieces, stake selection, and lone-king blackjack UI.

### `src/blackjack/blackjackRoundMachine.js`

Contains pure state-transition helpers for blackjack rounds: creating a round, hitting, revealing the dealer, applying dealer snapshots, and resolving the round.

### `src/blackjack/blackjackSim.js`

Runs simplified blackjack gameplay simulations. It creates random hands, plays the player according to a selected strategy, plays the dealer, and returns win/loss/tie outcomes.

### `src/blackjack/blackjackMonteCarlo.js`

Runs repeated blackjack simulations to estimate win, loss, and tie rates.

### `src/blackjack/blackjackOdds.js`

Caches Monte Carlo results by strategy and simulation count.

### `src/blackjack/blackjackStrategies.js`

Defines simplified blackjack action strategies such as random, random-plus, dealer-aware, and basic-strategy-lite.

### `src/bot/chooseBotAction.js`

The bot's top-level decision function. It compares the best chess move against the best blackjack option and chooses the stronger action.

Bot debug output is gated behind:

```text
VITE_BOT_DEBUG=true
```

in development mode.

### `src/bot/evaluateChessMove.js`

Scores legal chess moves using custom heuristics.

### `src/bot/evaluateBlackjackOption.js`

Scores blackjack recovery options using Monte Carlo odds, recovery utility, stake cost, turn cost, threat penalty, deficit pressure, and remaining attempts.

### `src/bot/chooseRecoveryTarget.js`

Finds legal captured pieces that can be recovered and scores their usefulness.

### `src/bot/chooseStakePieces.js`

Finds legal stake pieces and generates stake combinations for recovery attempts.

### `src/rules/blackjackLimits.js`

Tracks normal blackjack usage and limits. The default normal limit is 5 attempts per player.

### `src/rules/stakeSafety.js`

Checks whether removing a staked piece would expose the player's king.

### `server.js`

Serves the built app and manages WebSocket friend rooms.

---

## Installation

```bash
git clone https://github.com/zga21/THE-ROYAL-GAMBIT2.git
cd THE-ROYAL-GAMBIT2
npm install
```

---

## Running in Development

```bash
npm run dev
```

The Vite dev server runs on `127.0.0.1`.

---

## Building

```bash
npm run build
```

This creates the production build inside `dist/`.

---

## Running Friend Mode / Local Server

Build first:

```bash
npm run build
```

Then run:

```bash
npm run serve
```

Or build and serve in one command:

```bash
npm run friend
```

The server defaults to port `5174` unless `PORT` is set.

---

## Running Tests

```bash
npm test
```

The project uses Node's built-in test runner through `node --test`.

Important: if no test files are present, this command will not prove the game is correct. The highest-value tests to add are:

- Blackjack round state transitions.
- Monte Carlo output shape and rate bounds.
- Stake safety for pinned pieces.
- Blackjack attempt-limit enforcement.
- Recovery-square legality.
- Bot action choice when blackjack EV is clearly better/worse than a chess move.

---

## Available Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the Vite development server. |
| `npm test` | Run Node tests. |
| `npm run build` | Build the app for production. |
| `npm run preview` | Preview the production build locally. |
| `npm run serve` | Serve the built app through Express/WebSocket server. |
| `npm run friend` | Build the app and start the friend-mode server. |

---

## Strengths

- The concept is original enough to be worth showing.
- The blackjack mechanic is connected to material imbalance rather than being decorative.
- The bot considers both chess moves and blackjack recovery options.
- Monte Carlo odds make the blackjack AI decision more defensible.
- The project now has better separation than before through `ChessBoard`, `SidePanel`, and blackjack state helpers.
- The theme system is clean and extendable.

---

## Weaknesses / Next Improvements

This project is promising, but these are the areas that still make it look like a prototype:

1. **`App.jsx` is still too large.**  
   Move chess state, blackjack state, bot turns, and multiplayer sync into separate hooks.

2. **Rules need player-facing documentation inside the app.**  
   A new player will not instantly understand stake matching, recovery eligibility, king gamble, and blackjack limits.

3. **Tests need to become serious.**  
   The project now has an `npm test` command, but the important part is coverage of the custom rules. Chess.js already handles chess. Your risk is the variant logic.

4. **Monte Carlo results should be visible somewhere.**  
   Add a small developer/statistics panel showing bot blackjack win rate, loss rate, tie rate, simulation count, and selected strategy. That would make the engineering behind the game obvious.

5. **Friend rooms are memory-only.**  
   This is fine for local play, but hosted multiplayer needs persistence, reconnect handling, and better room lifecycle management.

6. **The README needs real screenshots.**  
   Without visuals, the project still undersells itself. Add the images listed at the top of this README.

---

## Suggested Roadmap

### Version 1 — Make it presentable

- Add screenshots to `docs/images/`.
- Add an in-game rules modal.
- Add tests for blackjack and staking rules.
- Reduce `App.jsx` into focused hooks.

### Version 2 — Make it impressive

- Add Monte Carlo stats display.
- Add named bot personalities.
- Add game history and move log.
- Add stronger animations for recovery/stake outcomes.
- Add deployment instructions.

### Version 3 — Make it defensible

- Add persistent multiplayer rooms.
- Add reconnection support.
- Add matchmaking or lobby flow.
- Add serious balancing data from simulated games.
- Add a formal rulebook.

---

## Project Vision

**The Royal Gambit** asks:

> What if losing material in chess did not simply mean decline, but opened a dangerous comeback route?

The goal is to create a chess variant that feels tactical, cinematic, royal, and psychologically sharp. A player should constantly ask:

```text
Do I play the board, or do I risk the crown?
```
