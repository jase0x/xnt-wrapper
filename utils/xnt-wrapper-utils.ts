/**
 * XNT Wrapper Utilities for XDEX Integration
 * 
 * Import these functions into your XDEX frontend to handle
 * automatic wrapping/unwrapping of XNT ↔ wXNT
 */

import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress 
} from "@solana/spl-token";

// ============================================================================
// CONFIGURATION - Update these with your deployed addresses
// ============================================================================

export const WXNT_CONFIG = {
  // TODO: Replace with your actual wXNT mint address from initialization
  mintAddress: new PublicKey("YourWXNTMintAddressHere"),
  
  // TODO: Replace with your deployed wrapper program ID
  programId: new PublicKey("YourWrapperProgramIDHere"),
  
  // Token info
  decimals: 9,
  symbol: "wXNT",
  name: "Wrapped XNT",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Derive the wrapper authority PDA
 */
export function getWrapperAuthority(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("wrapper-authority")],
    programId
  );
}

/**
 * Get user's wXNT associated token account address
 */
export async function getUserWxntAccount(userPublicKey: PublicKey): Promise<PublicKey> {
  return await getAssociatedTokenAddress(
    WXNT_CONFIG.mintAddress,
    userPublicKey
  );
}

/**
 * Convert XNT amount to lamports
 */
export function xntToLamports(xntAmount: number): BN {
  return new BN(Math.floor(xntAmount * LAMPORTS_PER_SOL));
}

/**
 * Convert lamports to XNT amount
 */
export function lamportsToXnt(lamports: BN): number {
  return lamports.toNumber() / LAMPORTS_PER_SOL;
}

// ============================================================================
// MAIN WRAPPER FUNCTIONS
// ============================================================================

/**
 * Wrap native XNT into wXNT tokens
 * 
 * @param program - The XNT wrapper program instance
 * @param amount - Amount of XNT to wrap (in XNT, not lamports)
 * @param userPublicKey - User's wallet public key
 * @returns Transaction signature
 * 
 * @example
 * // Wrap 10 XNT
 * const tx = await wrapXNT(wrapperProgram, 10, wallet.publicKey);
 */
export async function wrapXNT(
  program: Program,
  amount: number,
  userPublicKey: PublicKey
): Promise<string> {
  const [wrapperAuthority] = getWrapperAuthority(program.programId);
  const userWxntAccount = await getUserWxntAccount(userPublicKey);
  const amountLamports = xntToLamports(amount);

  return await program.methods
    .wrap(amountLamports)
    .accounts({
      wxntMint: WXNT_CONFIG.mintAddress,
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

/**
 * Unwrap wXNT tokens back to native XNT
 * 
 * @param program - The XNT wrapper program instance
 * @param amount - Amount of wXNT to unwrap (in wXNT, not lamports)
 * @param userPublicKey - User's wallet public key
 * @returns Transaction signature
 * 
 * @example
 * // Unwrap 5 wXNT
 * const tx = await unwrapXNT(wrapperProgram, 5, wallet.publicKey);
 */
export async function unwrapXNT(
  program: Program,
  amount: number,
  userPublicKey: PublicKey
): Promise<string> {
  const [wrapperAuthority] = getWrapperAuthority(program.programId);
  const userWxntAccount = await getUserWxntAccount(userPublicKey);
  const amountLamports = xntToLamports(amount);

  return await program.methods
    .unwrap(amountLamports)
    .accounts({
      wxntMint: WXNT_CONFIG.mintAddress,
      wrapperAuthority,
      user: userPublicKey,
      userWxntAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

/**
 * Check if user has a wXNT token account
 * 
 * @param connection - Solana connection
 * @param userPublicKey - User's wallet public key
 * @returns True if account exists
 */
export async function hasWxntAccount(
  connection: any,
  userPublicKey: PublicKey
): Promise<boolean> {
  try {
    const accountAddress = await getUserWxntAccount(userPublicKey);
    const accountInfo = await connection.getAccountInfo(accountAddress);
    return accountInfo !== null;
  } catch {
    return false;
  }
}

/**
 * Get user's wXNT balance
 * 
 * @param connection - Solana connection
 * @param userPublicKey - User's wallet public key
 * @returns wXNT balance (in wXNT, not lamports)
 */
export async function getWxntBalance(
  connection: any,
  userPublicKey: PublicKey
): Promise<number> {
  try {
    const accountAddress = await getUserWxntAccount(userPublicKey);
    const balance = await connection.getTokenAccountBalance(accountAddress);
    return balance.value.uiAmount || 0;
  } catch {
    return 0;
  }
}

/**
 * Get user's native XNT balance
 * 
 * @param connection - Solana connection
 * @param userPublicKey - User's wallet public key
 * @returns XNT balance (in XNT, not lamports)
 */
export async function getNativeXntBalance(
  connection: any,
  userPublicKey: PublicKey
): Promise<number> {
  const balance = await connection.getBalance(userPublicKey);
  return balance / LAMPORTS_PER_SOL;
}

// ============================================================================
// SMART SWAP HELPERS (for XDEX integration)
// ============================================================================

/**
 * Automatically wrap XNT if needed before a swap
 * Returns true if wrapping was performed
 * 
 * @example
 * // In your swap handler
 * await autoWrapForSwap(program, connection, inputToken, amount, wallet.publicKey);
 * // Now proceed with regular swap using wXNT
 */
export async function autoWrapForSwap(
  program: Program,
  connection: any,
  inputToken: PublicKey,
  amount: number,
  userPublicKey: PublicKey
): Promise<boolean> {
  // Check if input is native XNT (not an SPL token)
  // You'll need to implement your own logic to detect native vs SPL
  const isNativeXnt = inputToken.equals(PublicKey.default); // Placeholder logic
  
  if (!isNativeXnt) {
    return false; // No wrapping needed
  }

  // Check if user has enough native XNT
  const nativeBalance = await getNativeXntBalance(connection, userPublicKey);
  if (nativeBalance < amount) {
    throw new Error(`Insufficient XNT balance. Have ${nativeBalance}, need ${amount}`);
  }

  // Wrap the amount needed
  await wrapXNT(program, amount, userPublicKey);
  return true;
}

/**
 * Automatically unwrap wXNT after a swap if user prefers native
 * 
 * @example
 * // After swap completes
 * await autoUnwrapAfterSwap(program, connection, outputToken, outputAmount, wallet.publicKey, true);
 */
export async function autoUnwrapAfterSwap(
  program: Program,
  connection: any,
  outputToken: PublicKey,
  outputAmount: number,
  userPublicKey: PublicKey,
  userWantsNative: boolean = false
): Promise<boolean> {
  if (!userWantsNative) {
    return false; // User is fine keeping wXNT
  }

  const isWxnt = outputToken.equals(WXNT_CONFIG.mintAddress);
  if (!isWxnt) {
    return false; // Output isn't wXNT
  }

  // Unwrap the received wXNT
  await unwrapXNT(program, outputAmount, userPublicKey);
  return true;
}

// ============================================================================
// DISPLAY UTILITIES
// ============================================================================

/**
 * Format XNT/wXNT amount for display
 */
export function formatXntAmount(amount: number, decimals: number = 4): string {
  return amount.toFixed(decimals);
}

/**
 * Check if a token is wXNT
 */
export function isWxnt(tokenMint: PublicKey): boolean {
  return tokenMint.equals(WXNT_CONFIG.mintAddress);
}

// ============================================================================
// EXAMPLE USAGE IN XDEX
// ============================================================================

/*

// 1. Initialize wrapper program in your app
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { wrapXNT, unwrapXNT, autoWrapForSwap } from "./xnt-wrapper-utils";

const provider = AnchorProvider.env();
const wrapperProgram = new Program(wrapperIDL, WXNT_CONFIG.programId, provider);

// 2. In your swap handler
async function handleSwap(inputToken, outputToken, inputAmount) {
  // Auto-wrap if user is swapping with native XNT
  const didWrap = await autoWrapForSwap(
    wrapperProgram,
    connection,
    inputToken,
    inputAmount,
    wallet.publicKey
  );

  // If wrapped, use wXNT as input for the swap
  const actualInputToken = didWrap ? WXNT_CONFIG.mintAddress : inputToken;

  // Execute your normal AMM swap
  const outputAmount = await executeAmmSwap(actualInputToken, outputToken, inputAmount);

  // Auto-unwrap if user wants native XNT back
  await autoUnwrapAfterSwap(
    wrapperProgram,
    connection,
    outputToken,
    outputAmount,
    wallet.publicKey,
    userPreference.wantsNative
  );
}

// 3. Manual wrap button in UI
async function onWrapClick(amount: number) {
  try {
    const tx = await wrapXNT(wrapperProgram, amount, wallet.publicKey);
    console.log("Wrapped successfully:", tx);
  } catch (error) {
    console.error("Wrap failed:", error);
  }
}

// 4. Manual unwrap button in UI
async function onUnwrapClick(amount: number) {
  try {
    const tx = await unwrapXNT(wrapperProgram, amount, wallet.publicKey);
    console.log("Unwrapped successfully:", tx);
  } catch (error) {
    console.error("Unwrap failed:", error);
  }
}

*/
