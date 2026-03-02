/**
 * Local dev server for $MODRIC Lottery Verification dApp.
 *
 * - Serves index.html on http://localhost:3000
 * - Proxies POST /rpc → Solana mainnet RPC (with endpoint rotation on 429)
 * - GET /snapshot/:drawId → serves local data/ files
 *
 * No npm install needed — pure Node.js stdlib (https, http, fs).
 *
 * Usage:
 *   node server.mjs
 *   Then open: http://localhost:3000
 */

import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

// ── RPC endpoint pool ───────────────────────────────────────────────────────
// Mirrors verify.mjs — rotates to next endpoint on 429/403/401.

const RPC_ENDPOINTS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana.publicnode.com",
];

let currentRpcIndex = 0;

function rpcLabel(idx) {
  try { return new URL(RPC_ENDPOINTS[idx % RPC_ENDPOINTS.length]).hostname; }
  catch { return RPC_ENDPOINTS[idx % RPC_ENDPOINTS.length]; }
}

function rotateRpc() {
  currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
  const label = rpcLabel(currentRpcIndex);
  console.log(`  ⟳ RPC rotate → ${label}`);
  return currentRpcIndex;
}

// ── Local snapshot mapping ──────────────────────────────────────────────────

const SNAPSHOTS = {
  "1": "modric_top_holders_oct_19.json",
  "2": "modric_top_holders_nov_01.json",
  "3": "modric_top_holders_jan_14_2026.json",
};

function serveSnapshot(drawId, res) {
  const filename = SNAPSHOTS[drawId];
  if (!filename) {
    res.writeHead(404, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    return res.end(JSON.stringify({ error: "Unknown draw ID" }));
  }
  const filePath = path.join(__dir, "data", filename);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    return res.end(JSON.stringify({ error: `File not found: data/${filename}` }));
  }
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
  fs.createReadStream(filePath).pipe(res);
}

// ── RPC proxy with retry + rotation ─────────────────────────────────────────

function proxyRpc(body, res, attempt) {
  if (attempt === undefined) attempt = 0;
  const maxAttempts = RPC_ENDPOINTS.length * 2;

  const endpoint = RPC_ENDPOINTS[currentRpcIndex];
  const url = new URL(endpoint);

  const opts = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
      host: url.hostname,
      "user-agent": "modric-verify/2.0",
    },
  };

  const req = https.request(opts, remote => {
    const isRetryable = [429, 403, 401].includes(remote.statusCode);

    if (isRetryable && attempt < maxAttempts - 1) {
      // Consume response, then rotate and retry
      remote.resume();
      rotateRpc();
      const delay = 500 * (attempt + 1);
      setTimeout(() => proxyRpc(body, res, attempt + 1), delay);
      return;
    }

    // Forward response headers with CORS + X-RPC-Endpoint for the frontend
    res.writeHead(remote.statusCode, {
      "Content-Type": remote.headers["content-type"] || "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers": "X-RPC-Endpoint",
      "X-RPC-Endpoint": rpcLabel(currentRpcIndex),
    });
    remote.pipe(res);
  });

  req.on("error", err => {
    if (attempt < maxAttempts - 1) {
      rotateRpc();
      setTimeout(() => proxyRpc(body, res, attempt + 1), 500);
      return;
    }
    res.writeHead(502, { "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify({ error: err.message }));
  });

  req.write(body);
  req.end();
}

// ── Request handler ─────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  // ── /rpc  →  Solana RPC (with rotation) ─────────────────────────────────
  if (url.pathname === "/rpc" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => proxyRpc(body, res));
    return;
  }

  // ── /snapshot/:drawId  →  local data/ files ─────────────────────────────
  const snapMatch = url.pathname.match(/^\/snapshot\/([123])$/);
  if (snapMatch && req.method === "GET") {
    return serveSnapshot(snapMatch[1], res);
  }
  // Legacy /snapshot → Draw 3
  if (url.pathname === "/snapshot" && req.method === "GET") {
    return serveSnapshot("3", res);
  }

  // ── /  →  Serve index.html ──────────────────────────────────────────────
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    const file = path.join(__dir, "index.html");
    if (!fs.existsSync(file)) {
      res.writeHead(404);
      return res.end("index.html not found in " + __dir);
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return fs.createReadStream(file).pipe(res);
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════════════╗`);
  console.log(`  ║   $MODRIC Lottery Verification — Local Server   ║`);
  console.log(`  ╠══════════════════════════════════════════════════╣`);
  console.log(`  ║                                                  ║`);
  console.log(`  ║   Open in browser:  http://localhost:${PORT}       ║`);
  console.log(`  ║                                                  ║`);
  console.log(`  ║   Routes:                                        ║`);
  console.log(`  ║     GET  /             → serves index.html       ║`);
  console.log(`  ║     POST /rpc          → Solana RPC (with pool)  ║`);
  console.log(`  ║     GET  /snapshot/:id → local data/ files       ║`);
  console.log(`  ║                                                  ║`);
  console.log(`  ║   RPC:  ${rpcLabel(currentRpcIndex).padEnd(38)}  ║`);
  console.log(`  ║   Stop: Ctrl+C                                   ║`);
  console.log(`  ╚══════════════════════════════════════════════════╝\n`);
});
