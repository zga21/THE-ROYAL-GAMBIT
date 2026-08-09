import { assignRole, clientCount, getRoom, setRoom, touchClient } from './_roomStore.js';

const MAX_REQUEST_BYTES = 256 * 1024;
const MAX_STATE_BYTES = 192 * 1024;

function send(res, status, payload) {
  res.status(status).json(payload);
}

function httpError(statusCode, code) {
  const error = new Error(code);
  error.statusCode = statusCode;
  return error;
}

function normalizeRoomId(roomId) {
  return typeof roomId === 'string' && /^[a-zA-Z0-9_-]{4,64}$/.test(roomId) ? roomId : null;
}

function normalizeClientId(clientId) {
  return typeof clientId === 'string' && /^[a-zA-Z0-9_-]{8,80}$/.test(clientId) ? clientId : null;
}

function validateStatePayload(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw httpError(400, 'invalid-state');
  }

  const size = Buffer.byteLength(JSON.stringify(state), 'utf8');
  if (size > MAX_STATE_BYTES) {
    throw httpError(413, 'state-too-large');
  }
}

function parseJson(raw) {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw httpError(400, 'invalid-json');
  }
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return parseJson(req.body);
  if (Buffer.isBuffer(req.body)) {
    const rawBody = req.body.toString('utf8');
    return parseJson(rawBody);
  }

  const contentLength = Number(req.headers?.['content-length']);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    throw httpError(413, 'request-too-large');
  }

  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_REQUEST_BYTES) throw httpError(413, 'request-too-large');
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return parseJson(raw);
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const roomId = normalizeRoomId(req.query?.roomId);
      const clientId = normalizeClientId(req.query?.clientId);
      if (!roomId || !clientId) return send(res, 400, { error: 'roomId and clientId are required' });

      const room = await getRoom(roomId);
      const role = room.clients?.[clientId]?.role ?? 'spectator';
      const nextRoom = await setRoom(roomId, touchClient(room, clientId, role));
      return send(res, 200, {
        type: 'room-state',
        roomId,
        state: nextRoom.state,
        role,
        clientCount: clientCount(nextRoom),
        version: nextRoom.version,
      });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return send(res, 405, { error: 'method not allowed' });
    }

    const body = await readBody(req);
    const roomId = normalizeRoomId(body.roomId);
    const clientId = normalizeClientId(body.clientId);
    if (!roomId || !clientId) return send(res, 400, { error: 'roomId and clientId are required' });

    const room = await getRoom(roomId);
    const role = assignRole(room, clientId, body.requestedRole);
    let nextRoom = touchClient(room, clientId, role);

    if (body.type === 'join') {
      if (!nextRoom.state && body.state) {
        validateStatePayload(body.state);
        nextRoom = {
          ...nextRoom,
          state: body.state,
          version: nextRoom.version + 1,
        };
      }
    } else if (body.type === 'sync') {
      if (!body.state) return send(res, 400, { error: 'state is required for sync' });
      validateStatePayload(body.state);
      nextRoom = {
        ...nextRoom,
        state: body.state,
        version: nextRoom.version + 1,
      };
    } else {
      return send(res, 400, { error: 'unknown room action' });
    }

    nextRoom = await setRoom(roomId, nextRoom);
    return send(res, 200, {
      type: 'room-state',
      roomId,
      state: nextRoom.state,
      role,
      clientCount: clientCount(nextRoom),
      version: nextRoom.version,
    });
  } catch (error) {
    const status = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    const code = status >= 500 ? 'room-sync-failed' : error.message || 'bad-request';
    return send(res, status, { error: code });
  }
}
