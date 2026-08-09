# The Royal Gambit

The Royal Gambit is a browser-based chess variant that combines standard chess with a blackjack recovery mechanic. It is built with React, Vite, and chess.js, with a Stockfish-backed bot and online friend rooms.

## Links

- Live demo: https://royalgambit.vercel.app/
- Source code: https://github.com/zga21/THE-ROYAL-GAMBIT

## Overview

Players make normal legal chess moves, but a losing player can sometimes risk active material in a blackjack hand to recover captured pieces. The result is a tactical chess game with an extra risk-management layer around material, tempo, and comeback decisions.

## Highlights

- Standard chess legality powered by `chess.js`
- Checkmate, stalemate, castling, promotion, and threefold-repetition draw handling
- Blackjack recovery system with staking, recovery targets, and a 5-use normal blackjack limit per player
- King Gamble survival mechanic for lone-king positions
- Pinned-stake safety rule so players cannot risk pieces that expose their own king
- Stockfish-backed bot move selection with custom Royal Gambit expected-value logic
- Monte Carlo blackjack odds for bot recovery decisions
- Friend rooms with local WebSocket sync and Vercel serverless HTTP polling
- Three full UI themes: Royal, Pink & White, and Orange & Black
- Responsive board UI with board flipping and shareable game links

## Tech Stack

| Area | Technology |
|---|---|
| Frontend | React 19 |
| Build Tool | Vite 6 |
| Chess Rules | chess.js |
| Bot Chess Engine | Stockfish worker |
| Blackjack Odds | Monte Carlo simulation |
| Local Multiplayer | Express + ws |
| Vercel Multiplayer | Serverless API routes with optional KV/Upstash Redis |
| Styling | CSS variables and responsive CSS |

## Architecture

```text
.
|-- api/                 # Vercel serverless room-sync endpoints
|-- public/stockfish/    # Browser Stockfish worker assets
|-- server.js            # Local Express/WebSocket friend server
|-- src/
|   |-- blackjack/       # Blackjack round state, simulation, odds, strategies
|   |-- bot/             # Bot profiles, Stockfish integration, EV scoring
|   |-- components/      # ChessBoard and SidePanel UI components
|   |-- rules/           # Material values, recovery, repetition, stake safety
|   |-- App.jsx          # Main app orchestration
|   |-- main.jsx
|   `-- styles.css
|-- test/                # Rule-level tests
|-- vercel.json
`-- package.json
```

## Gameplay Systems

### Chess Core

The app uses `chess.js` for legal move generation and game-ending states. A parallel piece model tracks Royal Gambit-specific data such as original square, captured state, promotion state, recovery eligibility, and temporary protection.

### Blackjack Recovery

Normal blackjack is available only when the active player is behind by enough material, is not in check, has a legal recovery target, can stake safe active material, and still has normal blackjack attempts remaining.

Queen is worth 9, rook 5, bishop 3, knight 3, and pawn 1. Starting material is 40 per side.

### King Gamble

When a player has only their king, they can use the King Gamble mechanic if they are not in check and are not blocked by cooldown. Losing the blackjack hand does not end the game by itself; only checkmate ends the crown.

### Bot Decision Engine

The bot compares possible actions on a centipawn-like scale:

```text
best action = max(chess move EV, normal blackjack EV, king gamble EV)
```

Stockfish supplies the best normal chess move and evaluation. The custom Royal Gambit layer scores blackjack recovery, stake risk, remaining attempts, material deficit, skip-turn cost, and king-gamble pressure.

Debug logging is gated behind:

```text
VITE_BOT_DEBUG=true
```

## Running Locally

Install dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Build for production:

```bash
npm run build
```

## Local Friend Mode

Build and run the local WebSocket server:

```bash
npm run friend
```

The local friend server runs on port `5174` by default.

## Vercel Deployment

The repo includes `vercel.json` and serverless API routes, so it can be imported directly into Vercel.

Recommended Vercel settings:

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

Friend links on Vercel use `/api/room` HTTP polling instead of the local `/ws` server.

For reliable deployed multiplayer, add Vercel KV or Upstash Redis REST variables:

```text
KV_REST_API_URL
KV_REST_API_TOKEN
```

Upstash-compatible names are also supported:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

Optional:

```text
PUBLIC_ORIGIN=https://royalgambit.vercel.app
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the local Vite dev server |
| `npm test` | Run the Node test suite |
| `npm run build` | Build the production app |
| `npm run preview` | Preview the production build locally |
| `npm run serve` | Serve the built app with Express |
| `npm run friend` | Build and start the local friend server |

## Tests

The test suite covers core rule and bot-decision helpers:

- Blackjack Monte Carlo rates
- Bot action fallback behaviour
- King Gamble availability
- Material-value conversion
- Threefold repetition
- Normal blackjack attempt limits
- Pinned stake safety
- Piece recovery rules

## Roadmap

- Add an in-app rules reference
- Expand browser-level multiplayer tests
- Add match history and game review tools
- Improve mobile controls and board animations
- Add more bot personalities on top of rating levels
