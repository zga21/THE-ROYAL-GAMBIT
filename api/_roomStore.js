const memoryRooms = globalThis.__ROYAL_GAMBIT_ROOMS__ ?? new Map();
globalThis.__ROYAL_GAMBIT_ROOMS__ = memoryRooms;

const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const hasRedis = Boolean(redisUrl && redisToken);
const ROOM_TTL_SECONDS = 6 * 60 * 60;
const PRESENCE_TIMEOUT_MS = 45_000;

function roomKey(roomId) {
  return `royal-gambit:room:${roomId}`;
}

function cleanRoom(room) {
  const now = Date.now();
  const clients = Object.fromEntries(
    Object.entries(room?.clients ?? {}).filter(([, client]) => now - (client.lastSeen ?? 0) < PRESENCE_TIMEOUT_MS),
  );

  return {
    state: room?.state ?? null,
    version: room?.version ?? 0,
    createdAt: room?.createdAt ?? now,
    updatedAt: room?.updatedAt ?? now,
    clients,
  };
}

async function redisCommand(parts) {
  const response = await fetch(redisUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${redisToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(parts),
  });

  if (response.ok) {
    return response.json();
  }

  if (parts[0] !== 'get') {
    throw new Error('redis-command-failed');
  }

  const fallback = await fetch(`${redisUrl}/${parts.map((part) => encodeURIComponent(String(part))).join('/')}`, {
    headers: {
      Authorization: `Bearer ${redisToken}`,
    },
  });

  if (!fallback.ok) {
    throw new Error('redis-command-failed');
  }

  return fallback.json();
}

export async function getRoom(roomId) {
  if (!roomId) return null;

  if (hasRedis) {
    const payload = await redisCommand(['get', roomKey(roomId)]);
    return payload?.result ? cleanRoom(JSON.parse(payload.result)) : cleanRoom(null);
  }

  return cleanRoom(memoryRooms.get(roomId));
}

export async function setRoom(roomId, room) {
  const nextRoom = cleanRoom({ ...room, updatedAt: Date.now() });

  if (hasRedis) {
    await redisCommand(['set', roomKey(roomId), JSON.stringify(nextRoom), 'EX', ROOM_TTL_SECONDS]);
    return nextRoom;
  }

  memoryRooms.set(roomId, nextRoom);
  return nextRoom;
}

export function assignRole(room, clientId, requestedRole) {
  const existing = room.clients?.[clientId]?.role;
  if (existing) return existing;

  const taken = new Set(Object.values(room.clients ?? {}).map((client) => client.role).filter(Boolean));
  if ((requestedRole === 'white' || requestedRole === 'black') && !taken.has(requestedRole)) return requestedRole;
  if (!taken.has('white')) return 'white';
  if (!taken.has('black')) return 'black';
  return 'spectator';
}

export function touchClient(room, clientId, role) {
  return {
    ...room,
    clients: {
      ...(room.clients ?? {}),
      [clientId]: {
        role,
        lastSeen: Date.now(),
      },
    },
  };
}

export function clientCount(room) {
  return Object.values(room.clients ?? {}).filter((client) => client.role === 'white' || client.role === 'black').length;
}
