let engine = null;
let pendingResolve = null;
let pendingTimeout = null;
let latestScore = null;
let latestMate = null;
let latestDepth = null;
let rawLines = [];
let pendingSettings = { depth: null, skillLevel: null };

function clearPending() {
  if (pendingTimeout) {
    globalThis.clearTimeout(pendingTimeout);
    pendingTimeout = null;
  }
  pendingResolve = null;
}

function parseScore(line) {
  const depthMatch = line.match(/\bdepth (\d+)/);
  if (depthMatch) latestDepth = Number(depthMatch[1]);

  const cpMatch = line.match(/\bscore cp (-?\d+)/);
  if (cpMatch) {
    latestMate = null;
    return Number(cpMatch[1]);
  }

  const mateMatch = line.match(/\bscore mate (-?\d+)/);
  if (mateMatch) {
    const mate = Number(mateMatch[1]);
    latestMate = mate;
    return null;
  }

  return latestScore;
}

function createEngine() {
  if (engine) return engine;
  if (typeof Worker === 'undefined') return null;

  engine = new Worker('/stockfish/stockfish.js');

  engine.onmessage = (event) => {
    const line = String(event.data);
    rawLines.push(line);
    if (rawLines.length > 80) rawLines = rawLines.slice(-80);

    if (line.startsWith('info ')) {
      latestScore = parseScore(line);
    }

    if (line.startsWith('bestmove') && pendingResolve) {
      const parts = line.split(' ');
      const bestMove = parts[1];
      const resolve = pendingResolve;
      const result = {
        uci: bestMove,
        bestMove,
        centipawns: Number.isFinite(latestScore) ? latestScore : null,
        mate: Number.isFinite(latestMate) ? latestMate : null,
        depth: latestDepth ?? pendingSettings.depth,
        skillLevel: pendingSettings.skillLevel,
        rawLines: [...rawLines],
      };
      clearPending();
      resolve(result);
    }
  };

  engine.onerror = () => {
    if (pendingResolve) {
      const resolve = pendingResolve;
      clearPending();
      resolve({
        uci: null,
        bestMove: null,
        centipawns: null,
        mate: null,
        error: 'stockfish-timeout-or-load-failure',
        rawLines: [...rawLines],
      });
    }
    engine?.terminate();
    engine = null;
  };

  engine.postMessage('uci');
  engine.postMessage('isready');

  return engine;
}

export function getStockfishBestMove(fen, { depth = 12, skillLevel = 10, timeoutMs = 8000 } = {}) {
  const worker = createEngine();

  if (!worker) {
    return Promise.resolve({
      uci: null,
      bestMove: null,
      centipawns: null,
      mate: null,
      error: 'stockfish-timeout-or-load-failure',
      rawLines: [],
    });
  }

  return new Promise((resolve) => {
    if (pendingResolve) {
      pendingResolve({
        uci: null,
        bestMove: null,
        centipawns: null,
        mate: null,
        error: 'stockfish-superseded',
        rawLines: [...rawLines],
      });
      clearPending();
    }

    latestScore = null;
    latestMate = null;
    latestDepth = null;
    rawLines = [];
    pendingSettings = { depth, skillLevel };
    pendingResolve = resolve;
    pendingTimeout = globalThis.setTimeout(() => {
      clearPending();
      resolve({
        uci: null,
        bestMove: null,
        centipawns: null,
        mate: null,
        error: 'stockfish-timeout-or-load-failure',
        rawLines: [...rawLines],
      });
    }, timeoutMs);

    worker.postMessage(`setoption name Skill Level value ${skillLevel}`);
    worker.postMessage(`position fen ${fen}`);
    worker.postMessage(`go depth ${depth}`);
  });
}
