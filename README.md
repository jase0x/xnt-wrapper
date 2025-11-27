# XNT Wrapper Program

> Native XNT ↔ wXNT wrapping program for X1 blockchain, following Solana's SOL/wSOL pattern.

## What This Does

Enables XDEX (Raydium fork) to work with native XNT by providing a wrapped SPL token version (wXNT).

**The Problem:**
- XDEX requires SPL tokens for liquidity pools
- XNT is native (not SPL)
- No wXNT mint exists with proper authority

**The Solution:**
- Wrap native XNT into wXNT (SPL token) 1:1
- Unwrap wXNT back to native XNT 1:1
- Zero changes needed to your audited AMM code

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
# or
yarn install
```

### 2. Build the Program
```bash
anchor build
```

### 3. Update Program ID
```bash
anchor keys list
```
Copy the program ID and update:
- `programs/xnt-wrapper/src/lib.rs` (line 5)
- `Anchor.toml` (all occurrences)

### 4. Deploy
```bash
# Devnet
anchor deploy --provider.cluster devnet

# Mainnet (when ready)
anchor deploy --provider.cluster mainnet
```

### 5. Initialize wXNT Mint
```bash
npm run initialize
```
**Save the wXNT mint address!** You'll need it for XDEX.

### 6. Test It
```bash
# Update scripts/test-wrap-unwrap.ts with your mint address
npm run test-wrap
```

---

## Program Instructions

### `initialize()`
One-time setup. Creates the wXNT mint with:
- 9 decimals (like SOL)
- Mint authority: wrapper program PDA
- Freeze authority: wrapper program PDA

### `wrap(amount: u64)`
Wraps native XNT into wXNT:
1. User sends native XNT to wrapper program
2. Program mints wXNT to user's token account
3. 1:1 ratio maintained

### `unwrap(amount: u64)`
Unwraps wXNT back to native XNT:
1. User burns wXNT from their token account
2. Program sends native XNT back to user
3. 1:1 ratio maintained

---

## Integration with XDEX

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete integration instructions.

**Quick summary:**
1. Deploy wrapper program ✅
2. Initialize wXNT mint ✅
3. Update XDEX config with wXNT mint address
4. Add wrap/unwrap logic to UI
5. Create pools with wXNT
6. Profit! 🚀

---

## Architecture

```
User's Native XNT
       ↓ wrap()
Wrapper Program (holds XNT)
       ↓ mints
User's wXNT (SPL token)
       ↓ 
XDEX AMM (works with wXNT like any SPL token)
       ↓
User's wXNT (from swap/LP)
       ↓ unwrap()
Wrapper Program (burns wXNT)
       ↓
User's Native XNT
```

---

## Why This Works

This is **exactly** how Solana handles SOL/wSOL:
- ✅ Native token stays native
- ✅ Wrapper creates SPL representation
- ✅ AMM never touches native token
- ✅ No changes to audited DEX code
- ✅ Simple, battle-tested pattern

Your AMM doesn't know or care about native XNT. It only sees wXNT as another SPL token.

---

## File Structure

```
xnt-wrapper/
├── programs/
│   └── xnt-wrapper/
│       ├── src/
│       │   └── lib.rs          # Main wrapper program
│       └── Cargo.toml
├── scripts/
│   ├── initialize.ts           # Deploy wXNT mint
│   └── test-wrap-unwrap.ts     # Test wrapping
├── Anchor.toml
├── package.json
├── DEPLOYMENT_GUIDE.md         # Full integration guide
└── README.md                   # This file
```

---

## Security Notes

- **No admin keys**: Program has no upgrade authority (can be immutable)
- **Simple logic**: Only ~200 lines, easy to audit
- **Battle-tested pattern**: Same as Solana's wSOL
- **1:1 peg**: Always maintained by mint/burn mechanism
- **No external dependencies**: Pure SPL token operations

---

## Testing

Run the full test suite:
```bash
anchor test
```

Or test individual components:
```bash
# Initialize
npm run initialize

# Test wrap/unwrap
npm run test-wrap
```

---

## Troubleshooting

### "Program ID mismatch"
Update program ID in both `lib.rs` and `Anchor.toml`

### "Insufficient funds"
User needs native XNT for:
- Wrapping amount
- Transaction fees
- Token account rent

### "Cannot find module"
Run `npm install` or `yarn install`

### "Mint authority error"
Verify PDA derivation uses correct seed: `b"wrapper-authority"`

---

## What's Next?

After deploying this wrapper:

1. ✅ XDEX can create wXNT liquidity pools
2. ✅ Users can swap with XNT (via auto-wrap)
3. ✅ No changes to audited AMM code
4. ✅ Future gate NOT required for basic functionality

The "future gate" Cyphereus mentioned is for advanced features later, but **not needed** for XDEX to work right now.

---

## License

MIT

---

## Need Help?

- Check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed integration steps
- Review Solana's wSOL implementation for reference
- Test thoroughly on devnet before mainnet deployment

---

**Built for X1 blockchain** 🚀
