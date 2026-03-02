/**
 * Local dev server for $MODRIC Lottery Verification dApp.
 *
 * - Serves index.html on http://localhost:3000
 * - Proxies POST /rpc → https://api.mainnet-beta.solana.com  (bypasses CORS)
 * - Proxies GET  /snapshot/:drawId → GitHub raw JSON          (bypasses CORS)
 *
 * No npm install needed — pure Node.js stdlib (https, http, fs).
 *
 * Usage:
 *   node server.mjs
 *   Then open: http://localhost:3000
 */

import http  from "http";
import https from "https";
import fs    from "fs";
import path  from "path";
import { fileURLToPath } from "url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const PORT  = 3000;

// ── Tiny HTTPS proxy helper ─────────────────────────────────────────────────

/** Forwards a request to a remote URL and pipes the response back. */
function proxy(targetUrl, method, headers, body, res) {
  const url  = new URL(targetUrl);
  const opts = {
    hostname: url.hostname,
    path:     url.pathname + url.search,
    method,
    headers: {
      ...headers,
      host: url.hostname,
      "user-agent": "modric-verify/1.0",
    },
  };

  const req = https.request(opts, remote => {
    // Add CORS headers so the browser page can read the response
    res.writeHead(remote.statusCode, {
      "Content-Type":                remote.headers["content-type"] || "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    remote.pipe(res);
  });

  req.on("error", err => {
    res.writeHead(502);
    res.end(JSON.stringify({ error: err.message }));
  });

  if (body) req.write(body);
  req.end();
}

// ── Request handler ─────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  // ── /rpc  →  Solana mainnet RPC ──────────────────────────────────────────
  if (url.pathname === "/rpc" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      proxy(
        "https://api.mainnet-beta.solana.com/",
        "POST",
        { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
        body,
        res
      );
    });
    return;
  }

  // ── /snapshot/:drawId  →  GitHub raw JSON ────────────────────────────────
  const SNAPSHOTS = {
    "1": "modric_top_holders_oct_19.json",
    "2": "modric_top_holders_nov_01.json",
    "3": "modric_top_holders_jan_14_2026.json",
  };
  const snapMatch = url.pathname.match(/^\/snapshot\/([123])$/);
  if (snapMatch && req.method === "GET") {
    const file = SNAPSHOTS[snapMatch[1]];
    proxy(
      `https://raw.githubusercontent.com/trendexgg/trendexgg/main/data/${file}`,
      "GET",
      {},
      null,
      res
    );
    return;
  }
  // Legacy /snapshot → Draw 3
  if (url.pathname === "/snapshot" && req.method === "GET") {
    proxy(
      "https://raw.githubusercontent.com/trendexgg/trendexgg/main/data/modric_top_holders_jan_14_2026.json",
      "GET",
      {},
      null,
      res
    );
    return;
  }

  // ── / or /index.html  →  Serve the HTML page ─────────────────────────────
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
  console.log(`  ║     POST /rpc          → Solana mainnet RPC      ║`);
  console.log(`  ║     GET  /snapshot/:id → GitHub snapshot proxy   ║`);
  console.log(`  ║                                                  ║`);
  console.log(`  ║   Stop: Ctrl+C                                   ║`);
  console.log(`  ╚══════════════════════════════════════════════════╝\n`);
});
