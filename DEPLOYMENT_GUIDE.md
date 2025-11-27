# XNT Wrapper Program - Deployment & Integration Guide

## Overview
This wrapper program enables native XNT to be wrapped into wXNT (SPL token), exactly like Solana's SOL/wSOL system. This allows XDEX (Raydium fork) to create liquidity pools with XNT.

## How It Works
- **Wrap**: User deposits native XNT → receives wXNT 1:1
- **Unwrap**: User burns wXNT → receives native XNT 1:1
- **Mint Authority**: The wrapper program's PDA controls wXNT minting
- **No AMM Changes**: Your audited AMM code remains untouched

---

## Deployment Steps

### 1. Build the Program
```bash
anchor build
```

### 2. Get Your Program ID
```bash
anchor keys list
```

Copy the program ID and update these files:
- `lib.rs` - line 5: `declare_id!("YOUR_PROGRAM_ID");`
- `Anchor.toml` - all program ID references

### 3. Deploy to Your Network
```bash
# For devnet
anchor deploy --provider.cluster devnet

# For mainnet (when ready)
anchor deploy --provider.cluster mainnet
```

### 4. Initialize wXNT Mint (ONE-TIME)
```bash
ts-node scripts/initialize.ts
```

**SAVE THE OUTPUT!** You'll get:
- wXNT Mint Address
- Wrapper Authority PDA

You need these addresses for XDEX integration.

### 5. Test Wrap/Unwrap
Update `scripts/test-wrap-unwrap.ts` with your wXNT mint address, then:
```bash
ts-node scripts/test-wrap-unwrap.ts
```

---

## Integration with XDEX

### Step 1: Configure wXNT as Native Token

In your XDEX config files, set wXNT as the wrapped native token:

```typescript
// XDEX config
export const NATIVE_TOKEN = {
  mint: new PublicKey("YOUR_WXNT_MINT_ADDRESS"),
  decimals: 9,
  symbol: "wXNT",
  name: "Wrapped XNT",
  isNative: true, // This tells XDEX it's the wrapped native token
};

export const WRAPPER_PROGRAM_ID = new PublicKey("YOUR_WRAPPER_PROGRAM_ID");
```

### Step 2: Add Auto-Wrap/Unwrap in UI

Add wrapper functionality to your swap interface:

```typescript
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

// Wrap native XNT to wXNT
export async function wrapXNT(
  program: Program,
  amount: number, // in XNT
  userPublicKey: PublicKey
) {
  const wxntMint = new PublicKey("YOUR_WXNT_MINT_ADDRESS");
  const [wrapperAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("wrapper-authority")],
    program.programId
  );
  
  const userWxntAccount = await getAssociatedTokenAddress(
    wxntMint,
    userPublicKey
  );

  const amountLamports = Math.floor(amount * LAMPORTS_PER_SOL);

  return await program.methods
    .wrap(new BN(amountLamports))
    .accounts({
      wxntMint,
      wrapperAuthority,
      user: userPublicKey,
      userWxntAccount,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc();
}

// Unwrap wXNT back to native XNT
export async function unwrapXNT(
  program: Program,
  amount: number, // in wXNT
  userPublicKey: PublicKey
) {
  const wxntMint = new PublicKey("YOUR_WXNT_MINT_ADDRESS");
  const [wrapperAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("wrapper-authority")],
    program.programId
  );
  
  const userWxntAccount = await getAssociatedTokenAddress(
    wxntMint,
    userPublicKey
  );

  const amountLamports = Math.floor(amount * LAMPORTS_PER_SOL);

  return await program.methods
    .unwrap(new BN(amountLamports))
    .accounts({
      wxntMint,
      wrapperAuthority,
      user: userPublicKey,
      userWxntAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}
```

### Step 3: Update Swap Flow

Modify your swap interface to auto-wrap when needed:

```typescript
// In your swap handler
async function handleSwap(inputToken, outputToken, amount) {
  let actualInputToken = inputToken;
  
  // If user is swapping with native XNT, wrap it first
  if (isNativeXNT(inputToken)) {
    await wrapXNT(wrapperProgram, amount, userPublicKey);
    actualInputToken = WXNT_MINT; // Now use wXNT for the swap
  }

  // Execute the normal AMM swap
  await executeSwap(actualInputToken, outputToken, amount);

  // If output is wXNT and user wants native, auto-unwrap
  if (isWXNT(outputToken) && userPrefersNative) {
    await unwrapXNT(wrapperProgram, outputAmount, userPublicKey);
  }
}
```

### Step 4: Pool Creation

Now XDEX can create pools! Example for XNT/USDC pool:

```typescript
// Create XNT/USDC pool (actually wXNT/USDC under the hood)
await createPool({
  tokenA: WXNT_MINT,  // wXNT mint address
  tokenB: USDC_MINT,
  initialPriceRatio: 0.5,
});
```

The AMM will treat wXNT exactly like any other SPL token.

---

## UI/UX Recommendations

### Display Logic
- Show "XNT" to users (not wXNT) - they don't need to know about wrapping
- Handle wrapping/unwrapping transparently in the background
- Display a toggle: "Use XNT" vs "Use wXNT" (like Raydium's "Use SOL")

### Example UI Flow
```
User wants to swap: 10 XNT → USDC

Behind the scenes:
1. Check if user has wXNT already
2. If not, prompt: "Wrap 10 XNT to proceed?"
3. Execute wrap transaction
4. Execute swap with wXNT
5. Done!

User receives: USDC (and still has remaining wXNT for future trades)
```

---

## Important Notes

### ✅ What You Don't Need to Change
- ❌ Your audited AMM program (zero changes)
- ❌ Pool math or swap logic
- ❌ Liquidity add/remove instructions
- ❌ Fee calculations

### ✅ What You Do Need
- ✅ Deploy wrapper program (this repo)
- ✅ Initialize wXNT mint (one-time, 5 minutes)
- ✅ Update XDEX config to recognize wXNT
- ✅ Add wrap/unwrap UI logic (frontend only)

### Security Considerations
- The wrapper program is simple and auditable (~200 lines)
- Only holds native XNT, mints wXNT 1:1
- No admin keys or upgrade authority needed
- Program can be immutable after deployment

---

## Testing Checklist

- [ ] Deploy wrapper program
- [ ] Initialize wXNT mint
- [ ] Test wrap 0.1 XNT
- [ ] Verify wXNT balance increases
- [ ] Test unwrap 0.1 wXNT
- [ ] Verify native XNT balance restored
- [ ] Create test pool (wXNT/USDC)
- [ ] Execute test swap
- [ ] Verify liquidity provision works
- [ ] Test auto-wrap in UI
- [ ] Test auto-unwrap in UI

---

## Common Issues & Fixes

### "Mint authority mismatch"
- Make sure wrapper authority PDA is correctly derived
- Seeds must be: `[b"wrapper-authority"]`

### "Insufficient funds"
- User needs native XNT for wrapping
- Remember to account for transaction fees

### "Token account doesn't exist"
- Use `init_if_needed` in wrap instruction
- Or create ATA before wrapping

### "Cannot create pool"
- Verify wXNT mint address in XDEX config
- Ensure wXNT has 9 decimals (like SOL)

---

## Support

If you run into issues:
1. Check the Anchor program logs: `solana logs`
2. Verify all addresses are correct
3. Test wrap/unwrap before integrating with XDEX
4. Reach out if you need help with specific errors

---

## Maintenance

This wrapper program is:
- ✅ Production-ready
- ✅ Follows Solana's wSOL pattern exactly
- ✅ No admin or upgrade authority
- ✅ Can be made immutable
- ✅ Minimal attack surface

Once deployed and tested, it requires zero maintenance.
