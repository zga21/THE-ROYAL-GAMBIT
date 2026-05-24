import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import {
  BadgeAlert,
  Bot,
  CircleDot,
  Copy,
  Crown,
  Link,
  RotateCcw,
  RotateCw,
  Shield,
  Spade,
  Swords,
  Users,
} from 'lucide-react';

const PIECE_VALUES = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 1,
};

const DEFAULT_KING_GAMBLE_TRACKER = {
  lossStreak: { white: 0, black: 0 },
  cooldown: { white: false, black: false },
  requiredKingMoveFrom: { white: null, black: null },
};

const TYPE_FROM_CHESS = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

const CHESS_FROM_TYPE = {
  pawn: 'p',
  knight: 'n',
  bishop: 'b',
  rook: 'r',
  queen: 'q',
  king: 'k',
};

const COLOR_FROM_CHESS = {
  w: 'white',
  b: 'black',
};

const CHESS_FROM_COLOR = {
  white: 'w',
  black: 'b',
};

const PIECE_GLYPHS = {
  white: {
    king: '♔',
    queen: '♕',
    rook: '♖',
    bishop: '♗',
    knight: '♘',
    pawn: '♙',
  },
  black: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟',
  },
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];
const PROMOTIONS = ['queen', 'rook', 'bishop', 'knight'];
const BOT_RATINGS = Array.from({ length: 10 }, (_, index) => 200 + index * 200);
const CARD_SUITS = ['♠', '♥', '♦', '♣'];
const CARD_RANKS = [
  { label: 'A', value: 11 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5', value: 5 },
  { label: '6', value: 6 },
  { label: '7', value: 7 },
  { label: '8', value: 8 },
  { label: '9', value: 9 },
  { label: '10', value: 10 },
  { label: 'J', value: 10 },
  { label: 'Q', value: 10 },
  { label: 'K', value: 10 },
];

function opposite(color) {
  return color === 'white' ? 'black' : 'white';
}

function labelColor(color) {
  return color[0].toUpperCase() + color.slice(1);
}

function createInitialPieces() {
  const pieces = [];
  const addPiece = (owner, type, square, suffix) => {
    pieces.push({
      id: `${owner}_${type}_${suffix}`,
      owner,
      type,
      originalType: type,
      originalSquare: square,
      currentSquare: square,
      isCaptured: false,
      isPromoted: false,
    });
  };

  addPiece('white', 'rook', 'a1', 'a');
  addPiece('white', 'knight', 'b1', 'b');
  addPiece('white', 'bishop', 'c1', 'c');
  addPiece('white', 'queen', 'd1', 'd');
  addPiece('white', 'king', 'e1', 'e');
  addPiece('white', 'bishop', 'f1', 'f');
  addPiece('white', 'knight', 'g1', 'g');
  addPiece('white', 'rook', 'h1', 'h');
  FILES.forEach((file) => addPiece('white', 'pawn', `${file}2`, file));

  addPiece('black', 'rook', 'a8', 'a');
  addPiece('black', 'knight', 'b8', 'b');
  addPiece('black', 'bishop', 'c8', 'c');
  addPiece('black', 'queen', 'd8', 'd');
  addPiece('black', 'king', 'e8', 'e');
  addPiece('black', 'bishop', 'f8', 'f');
  addPiece('black', 'knight', 'g8', 'g');
  addPiece('black', 'rook', 'h8', 'h');
  FILES.forEach((file) => addPiece('black', 'pawn', `${file}7`, file));

  return pieces;
}

function makeDeck() {
  const deck = [];
  for (const suit of CARD_SUITS) {
    for (const rank of CARD_RANKS) {
      deck.push({ ...rank, suit, id: `${rank.label}${suit}-${crypto.randomUUID()}` });
    }
  }

  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function drawCard(deck) {
  const nextDeck = deck.length ? [...deck] : makeDeck();
  return [nextDeck.shift(), nextDeck];
}

function handValue(hand) {
  let total = hand.reduce((sum, card) => sum + card.value, 0);
  let aces = hand.filter((card) => card.label === 'A').length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

function resultFor(playerHand, dealerHand) {
  const player = handValue(playerHand);
  const dealer = handValue(dealerHand);
  if (player > 21) return 'lose';
  if (dealer > 21) return 'win';
  if (player > dealer) return 'win';
  if (player < dealer) return 'lose';
  return 'tie';
}

function normalizeKingGambleTracker(tracker) {
  return {
    lossStreak: {
      white: tracker?.lossStreak?.white ?? 0,
      black: tracker?.lossStreak?.black ?? 0,
    },
    cooldown: {
      white: tracker?.cooldown?.white ?? false,
      black: tracker?.cooldown?.black ?? false,
    },
    requiredKingMoveFrom: {
      white: tracker?.requiredKingMoveFrom?.white ?? null,
      black: tracker?.requiredKingMoveFrom?.black ?? null,
    },
  };
}

function resetKingGambleCooldown(tracker, color) {
  const next = normalizeKingGambleTracker(tracker);
  return {
    lossStreak: { ...next.lossStreak, [color]: 0 },
    cooldown: { ...next.cooldown, [color]: false },
    requiredKingMoveFrom: { ...next.requiredKingMoveFrom, [color]: null },
  };
}

function noteKingGambleResult(tracker, color, result, kingSquare = null) {
  if (result !== 'lose') return resetKingGambleCooldown(tracker, color);

  const next = normalizeKingGambleTracker(tracker);
  const losses = next.lossStreak[color] + 1;
  const cooldown = losses >= 2;
  return {
    lossStreak: { ...next.lossStreak, [color]: losses },
    cooldown: { ...next.cooldown, [color]: cooldown },
    requiredKingMoveFrom: {
      ...next.requiredKingMoveFrom,
      [color]: cooldown ? kingSquare : next.requiredKingMoveFrom[color],
    },
  };
}

function clearKingGambleCooldownAfterMove(tracker, color, played) {
  const next = normalizeKingGambleTracker(tracker);
  const requiredFrom = next.requiredKingMoveFrom[color];
  const kingMovedFromRequiredSquare =
    played.piece === 'k' && (!requiredFrom || played.from === requiredFrom) && played.from !== played.to;

  return kingMovedFromRequiredSquare ? resetKingGambleCooldown(next, color) : next;
}

function statusFromChess(chess) {
  if (chess.isCheckmate()) return 'checkmate';
  if (chess.isStalemate()) return 'stalemate';
  if (chess.isDraw()) return 'draw';
  return 'active';
}

function materialFor(pieces, color) {
  return pieces
    .filter((piece) => piece.owner === color && !piece.isCaptured)
    .reduce((sum, piece) => sum + PIECE_VALUES[piece.type], 0);
}

function deficitFor(pieces, color) {
  return materialFor(pieces, opposite(color)) - materialFor(pieces, color);
}

function pieceAt(pieces, square) {
  return pieces.find((piece) => piece.currentSquare === square && !piece.isCaptured) ?? null;
}

function cloneChess(chess) {
  return new Chess(chess.fen());
}

function fenWithTurn(fen, color) {
  const parts = fen.split(' ');
  parts[1] = CHESS_FROM_COLOR[color];
  return parts.join(' ');
}

function getLegalMoves(chess, square, pieces, protection) {
  const moves = chess.moves({ square, verbose: true });
  if (!protection.pieceIds.length || COLOR_FROM_CHESS[chess.turn()] !== protection.protectedAgainst) {
    return moves;
  }

  const protectedSquares = protection.pieceIds
    .map((id) => pieces.find((piece) => piece.id === id)?.currentSquare)
    .filter(Boolean);

  return moves.filter((move) => !protectedSquares.includes(move.to));
}

function getCastleMoveForPair(chess, pieces, protection, firstSquare, secondSquare) {
  const firstPiece = pieceAt(pieces, firstSquare);
  const secondPiece = pieceAt(pieces, secondSquare);
  if (!firstPiece || !secondPiece || firstPiece.owner !== secondPiece.owner) return null;

  const king = firstPiece.type === 'king' ? firstPiece : secondPiece.type === 'king' ? secondPiece : null;
  const rook = firstPiece.type === 'rook' ? firstPiece : secondPiece.type === 'rook' ? secondPiece : null;
  if (!king || !rook || rook.originalType !== 'rook') return null;
  if (COLOR_FROM_CHESS[chess.turn()] !== king.owner) return null;

  const castleDestinations = {
    'white:h1': 'g1',
    'white:a1': 'c1',
    'black:h8': 'g8',
    'black:a8': 'c8',
  };
  const destination = castleDestinations[`${king.owner}:${rook.currentSquare}`];
  if (!destination || rook.originalSquare !== rook.currentSquare) return null;

  return (
    getLegalMoves(chess, king.currentSquare, pieces, protection).find(
      (move) => move.to === destination && (move.flags.includes('k') || move.flags.includes('q')),
    ) ?? null
  );
}

function getCastlePartnerSquares(chess, pieces, protection, square) {
  const selectedPiece = pieceAt(pieces, square);
  if (!selectedPiece || selectedPiece.owner !== COLOR_FROM_CHESS[chess.turn()]) return [];

  if (selectedPiece.type === 'king') {
    return ['a1', 'h1', 'a8', 'h8'].filter((rookSquare) =>
      Boolean(getCastleMoveForPair(chess, pieces, protection, square, rookSquare)),
    );
  }

  if (selectedPiece.type === 'rook') {
    return ['e1', 'e8'].filter((kingSquare) =>
      Boolean(getCastleMoveForPair(chess, pieces, protection, square, kingSquare)),
    );
  }

  return [];
}

function getBoardSquares(flipped = false) {
  const ranks = flipped ? [...RANKS].reverse() : RANKS;
  const files = flipped ? [...FILES].reverse() : FILES;
  return ranks.flatMap((rank) => files.map((file) => `${file}${rank}`));
}

function recoveryValue(piece) {
  return PIECE_VALUES[piece.originalType];
}

function canOpponentAnswerProtectedCheck(chess, targetPieces, winner) {
  const simulation = cloneChess(chess);
  for (const piece of targetPieces) {
    simulation.put(
      { type: CHESS_FROM_TYPE[piece.originalType], color: CHESS_FROM_COLOR[piece.owner] },
      piece.originalSquare,
    );
  }

  const defender = opposite(winner);
  const responseChess = new Chess(fenWithTurn(simulation.fen(), defender));
  if (!responseChess.isCheck()) return true;

  const protectedSquares = targetPieces.map((piece) => piece.originalSquare);
  const responses = responseChess
    .moves({ verbose: true })
    .filter((move) => !protectedSquares.includes(move.to));
  return responses.length > 0;
}

function isLoneKing(pieces, color) {
  const active = pieces.filter((piece) => piece.owner === color && !piece.isCaptured);
  return active.length === 1 && active[0].type === 'king';
}

function canStartBlackjackChallenge(state, player, targetCapturedPieceIds, stakedPieceIds) {
  const { chess, pieces, status } = state;
  if (COLOR_FROM_CHESS[chess.turn()] !== player) return false;
  if (status !== 'active') return false;
  if (chess.isCheck()) return false;
  if (normalizeKingGambleTracker(state.kingGamble).cooldown[player]) return false;
  if (deficitFor(pieces, player) < 5) return false;

  const targetIds = Array.isArray(targetCapturedPieceIds) ? targetCapturedPieceIds : [targetCapturedPieceIds];
  if (!targetIds.length || new Set(targetIds).size !== targetIds.length) return false;
  const targets = targetIds.map((id) => pieces.find((piece) => piece.id === id));
  if (targets.some((target) => !target || target.owner !== player || !target.isCaptured)) return false;
  if (targets.some((target) => pieceAt(pieces, target.originalSquare))) return false;

  const loneKing = isLoneKing(pieces, player);
  const staked = stakedPieceIds.map((id) => pieces.find((piece) => piece.id === id));
  if (staked.some((piece) => !piece)) return false;
  if (staked.some((piece) => piece.owner !== player || piece.isCaptured || !piece.currentSquare)) return false;
  if (!loneKing && staked.some((piece) => piece.type === 'king')) return false;

  const stakeValue = staked.reduce((sum, piece) => sum + PIECE_VALUES[piece.type], 0);
  const targetValue = targets.reduce((sum, target) => sum + recoveryValue(target), 0);
  if (stakeValue !== targetValue) return false;

  return canOpponentAnswerProtectedCheck(chess, targets, player);
}

function applyMoveToPieces(pieces, move) {
  const nextPieces = pieces.map((piece) => ({ ...piece }));
  const mover = nextPieces.find((piece) => piece.currentSquare === move.from && !piece.isCaptured);
  if (!mover) return nextPieces;

  const captureSquare = move.flags.includes('e') ? `${move.to[0]}${move.from[1]}` : move.to;
  const captured = nextPieces.find((piece) => piece.currentSquare === captureSquare && !piece.isCaptured);
  if (captured && captured.owner !== mover.owner) {
    captured.isCaptured = true;
    captured.currentSquare = null;
    if (captured.isPromoted) {
      captured.type = captured.originalType;
      captured.isPromoted = false;
    }
  }

  mover.currentSquare = move.to;
  if (move.promotion) {
    mover.type = TYPE_FROM_CHESS[move.promotion];
    mover.isPromoted = true;
  }

  if (move.flags.includes('k') || move.flags.includes('q')) {
    const rookMove =
      move.to === 'g1'
        ? ['h1', 'f1']
        : move.to === 'c1'
          ? ['a1', 'd1']
          : move.to === 'g8'
            ? ['h8', 'f8']
            : ['a8', 'd8'];
    const rook = nextPieces.find((piece) => piece.currentSquare === rookMove[0] && !piece.isCaptured);
    if (rook) rook.currentSquare = rookMove[1];
  }

  return nextPieces;
}

function passTurnChess(chess, nextColor) {
  return new Chess(fenWithTurn(chess.fen(), nextColor));
}

function evaluateAfterBlackjack(chess, nextColor) {
  const nextChess = passTurnChess(chess, nextColor);
  return { chess: nextChess, status: statusFromChess(nextChess) };
}

function initialGameState() {
  const chess = new Chess();
  return {
    chess,
    pieces: createInitialPieces(),
    status: 'active',
    protection: { pieceIds: [], protectedAgainst: null },
    kingGamble: normalizeKingGambleTracker(),
  };
}

function stateForUrl(game, mode, botRating) {
  return {
    fen: game.chess.fen(),
    pieces: game.pieces,
    status: game.status,
    protection: game.protection,
    kingGamble: normalizeKingGambleTracker(game.kingGamble),
    mode,
    botRating,
  };
}

function serializeGame(game) {
  return {
    fen: game.chess.fen(),
    pieces: game.pieces,
    status: game.status,
    protection: game.protection,
    kingGamble: normalizeKingGambleTracker(game.kingGamble),
  };
}

function hydrateGame(serialized) {
  return {
    chess: new Chess(serialized.fen),
    pieces: serialized.pieces,
    status: serialized.status,
    protection: serialized.protection ?? { pieceIds: [], protectedAgainst: null },
    kingGamble: normalizeKingGambleTracker(serialized.kingGamble),
  };
}

function encodeShareState(game, mode, botRating) {
  const payload = JSON.stringify(stateForUrl(game, mode, botRating));
  return btoa(encodeURIComponent(payload));
}

function decodeShareState() {
  if (typeof window === 'undefined') return null;
  const encoded = new URLSearchParams(window.location.search).get('game');
  if (!encoded) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(atob(encoded)));
    return {
      game: {
        chess: new Chess(parsed.fen),
        pieces: parsed.pieces,
        status: parsed.status,
        protection: parsed.protection ?? { pieceIds: [], protectedAgainst: null },
        kingGamble: normalizeKingGambleTracker(parsed.kingGamble),
      },
      mode: parsed.mode === 'bot' ? 'bot' : 'friend',
      botRating: BOT_RATINGS.includes(parsed.botRating) ? parsed.botRating : 800,
    };
  } catch {
    return null;
  }
}

function makeShareUrl(game, mode, botRating) {
  const url = new URL(window.location.href);
  url.searchParams.set('game', encodeShareState(game, mode, botRating));
  return url.toString();
}

function makeFriendRoomUrl(roomId, origin) {
  const url = new URL(origin || window.location.origin);
  url.searchParams.set('room', roomId);
  url.searchParams.set('seat', 'black');
  return url.toString();
}

function getRoomFromUrl() {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('room');
}

function getSeatFromUrl() {
  if (typeof window === 'undefined') return null;
  const seat = new URLSearchParams(window.location.search).get('seat');
  return seat === 'white' || seat === 'black' ? seat : null;
}

function makeRoomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function sharedStatePayload(game, playMode, botRating, message, round, kingGambleDecision) {
  return {
    game: serializeGame(game),
    playMode,
    botRating,
    message,
    round,
    kingGambleDecision,
  };
}

function hydrateSharedState(payload) {
  return {
    game: hydrateGame(payload.game),
    playMode: payload.playMode === 'bot' ? 'bot' : 'friend',
    botRating: BOT_RATINGS.includes(payload.botRating) ? payload.botRating : 800,
    message: payload.message ?? 'Synced game.',
    round: payload.round ?? null,
    kingGambleDecision: payload.kingGambleDecision ?? null,
  };
}

function legalMovesForState(chess, pieces, protection) {
  const moves = chess.moves({ verbose: true });
  if (!protection.pieceIds.length || COLOR_FROM_CHESS[chess.turn()] !== protection.protectedAgainst) {
    return moves;
  }

  const protectedSquares = protection.pieceIds
    .map((id) => pieces.find((piece) => piece.id === id)?.currentSquare)
    .filter(Boolean);
  return moves.filter((move) => !protectedSquares.includes(move.to));
}

function clearProtectionAfterMove(protection, movingColor) {
  return protection.protectedAgainst === movingColor ? { pieceIds: [], protectedAgainst: null } : protection;
}

function evaluatePosition(chess, pieces, botColor) {
  if (chess.isCheckmate()) {
    return COLOR_FROM_CHESS[chess.turn()] === botColor ? -100000 : 100000;
  }
  if (chess.isDraw() || chess.isStalemate()) return 0;

  const materialScore = (materialFor(pieces, botColor) - materialFor(pieces, opposite(botColor))) * 100;
  const mobilityScore =
    COLOR_FROM_CHESS[chess.turn()] === botColor ? chess.moves().length * 2 : -chess.moves().length * 2;
  const checkScore = chess.isCheck() ? (COLOR_FROM_CHESS[chess.turn()] === botColor ? -25 : 25) : 0;
  return materialScore + mobilityScore + checkScore;
}

function searchBotMove(chess, pieces, protection, depth, botColor) {
  if (depth === 0 || chess.isGameOver()) {
    return evaluatePosition(chess, pieces, botColor);
  }

  const moves = legalMovesForState(chess, pieces, protection);
  if (!moves.length) return evaluatePosition(chess, pieces, botColor);

  const maximizing = COLOR_FROM_CHESS[chess.turn()] === botColor;
  let best = maximizing ? -Infinity : Infinity;
  for (const move of moves) {
    const nextChess = cloneChess(chess);
    const played = nextChess.move(move);
    const nextPieces = applyMoveToPieces(pieces, played);
    const nextProtection = clearProtectionAfterMove(protection, COLOR_FROM_CHESS[played.color]);
    const score = searchBotMove(nextChess, nextPieces, nextProtection, depth - 1, botColor);
    best = maximizing ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}

function chooseBotMove(game, rating) {
  const botColor = COLOR_FROM_CHESS[game.chess.turn()];
  const moves = legalMovesForState(game.chess, game.pieces, game.protection);
  if (!moves.length) return null;

  const depth = rating >= 1600 ? 3 : rating >= 900 ? 2 : 1;
  const noise = Math.max(10, 230 - rating / 9);
  const scored = moves.map((move) => {
    const nextChess = cloneChess(game.chess);
    const played = nextChess.move(move);
    const nextPieces = applyMoveToPieces(game.pieces, played);
    const nextProtection = clearProtectionAfterMove(game.protection, COLOR_FROM_CHESS[played.color]);
    return {
      move,
      score:
        searchBotMove(nextChess, nextPieces, nextProtection, depth - 1, botColor) +
        (Math.random() - 0.5) * noise,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const chaos = Math.max(0.02, 0.55 - rating / 3800);
  if (Math.random() < chaos) {
    const poolSize = Math.min(scored.length, rating < 800 ? 8 : 4);
    return scored[Math.floor(Math.random() * poolSize)].move;
  }
  return scored[0].move;
}

function findPieceCombos(pieces, maxCombos = 140) {
  const combos = [];
  const sorted = [...pieces].sort((a, b) => recoveryValue(b) - recoveryValue(a));

  function walk(index, combo) {
    if (combos.length >= maxCombos) return;
    if (combo.length) combos.push(combo);
    for (let i = index; i < sorted.length; i += 1) {
      walk(i + 1, [...combo, sorted[i]]);
    }
  }

  walk(0, []);
  return combos;
}

function findStakeCombo(activePieces, targetValue) {
  const candidates = activePieces
    .filter((piece) => piece.type !== 'king')
    .sort((a, b) => PIECE_VALUES[b.type] - PIECE_VALUES[a.type]);

  function walk(index, combo, total) {
    if (total === targetValue) return combo;
    if (total > targetValue) return null;
    for (let i = index; i < candidates.length; i += 1) {
      const found = walk(i + 1, [...combo, candidates[i]], total + PIECE_VALUES[candidates[i].type]);
      if (found) return found;
    }
    return null;
  }

  return walk(0, [], 0);
}

function recoverablePiecesForBudget(pieces, chess, player, budget) {
  return pieces.filter(
    (piece) =>
      piece.owner === player &&
      piece.isCaptured &&
      recoveryValue(piece) <= budget &&
      !pieceAt(pieces, piece.originalSquare) &&
      canOpponentAnswerProtectedCheck(chess, [piece], player),
  );
}

function chooseRecoveryTargetsForBudget(pieces, chess, player, budget) {
  const targets = recoverablePiecesForBudget(pieces, chess, player, budget);
  const combos = findPieceCombos(targets)
    .map((combo) => ({
      targets: combo,
      value: combo.reduce((sum, piece) => sum + recoveryValue(piece), 0),
    }))
    .filter((combo) => combo.value <= budget && canOpponentAnswerProtectedCheck(chess, combo.targets, player))
    .sort((a, b) => b.value - a.value || b.targets.length - a.targets.length);

  return combos[0]?.targets ?? [];
}

function chooseBotBlackjack(game, rating) {
  const player = COLOR_FROM_CHESS[game.chess.turn()];
  if (game.status !== 'active' || game.chess.isCheck() || deficitFor(game.pieces, player) < 5) return null;
  if (normalizeKingGambleTracker(game.kingGamble).cooldown[player]) return null;

  const targets = game.pieces.filter(
    (piece) =>
      piece.owner === player &&
      piece.isCaptured &&
      !pieceAt(game.pieces, piece.originalSquare) &&
      canOpponentAnswerProtectedCheck(game.chess, [piece], player),
  );
  if (!targets.length) return null;

  if (isLoneKing(game.pieces, player)) {
    const king = game.pieces.find((piece) => piece.owner === player && !piece.isCaptured && piece.type === 'king');
    const pawnTargets = chooseRecoveryTargetsForBudget(game.pieces, game.chess, player, 2).filter(
      (piece) => piece.originalType === 'pawn',
    );
    if (king && pawnTargets.length && canOpponentAnswerProtectedCheck(game.chess, pawnTargets, player)) {
      return { mode: 'king', targets: pawnTargets.slice(0, 2), stakes: [king], budget: 2, wins: 0 };
    }
    return null;
  }

  const active = game.pieces.filter((piece) => piece.owner === player && !piece.isCaptured && piece.currentSquare);
  const combos = findPieceCombos(targets)
    .map((combo) => ({
      targets: combo,
      value: combo.reduce((sum, piece) => sum + recoveryValue(piece), 0),
    }))
    .sort((a, b) => b.targets.length - a.targets.length || b.value - a.value);

  for (const combo of combos) {
    const stakes = findStakeCombo(active, combo.value);
    if (
      stakes &&
      canStartBlackjackChallenge(
        game,
        player,
        combo.targets.map((piece) => piece.id),
        stakes.map((piece) => piece.id),
      )
    ) {
      return { mode: 'standard', targets: combo.targets, stakes };
    }
  }

  return null;
}

function BlackjackTable({
  round,
  onHit,
  onStand,
  onClose,
  isAutoPlayer,
  actionsLocked = false,
  lockedLabel = 'Waiting...',
  cinematicActive = false,
}) {
  if (!round) return null;
  const playerTotal = handValue(round.playerHand);
  const dealerTotal = handValue(round.dealerHand);
  const resolved = Boolean(round.result);

  return (
    <section className="blackjack-table" aria-label="Blackjack challenge">
      <div className="table-header">
        <div>
          <span className="eyebrow">Blackjack challenge</span>
          <h2>{labelColor(round.player)} is gambling the turn</h2>
        </div>
        <Spade aria-hidden="true" />
      </div>

      <div className="hands">
        <Hand title="Challenger" hand={round.playerHand} total={playerTotal} />
        <Hand
          title="Dealer"
          hand={round.dealerHand}
          total={dealerTotal}
          hideCardIndex={!round.revealDealer ? 1 : null}
        />
      </div>

      <div className="round-detail">
        {round.mode === 'standard' ? (
          <p>
            Recovering {round.targets.map((piece) => piece.originalType).join(', ')} from{' '}
            {round.targets.map((piece) => piece.originalSquare).join(', ')}. Stake value:{' '}
            {round.stakes.reduce((sum, piece) => sum + PIECE_VALUES[piece.type], 0)}.
          </p>
        ) : (
          <p>
            Lone-king wager: up to {round.budget ?? 2} recovery point(s). Current claim:{' '}
            {round.targets.map((piece) => piece.originalSquare).join(', ') || 'none'}.
          </p>
        )}
        {round.mode === 'king' && (
          <p className="king-round-line">
            {resolved
              ? round.result === 'win'
                ? 'The king survives. Hope returns to the board.'
                : round.result === 'lose'
                  ? 'The wager fails. The king must survive the board.'
                  : 'Fate refuses to answer. The king stands alone.'
              : 'The crown is on the table...'}
          </p>
        )}
      </div>

      <div className="round-summary-grid">
        <div>
          <span>Target</span>
          <strong>
            {round.targets.map((piece) => `${piece.originalType} ${piece.originalSquare}`).join(', ') || 'None'}
          </strong>
        </div>
        <div>
          <span>Stake</span>
          <strong>
            {round.stakes
              .map((piece) => `${piece.type} ${piece.currentSquare ?? piece.originalSquare}`)
              .join(', ') || 'King'}
          </strong>
        </div>
      </div>

      <div className="round-actions">
        {cinematicActive ? (
          <>
            {resolved && (
              <strong className={`result result-${round.result}`}>
                {round.result === 'win' ? 'Win' : round.result === 'lose' ? 'Lose' : 'Push'}
              </strong>
            )}
            <strong className="thinking">Use the Royal Table controls.</strong>
          </>
        ) : !resolved ? (
          isAutoPlayer || actionsLocked ? (
            <strong className="thinking">{isAutoPlayer ? 'Bot deciding...' : lockedLabel}</strong>
          ) : (
            <>
              <button type="button" className="primary" onClick={onHit} disabled={playerTotal > 21}>
                Hit
              </button>
              <button type="button" onClick={onStand}>
                Stand
              </button>
            </>
          )
        ) : (
          <>
            <strong className={`result result-${round.result}`}>
              {round.result === 'win' ? 'Win' : round.result === 'lose' ? 'Lose' : 'Push'}
            </strong>
            <button type="button" className="primary" onClick={onClose}>
              Return to board
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function RoyalTableCinematic({
  round,
  phase,
  onHit,
  onStand,
  controlsDisabled,
  kingGambleDecision,
  kingDecisionTargets,
  selectedKingRecoveryIds,
  kingRecoveryValue,
  onToggleKingRecovery,
  onRecoverMaterial,
  onGambleAgain,
  onConfirmRecovery,
  canResolveKingGamble,
  kingDecisionReady,
}) {
  if ((!round && !kingGambleDecision) || phase === 'idle') return null;

  const isKingGamble = round?.mode === 'king' || Boolean(kingGambleDecision);
  const result = round?.result;
  const playerTotal = round ? handValue(round.playerHand) : 0;
  const showControls = phase === 'playerDecision' && !result;
  const controlsLocked =
    controlsDisabled || playerTotal > 21 || Boolean(round?.playerStood) || Boolean(round?.dealerPlaying);
  const kingPoints = kingGambleDecision?.points ?? 0;
  const kingHands = kingGambleDecision?.handCount ?? 0;
  const kingEscalation = Math.min(3, kingHands);
  const kingResultCopy =
    isKingGamble && result === 'win'
      ? {
          className: 'royal-recall',
          title: 'THE CROWN ENDURES',
          text: 'You may recover up to 2 points of material, then choose whether to gamble again.',
          label: `${kingPoints} recovery point${kingPoints === 1 ? '' : 's'} earned.`,
        }
      : isKingGamble && result === 'lose'
        ? {
            className: 'wager-claimed',
            title: 'THE WAGER FAILS',
            text: 'No material returns. The king must survive the board.',
            label: 'Lose the hand, lose the turn. Only checkmate ends the crown.',
          }
        : isKingGamble && result === 'tie'
          ? {
              className: 'fate-holds',
              title: 'FATE HOLDS THE CROWN',
              text: 'No material returns. You may choose whether to gamble again if the king is still alone.',
              label: `${kingPoints} recovery point${kingPoints === 1 ? '' : 's'} remain.`,
            }
          : null;
  const resultCopy =
    result === 'win'
      ? {
          className: 'royal-recall',
                title: 'VICTORY — Royal Recall',
          text: 'Recovered material returns. The stake survives.',
          label: pieceReturnLabel(round.targets[0]),
        }
      : result === 'lose'
        ? {
            className: 'wager-claimed',
                  title: 'DEFEAT — The Wager Is Claimed',
            text: 'Staked material is lost.',
            label: 'The velvet tray accepts the wager.',
          }
        : result === 'tie'
          ? {
              className: 'fate-holds',
                    title: 'PUSH — Fate Holds',
              text: 'No material changes. The turn is still lost.',
              label: 'The table falls silent.',
            }
          : null;
  const activeResultCopy = kingResultCopy ?? resultCopy;
  const isRecoverySelection = phase === 'recoverySelection';
  const showKingChoice = isKingGamble && phase === 'chooseContinueOrRecover' && kingGambleDecision;
  const showRecoveryAnimation = isKingGamble && phase === 'recoveryAnimation';

  return (
    <div
      className={[
        'royal-cinematic-layer',
        `phase-${phase}`,
        activeResultCopy?.className ?? '',
        isKingGamble ? 'kings-gamble-table' : '',
        `king-escalation-${kingEscalation}`,
      ].join(' ')}
    >
      <div className="spotlight-layer" />
      <div className="royal-table-vignette" />
      <div className="cinematic-title">
        <span>{isKingGamble ? "THE KING'S GAMBLE" : 'BLACKJACK CHALLENGE'}</span>
        <strong>
          {isRecoverySelection
            ? 'ROYAL RECALL'
            : showRecoveryAnimation
              ? 'THE ARMY RETURNS'
              : activeResultCopy?.title ?? (phase === 'cleanup' ? 'The table settles.' : 'The crown places its wager.')}
        </strong>
        <em>
          {isRecoverySelection
            ? 'Choose captured material to restore.'
            : showRecoveryAnimation
              ? 'Recovered material returns to the board.'
              : activeResultCopy?.text ??
            (phase === 'playerDecision'
              ? 'Choose your next move.'
              : phase === 'dealerReveal' || phase === 'dealerPlay'
                ? 'The dealer answers the crown.'
                : isKingGamble
                  ? 'The crown risks everything.'
                  : 'The crown places its wager.')}
        </em>
        {activeResultCopy?.label && <small>{activeResultCopy.label}</small>}
      </div>
      {isRecoverySelection ? (
        <KingRecoverySelection
          targets={kingDecisionTargets}
          selectedIds={selectedKingRecoveryIds}
          selectedValue={kingRecoveryValue}
          availablePoints={kingPoints}
          canAct={canResolveKingGamble}
          canConfirm={kingDecisionReady}
          onToggle={onToggleKingRecovery}
          onConfirm={onConfirmRecovery}
        />
      ) : (
        <div className="cinematic-table">
          {round && (
            <>
              <CinematicHand
                title="Dealer"
                hand={round.dealerHand}
                result={result}
                hideCardIndex={!round.revealDealer ? 1 : null}
                className="dealer-hand"
              />
              <div className="table-seal">
                <Spade size={28} aria-hidden="true" />
              </div>
              <div className="cinematic-player-zone">
                <CinematicHand title="Your Hand" hand={round.playerHand} result={result} className="player-hand" />
                {showControls && (
                  <div className="royal-table-actions" aria-label="Blackjack actions">
                    <button type="button" onClick={onHit} disabled={controlsLocked}>
                      Hit
                    </button>
                    <button type="button" onClick={onStand} disabled={controlsLocked}>
                      Stand
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
          {showKingChoice && (
            <div className="king-gamble-choice">
              <div className="king-points-meter">
                <span>Total recovery points</span>
                <strong>{kingPoints}</strong>
                <small>Hand {kingHands}</small>
              </div>
              <div className="royal-table-actions" aria-label="King's Gamble choices">
                <button type="button" onClick={onRecoverMaterial} disabled={!canResolveKingGamble || kingPoints <= 0}>
                  Recover Material
                </button>
                <button type="button" onClick={onGambleAgain} disabled={!canResolveKingGamble}>
                  Gamble Again
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {result === 'lose' && (
        <div className="discard-tray">
          <span>DISCARD</span>
        </div>
      )}
    </div>
  );
}

function KingRecoverySelection({
  targets,
  selectedIds,
  selectedValue,
  availablePoints,
  canAct,
  canConfirm,
  onToggle,
  onConfirm,
}) {
  return (
    <section className="king-recovery-selection" aria-label="King's Gamble recovery selection">
      <div className="king-recovery-meter">
        <div>
          <span>Available</span>
          <strong>{availablePoints}</strong>
        </div>
        <div>
          <span>Selected</span>
          <strong>{selectedValue}</strong>
        </div>
      </div>
      <div className="king-recovery-list">
        {targets.length ? (
          targets.map((piece) => {
            const selected = selectedIds.includes(piece.id);
            return (
              <button
                type="button"
                key={piece.id}
                className={selected ? 'selected-row' : ''}
                disabled={!canAct}
                onClick={() => onToggle(piece.id)}
              >
                <span>{PIECE_GLYPHS[piece.owner][piece.originalType]}</span>
                <strong>{piece.originalType}</strong>
                <em>{piece.originalSquare}</em>
                <b>{recoveryValue(piece)}</b>
              </button>
            );
          })
        ) : (
          <p>No valid material can currently return.</p>
        )}
      </div>
      <button type="button" className="king-confirm-recovery" disabled={!canConfirm || !canAct} onClick={onConfirm}>
        Confirm Royal Recall
      </button>
    </section>
  );
}

function CinematicHand({ title, hand, result, hideCardIndex = null, className = '' }) {
  return (
    <div className={['cinematic-hand', className].join(' ')}>
      <span>{title}</span>
      <div className="cinematic-cards">
        {hand.slice(0, 4).map((card, index) => (
          <div
            className={[
              'card-flip',
              hideCardIndex === index ? 'card-hidden' : '',
              result ? `card-${result}` : '',
            ].join(' ')}
            key={card.id}
            style={{ '--deal-index': index }}
          >
            <div className="card-face card-back">
              <Spade size={18} aria-hidden="true" />
            </div>
            {hideCardIndex !== index && (
              <div className="card-face card-front">
                <strong>{card.label}</strong>
                <span>{card.suit}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function pieceReturnLabel(piece) {
  switch (piece?.originalType) {
    case 'queen':
      return 'The Queen Returns to Court.';
    case 'rook':
      return 'The Fortress Stands Again.';
    case 'bishop':
      return 'The Bishop Answers the Crown.';
    case 'knight':
      return 'The Knight Rides Back.';
    case 'pawn':
      return 'The Pawns Return to the Line.';
    default:
      return 'The crown restores its line.';
  }
}

function Hand({ title, hand, total, hideCardIndex = null }) {
  const hasHiddenCard = hideCardIndex !== null;
  return (
    <div className="hand">
      <div className="hand-title">
        <span>{title}</span>
        <strong>{hasHiddenCard ? '?' : total}</strong>
      </div>
      <div className="cards">
        {hand.map((card, index) => (
          <div
            key={card.id}
            className={[
              'card',
              card.suit === '♥' || card.suit === '♦' ? 'red-card' : '',
              hideCardIndex === index ? 'card-back' : '',
            ].join(' ')}
            style={{ animationDelay: `${index * 160}ms` }}
          >
            {hideCardIndex === index ? (
              <>
                <span>?</span>
                <span>◆</span>
              </>
            ) : (
              <>
                <span>{card.label}</span>
                <span>{card.suit}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EndgameModal({ type, winner, onNewGame, onReviewBoard }) {
  if (!type) return null;

  const isCheckmate = type === 'checkmate';
  const title = isCheckmate ? 'CHECKMATE' : 'STALEMATE';
  const subtitle = isCheckmate
    ? winner === 'white'
      ? 'White claims the crown.'
      : 'Black claims the crown.'
    : 'No legal move remains. The crown survives, but no one wins.';

  return (
    <div className={`endgame-overlay ${isCheckmate ? 'checkmate-ending' : 'stalemate-ending'}`}>
      <section className="endgame-modal" aria-label={`${title} result`} role="dialog" aria-modal="true">
        <div className="endgame-crown" aria-hidden="true">
          <Crown size={42} />
        </div>
        <span className="eyebrow">{isCheckmate ? 'The crown has fallen' : 'The crown holds'}</span>
        <h2>{title}</h2>
        <p>{subtitle}</p>
        <div className="endgame-result-grid">
          <div>
            <span>{isCheckmate ? 'Winner' : 'Winner'}</span>
            <strong>{isCheckmate ? labelColor(winner) : 'None'}</strong>
          </div>
          <div>
            <span>Final result</span>
            <strong>{isCheckmate ? 'Checkmate' : 'Draw by stalemate'}</strong>
          </div>
        </div>
        <div className="endgame-actions">
          <button type="button" className="primary" onClick={onNewGame}>
            New Game
          </button>
          <button type="button" onClick={onReviewBoard}>
            Review Board
          </button>
        </div>
      </section>
    </div>
  );
}

function App() {
  const sharedInitial = useMemo(() => decodeShareState(), []);
  const initialRoomId = useMemo(() => getRoomFromUrl(), []);
  const initialSeat = useMemo(() => getSeatFromUrl(), []);
  const [game, setGame] = useState(() => sharedInitial?.game ?? initialGameState());
  const [playMode, setPlayMode] = useState(() => (initialRoomId ? 'friend' : sharedInitial?.mode ?? 'friend'));
  const [botRating, setBotRating] = useState(() => sharedInitial?.botRating ?? 800);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [selectedTargetIds, setSelectedTargetIds] = useState([]);
  const [selectedStakeIds, setSelectedStakeIds] = useState([]);
  const [selectedKingRecoveryIds, setSelectedKingRecoveryIds] = useState([]);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [message, setMessage] = useState(sharedInitial ? 'Loaded game from link.' : 'White to move.');
  const [round, setRound] = useState(null);
  const [cinematicPhase, setCinematicPhase] = useState('idle');
  const [kingGambleDecision, setKingGambleDecision] = useState(null);
  const [kingGambleIntro, setKingGambleIntro] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [roomId, setRoomId] = useState(initialRoomId);
  const [roomStatus, setRoomStatus] = useState(initialRoomId ? 'connecting' : 'offline');
  const [playerColor, setPlayerColor] = useState(initialSeat);
  const [roomPlayers, setRoomPlayers] = useState(0);
  const [showBotWarning, setShowBotWarning] = useState(false);
  const [friendOrigin, setFriendOrigin] = useState('');
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [endgameModal, setEndgameModal] = useState(null);
  const [endgameWinner, setEndgameWinner] = useState(null);
  const [reviewMode, setReviewMode] = useState(false);
  const socketRef = useRef(null);
  const applyingRemoteRef = useRef(false);
  const broadcastTimerRef = useRef(null);
  const cinematicTimersRef = useRef([]);
  const dealerTimersRef = useRef([]);

  const currentTurn = COLOR_FROM_CHESS[game.chess.turn()];
  const promotionColor = pendingPromotion?.color ?? currentTurn;
  const royalCinematicActive = cinematicPhase !== 'idle';
  const botColor = 'black';
  const isBotTurn =
    playMode === 'bot' && currentTurn === botColor && game.status === 'active' && !round && !kingGambleDecision;
  const isLiveRoom = playMode === 'friend' && Boolean(roomId);
  const canAct = !isBotTurn && !kingGambleDecision && (!isLiveRoom || playerColor === currentTurn);
  const canResolveKingGamble =
    Boolean(kingGambleDecision) && (!isLiveRoom || playerColor === kingGambleDecision.player);
  const boardSquares = useMemo(() => getBoardSquares(boardFlipped), [boardFlipped]);
  const boardRanks = useMemo(() => (boardFlipped ? [...RANKS].reverse() : RANKS), [boardFlipped]);
  const boardFiles = useMemo(() => (boardFlipped ? [...FILES].reverse() : FILES), [boardFlipped]);
  const selectedMoves = selectedSquare
    ? getLegalMoves(game.chess, selectedSquare, game.pieces, game.protection)
    : [];
  const selectedCastlePartnerSquares = selectedSquare
    ? getCastlePartnerSquares(game.chess, game.pieces, game.protection, selectedSquare)
    : [];
  const material = {
    white: materialFor(game.pieces, 'white'),
    black: materialFor(game.pieces, 'black'),
  };
  const deficit = deficitFor(game.pieces, currentTurn);
  const playerInCheck = game.chess.isCheck();
  const blackjackCooldownActive = normalizeKingGambleTracker(game.kingGamble).cooldown[currentTurn];
  const currentActivePieces = game.pieces.filter((piece) => piece.owner === currentTurn && !piece.isCaptured);
  const loneKingMode = isLoneKing(game.pieces, currentTurn);
  const blackjackBaseAllowed =
    game.status === 'active' && !playerInCheck && !blackjackCooldownActive && deficit >= 5 && canAct;

  const capturedTargets = game.pieces.filter(
    (piece) =>
      piece.owner === currentTurn &&
      piece.isCaptured &&
      !pieceAt(game.pieces, piece.originalSquare) &&
      canOpponentAnswerProtectedCheck(game.chess, [piece], currentTurn),
  );
  const selectedTargets = selectedTargetIds
    .map((id) => game.pieces.find((piece) => piece.id === id))
    .filter(Boolean);
  const selectedStakes = selectedStakeIds
    .map((id) => game.pieces.find((piece) => piece.id === id))
    .filter(Boolean);
  const stakeTotal = selectedStakes.reduce((sum, piece) => sum + PIECE_VALUES[piece.type], 0);
  const targetValue = selectedTargets.reduce((sum, piece) => sum + recoveryValue(piece), 0);
  const standardChallengeReady =
    selectedTargets.length > 0 &&
    canStartBlackjackChallenge(
      { ...game, status: game.status },
      currentTurn,
      selectedTargetIds,
      selectedStakeIds,
    );

  const kingRecoveryPieces = capturedTargets.filter((piece) => piece.originalType === 'pawn');
  const selectedKingRecovery = selectedKingRecoveryIds
    .map((id) => game.pieces.find((piece) => piece.id === id))
    .filter(Boolean);
  const kingRecoveryValue = selectedKingRecovery.reduce((sum, piece) => sum + recoveryValue(piece), 0);
  const isKingsGambleActive = Boolean(kingGambleDecision);
  const kingsGambleRecoveryPoints = kingGambleDecision?.points ?? 0;
  const kingsGambleHandCount = kingGambleDecision?.handCount ?? 0;
  const kingsGambleCanContinue = kingGambleDecision?.canContinue ?? false;
  const kingsGambleResolved = kingGambleDecision?.resolved ?? false;
  const kingRecoveryBudget = kingsGambleRecoveryPoints || 2;
  const kingDecisionTargets = kingGambleDecision
    ? recoverablePiecesForBudget(game.pieces, game.chess, kingGambleDecision.player, kingsGambleRecoveryPoints)
    : [];
  const kingDecisionReady =
    Boolean(kingGambleDecision) &&
    selectedKingRecovery.length > 0 &&
    kingRecoveryValue <= kingsGambleRecoveryPoints &&
    canOpponentAnswerProtectedCheck(game.chess, selectedKingRecovery, kingGambleDecision.player);
  const kingChallengeReady =
    loneKingMode &&
    blackjackBaseAllowed;
  const blackjackAvailable = blackjackBaseAllowed && capturedTargets.length > 0;

  useEffect(() => {
    if (reviewMode && game.status !== 'active') return;

    if (game.status === 'checkmate') {
      setEndgameWinner(opposite(COLOR_FROM_CHESS[game.chess.turn()]));
      setEndgameModal('checkmate');
      setReviewMode(false);
    } else if (game.status === 'stalemate') {
      setEndgameWinner(null);
      setEndgameModal('stalemate');
      setReviewMode(false);
    } else if (game.status === 'active') {
      setEndgameModal(null);
      setEndgameWinner(null);
      setReviewMode(false);
    }
  }, [game.status, game.chess, reviewMode]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/info')
      .then((response) => (response.ok ? response.json() : null))
      .then((info) => {
        if (cancelled || !info?.server) return;
        const localHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
        setFriendOrigin(localHost ? info.preferredOrigin : window.location.origin);
      })
      .catch(() => {
        if (!cancelled) setFriendOrigin('');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (playMode !== 'friend' || !roomId) {
      socketRef.current?.close();
      socketRef.current = null;
      setRoomStatus(roomId ? 'offline' : 'offline');
      setPlayerColor(null);
      setRoomPlayers(0);
      return undefined;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
    socketRef.current = socket;
    setRoomStatus('connecting');

    socket.addEventListener('open', () => {
      setRoomStatus('connected');
      socket.send(
        JSON.stringify({
          type: 'join',
          roomId,
          requestedRole: playerColor,
          state: sharedStatePayload(game, 'friend', botRating, message, round, kingGambleDecision),
        }),
      );
    });

    socket.addEventListener('message', (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'presence') {
        setRoomPlayers(payload.clientCount ?? 0);
        return;
      }
      if (payload.type !== 'room-state' || !payload.state) return;
      if (payload.role) setPlayerColor(payload.role);
      setRoomPlayers((count) => payload.clientCount ?? count);
      applyingRemoteRef.current = true;
      const hydrated = hydrateSharedState(payload.state);
      setGame(hydrated.game);
      setPlayMode('friend');
      setBotRating(hydrated.botRating);
      setRound(hydrated.round);
      setKingGambleDecision(hydrated.kingGambleDecision);
      setMessage(hydrated.message);
      setPendingPromotion(null);
      window.setTimeout(() => {
        applyingRemoteRef.current = false;
      }, 0);
    });

    socket.addEventListener('close', () => {
      if (socketRef.current === socket) setRoomStatus('offline');
    });

    socket.addEventListener('error', () => {
      if (socketRef.current === socket) setRoomStatus('offline');
    });

    return () => {
      socket.close();
    };
  }, [roomId, playMode]);

  useEffect(() => {
    if (playMode !== 'friend' || !roomId || applyingRemoteRef.current) return undefined;
    if (socketRef.current?.readyState !== WebSocket.OPEN) return undefined;

    window.clearTimeout(broadcastTimerRef.current);
    broadcastTimerRef.current = window.setTimeout(() => {
      socketRef.current?.send(
        JSON.stringify({
          type: 'sync',
          state: sharedStatePayload(game, 'friend', botRating, message, round, kingGambleDecision),
        }),
      );
    }, 25);

    return () => window.clearTimeout(broadcastTimerRef.current);
  }, [game, round, message, botRating, playMode, roomId, kingGambleDecision]);

  useEffect(() => {
    cinematicTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    cinematicTimersRef.current = [];

    if (!round) {
      setCinematicPhase('idle');
      return undefined;
    }

    const queuePhase = (phase, delay) => {
      const timer = window.setTimeout(() => setCinematicPhase(phase), delay);
      cinematicTimersRef.current.push(timer);
    };

    if (round.result) {
      setCinematicPhase('resultReveal');
      if (round.mode === 'king' && round.result !== 'lose') {
        queuePhase('chooseContinueOrRecover', 1800);
      } else {
        queuePhase('pieceResolution', 1600);
        queuePhase('cleanup', 3400);
      }
    } else {
      setCinematicPhase('intro');
      queuePhase('presentation', 1200);
      queuePhase('initialDeal', 2600);
      queuePhase('playerDecision', 4200);
    }

    return () => {
      cinematicTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      cinematicTimersRef.current = [];
    };
  }, [round?.id, round?.result]);

  useEffect(() => {
    if (!isBotTurn) return undefined;
    setSelectedSquare(null);
    setMessage(`Bot ${botRating} is thinking.`);
    const timer = window.setTimeout(() => {
      const botChallenge = chooseBotBlackjack(game, botRating);
      if (botChallenge) {
        beginRound(botChallenge.mode, { player: botColor, targets: botChallenge.targets, stakes: botChallenge.stakes });
        return;
      }
      const botMove = chooseBotMove(game, botRating);
      if (botMove) {
        finishNormalMove(botMove, game, `Bot ${botRating}`);
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [isBotTurn, game, botRating]);

  useEffect(() => {
    if (!round?.result) return undefined;
    if (round.mode === 'king' && round.result !== 'lose') return undefined;

    const timer = window.setTimeout(() => {
      setRound(null);
      setCinematicPhase('idle');
    }, 4600);
    return () => window.clearTimeout(timer);
  }, [round?.id, round?.result, round?.mode]);

  useEffect(() => {
    if (
      !round ||
      round.result ||
      playMode !== 'bot' ||
      round.player !== botColor ||
      cinematicPhase !== 'playerDecision'
    ) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      if (handValue(round.playerHand) < 17) hit();
      else stand();
    }, 1050);
    return () => window.clearTimeout(timer);
  }, [round, playMode, cinematicPhase]);

  useEffect(() => {
    if (!round?.result || playMode !== 'bot' || round.player !== botColor) return undefined;
    const timer = window.setTimeout(() => {
      setRound(null);
    }, 4300);
    return () => window.clearTimeout(timer);
  }, [round, playMode]);

  useEffect(() => {
    if (!kingGambleDecision || kingGambleDecision.player !== botColor || playMode !== 'bot' || round) return undefined;
    const timer = window.setTimeout(() => {
      const targets = chooseRecoveryTargetsForBudget(
        game.pieces,
        game.chess,
        kingGambleDecision.player,
        kingGambleDecision.points,
      );
      if (targets.length) claimKingGambleRecovery(targets.map((piece) => piece.id));
      else gambleKingAgain();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [kingGambleDecision, playMode, round, game]);

  function resetGame() {
    dealerTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    dealerTimersRef.current = [];
    setGame(initialGameState());
    setSelectedSquare(null);
    setSelectedTargetIds([]);
    setSelectedStakeIds([]);
    setSelectedKingRecoveryIds([]);
    setPendingPromotion(null);
    setRound(null);
    setCinematicPhase('idle');
    setKingGambleDecision(null);
    setKingGambleIntro(false);
    setEndgameModal(null);
    setEndgameWinner(null);
    setReviewMode(false);
    setShareLink('');
    setMessage('White to move.');
  }

  function leaveRoomForBot() {
    dealerTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    dealerTimersRef.current = [];
    socketRef.current?.close();
    socketRef.current = null;
    setRoomId(null);
    setRoomStatus('offline');
    setPlayerColor(null);
    setRoomPlayers(0);
    setShareLink('');
    setShowBotWarning(false);
    setKingGambleDecision(null);
    setCinematicPhase('idle');
    setEndgameModal(null);
    setEndgameWinner(null);
    setReviewMode(false);
    setPlayMode('bot');
    window.history.replaceState(null, '', window.location.pathname);
    setMessage('Switched to bot mode. The friend room link is no longer active for this game.');
  }

  function openKingGamble() {
    if (blackjackCooldownActive) {
      setMessage(`${labelColor(currentTurn)} must move the king one square before another King's Gamble.`);
      return;
    }
    setKingGambleIntro(true);
    setMessage('Your army has fallen. Your crown is all that remains. Lose the hand, lose the turn.');
  }

  function dealFinalHand() {
    if (blackjackCooldownActive) {
      setKingGambleIntro(false);
      setMessage(`${labelColor(currentTurn)} must move the king one square before another King's Gamble.`);
      return;
    }
    setKingGambleIntro(false);
    beginRound('king');
  }

  function finishNormalMove(move, sourceGame = game, actorLabel = null) {
    const nextChess = cloneChess(sourceGame.chess);
    const played = nextChess.move(move);
    if (!played) return;

    const movingColor = COLOR_FROM_CHESS[played.color];
    const nextPieces = applyMoveToPieces(sourceGame.pieces, played);
    const nextProtection = clearProtectionAfterMove(sourceGame.protection, movingColor);
    const status = statusFromChess(nextChess);
    setGame({
      chess: nextChess,
      pieces: nextPieces,
      status,
      protection: nextProtection,
      kingGamble: clearKingGambleCooldownAfterMove(sourceGame.kingGamble, movingColor, played),
    });
    setSelectedSquare(null);
    setPendingPromotion(null);
    setSelectedStakeIds([]);
    setSelectedTargetIds([]);
    setSelectedKingRecoveryIds([]);
    setShareLink('');

    const nextTurn = COLOR_FROM_CHESS[nextChess.turn()];
    const prefix = actorLabel ? `${actorLabel} played ${played.san}. ` : '';
    if (status === 'checkmate') setMessage(`${prefix}${labelColor(movingColor)} wins by checkmate.`);
    else if (status === 'stalemate') setMessage('Stalemate.');
    else if (status === 'draw') setMessage('Draw.');
    else if (nextChess.isCheck()) setMessage(`${prefix}${labelColor(nextTurn)} is in check.`);
    else setMessage(`${prefix}${labelColor(nextTurn)} to move.`);
  }

  function handleSquareClick(square) {
    if (pendingPromotion || round || game.status !== 'active' || !canAct) return;

    const clickedPiece = pieceAt(game.pieces, square);
    if (selectedSquare) {
      const castleMove = getCastleMoveForPair(game.chess, game.pieces, game.protection, selectedSquare, square);
      if (castleMove) {
        finishNormalMove({ from: castleMove.from, to: castleMove.to });
        return;
      }

      const movesToSquare = selectedMoves.filter((move) => move.to === square);
      if (movesToSquare.length) {
        const promotionMoves = movesToSquare.filter((move) => move.flags.includes('p'));
        if (promotionMoves.length) {
          setPendingPromotion({ from: selectedSquare, to: square, color: currentTurn });
          setMessage(`Promote ${labelColor(currentTurn)} pawn on ${square}.`);
          return;
        }
        finishNormalMove({ from: selectedSquare, to: square });
        return;
      }
    }

    if (clickedPiece && clickedPiece.owner === currentTurn) {
      setSelectedSquare(square);
      setMessage(`${labelColor(currentTurn)} selected ${clickedPiece.type} on ${square}.`);
    } else {
      setSelectedSquare(null);
    }
  }

  function choosePromotion(type) {
    if (!pendingPromotion) return;
    finishNormalMove({ from: pendingPromotion.from, to: pendingPromotion.to, promotion: CHESS_FROM_TYPE[type] });
  }

  function toggleStake(pieceId) {
    setSelectedStakeIds((ids) =>
      ids.includes(pieceId) ? ids.filter((id) => id !== pieceId) : [...ids, pieceId],
    );
  }

  function toggleTarget(pieceId) {
    setSelectedTargetIds((ids) =>
      ids.includes(pieceId) ? ids.filter((id) => id !== pieceId) : [...ids, pieceId],
    );
  }

  async function copyFriendLink() {
    if (!friendOrigin) {
      setMessage('Friend server is offline. Run npm run friend, then create a room link again.');
      return;
    }

    const nextRoomId = roomId ?? makeRoomId();
    setRoomId(nextRoomId);
    setPlayerColor('white');
    setPlayMode('friend');
    const link = makeFriendRoomUrl(nextRoomId, friendOrigin);
    setShareLink(link);
    window.history.replaceState(null, '', `?room=${nextRoomId}&seat=white`);
    await copyLinkToClipboard(link, 'Live room link copied. Keep this window open while your friend joins.');
  }

  async function copyLinkToClipboard(link, successMessage = 'Friend link copied.') {
    let copied = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied) {
      const textArea = document.createElement('textarea');
      textArea.value = link;
      textArea.setAttribute('readonly', '');
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '1px';
      textArea.style.height = '1px';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, link.length);
      copied = document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    if (copied) {
      setMessage(successMessage);
    } else {
      setMessage('Friend link is ready below.');
    }
  }

  function toggleKingRecovery(pieceId) {
    setSelectedKingRecoveryIds((ids) => {
      if (ids.includes(pieceId)) return ids.filter((id) => id !== pieceId);
      const piece = game.pieces.find((item) => item.id === pieceId);
      if (!piece) return ids;
      const nextValue =
        ids
          .map((id) => game.pieces.find((item) => item.id === id))
          .filter(Boolean)
          .reduce((sum, item) => sum + recoveryValue(item), 0) + recoveryValue(piece);
      return nextValue <= kingRecoveryBudget ? [...ids, pieceId] : ids;
    });
  }

  function beginRound(mode, override = null) {
    const deck = makeDeck();
    let nextDeck = deck;
    let card;
    const playerHand = [];
    const dealerHand = [];
    [card, nextDeck] = drawCard(nextDeck);
    playerHand.push(card);
    [card, nextDeck] = drawCard(nextDeck);
    dealerHand.push(card);
    [card, nextDeck] = drawCard(nextDeck);
    playerHand.push(card);
    [card, nextDeck] = drawCard(nextDeck);
    dealerHand.push(card);

    setRound({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      mode,
      player: override?.player ?? currentTurn,
      budget: override?.budget ?? (mode === 'king' ? 2 : null),
      points: override?.points ?? kingGambleDecision?.points ?? 0,
      handCount: override?.handCount ?? kingGambleDecision?.handCount ?? 0,
      deck: nextDeck,
      playerHand,
      dealerHand,
      revealDealer: false,
      result: null,
      targets: override?.targets ?? (mode === 'standard' ? selectedTargets : selectedKingRecovery),
      stakes: override?.stakes ?? (mode === 'standard' ? selectedStakes : currentActivePieces),
    });
    setSelectedSquare(null);
    setMessage(
      mode === 'king'
        ? 'The crown is on the table...'
        : `${labelColor(override?.player ?? currentTurn)} started blackjack.`,
    );
  }

  function dealerFinish(nextRound) {
    let deck = nextRound.deck;
    const dealerHand = [...nextRound.dealerHand];
    while (handValue(dealerHand) < 17) {
      let card;
      [card, deck] = drawCard(deck);
      dealerHand.push(card);
    }

    const result = resultFor(nextRound.playerHand, dealerHand);
    const resolvedRound = { ...nextRound, deck, dealerHand, revealDealer: true, result };
    setRound(resolvedRound);
    applyBlackjackResult(resolvedRound, result);
  }

  function hit() {
    if (!round || round.result || round.playerStood || round.dealerPlaying || cinematicPhase !== 'playerDecision') return;
    let card;
    let deck;
    [card, deck] = drawCard(round.deck);
    const playerHand = [...round.playerHand, card];
    const nextRound = { ...round, deck, playerHand };
    setCinematicPhase('playerHit');
    setRound(nextRound);
    if (handValue(playerHand) > 21) {
      const revealTimer = window.setTimeout(() => {
        const resolvedRound = { ...nextRound, revealDealer: true, result: 'lose' };
        setRound(resolvedRound);
        applyBlackjackResult(resolvedRound, 'lose');
      }, 1000);
      dealerTimersRef.current.push(revealTimer);
    } else {
      setRound(nextRound);
      const decisionTimer = window.setTimeout(() => setCinematicPhase('playerDecision'), 1350);
      dealerTimersRef.current.push(decisionTimer);
    }
  }

  function stand() {
    if (!round || round.result || round.playerStood || round.dealerPlaying || cinematicPhase !== 'playerDecision') return;
    dealerTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    dealerTimersRef.current = [];

    const standingRound = { ...round, revealDealer: true, playerStood: true, dealerPlaying: true };
    setRound(standingRound);
    setCinematicPhase('dealerReveal');

    let deck = standingRound.deck;
    const dealerHand = [...standingRound.dealerHand];
    const playerHand = [...standingRound.playerHand];
    const dealerSnapshots = [];

    while (handValue(dealerHand) < 17) {
      let card;
      [card, deck] = drawCard(deck);
      dealerHand.push(card);
      dealerSnapshots.push({ deck, dealerHand: [...dealerHand] });
    }

    const schedule = (callback, ms) => {
      const timer = window.setTimeout(callback, ms);
      dealerTimersRef.current.push(timer);
    };

    schedule(() => {
      setCinematicPhase('dealerPlay');
      dealerSnapshots.forEach((snapshot, index) => {
        schedule(() => {
          setRound((current) => (current?.id === standingRound.id ? { ...current, ...snapshot } : current));
        }, (index + 1) * 950);
      });

      schedule(() => {
        const result = resultFor(playerHand, dealerHand);
        const resolvedRound = {
          ...standingRound,
          deck,
          dealerHand: [...dealerHand],
          revealDealer: true,
          dealerPlaying: false,
          result,
        };
        setRound(resolvedRound);
        applyBlackjackResult(resolvedRound, result);
      }, Math.max(1400, dealerSnapshots.length * 950 + 1400));
    }, 1800);
  }

  function claimKingGambleRecovery(overrideIds = null) {
    if (!kingGambleDecision) return;
    if (isLiveRoom && playerColor !== kingGambleDecision.player) return;

    const selectedIds = overrideIds ?? selectedKingRecoveryIds;
    const player = kingGambleDecision.player;
    const nextColor = opposite(player);
    const nextPieces = game.pieces.map((piece) => ({ ...piece }));
    const nextChess = cloneChess(game.chess);
    const targets = selectedIds.map((id) => nextPieces.find((piece) => piece.id === id)).filter(Boolean);
    const claimValue = targets.reduce((sum, piece) => sum + recoveryValue(piece), 0);
    const valid =
      targets.length > 0 &&
      claimValue <= kingGambleDecision.points &&
      targets.every(
        (piece) =>
          piece.owner === player &&
          piece.isCaptured &&
          !pieceAt(nextPieces, piece.originalSquare) &&
          recoveryValue(piece) <= kingGambleDecision.points,
      ) &&
      canOpponentAnswerProtectedCheck(game.chess, targets, player);

    if (!valid) {
      setMessage(`Choose recoveries worth up to ${kingGambleDecision.points} point(s) before ending the gamble.`);
      return;
    }

    for (const target of targets) {
      target.isCaptured = false;
      target.currentSquare = target.originalSquare;
      target.type = target.originalType;
      target.isPromoted = false;
      nextChess.put(
        { type: CHESS_FROM_TYPE[target.type], color: CHESS_FROM_COLOR[target.owner] },
        target.currentSquare,
      );
    }

    const evaluated = evaluateAfterBlackjack(nextChess, nextColor);
    setGame({
      chess: evaluated.chess,
      pieces: nextPieces,
      status: evaluated.status,
      protection: {
        pieceIds: targets.map((piece) => piece.id),
        protectedAgainst: nextColor,
      },
      kingGamble: resetKingGambleCooldown(game.kingGamble, player),
    });
    setCinematicPhase('recoveryAnimation');
    setKingGambleIntro(false);
    setShareLink('');
    setMessage(`${labelColor(player)} claimed ${claimValue} recovery point(s). ${labelColor(nextColor)} to move.`);
    window.setTimeout(() => setCinematicPhase('cleanup'), 1800);
    window.setTimeout(() => {
      setRound(null);
      setKingGambleDecision(null);
      setSelectedKingRecoveryIds([]);
      setSelectedTargetIds([]);
      setSelectedStakeIds([]);
      setCinematicPhase('idle');
    }, 2700);
  }

  function gambleKingAgain() {
    if (!kingGambleDecision || !canResolveKingGamble) return;
    const player = kingGambleDecision.player;
    const king = game.pieces.find(
      (piece) => piece.id === kingGambleDecision.kingId || (piece.owner === player && piece.type === 'king'),
    );
    if (!king?.currentSquare || king.isCaptured) return;

    const targets = chooseRecoveryTargetsForBudget(game.pieces, game.chess, player, kingGambleDecision.points + 2);

    beginRound('king', {
      player,
      targets,
      stakes: [king],
      budget: 2,
      points: kingGambleDecision.points,
      handCount: kingGambleDecision.handCount,
    });
  }

  function openKingRecoverySelection() {
    if (!kingGambleDecision || !canResolveKingGamble) return;
    setSelectedKingRecoveryIds((ids) => {
      const selectedValue = ids
        .map((id) => game.pieces.find((piece) => piece.id === id))
        .filter(Boolean)
        .reduce((sum, piece) => sum + recoveryValue(piece), 0);
      if (selectedValue <= kingGambleDecision.points) return ids;
      return [];
    });
    setCinematicPhase('recoverySelection');
  }

  function applyBlackjackResult(resolvedRound, result) {
    const player = resolvedRound.player;
    const nextColor = opposite(player);

    if (resolvedRound.mode === 'king' && result === 'win') {
      const points = (resolvedRound.points ?? kingGambleDecision?.points ?? 0) + 2;
      const handCount = (resolvedRound.handCount ?? kingGambleDecision?.handCount ?? 0) + 1;
      const targets = chooseRecoveryTargetsForBudget(game.pieces, game.chess, player, points);
      setGame((current) => ({
        ...current,
        kingGamble: noteKingGambleResult(current.kingGamble, player, result),
      }));
      setKingGambleDecision({
        player,
        points,
        handCount,
        canContinue: true,
        resolved: false,
        lastResult: 'win',
        kingId: resolvedRound.stakes[0]?.id ?? null,
      });
      setSelectedKingRecoveryIds(targets.map((piece) => piece.id));
      setKingGambleIntro(false);
      setShareLink('');
      setMessage(`The crown endures. ${labelColor(player)} has ${points} recovery point(s).`);
      return;
    }

    if (resolvedRound.mode === 'king' && result === 'tie') {
      const points = resolvedRound.points ?? kingGambleDecision?.points ?? 0;
      const handCount = (resolvedRound.handCount ?? kingGambleDecision?.handCount ?? 0) + 1;
      const targets = chooseRecoveryTargetsForBudget(game.pieces, game.chess, player, points);
      setGame((current) => ({
        ...current,
        kingGamble: noteKingGambleResult(current.kingGamble, player, result),
      }));
      setKingGambleDecision({
        player,
        points,
        handCount,
        canContinue: true,
        resolved: false,
        lastResult: 'tie',
        kingId: resolvedRound.stakes[0]?.id ?? null,
      });
      setSelectedKingRecoveryIds(targets.map((piece) => piece.id));
      setKingGambleIntro(false);
      setShareLink('');
      setMessage(`Fate holds the crown. ${labelColor(player)} still has ${points} recovery point(s).`);
      return;
    }

    const nextPieces = game.pieces.map((piece) => ({ ...piece }));
    const nextChess = cloneChess(game.chess);
    let statusOverride = null;
    let nextProtection = { pieceIds: [], protectedAgainst: null };
    let nextKingGamble = normalizeKingGambleTracker(game.kingGamble);

    if (result === 'win') {
      for (const target of resolvedRound.targets) {
        const recovered = nextPieces.find((piece) => piece.id === target.id);
        recovered.isCaptured = false;
        recovered.currentSquare = recovered.originalSquare;
        recovered.type = recovered.originalType;
        recovered.isPromoted = false;
        nextChess.put(
          { type: CHESS_FROM_TYPE[recovered.type], color: CHESS_FROM_COLOR[recovered.owner] },
          recovered.currentSquare,
        );
      }
      nextProtection = {
        pieceIds: resolvedRound.targets.map((piece) => piece.id),
        protectedAgainst: nextColor,
      };
    }

    if (result === 'lose') {
      if (resolvedRound.mode === 'king') {
        nextProtection = { pieceIds: [], protectedAgainst: null };
        const kingSquare =
          resolvedRound.stakes.find((piece) => piece.type === 'king')?.currentSquare ??
          nextPieces.find((piece) => piece.owner === player && piece.type === 'king' && !piece.isCaptured)
            ?.currentSquare ??
          null;
        nextKingGamble = noteKingGambleResult(game.kingGamble, player, result, kingSquare);
      } else {
        for (const stake of resolvedRound.stakes) {
          const stakedPiece = nextPieces.find((piece) => piece.id === stake.id);
          if (stakedPiece?.currentSquare) nextChess.remove(stakedPiece.currentSquare);
          stakedPiece.isCaptured = true;
          stakedPiece.currentSquare = null;
          if (stakedPiece.isPromoted) {
            stakedPiece.type = stakedPiece.originalType;
            stakedPiece.isPromoted = false;
          }
        }
      }
    }

    const evaluated = statusOverride
      ? { chess: passTurnChess(nextChess, nextColor), status: statusOverride }
      : evaluateAfterBlackjack(nextChess, nextColor);

    setGame({
      chess: evaluated.chess,
      pieces: nextPieces,
      status: evaluated.status,
      protection: result === 'win' ? nextProtection : { pieceIds: [], protectedAgainst: null },
      kingGamble: nextKingGamble,
    });
    setSelectedTargetIds([]);
    setSelectedStakeIds([]);
    setSelectedKingRecoveryIds([]);
    setKingGambleDecision(null);
    setKingGambleIntro(false);
    setShareLink('');

    if (statusOverride) {
      setMessage('The board has decided the game.');
    } else if (resolvedRound.mode === 'king' && result === 'win') {
      setMessage('The king survives. Hope returns to the board.');
    } else if (resolvedRound.mode === 'king' && result === 'tie') {
      setMessage('Fate refuses to answer. The king stands alone.');
    } else if (evaluated.status === 'checkmate') {
      setMessage(`${labelColor(player)} wins by checkmate.`);
    } else if (evaluated.status === 'stalemate') {
      setMessage('Stalemate.');
    } else if (evaluated.status === 'draw') {
      setMessage('Draw.');
    } else if (resolvedRound.mode === 'king' && result === 'lose') {
      const cooldownText = nextKingGamble.cooldown[player]
        ? ` ${labelColor(player)} must move the king one square before another King's Gamble.`
        : '';
      setMessage(`The wager fails. ${labelColor(nextColor)} to move.${cooldownText}`);
    } else if (result === 'win') {
      setMessage(`${labelColor(player)} recovered material. ${labelColor(nextColor)} to move.`);
    } else if (result === 'lose') {
      setMessage(`${labelColor(player)} lost the stake. ${labelColor(nextColor)} to move.`);
    } else {
      setMessage(`Push. No material changed. ${labelColor(nextColor)} to move.`);
    }
  }

  function closeResolvedRound() {
    dealerTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    dealerTimersRef.current = [];
    setRound(null);
    setCinematicPhase('idle');
  }

  const protectedSquares = game.protection.pieceIds
    .map((id) => game.pieces.find((piece) => piece.id === id)?.currentSquare)
    .filter(Boolean);
  const canControlRound = !round || !isLiveRoom || round.player === playerColor || Boolean(round.result);
  const stakedSquares = kingGambleDecision
    ? game.pieces
        .filter(
          (piece) =>
            piece.id === kingGambleDecision.kingId ||
            (piece.owner === kingGambleDecision.player && piece.type === 'king' && !piece.isCaptured),
        )
        .map((piece) => piece.currentSquare)
        .filter(Boolean)
    : round
      ? round.stakes.map((piece) => piece.currentSquare).filter(Boolean)
      : selectedStakes.map((piece) => piece.currentSquare).filter(Boolean);
  const recoverySquares = kingGambleDecision
    ? selectedKingRecovery.map((piece) => piece.originalSquare)
    : round
      ? round.targets.map((piece) => piece.originalSquare)
      : selectedTargets.map((piece) => piece.originalSquare);
  const kingSpotlightSquare = kingGambleIntro || kingGambleDecision
    ? game.pieces.find((piece) => piece.owner === currentTurn && piece.type === 'king' && !piece.isCaptured)
        ?.currentSquare
    : null;
  const endgameFocusSquare =
    game.status === 'checkmate' || game.status === 'stalemate'
      ? game.pieces.find((piece) => piece.owner === currentTurn && piece.type === 'king' && !piece.isCaptured)
          ?.currentSquare
      : null;

  return (
    <main className="app-shell">
      <section
        className={[
          'play-surface',
          kingGambleIntro || kingGambleDecision ? 'king-cinematic' : '',
          game.status === 'checkmate' || game.status === 'stalemate' ? 'endgame-active' : '',
          royalCinematicActive ? 'royal-cinematic-active' : '',
          royalCinematicActive && round?.result ? `cinematic-result-${round.result}` : '',
        ].join(' ')}
      >
        <header className="topbar">
          <div>
            <h1>The Royal Gambit</h1>
          </div>
          <div className="top-actions">
            <div className="mode-toggle" aria-label="Play mode">
              <button
                type="button"
                className={playMode === 'bot' ? 'active' : ''}
                onClick={() => {
                  if (isLiveRoom) {
                    setShowBotWarning(true);
                    return;
                  }
                  setPlayMode('bot');
                  setShareLink('');
                }}
              >
                <Bot size={16} aria-hidden="true" />
                Bot
              </button>
              <button
                type="button"
                className={playMode === 'friend' ? 'active' : ''}
                onClick={() => {
                  setPlayMode('friend');
                  setShareLink('');
                }}
              >
                <Users size={16} aria-hidden="true" />
                Friend
              </button>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => setBoardFlipped((flipped) => !flipped)}
              aria-label={boardFlipped ? 'Show White perspective' : 'Show Black perspective'}
              title={boardFlipped ? 'Show White perspective' : 'Show Black perspective'}
            >
              <RotateCw size={20} aria-hidden="true" />
            </button>
            <button type="button" className="icon-button" onClick={resetGame} aria-label="Reset game" title="Reset game">
              <RotateCcw size={20} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className={['board-wrap', royalCinematicActive ? 'board-tilted' : ''].join(' ')}>
          <div className="rank-labels" aria-hidden="true">
            {boardRanks.map((rank) => (
              <span key={rank}>{rank}</span>
            ))}
          </div>
          <div className="board" aria-label="Chess board">
            {boardSquares.map((square) => {
              const fileIndex = FILES.indexOf(square[0]);
              const rankIndex = RANKS.indexOf(square[1]);
              const squarePiece = pieceAt(game.pieces, square);
              const isLight = (fileIndex + rankIndex) % 2 === 0;
              const isSelected = selectedSquare === square;
              const canMoveHere = selectedMoves.some((move) => move.to === square);
              const canCastleHere = selectedCastlePartnerSquares.includes(square);
              const protectedHere = protectedSquares.includes(square);
              const stakedHere = stakedSquares.includes(square);
              const recoveryHere = recoverySquares.includes(square);
              const endgameFocusHere = endgameFocusSquare === square;
              const recoveryPiece =
                (round?.targets ?? selectedTargets).find((piece) => piece.originalSquare === square) ??
                selectedKingRecovery.find((piece) => piece.originalSquare === square);
              const kingSpotlightHere = kingSpotlightSquare === square;
              return (
                <button
                  type="button"
                  key={square}
                  className={[
                    'square',
                    isLight ? 'light' : 'dark',
                    isSelected ? 'selected' : '',
                    canMoveHere ? 'destination' : '',
                    canCastleHere ? 'castle-partner' : '',
                    protectedHere ? 'protected' : '',
                    stakedHere ? 'staked-square' : '',
                    recoveryHere ? 'recovery-square' : '',
                    kingSpotlightHere ? 'king-spotlight' : '',
                    endgameFocusHere && game.status === 'checkmate' ? 'endgame-king-lost' : '',
                    endgameFocusHere && game.status === 'stalemate' ? 'endgame-king-stalemate' : '',
                  ].join(' ')}
                  onClick={() => handleSquareClick(square)}
                  aria-label={`${square}${squarePiece ? ` ${squarePiece.owner} ${squarePiece.type}` : ''}`}
                >
                  <span className="coord">{square}</span>
                  {protectedHere && <Shield size={16} className="shield" aria-hidden="true" />}
                  {royalCinematicActive && stakedHere && <span className="square-cinematic-label stake-label">Stake</span>}
                  {royalCinematicActive && recoveryHere && (
                    <>
                      <span className="square-cinematic-label recovery-label">Recovery</span>
                      <span className="recovery-ghost">
                        {PIECE_GLYPHS[recoveryPiece?.owner ?? currentTurn][recoveryPiece?.originalType ?? 'pawn']}
                      </span>
                    </>
                  )}
                  {squarePiece && (
                    <span className={`piece ${squarePiece.owner}`}>
                      {PIECE_GLYPHS[squarePiece.owner][squarePiece.type]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="file-labels" aria-hidden="true">
            {boardFiles.map((file) => (
              <span key={file}>{file}</span>
            ))}
          </div>
        </div>

        <RoyalTableCinematic
          round={round}
          phase={cinematicPhase}
          onHit={hit}
          onStand={stand}
          controlsDisabled={!canControlRound}
          kingGambleDecision={kingGambleDecision}
          kingDecisionTargets={kingDecisionTargets}
          selectedKingRecoveryIds={selectedKingRecoveryIds}
          kingRecoveryValue={kingRecoveryValue}
          onToggleKingRecovery={toggleKingRecovery}
          onRecoverMaterial={openKingRecoverySelection}
          onGambleAgain={gambleKingAgain}
          onConfirmRecovery={() => claimKingGambleRecovery()}
          canResolveKingGamble={canResolveKingGamble}
          kingDecisionReady={kingDecisionReady}
        />

        {showBotWarning && (
          <div className="blackjack-overlay">
            <section className="confirm-panel" aria-label="Leave friend room">
              <h2>Leave friend room?</h2>
              <p>
                Switching to Bot mode will disconnect this live friend room and the current room link will stop syncing
                this game.
              </p>
              <div className="round-actions">
                <button type="button" className="primary" onClick={leaveRoomForBot}>
                  Switch to Bot
                </button>
                <button type="button" onClick={() => setShowBotWarning(false)}>
                  Stay in room
                </button>
              </div>
            </section>
          </div>
        )}

        {kingGambleIntro && (
          <div className="blackjack-overlay">
            <section className="king-gamble-panel king-gamble-cinematic" aria-label="The King's Gamble">
              <div className="king-crown-orbit" aria-hidden="true">
                <Crown size={46} />
                <span className="orbit-card orbit-card-a">A</span>
                <span className="orbit-card orbit-card-k">K</span>
                <span className="orbit-card orbit-card-q">Q</span>
              </div>
              <div className="king-seal" aria-hidden="true" />
              <span className="eyebrow">The King's Gamble</span>
              <h2>The crown risks everything.</h2>
              <p className="king-line">The crown risks everything.</p>
              <div className="king-gamble-stakes">
                <strong>Last stand</strong>
                <span>Win: gain 2 recovery points.</span>
                <span>Tie: survive and choose again.</span>
                <span>Lose the hand, lose the turn.</span>
                <span>Only checkmate ends the crown.</span>
              </div>
              <div className="round-actions">
                <button type="button" className="primary" onClick={dealFinalHand}>
                  Deal the Final Hand
                </button>
                <button type="button" onClick={() => setKingGambleIntro(false)}>
                  Not yet
                </button>
              </div>
            </section>
          </div>
        )}

        {pendingPromotion && (
          <div className="blackjack-overlay">
            <section className="promotion-panel" aria-label="Promote pawn">
              <span className="eyebrow">Promotion</span>
              <h2>Choose your new piece</h2>
              <p>
                Pawn from {pendingPromotion.from} reached {pendingPromotion.to}.
              </p>
              <div className="promotion-picker">
                {PROMOTIONS.map((type) => (
                  <button type="button" key={type} onClick={() => choosePromotion(type)}>
                    <span className={`promotion-piece piece ${promotionColor}`}>{PIECE_GLYPHS[promotionColor][type]}</span>
                    <strong>{type}</strong>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        <EndgameModal
          type={endgameModal}
          winner={endgameWinner}
          onNewGame={resetGame}
          onReviewBoard={() => {
            setEndgameModal(null);
            setReviewMode(true);
          }}
        />
      </section>

      <aside className="side-panel">
        <section className="status-panel">
          <div className="status-line">
            <CircleDot size={18} aria-hidden="true" />
            <strong>{message}</strong>
          </div>
          <div className="metrics">
            <div>
              <span>Turn</span>
              <strong>{labelColor(currentTurn)}</strong>
            </div>
            <div>
              <span>White</span>
              <strong>{material.white}</strong>
            </div>
            <div>
              <span>Black</span>
              <strong>{material.black}</strong>
            </div>
            <div>
              <span>Deficit</span>
              <strong>{Math.max(0, deficit)}</strong>
            </div>
          </div>
          {blackjackAvailable && (
            <div className="blackjack-available">
              <Spade size={16} aria-hidden="true" />
              <strong>Blackjack Available</strong>
              <span>Down 5+ Material</span>
            </div>
          )}
          <div className="mode-panel">
            {playMode === 'bot' ? (
              <>
                <div className="select-row">
                  <label htmlFor="bot-rating">Bot strength</label>
                  <select
                    id="bot-rating"
                    value={botRating}
                    onChange={(event) => setBotRating(Number(event.target.value))}
                  >
                    {BOT_RATINGS.map((rating) => (
                      <option key={rating} value={rating}>
                        {rating}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="small-copy">You play White. The bot plays Black automatically.</p>
              </>
            ) : (
              <>
                <p className="room-status">
                  Room server: {roomStatus === 'connected' ? 'connected' : friendOrigin ? 'ready' : 'offline'}
                  {playerColor ? ` | You are ${labelColor(playerColor)}` : ''}
                  {roomPlayers ? ` | Players ${Math.min(roomPlayers, 2)}/2` : ''}
                </p>
                <button type="button" className="link-button" onClick={copyFriendLink}>
                  <Link size={16} aria-hidden="true" />
                  Create friend link
                </button>
                {shareLink && (
                  <>
                    <div className="share-box">
                      <Copy size={15} aria-hidden="true" />
                      <span>{shareLink}</span>
                    </div>
                    <button type="button" className="copy-link-button" onClick={() => copyLinkToClipboard(shareLink)}>
                      <Copy size={16} aria-hidden="true" />
                      Copy link
                    </button>
                  </>
                )}
              </>
            )}
          </div>
          {game.status !== 'active' && (
            <p className="notice">
              <BadgeAlert size={16} aria-hidden="true" />
              Game status: {game.status}.
            </p>
          )}
          {playerInCheck && game.status === 'active' && (
            <p className="notice">
              <BadgeAlert size={16} aria-hidden="true" />
              Blackjack is locked while the king is in check.
            </p>
          )}
        </section>

        {round && (
          <BlackjackTable
            round={round}
            onHit={hit}
            onStand={stand}
            onClose={closeResolvedRound}
            isAutoPlayer={playMode === 'bot' && round.player === botColor}
            actionsLocked={!canControlRound}
            lockedLabel={`Waiting for ${labelColor(round.player)} to play blackjack.`}
            cinematicActive={royalCinematicActive}
          />
        )}

        {false && kingGambleDecision && !round && (
          <section className="challenge-panel king-claim-panel">
            <div className="panel-heading">
              <Crown size={18} aria-hidden="true" />
              <h2>King's Gamble Prize</h2>
            </div>
            <p className="small-copy">
              Claim pieces worth up to {kingRecoveryBudget} point(s), or play another hand to double the prize to{' '}
              {kingRecoveryBudget * 2}. Losing a hand passes the turn; only checkmate ends the crown.
            </p>
            {!canResolveKingGamble && (
              <div className="disabled-reason">
                Waiting for {labelColor(kingGambleDecision.player)} to finish the gamble.
              </div>
            )}
            <div className="stake-grid">
              {kingDecisionTargets.map((piece) => (
                <button
                  type="button"
                  key={piece.id}
                  className={selectedKingRecoveryIds.includes(piece.id) ? 'selected-row' : ''}
                  onClick={() => toggleKingRecovery(piece.id)}
                  disabled={!canResolveKingGamble}
                >
                  <span>{PIECE_GLYPHS[piece.owner][piece.originalType]}</span>
                  <small>{piece.originalType} {piece.originalSquare}</small>
                  <b>{recoveryValue(piece)}</b>
                </button>
              ))}
            </div>
            {!kingDecisionTargets.length && <p className="empty">No legal recovery squares are open.</p>}
            <div className="stake-total">
              <span>Selected {kingRecoveryValue}</span>
              <span>Prize {kingRecoveryBudget}</span>
            </div>
            <div className="king-claim-actions">
              <button
                type="button"
                className="primary full"
                disabled={!kingDecisionReady || !canResolveKingGamble || Boolean(round)}
                onClick={() => claimKingGambleRecovery()}
              >
                Claim pieces and end turn
              </button>
              <button
                type="button"
                className="full danger-wager"
                disabled={!canResolveKingGamble || Boolean(round)}
                onClick={doubleKingGamble}
              >
                Gamble again for {kingRecoveryBudget * 2}
              </button>
            </div>
          </section>
        )}

        {!kingGambleDecision && (
        <section className="challenge-panel">
          <div className="panel-heading">
            <Swords size={18} aria-hidden="true" />
            <h2>Blackjack Recovery</h2>
          </div>
          <p className="small-copy">
            When behind by 5 or more, recover one or many captured pieces by matching their total value exactly.
          </p>

          {!blackjackBaseAllowed && (
            <div className="disabled-reason">
              {game.status !== 'active'
                ? 'The game is over.'
                : playerInCheck
                  ? 'Your king is in check.'
                  : blackjackCooldownActive
                    ? 'Move the king one square before another blackjack.'
                  : isLiveRoom && !canAct
                    ? `Waiting for ${labelColor(currentTurn)} to move.`
                    : `Need a deficit of at least 5. Current deficit: ${Math.max(0, deficit)}.`}
            </div>
          )}

          <div className="target-list">
            <h3>Captured pieces</h3>
            {capturedTargets.length ? (
              capturedTargets.map((piece) => (
                <button
                  type="button"
                  key={piece.id}
                  className={selectedTargetIds.includes(piece.id) ? 'selected-row' : ''}
                  onClick={() => toggleTarget(piece.id)}
                  disabled={!blackjackBaseAllowed || loneKingMode}
                >
                  <span>{PIECE_GLYPHS[piece.owner][piece.originalType]}</span>
                  <strong>{piece.originalType}</strong>
                  <em>{piece.originalSquare}</em>
                  <b>{recoveryValue(piece)}</b>
                </button>
              ))
            ) : (
              <p className="empty">No recoverable captured pieces.</p>
            )}
          </div>

          {!loneKingMode && (
            <div className="stake-list">
              <h3>Stake active pieces</h3>
              <div className="stake-grid">
                {currentActivePieces
                  .filter((piece) => piece.type !== 'king')
                  .map((piece) => (
                    <button
                      type="button"
                      key={piece.id}
                      className={selectedStakeIds.includes(piece.id) ? 'selected-row' : ''}
                      onClick={() => toggleStake(piece.id)}
                      disabled={!blackjackBaseAllowed || !selectedTargets.length}
                    >
                      <span>{PIECE_GLYPHS[piece.owner][piece.type]}</span>
                      <small>{piece.currentSquare}</small>
                      <b>{PIECE_VALUES[piece.type]}</b>
                    </button>
                  ))}
              </div>
              <div className="stake-total">
                <span>Stake {stakeTotal}</span>
                <span>Recovery {targetValue}</span>
              </div>
              <button
                type="button"
                className="primary full"
                disabled={!standardChallengeReady || Boolean(round)}
                onClick={() => beginRound('standard')}
              >
                Start challenge
              </button>
            </div>
          )}

          {loneKingMode && (
            <div className="stake-list">
              <div className="lone-king-title">
                <Crown size={18} aria-hidden="true" />
                <h3>Lone-king blackjack</h3>
              </div>
              <p className="small-copy">
                Risk the crown. Each win adds 2 recovery points; a loss passes the turn. Only checkmate ends the
                crown.
              </p>
              <div className="stake-grid">
                {kingRecoveryPieces.map((piece) => (
                  <button
                    type="button"
                    key={piece.id}
                    className={selectedKingRecoveryIds.includes(piece.id) ? 'selected-row' : ''}
                    onClick={() => toggleKingRecovery(piece.id)}
                    disabled={!blackjackBaseAllowed}
                  >
                    <span>{PIECE_GLYPHS[piece.owner][piece.originalType]}</span>
                    <small>{piece.originalSquare}</small>
                    <b>{recoveryValue(piece)}</b>
                  </button>
                ))}
              </div>
              <div className="stake-total">
                <span>King staked</span>
                <span>Opening claim {kingRecoveryValue}/2</span>
              </div>
              <button
                type="button"
                className="primary full"
                disabled={!kingChallengeReady || Boolean(round)}
                onClick={openKingGamble}
              >
                The King's Gamble
              </button>
            </div>
          )}
        </section>
        )}

      </aside>
    </main>
  );
}

export default App;
