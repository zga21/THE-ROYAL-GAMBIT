# The Royal Gambit

**The Royal Gambit** is a browser-based chess variant that combines classical chess with a blackjack-style recovery mechanic. The project is built as a React + Vite web app and uses `chess.js` for legal chess move validation. It includes a local Express/WebSocket server for same-network play and Vercel serverless room sync for deployed friend links.

This is not just a standard chessboard. The game experiments with risk, recovery, material imbalance, and strategic gambling. When a player falls behind, they can use a limited blackjack challenge to try to recover captured pieces by staking equivalent material.

## Current Status

The project currently includes:

- A playable chess interface.
- Classical move legality through `chess.js`.
- Custom blackjack challenge rules.
- Piece staking and recovery logic.
- King-gamble cooldown behaviour.
- Bot play with rating-based difficulty profiles and a Stockfish-backed chess move candidate.
- Friend-room multiplayer over local WebSockets or Vercel HTTP polling.
- Shareable game-state URLs.
- Three visual themes: Royal, Pink & White, and Orange & Black.
- A responsive UI with a right-side control/status panel.

## Tech Stack

| Area | Technology |
|---|---|
| Frontend | React 19 |
| Build Tool | Vite 6 |
| Chess Rules | chess.js |
| Icons | lucide-react |
| Local Multiplayer Server | Express + ws |
| Vercel Multiplayer Sync | Serverless API routes with optional Vercel KV / Upstash Redis |
| Language | JavaScript / JSX / CSS |

## How the Game Works

### 1. Normal Chess Foundation

The board starts from a standard chess position. Legal moves, check, checkmate, stalemate, draw detection, castling, promotion, and turn handling are managed through `chess.js`.

The app keeps its own piece model alongside the chess engine. This allows the game to track extra information that normal chess does not need, such as:

- Original piece type.
- Original square.
- Captured state.
- Promotion state.
- Custom recovery eligibility.
- Staked pieces during blackjack challenges.

### 2. Blackjack Recovery Mechanic

The main variant mechanic is the blackjack challenge.

A player can attempt a blackjack recovery only when the rules allow it. The current implementation requires conditions such as:

- The game must be active.
- The player must be the side to move.
- The player must not currently be in check.
- The player must be behind by enough material.
- The player must have recoverable captured pieces.
- The original recovery square must be empty.
- The player must stake active material equal to the recovery value.
- The stake must not illegally expose the king.
- Normal blackjack usage must remain within the per-player limit.

The default normal blackjack limit is currently **5 attempts per player**.

### 3. Staking Rules

To recover a captured piece, the player must stake active pieces with matching material value. For example, recovering a rook requires a stake value of 5.

The project includes safety checks so a player cannot stake a piece if removing that piece would expose their own king to check.

### 4. King Gamble / Lone King Logic

The project includes special logic for king-related gambling states. The app tracks loss streaks, cooldown status, and whether the king must move from a required square before gambling can resume.

This is one of the more experimental areas of the game design and should be treated carefully when expanding the rule system.

### 5. Bot Mode

The game includes bot play with multiple rating labels, from beginner levels to elite-style difficulty labels.

Version 3 uses a unified bot decision engine. On each bot turn it compares three candidate action families on a shared centipawn-like scale:

- Normal chess moves from Stockfish, with the custom heuristic evaluator kept as a fallback.
- Normal blackjack recovery expected value.
- King-gamble / lone-king blackjack expected value.

The bot chooses blackjack only when the expected value clears the chess move by its rating-based risk margin.

## Main Features

### Chessboard

- Standard 8x8 board.
- Click-based piece movement.
- Legal move hints.
- Capture hints.
- Castling support.
- Promotion support.
- Board flip support.
- Captured-piece tracking.

### Blackjack Challenge

- Card deck generation.
- Hit / stand flow.
- Ace handling.
- Dealer comparison.
- Win / lose / tie result handling.
- Captured-piece recovery after successful challenges.
- Staked-piece loss after failed challenges.

### Bot AI

- Rating levels from 200 to 2600.
- Skill-dependent noise and blunder chance.
- Softmax move selection for weaker bots.
- More deterministic play for stronger bots.
- Blackjack decision-making based on expected value.
- King-gamble decision-making based on expected value.
- Stockfish worker assets served from `public/stockfish/`.

### Friend Mode

- Room creation.
- White/black/spectator assignment.
- WebSocket state sync locally.
- HTTP polling state sync on Vercel.
- LAN link support through the local server.
- Shareable invite links.

### Themes

The app currently has three visual themes:

1. **Royal** — dark/gold luxury chess theme.
2. **Pink & White** — bright playful theme.
3. **Orange & Black** — high-contrast orange/black theme.

Theme colours are controlled through CSS variables, so adding more themes should be straightforward.

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
│   ├── bot
│   │   ├── botLevels.js
│   │   ├── botProfiles.js
│   │   ├── chooseBotAction.js
│   │   ├── evaluateBlackjackOption.js
│   │   ├── evaluateChessMove.js
│   │   └── other bot helper files
│   ├── blackjack
│   │   └── blackjack odds / helper logic
│   └── rules
│       ├── blackjackLimits.js
│       └── stakeSafety.js
└── README.md
```

## Important Files

### `index.html`

The Vite HTML entry point. It mounts the React app into the `#root` element and loads `src/main.jsx`.

### `src/main.jsx`

The React entry file. It imports the global stylesheet and renders the main `App` component inside `React.StrictMode`.

### `src/App.jsx`

The main application file. It holds the central game state, board rendering, chess movement, blackjack flow, room/share logic, bot interaction, theme selection, and UI panels.

This file currently does a lot. Long-term, it should be split into smaller components and hooks.

### `src/styles.css`

The main stylesheet. It defines the global layout, board appearance, right-side panels, buttons, modals, blackjack table styling, and the theme system.

The three current themes are implemented using CSS custom properties:

- `.theme-royal`
- `.theme-pink`
- `.theme-orange`

### `server.js`

The local production/friend-mode server.

It:

- Serves the built Vite app from `dist/`.
- Starts an Express HTTP server.
- Creates a WebSocket server on `/ws`.
- Manages rooms in memory.
- Assigns players as white, black, or spectator.
- Broadcasts synced game state between room clients.
- Provides `/api/info` for LAN origin information.

The deployed Vercel version uses `api/info.js` and `api/room.js` instead of this long-running server.

### `src/rules/blackjackLimits.js`

Defines and manages the normal blackjack attempt limit. The current default is 5 normal blackjack attempts per player.

### `src/rules/stakeSafety.js`

Checks whether staked pieces can be removed without exposing the staking player’s king to check.

### `src/bot/botLevels.js`

Defines rating levels and converts a rating into skill parameters such as:

- Search depth.
- Evaluation noise.
- Blunder chance.
- Mistake chance.
- Material awareness.
- Tactical awareness.
- King-safety awareness.
- Softmax temperature.

### `src/bot/botProfiles.js`

Turns bot rating configs into full bot behaviour profiles. It adds blackjack-related personality parameters such as risk tolerance, resource discipline, stake awareness, and blackjack strategy.

### `src/bot/evaluateChessMove.js`

Scores legal chess moves using custom heuristics. This is the main move-evaluation layer for the bot.

### `src/bot/evaluateBlackjackOption.js`

Scores whether the bot should use blackjack instead of making a chess move. It considers recovery value, stake cost, skip-turn cost, opponent threat, material deficit, and remaining blackjack attempts.

### `src/bot/chooseBotAction.js`

Compares the best chess move, normal blackjack EV, and king-gamble EV on a shared centipawn-like scale, then returns the bot's selected action.

### `src/rules/materialValues.js`

Defines simple piece values for game rules and centipawn values for bot evaluation.

### `src/rules/repetition.js`

Tracks playable position keys and applies an automatic draw on the third repetition.

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/zga21/THE-ROYAL-GAMBIT2.git
cd THE-ROYAL-GAMBIT2
npm install
```

## Running in Development

```bash
npm run dev
```

This starts the Vite dev server on `127.0.0.1`.

## Building for Production

```bash
npm run build
```

This creates a production build inside `dist/`.

## Running Friend Mode / Local Server

Build the project first:

```bash
npm run build
```

Then start the server:

```bash
npm run serve
```

Or use:

```bash
npm run friend
```

The server runs on port `5174` by default unless a different `PORT` environment variable is provided.

## Deploying to Vercel

The project includes `vercel.json` and serverless API routes under `api/`, so it can be imported into Vercel directly from GitHub.

Basic setup:

```bash
npm run build
```

Then push to GitHub and import the repository in Vercel.

Vercel settings:

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

Friend links on Vercel use HTTP polling through `/api/room` instead of the local `/ws` WebSocket server. This is better suited to serverless hosting and means a shared link like:

```text
https://your-project.vercel.app/?room=abc123&seat=black
```

can work without your laptop being on the same network.

For quick testing, rooms can use temporary in-memory storage. For reliable multiplayer on Vercel, add Vercel KV or Upstash Redis REST environment variables:

```text
KV_REST_API_URL
KV_REST_API_TOKEN
```

Upstash-compatible names also work:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

Optional:

```text
PUBLIC_ORIGIN=https://your-project.vercel.app
```

The local friend server remains available with:

```bash
npm run friend
```

## Available NPM Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the Vite development server. |
| `npm test` | Run the Node test suite. |
| `npm run build` | Build the app for production. |
| `npm run preview` | Preview the Vite production build locally. |
| `npm run serve` | Serve the built app with the Express/WebSocket server. |
| `npm run friend` | Build the app and then start the friend-mode server. |

## Design Notes

The strongest part of this project is the game concept: it is not a clone of normal chess. The blackjack recovery system creates a second strategic layer around risk, comeback mechanics, and material valuation.

The weakest part right now is architecture. `App.jsx` is carrying too much responsibility. It currently mixes game-state logic, UI rendering, blackjack handling, multiplayer sync, bot calls, and theme management. That is fine for a prototype, but it will become painful if the project grows.

## Recommended Next Improvements

### High Priority

- Split `App.jsx` into smaller components.
- Move blackjack state transitions into a dedicated hook or state machine.
- Move chessboard rendering into a separate `ChessBoard` component.
- Move side-panel UI into separate components.
- Expand test coverage around room sync and cinematic blackjack flows.
- Add a dev-only bot decision inspector panel.

### Medium Priority

- Add persistent game history.
- Add undo/redo reliability checks.
- Add online deployment instructions.
- Add a proper rules page inside the app.
- Add screenshots or GIFs to the README.
- Add mobile polish for smaller screens.

### Future Ideas

- Ranked bot personalities with named characters.
- Defence/strategy-themed modes.
- More comeback mechanics with strict balancing.
- Match history and statistics.
- Timed games.
- Spectator mode improvements.
- Cloud-hosted multiplayer rooms.

## Known Limitations

- Local multiplayer rooms are stored in memory, so they reset when the local server restarts.
- Deployed multiplayer should use Vercel KV or Upstash Redis REST variables for reliable room storage across serverless instances.
- Stockfish runs in the browser through local worker assets, with heuristic fallback if it cannot answer.
- Automated tests currently cover core rule and bot-decision helpers, but not full browser flows.
- Some core logic is still concentrated in `App.jsx`.
- The blackjack rules are custom and should be documented clearly for players inside the UI.

## Project Vision

The Royal Gambit is an experimental chess variant built around the question:

> What if losing material did not simply mean falling behind, but opened a risky strategic route back into the game?

The aim is to create a game that feels royal, cinematic, tactical, and unpredictable while still respecting the structure of chess.
