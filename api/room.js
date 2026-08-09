import { assignRole, clientCount, getRoom, setRoom, touchClient } from './_roomStore.js';

function send(res, status, payload) {
  res.status(status).json(payload);
}

function normalizeRoomId(roomId) {
  return typeof roomId === 'string' && /^[a-zA-Z0-9_-]{4,64}$/.test(roomId) ? roomId : null;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {};
  if (Buffer.isBuffer(req.body)) {
    const rawBody = req.body.toString('utf8');
    return rawBody ? JSON.parse(rawBody) : {};
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const roomId = normalizeRoomId(req.query?.roomId);
      const clientId = req.query?.clientId;
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
    const clientId = typeof body.clientId === 'string' ? body.clientId : null;
    if (!roomId || !clientId) return send(res, 400, { error: 'roomId and clientId are required' });

    const room = await getRoom(roomId);
    const role = assignRole(room, clientId, body.requestedRole);
    let nextRoom = touchClient(room, clientId, role);

    if (body.type === 'join') {
      if (!nextRoom.state && body.state) {
        nextRoom = {
          ...nextRoom,
          state: body.state,
          version: nextRoom.version + 1,
        };
      }
    } else if (body.type === 'sync') {
      if (!body.state) return send(res, 400, { error: 'state is required for sync' });
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
    return send(res, 500, {
      error: 'room-sync-failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
