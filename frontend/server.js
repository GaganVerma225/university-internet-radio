// server.js
// Run: node server.js
// package.json -> { "type": "module" }

import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import { Buffer } from "node:buffer";

const PORT = process.env.PORT || 3000;

// ---------- HTTP server (proxy/tunnel friendly) ----------
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("ws signaling server");
});

// ---------- WS server on path /ws ----------
const wss = new WebSocketServer({ server, path: "/ws" });

// ---------- Global state for admin dashboard ----------
let broadcasting = false;
let broadcastStartTime = null; // ms epoch
let broadcasterId = null;
let listenerCount = 0;

const clients = new Map(); // id -> { ws, role }
const admins = new Set();  // set of admin ids

// Helpers
const send = (ws, obj) => {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
};

const pushAdminUpdate = () => {
  const payload = {
    type: "admin-update",
    broadcasting,
    listenerCount,
    startTime: broadcastStartTime,
  };
  for (const id of admins) {
    const c = clients.get(id);
    if (c?.ws?.readyState === WebSocket.OPEN) send(c.ws, payload);
  }
};

const safeParse = (raw) => {
  try {
    const s = typeof raw === "string" ? raw : raw.toString();
    return JSON.parse(s);
  } catch {
    return null;
  }
};

// ---------- WS connection ----------
wss.on("connection", (ws, req) => {
  const id = uuidv4();
  clients.set(id, { ws, role: "unknown" });

  console.log(`WS connected: id=${id}, origin=${req.headers.origin || "n/a"}`);

  ws.on("message", (raw) => {
    const msg = safeParse(raw);
    if (!msg || !msg.type) return;

    // ---- 1) Auth / Role ----
    if (msg.type === "auth") {
      const role = msg.role; // "admin" | "broadcaster" | "listener"
      clients.get(id).role = role;

      if (role === "admin") {
        // (Optionally validate msg.token here)
        admins.add(id);
        pushAdminUpdate(); // snapshot
      }

      if (role === "listener") {
        listenerCount++;
        pushAdminUpdate();

        // Notify broadcaster to create an offer for this listener
        if (broadcasterId) {
          const b = clients.get(broadcasterId);
          if (b?.ws?.readyState === WebSocket.OPEN) {
            send(b.ws, { type: "new-listener", listenerId: id });
          }
        }
      }

      if (role === "broadcaster") {
        broadcasterId = id;
      }

      return;
    }

    // ---- 2) Manual broadcast start/stop from broadcaster ----
    if (msg.type === "broadcast-start") {
      if (clients.get(id)?.role === "broadcaster") {
        broadcasting = true;
        broadcastStartTime = Date.now();
        pushAdminUpdate();
      }
      return;
    }

    if (msg.type === "broadcast-stop") {
      if (clients.get(id)?.role === "broadcaster") {
        broadcasting = false;
        broadcastStartTime = null;
        pushAdminUpdate();
      }
      return;
    }

    // ---- 3) Signaling relay ----
    if (msg.type === "offer" && clients.get(id)?.role === "broadcaster") {
      // Safety: first offer marks broadcast started (in case broadcaster didn't send broadcast-start)
      if (!broadcasting) {
        broadcasting = true;
        broadcastStartTime = Date.now();
        pushAdminUpdate();
      }
    }

    if (msg.type === "offer" || msg.type === "answer" || msg.type === "candidate") {
      const target = clients.get(msg.targetId);
      if (target?.ws?.readyState === WebSocket.OPEN) {
        send(target.ws, { ...msg, senderId: id });
      }
      return;
    }

    // Optional heartbeat
    if (msg.type === "ping") {
      try { ws.pong(); } catch {}
      return;
    }
  });

  ws.on("close", (code, reason) => {
    const role = clients.get(id)?.role;

    if (role === "listener") {
      listenerCount = Math.max(0, listenerCount - 1);
      pushAdminUpdate();
    }

    if (role === "admin") {
      admins.delete(id);
    }

    if (id === broadcasterId) {
      // broadcaster disconnected => stop broadcast
      broadcasting = false;
      broadcastStartTime = null;
      broadcasterId = null;
      pushAdminUpdate();
    }

    clients.delete(id);
    const r = Buffer.isBuffer(reason) ? reason.toString() : String(reason || "");
    console.log(`WS closed: id=${id}, code=${code}, reason=${r}`);
  });

  ws.on("error", (err) => {
    console.error(`WS error: id=${id}`, err);
  });
});

// Keepalive (avoid idle closes by proxies)
setInterval(() => {
  for (const { ws } of clients.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.ping(); } catch {}
    }
  }
}, 30000);

// Start server
server.listen(PORT, () => {
  console.log(`HTTP+WS listening on http://localhost:${PORT}  (WS path: /ws)`);
  console.log(`Frontend should connect to ws://localhost:${PORT}/ws (or wss://<tunnel>/ws)`);
});
