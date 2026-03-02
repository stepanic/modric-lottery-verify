# $MODRIC Lottery — Independent On-Chain Verification

Independent cryptographic verification of all 3 Trendex $MODRIC lottery draws (signed Luka Modric jersey giveaways) using Orao VRF on Solana.

Nezavisna kriptografska verifikacija sva 3 Trendex $MODRIC nagradna izvlacenja (potpisani dresovi Luke Modrica) koristeci Orao VRF na Solani.

## All 3 Draws

| Draw | Date | Holders | VRF Seed | Rand Offset | Winner |
|------|------|---------|----------|-------------|--------|
| 1 | Oct 19, 2025 | 20 (all) | `2ZhsqrcN...hpNn` | `[40:104]` | *(computed)* |
| 2 | Nov 01, 2025 | 8 (all) | `4SLs5v8A...Hnez` | `[73:137]` | *(computed)* |
| 3 | Jan 14, 2026 | 140 (top) | `5DkZHCp9...6kK` | `[40:104]` | `6bwzpk...gCyA` |

### Draw 3 Details (Main Lottery)

| Field | Value |
|-------|-------|
| Winner Wallet | `6bwzpkSKSXbjVMBYMSdazEytkaCZatibRdmExpjSgCyA` |
| VRF Seed | `5DkZHCp9gbBKzcto6ezFhdFqyiqhig7cfn87Ugix36kK` |
| VRF PDA | `HJyvitPbQ7AjxaH9EPHtZjsh9e4wcuaPbgJ9YQ1Q37PF` |
| VRF Transaction | [`3uVX8xScuf...Fj997h`](https://solscan.io/tx/3uVX8xScufRqtpaabM2bqr5UQYQ7gKB49Js3k4APpTA3CNbxmf8K5DSzqSyzXvcTzVdST6WnLatYA5N7iNFj997h) |
| $MODRIC Mint | `F5qFr17LeunQk5ikRM9hseSi2bbZYXYRum8zaTegtrnd` |

## Chain of Trust / Lanac povjerenja

| What | Status | How |
|------|--------|-----|
| VRF Randomness | **On-chain** | Orao VRF PDA account on Solana mainnet |
| PDA Derivation | **On-chain** | Programmatically derived from seed, not hardcoded |
| VRF Transaction | **On-chain** | Transaction exists, succeeded, invoked Orao VRF |
| Selection Algorithm | **Open-source** | Exact port of [Trendex source](https://github.com/trendexgg/trendexgg/blob/main/src/core/selection.ts) |
| $MODRIC Token | **On-chain** | Winner's token account verified on-chain |
| Holder Snapshots | **GitHub** | Published by Trendex ([commits](https://github.com/trendexgg/trendexgg/commits/main/)) |

> **Transparency note**: The holder snapshots were published by Trendex on their GitHub. VRF randomness and the selection algorithm are fully on-chain/open-source and independently verifiable. For complete trustlessness, snapshot balances can be cross-verified using an archival Solana RPC at each lottery block height.

## Usage / Koristenje

### CLI Verification

```bash
# Requires Node.js 18+
npm install

# Verify all 3 draws
npm run verify
# or: node verify.mjs

# Verify a single draw
node verify.mjs 3
```

### Browser dApp

```bash
npm install
npm run serve
# Open http://localhost:3000
```

The browser dApp has a draw selector (tabs) to verify each draw independently.

### Test Suite

```bash
npm test
```

## How It Works / Kako radi

For each draw:

1. **Load snapshot** -- Load holders from Trendex's official [GitHub snapshot](https://github.com/trendexgg/trendexgg/tree/main/data)
2. **Verify token** -- Confirm $MODRIC mint exists, winner holds tokens on-chain
3. **Derive PDA** -- Programmatically derive VRF account from seed using `["orao-vrf-randomness-request", seed]`
4. **Fetch VRF** -- Read 64-byte randomness from Orao VRF account at the draw's byte offset
5. **Verify transaction** -- Confirm VRF TX exists on Solana mainnet, invoked Orao VRF
6. **Replay algorithm** -- Run Trendex's exact selection algorithm:
   - Each holder gets `floor(tokens / 1000)` lottery slots
   - First 8 bytes of VRF randomness read as `BigUInt64BE`
   - Winner index = `randomness_value % total_slots`
7. **Compare** -- Computed winner must match announced winner (where known)

## Byte Offset Note

Draws 1 and 3 use randomness bytes at offset `[40:104]`, while Draw 2 uses offset `[73:137]`. This difference is undocumented but both offsets produce verifiable, reproducible results against their respective VRF accounts.

## Trendex Source Code Timeline

From [`github.com/trendexgg/trendexgg`](https://github.com/trendexgg/trendexgg) commit history:

| Commit | Date | Description |
|--------|------|-------------|
| `5c5ded6` | Oct 21, 2025 | Initial project: randomness generation and winner selection |
| `bf54572` | Oct 21, 2025 | Refactor: validation utilities, improved modularity |
| `fdc4007` | Oct 21, 2025 | Remove unused scripts |
| `f028cea` | Nov 1, 2025 | Add November top holders data file |
| `004c67a` | Jan 14, 2026 | Add data directory to .gitignore |
| `e39e2aa` | Jan 14, 2026 | VS Code debug config, update default data path to Jan 14 |
| `dd66bc1` | Jan 19, 2026 | Add January 14 holder snapshot (997 holders) |

## Project Structure

```
.
├── verify.mjs                              # CLI verification (all 3 draws)
├── index.html                              # Browser dApp (draw selector)
├── server.mjs                              # Dev server (CORS proxy)
├── test/verify-lottery.test.mjs            # Test suite
├── data/
│   ├── modric_top_holders_oct_19.json      # Draw 1 snapshot (20 holders)
│   ├── modric_top_holders_nov_01.json      # Draw 2 snapshot (8 holders)
│   └── modric_top_holders_jan_14_2026.json # Draw 3 snapshot (997 holders, top 140 used)
└── package.json
```

## On-Chain Links

### Draw 3 (Main Lottery)
- [VRF Transaction](https://solscan.io/tx/3uVX8xScufRqtpaabM2bqr5UQYQ7gKB49Js3k4APpTA3CNbxmf8K5DSzqSyzXvcTzVdST6WnLatYA5N7iNFj997h)
- [VRF Account (PDA)](https://solscan.io/account/HJyvitPbQ7AjxaH9EPHtZjsh9e4wcuaPbgJ9YQ1Q37PF)
- [Winner Wallet](https://solscan.io/account/6bwzpkSKSXbjVMBYMSdazEytkaCZatibRdmExpjSgCyA)

### Draw 1
- [VRF Transaction](https://solscan.io/tx/4xehnSm7tqhSp47mHSGLJnz9o7LfRLN3xu2RjiqnHU88a68RzjnJeNfX9jzVXiECJ7tJM8NPdpLGiLTfRngcFtJ8)
- [VRF Account (PDA)](https://solscan.io/account/FmFz1Q9reotBSa1wEUciim6Q5e6JR3AYc5eU8YUG4Fyh)

### Draw 2
- [VRF Transaction](https://solscan.io/tx/3ggGrf5pdAdzsNDGC9sC7mjLjUT8ievzp9F5AR9tiBGymNrA7hHcYiHkxPNXHoYmvu7wpZHSj7JG3NidrxMWFLMJ)
- [VRF Account (PDA)](https://solscan.io/account/A7WTnsag9rETHdkq44GQ9t1zwxCxa3YPomykM8sTvMVY)

### Token & Source
- [$MODRIC Token](https://solscan.io/token/F5qFr17LeunQk5ikRM9hseSi2bbZYXYRum8zaTegtrnd)
- [Trendex Source Code](https://github.com/trendexgg/trendexgg)
- [Selection Algorithm](https://github.com/trendexgg/trendexgg/blob/main/src/core/selection.ts)
