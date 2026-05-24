import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT || 5174);
const rooms = new Map();

if (!fs.existsSync(distDir)) {
  console.error('Missing dist/. Run `npm run build` first.');
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function getLanOrigins() {
  const origins = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        origins.push(`http://${entry.address}:${port}`);
      }
    }
  }
  return origins;
}

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { state: null, clients: new Set() });
  }
  return rooms.get(roomId);
}

function assignRole(room, requestedRole) {
  const taken = new Set([...room.clients].map((client) => client.role).filter(Boolean));
  if ((requestedRole === 'white' || requestedRole === 'black') && !taken.has(requestedRole)) return requestedRole;
  if (!taken.has('white')) return 'white';
  if (!taken.has('black')) return 'black';
  return 'spectator';
}

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcast(room, sender, payload) {
  for (const client of room.clients) {
    if (client !== sender) send(client, payload);
  }
}

app.get('/api/info', (req, res) => {
  const lanOrigins = getLanOrigins();
  res.json({
    server: true,
    port,
    lanOrigins,
    preferredOrigin: lanOrigins[0] ?? `http://localhost:${port}`,
  });
});

app.use(express.static(distDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

wss.on('connection', (ws) => {
  ws.id = crypto.randomUUID();

  ws.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (message.type === 'join' && message.roomId) {
      const room = getRoom(message.roomId);
      if (ws.roomId && rooms.has(ws.roomId)) {
        rooms.get(ws.roomId).clients.delete(ws);
      }

      ws.roomId = message.roomId;
      ws.role = assignRole(room, message.requestedRole);
      room.clients.add(ws);
      if (!room.state && message.state) room.state = message.state;

      send(ws, {
        type: 'room-state',
        roomId: ws.roomId,
        state: room.state,
        role: ws.role,
        clientCount: room.clients.size,
      });
      broadcast(room, ws, { type: 'presence', roomId: ws.roomId, clientCount: room.clients.size });
    }

    if (message.type === 'sync' && ws.roomId && message.state) {
      const room = getRoom(ws.roomId);
      room.state = message.state;
      broadcast(room, ws, { type: 'room-state', roomId: ws.roomId, state: room.state });
    }
  });

  ws.on('close', () => {
    if (!ws.roomId || !rooms.has(ws.roomId)) return;
    const room = rooms.get(ws.roomId);
    room.clients.delete(ws);
    broadcast(room, ws, { type: 'presence', roomId: ws.roomId, clientCount: room.clients.size });
    if (!room.clients.size && !room.state) rooms.delete(ws.roomId);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`The Royal Gambit friend server running at http://localhost:${port}`);
  for (const origin of getLanOrigins()) {
    console.log(`LAN link: ${origin}`);
  }
});
