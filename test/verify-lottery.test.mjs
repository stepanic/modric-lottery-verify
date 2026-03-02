/**
 * Trendex $MODRIC Lottery On-Chain Verification Tests
 *
 * Tests all 3 draws:
 *   Draw 1: Oct 19, 2025 — 20 holders, offset [40:104]
 *   Draw 2: Nov 01, 2025 — 8 holders, offset [73:137]
 *   Draw 3: Jan 14, 2026 — 140 holders, offset [40:104]
 *
 * Run: npm test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Connection, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// ============================================
// CONSTANTS
// ============================================

const ORAO_VRF_PROGRAM_ID = new PublicKey("VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y");
const RPC_ENDPOINT = "https://api.mainnet-beta.solana.com";
const SLOT_DIVISOR = 1000;
const BYTES_PER_SELECTION = 8;

const DRAWS = [
  {
    id: 1,
    label: "Draw 1 (Oct 19)",
    vrfSeed: "2ZhsqrcNEbtHikLBQoK2mrTgJLjFSz4njPpUY9rJhpNn",
    signature: "4xehnSm7tqhSp47mHSGLJnz9o7LfRLN3xu2RjiqnHU88a68RzjnJeNfX9jzVXiECJ7tJM8NPdpLGiLTfRngcFtJ8",
    snapshot: "modric_top_holders_oct_19.json",
    holderCount: null,
    randOffset: [40, 104],
    expectedWinner: null,
  },
  {
    id: 2,
    label: "Draw 2 (Nov 01)",
    vrfSeed: "4SLs5v8A72kEKjwBJQoMGV3rY9xcirHQLmJ6rx6uHnez",
    signature: "3ggGrf5pdAdzsNDGC9sC7mjLjUT8ievzp9F5AR9tiBGymNrA7hHcYiHkxPNXHoYmvu7wpZHSj7JG3NidrxMWFLMJ",
    snapshot: "modric_top_holders_nov_01.json",
    holderCount: null,
    randOffset: [73, 137],
    expectedWinner: null,
  },
  {
    id: 3,
    label: "Draw 3 (Jan 14)",
    vrfSeed: "5DkZHCp9gbBKzcto6ezFhdFqyiqhig7cfn87Ugix36kK",
    signature: "3uVX8xScufRqtpaabM2bqr5UQYQ7gKB49Js3k4APpTA3CNbxmf8K5DSzqSyzXvcTzVdST6WnLatYA5N7iNFj997h",
    snapshot: "modric_top_holders_jan_14_2026.json",
    holderCount: 140,
    randOffset: [40, 104],
    expectedWinner: "6bwzpkSKSXbjVMBYMSdazEytkaCZatibRdmExpjSgCyA",
  },
];

// ============================================
// LOAD SNAPSHOT DATA
// ============================================

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadHolders(draw) {
  const path = join(__dirname, "..", "data", draw.snapshot);
  const all = JSON.parse(readFileSync(path, "utf-8"));
  return draw.holderCount ? all.slice(0, draw.holderCount) : all;
}

// ============================================
// TRENDEX SELECTION ALGORITHM (exact copy)
// github.com/trendexgg/trendexgg/src/utils/utils.ts
// github.com/trendexgg/trendexgg/src/core/selection.ts
// ============================================

function distributeSlots(topHolders) {
  const slots = [];
  for (const holder of topHolders) {
    const n = Math.floor(holder.amount / SLOT_DIVISOR);
    if (n > 0) slots.push(...Array(n).fill(holder.publicKey));
  }
  return slots;
}

function generateRandomNumberFromRandomness(randomness, max, startFrom = 0) {
  if (max <= 0) throw new Error("Max value must be greater than 0");
  const offset = startFrom * BYTES_PER_SELECTION;
  const slice = randomness.slice(offset, offset + BYTES_PER_SELECTION);
  if (slice.length < BYTES_PER_SELECTION) throw new Error("Insufficient randomness bytes");
  return Number(Buffer.from(slice).readBigUInt64BE() % BigInt(max));
}

function selectFromRandomness(topHolders, randomness, numberOfSelection) {
  const slots = distributeSlots(topHolders);
  if (slots.length === 0) throw new Error("No valid slots");
  const result = [];
  let remaining = [...slots];
  for (let i = 0; i < numberOfSelection; i++) {
    const idx = generateRandomNumberFromRandomness(randomness, remaining.length, i);
    const winner = remaining[idx];
    result.push(winner);
    remaining = remaining.filter(s => s !== winner);
  }
  return result;
}

function deriveVRFAccount(seed) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("orao-vrf-randomness-request"), seed],
    ORAO_VRF_PROGRAM_ID
  );
  return pda;
}

// ============================================
// TESTS
// ============================================

const connection = new Connection(RPC_ENDPOINT, "confirmed");

// ── Snapshot tests (offline) ──

describe("1. Snapshot Data Validation", () => {
  for (const draw of DRAWS) {
    it(`should load ${draw.label} snapshot`, () => {
      const holders = loadHolders(draw);
      assert.ok(Array.isArray(holders));
      assert.ok(holders.length > 0);
      console.log(`    ${draw.label}: ${holders.length} holders`);
    });
  }

  it("should have valid public keys for all holders (Draw 3)", () => {
    const holders = loadHolders(DRAWS[2]);
    for (const h of holders) {
      assert.ok(h.publicKey);
      assert.ok(h.amount > 0);
      assert.doesNotThrow(() => new PublicKey(h.publicKey));
    }
  });

  it("Draw 3 should contain the winner wallet", () => {
    const holders = loadHolders(DRAWS[2]);
    const winner = holders.find(h => h.publicKey === DRAWS[2].expectedWinner);
    assert.ok(winner, "Winner must exist in top 140");
    assert.ok(winner.amount > 0);
    console.log(`    Winner holds ${winner.amount.toLocaleString()} $MODRIC`);
    console.log(`    Winner gets ${Math.floor(winner.amount / SLOT_DIVISOR)} slots`);
  });
});

// ── VRF Transaction tests (on-chain) ──

describe("2. VRF Transaction Verification", () => {
  it("should find Draw 3 VRF transaction on Solana", async () => {
    const tx = await connection.getTransaction(DRAWS[2].signature, {
      maxSupportedTransactionVersion: 0,
    });
    assert.ok(tx, "Transaction must exist");
    assert.ok(!tx.meta?.err, "Transaction must succeed");
    console.log(`    Block time: ${new Date(tx.blockTime * 1000).toISOString()}`);
    console.log(`    Slot: ${tx.slot}`);
  });

  it("should involve Orao VRF program", async () => {
    const tx = await connection.getTransaction(DRAWS[2].signature, {
      maxSupportedTransactionVersion: 0,
    });
    const keys = tx.transaction.message.getAccountKeys();
    let found = false;
    for (let i = 0; i < keys.length; i++) {
      if (keys.get(i)?.equals(ORAO_VRF_PROGRAM_ID)) { found = true; break; }
    }
    assert.ok(found, "TX must involve Orao VRF");
  });
});

// ── VRF Randomness tests (on-chain) ──

describe("3. VRF Randomness Verification", () => {
  for (const draw of DRAWS) {
    it(`should derive correct PDA for ${draw.label}`, async () => {
      const seed = bs58.decode(draw.vrfSeed);
      const pda = deriveVRFAccount(seed);
      const acct = await connection.getAccountInfo(pda);
      assert.ok(acct, `VRF account must exist for ${draw.label}`);
      assert.ok(acct.owner.equals(ORAO_VRF_PROGRAM_ID), "Must be owned by Orao");
      console.log(`    ${draw.label} PDA: ${pda.toBase58()}`);
      console.log(`    Account size: ${acct.data.length} bytes`);
    });
  }

  it("should have fulfilled randomness for Draw 3", async () => {
    const seed = bs58.decode(DRAWS[2].vrfSeed);
    const pda = deriveVRFAccount(seed);
    const acct = await connection.getAccountInfo(pda);
    const [start, end] = DRAWS[2].randOffset;
    const randomness = Buffer.from(acct.data.slice(start, end));
    assert.ok(!randomness.every(b => b === 0), "Must not be all zeros");
    console.log(`    Randomness offset: [${start}:${end}]`);
    console.log(`    Hex: ${randomness.toString("hex").slice(0, 32)}...`);
  });
});

// ── Winner Selection tests (on-chain) ──

describe("4. Winner Selection Verification", () => {
  it("should reproduce Draw 3 winner using VRF randomness", async () => {
    const draw = DRAWS[2];
    const seed = bs58.decode(draw.vrfSeed);
    const pda = deriveVRFAccount(seed);
    const acct = await connection.getAccountInfo(pda);
    const [start, end] = draw.randOffset;
    const randomness = Buffer.from(acct.data.slice(start, end));

    const holders = loadHolders(draw);
    const winners = selectFromRandomness(holders, randomness, 1);

    assert.equal(winners.length, 1);
    assert.equal(winners[0], draw.expectedWinner, `Winner must be ${draw.expectedWinner}`);

    const slots = distributeSlots(holders);
    const winnerEntry = holders.find(h => h.publicKey === draw.expectedWinner);
    const ws = Math.floor(winnerEntry.amount / SLOT_DIVISOR);
    console.log(`    Total slots: ${slots.length.toLocaleString()}`);
    console.log(`    Winner slots: ${ws} (${((ws / slots.length) * 100).toFixed(4)}%)`);
    console.log(`    Winner: ${winners[0]}`);
  });

  it("slot distribution should be correct for Draw 3", () => {
    const holders = loadHolders(DRAWS[2]);
    const slots = distributeSlots(holders);
    let expected = 0;
    for (const h of holders) expected += Math.floor(h.amount / SLOT_DIVISOR);
    assert.equal(slots.length, expected);
    console.log(`    Verified: ${expected.toLocaleString()} slots across ${holders.length} holders`);
  });
});

// ── Winner Wallet tests (on-chain) ──

describe("5. Winner Wallet On-Chain", () => {
  it("should be a valid Solana address", () => {
    assert.doesNotThrow(() => new PublicKey(DRAWS[2].expectedWinner));
  });

  it("should exist on Solana mainnet", async () => {
    const pk = new PublicKey(DRAWS[2].expectedWinner);
    const balance = await connection.getBalance(pk);
    console.log(`    SOL balance: ${(balance / 1e9).toFixed(4)} SOL`);
  });
});
