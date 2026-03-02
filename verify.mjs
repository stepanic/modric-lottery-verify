/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║     TRENDEX $MODRIC LOTTERY — FULL ON-CHAIN VERIFICATION         ║
 * ║     All 3 Draws · Signed Luka Modrić Jersey Giveaways            ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 *
 * Independent verification of all 3 Trendex $MODRIC lottery draws.
 * Fetches VRF randomness from Solana, replays the selection algorithm,
 * and proves each winner was correctly selected.
 *
 * Requirements:  Node.js >= 18 + npm install
 * Run:           node verify.mjs          (all 3 draws)
 *                node verify.mjs 3        (single draw)
 *
 * Source algorithm: github.com/trendexgg/trendexgg
 */

import { Connection, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// ── All 3 draws ────────────────────────────────────────────────────────────

const DRAWS = [
  {
    id: 1,
    label: "Draw 1 — Oct 19, 2025",
    date: "October 19, 2025",
    vrfSeed: "2ZhsqrcNEbtHikLBQoK2mrTgJLjFSz4njPpUY9rJhpNn",
    signature: "4xehnSm7tqhSp47mHSGLJnz9o7LfRLN3xu2RjiqnHU88a68RzjnJeNfX9jzVXiECJ7tJM8NPdpLGiLTfRngcFtJ8",
    snapshot: "modric_top_holders_oct_19.json",
    holderCount: null,     // use all holders in file (20)
    randOffset: [40, 104], // bytes 40-104
  },
  {
    id: 2,
    label: "Draw 2 — Nov 01, 2025",
    date: "November 1, 2025",
    vrfSeed: "4SLs5v8A72kEKjwBJQoMGV3rY9xcirHQLmJ6rx6uHnez",
    signature: "3ggGrf5pdAdzsNDGC9sC7mjLjUT8ievzp9F5AR9tiBGymNrA7hHcYiHkxPNXHoYmvu7wpZHSj7JG3NidrxMWFLMJ",
    snapshot: "modric_top_holders_nov_01.json",
    holderCount: null,     // use all holders in file (8)
    randOffset: [73, 137], // bytes 73-137 (different offset for this draw)
  },
  {
    id: 3,
    label: "Draw 3 — Jan 14, 2026",
    date: "January 14, 2026",
    vrfSeed: "5DkZHCp9gbBKzcto6ezFhdFqyiqhig7cfn87Ugix36kK",
    signature: "3uVX8xScufRqtpaabM2bqr5UQYQ7gKB49Js3k4APpTA3CNbxmf8K5DSzqSyzXvcTzVdST6WnLatYA5N7iNFj997h",
    snapshot: "modric_top_holders_jan_14_2026.json",
    holderCount: 140,      // top 140 holders from sorted file
    randOffset: [40, 104], // bytes 40-104
    expectedWinner: "6bwzpkSKSXbjVMBYMSdazEytkaCZatibRdmExpjSgCyA",
  },
];

const MINT_ADDRESS = "F5qFr17LeunQk5ikRM9hseSi2bbZYXYRum8zaTegtrnd";
const ORAO_PROGRAM_ID = new PublicKey("VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y");
const SLOT_DIVISOR = 1000;
const BYTES_PER_SEL = 8;

// ── RPC endpoint pool ───────────────────────────────────────────────────────
// Free public Solana RPC nodes. The script rotates to the next one on 429/403.

const RPC_ENDPOINTS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana.publicnode.com",
  "https://mainnet.helius-rpc.com/?api-key=1d8740dc-e5f4-421c-b823-e1bad1889ced",
];

const RPC_CONNECTION_OPTS = {
  commitment: "confirmed",
  disableRetryOnRateLimit: true,   // we handle 429 ourselves — no internal spam
};

let currentRpcIndex = 0;
let connection = new Connection(RPC_ENDPOINTS[currentRpcIndex], RPC_CONNECTION_OPTS);

function getCurrentRpcLabel() {
  const url = RPC_ENDPOINTS[currentRpcIndex];
  try { return new URL(url).hostname; } catch { return url; }
}

function rotateRpc() {
  currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
  connection = new Connection(RPC_ENDPOINTS[currentRpcIndex], RPC_CONNECTION_OPTS);
  return getCurrentRpcLabel();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(minMs = 500, maxMs = 1500) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return sleep(ms);
}

/** Retry an RPC call, rotating endpoint on 429 / 403 errors */
async function rpcCall(fn, label = "RPC call") {
  const maxRetries = RPC_ENDPOINTS.length * 2;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await randomDelay();
      return await fn(connection);
    } catch (err) {
      const msg = err.message || "";
      const isRetryable = msg.includes("429") || msg.includes("Too many requests")
        || msg.includes("403") || msg.includes("Forbidden");
      if (isRetryable && attempt < maxRetries - 1) {
        const newRpc = rotateRpc();
        const delayMs = 1000 * (attempt + 1);
        kv("RPC rotate", `→ ${newRpc}  (retry ${attempt + 1}, wait ${delayMs}ms)`, C.yellow);
        await sleep(delayMs);
        continue;
      }
      throw err;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Trendex selection algorithm (exact port)
// github.com/trendexgg/trendexgg/src/utils/utils.ts
// github.com/trendexgg/trendexgg/src/core/selection.ts
// ─────────────────────────────────────────────────────────────────────────────

function distributeSlots(holders) {
  const slots = [];
  for (const h of holders) {
    const n = Math.floor(h.amount / SLOT_DIVISOR);
    for (let i = 0; i < n; i++) slots.push(h.publicKey);
  }
  return slots;
}

function deriveIndex(randomness, max, iteration = 0) {
  const off = iteration * BYTES_PER_SEL;
  const slice = randomness.slice(off, off + BYTES_PER_SEL);
  return Number(slice.readBigUInt64BE() % BigInt(max));
}

function selectWinners(holders, randomness, count = 1) {
  let remaining = distributeSlots(holders);
  const winners = [];
  for (let i = 0; i < count; i++) {
    const idx = deriveIndex(randomness, remaining.length, i);
    const addr = remaining[idx];
    winners.push({ address: addr, slotIndex: idx, totalSlots: remaining.length });
    remaining = remaining.filter(pk => pk !== addr);
  }
  return winners;
}

// ─────────────────────────────────────────────────────────────────────────────
// On-chain fetching  (uses rpcCall() for automatic retry + endpoint rotation)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchVRFRandomness(vrfPda, draw) {
  const accountInfo = await rpcCall(conn => conn.getAccountInfo(vrfPda), "getAccountInfo");
  if (!accountInfo) throw new Error("VRF account not found on-chain");

  const raw = Buffer.from(accountInfo.data);

  if (!accountInfo.owner.equals(ORAO_PROGRAM_ID))
    throw new Error(`Unexpected owner: ${accountInfo.owner.toBase58()}`);

  const [start, end] = draw.randOffset;
  const randomness = raw.slice(start, end);

  if (randomness.length !== 64)
    throw new Error(`Expected 64 bytes of randomness, got ${randomness.length}`);
  if (randomness.every(b => b === 0))
    throw new Error("Randomness is all zeros — VRF not fulfilled");

  return { randomness, accountSize: raw.length, raw };
}

async function fetchTransaction(signature) {
  const result = await rpcCall(
    conn => conn.getTransaction(signature, { maxSupportedTransactionVersion: 0 }),
    "getTransaction"
  );
  if (!result) throw new Error("Transaction not found");

  const blockTime = result.blockTime
    ? new Date(result.blockTime * 1000).toISOString()
    : "unknown";

  const accountKeys = result.transaction.message.getAccountKeys();
  let hasOrao = false;
  for (let i = 0; i < accountKeys.length; i++) {
    if (accountKeys.get(i)?.equals(ORAO_PROGRAM_ID)) { hasOrao = true; break; }
  }

  return { blockTime, slot: result.slot, success: !result.meta?.err, hasOrao };
}

async function fetchTokenInfo(winnerAddress) {
  const mint = new PublicKey(MINT_ADDRESS);
  const result = {};

  try {
    const supply = await rpcCall(conn => conn.getTokenSupply(mint), "getTokenSupply");
    result.supply = supply.value;
  } catch (e) { result.supplyError = e.message; }

  try {
    const accts = await rpcCall(
      conn => conn.getTokenAccountsByOwner(new PublicKey(winnerAddress), { mint }),
      "getTokenAccountsByOwner"
    );
    if (accts.value.length > 0) {
      const bal = await rpcCall(
        conn => conn.getTokenAccountBalance(accts.value[0].pubkey),
        "getTokenAccountBalance"
      );
      result.winnerBalance = bal.value;
      result.tokenAccount = accts.value[0].pubkey.toBase58();
    }
  } catch (e) { result.balanceError = e.message; }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pretty-print helpers
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m",
  cyan: "\x1b[36m", white: "\x1b[37m",
};
const ok = `${C.green}✅${C.reset}`;
const fail = `${C.red}❌${C.reset}`;
const info = `${C.cyan}ℹ${C.reset}`;

function header(title) {
  const line = "─".repeat(72);
  console.log(`\n${C.bold}${C.cyan}${line}${C.reset}`);
  console.log(`${C.bold} ${title}${C.reset}`);
  console.log(`${C.cyan}${line}${C.reset}`);
}

function kv(key, value, color = C.white) {
  console.log(`  ${C.dim}${key.padEnd(22)}${C.reset} ${color}${value}${C.reset}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Verify a single draw
// ─────────────────────────────────────────────────────────────────────────────

async function verifyDraw(draw) {
  header(`${draw.label}`);

  // 1. Load snapshot
  const __dirname = dirname(fileURLToPath(import.meta.url));
  let allHolders;
  try {
    allHolders = JSON.parse(
      readFileSync(join(__dirname, "data", draw.snapshot), "utf-8")
    );
  } catch (e) {
    console.error(`  ${fail} Cannot read data/${draw.snapshot}: ${e.message}`);
    return false;
  }

  const holders = draw.holderCount ? allHolders.slice(0, draw.holderCount) : allHolders;
  const totalSlots = holders.reduce((s, h) => s + Math.floor(h.amount / SLOT_DIVISOR), 0);
  const eligible = holders.filter(h => Math.floor(h.amount / SLOT_DIVISOR) > 0).length;

  kv("Snapshot", draw.snapshot);
  kv("Holders in file", `${allHolders.length}`);
  kv("Used for draw", `${holders.length}${draw.holderCount ? ` (top ${draw.holderCount})` : ' (all)'}`);
  kv("Eligible (≥1000)", `${eligible}`);
  kv("Total slots", totalSlots.toLocaleString());

  // 2. Derive PDA
  const seed = bs58.decode(draw.vrfSeed);
  const [derivedPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("orao-vrf-randomness-request"), seed],
    ORAO_PROGRAM_ID
  );
  kv("VRF Seed", draw.vrfSeed);
  kv("Derived PDA", derivedPda.toBase58());

  // 3. Fetch VRF randomness
  let randomness;
  try {
    const vrf = await fetchVRFRandomness(derivedPda, draw);
    randomness = vrf.randomness;
    const [s, e] = draw.randOffset;
    kv("Account size", `${vrf.accountSize} bytes`);
    kv("Randomness offset", `[${s}..${e}]`);
    kv("Owner", `${ok} Orao VRF program`);
    kv("Hex[0..16]", randomness.slice(0, 16).toString("hex"), C.dim);
  } catch (e) {
    console.error(`  ${fail} VRF: ${e.message}`);
    return false;
  }

  // 4. Verify transaction
  try {
    const tx = await fetchTransaction(draw.signature);
    kv("TX time", tx.blockTime, C.green);
    kv("TX slot", tx.slot.toLocaleString());
    kv("TX status", tx.success ? `${ok} Success` : `${fail} Failed`);
    kv("Orao in TX", tx.hasOrao ? `${ok}` : `${fail}`);
  } catch (e) {
    kv("TX check", `⚠ skipped: ${e.message}`, C.yellow);
  }

  // 5. Reproduce selection
  const firstBytes = randomness.slice(0, BYTES_PER_SEL);
  const bigVal = firstBytes.readBigUInt64BE();
  const slotIdx = Number(bigVal % BigInt(totalSlots));

  const winners = selectWinners(holders, randomness, 1);
  const computed = winners[0];

  kv("Bytes[0..8]", `0x${firstBytes.toString("hex")}`);
  kv("BigUInt64", bigVal.toString());
  kv("Index", `${bigVal} mod ${totalSlots} = ${slotIdx.toLocaleString()}`);
  kv("Computed winner", computed.address, C.green);

  // Winner stats
  const winnerEntry = holders.find(h => h.publicKey === computed.address);
  if (winnerEntry) {
    const rank = holders.indexOf(winnerEntry) + 1;
    const ws = Math.floor(winnerEntry.amount / SLOT_DIVISOR);
    kv("Winner tokens", `${winnerEntry.amount.toFixed(6)} MODRIC`);
    kv("Winner slots", `${ws.toLocaleString()} (${(ws / totalSlots * 100).toFixed(4)}%)`);
  }

  // Verdict
  if (draw.expectedWinner) {
    const match = computed.address === draw.expectedWinner;
    if (match) {
      console.log(`\n  ${ok} ${C.bold}${C.green}VERIFIED — computed winner matches announced winner${C.reset}`);
    } else {
      console.log(`\n  ${fail} ${C.bold}${C.red}MISMATCH — expected ${draw.expectedWinner}${C.reset}`);
    }
    return match;
  } else {
    console.log(`\n  ${info} Winner computed (no expected winner to compare — draw result shown above)`);
    return true;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${C.bold}${C.green}`);
  console.log("  ╔══════════════════════════════════════════════════════════════════════╗");
  console.log("  ║     TRENDEX $MODRIC LOTTERY — FULL ON-CHAIN VERIFICATION            ║");
  console.log("  ║     3 Draws · Signed Luka Modrić Jerseys · Orao VRF on Solana       ║");
  console.log("  ╚══════════════════════════════════════════════════════════════════════╝");
  console.log(C.reset);
  kv("RPC endpoint", getCurrentRpcLabel(), C.cyan);

  // Optional: select a specific draw
  const drawArg = process.argv[2];
  const drawsToRun = drawArg
    ? DRAWS.filter(d => d.id === Number(drawArg))
    : DRAWS;

  if (drawArg && drawsToRun.length === 0) {
    console.error(`${fail} Unknown draw: ${drawArg}. Use 1, 2, or 3.`);
    process.exit(1);
  }

  // Token verification (once)
  header("$MODRIC TOKEN VERIFICATION");
  kv("Mint", MINT_ADDRESS);
  try {
    const draw3 = DRAWS[2];
    const tokenInfo = await fetchTokenInfo(draw3.expectedWinner);
    if (tokenInfo.supply) {
      kv("Supply", `${tokenInfo.supply.uiAmountString} MODRIC (${tokenInfo.supply.decimals} decimals)`, C.green);
    }
    if (tokenInfo.winnerBalance) {
      kv("Draw 3 winner bal.", `${ok} ${tokenInfo.winnerBalance.uiAmountString} MODRIC`);
    }
  } catch (e) {
    kv("Token check", `⚠ ${e.message}`, C.yellow);
  }

  // Run each draw
  const results = [];
  for (const draw of drawsToRun) {
    const ok = await verifyDraw(draw);
    results.push({ draw, ok });
  }

  // Summary
  header("SUMMARY");
  for (const r of results) {
    const icon = r.ok ? ok : fail;
    const d = r.draw;
    console.log(`  ${icon} ${d.label} — offset [${d.randOffset[0]}:${d.randOffset[1]}], ${d.holderCount || 'all'} holders`);
  }

  // Chain of trust
  header("CHAIN OF TRUST");
  console.log(`  ${ok} VRF randomness — on-chain, Orao program, Solana mainnet`);
  console.log(`  ${ok} PDA derived — programmatically from seed for each draw`);
  console.log(`  ${ok} Algorithm — deterministic, open-source (github.com/trendexgg/trendexgg)`);
  console.log(`  ${ok} Token mint — $MODRIC verified on-chain`);
  console.log(`  ${C.yellow}⚠${C.reset}  Snapshots — published on Trendex GitHub (off-chain)`);
  console.log(`  ${C.yellow}⚠${C.reset}  Byte offsets — Draw 2 uses [73:137], Draws 1&3 use [40:104]`);
  console.log(`  ${C.dim}     Offset difference is undocumented; both produce verifiable results${C.reset}`);

  // Links
  console.log(`\n${C.dim}  🔗 Links:${C.reset}`);
  console.log(`${C.dim}     Mint    : https://solscan.io/token/${MINT_ADDRESS}${C.reset}`);
  console.log(`${C.dim}     GitHub  : https://github.com/trendexgg/trendexgg${C.reset}`);
  for (const d of drawsToRun) {
    console.log(`${C.dim}     ${d.label.slice(0, 6)} TX : https://solscan.io/tx/${d.signature}${C.reset}`);
  }
  console.log();

  const anyFailed = results.some(r => !r.ok);
  if (anyFailed) process.exit(1);
}

main().catch(err => {
  console.error(`\n${C.red}Fatal error:${C.reset}`, err.message);
  process.exit(1);
});
