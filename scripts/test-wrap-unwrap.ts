import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { XntWrapper } from "../target/types/xnt_wrapper";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";

/**
 * Test wrapping and unwrapping XNT
 * Replace WXNT_MINT_ADDRESS with your actual mint address from initialization
 */
const WXNT_MINT_ADDRESS = "YourWXNTMintAddressHere"; // TODO: Replace with actual mint address

async function testWrapUnwrap() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.XntWrapper as Program<XntWrapper>;
  const wxntMint = new PublicKey(WXNT_MINT_ADDRESS);

  // Derive wrapper authority
  const [wrapperAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("wrapper-authority")],
    program.programId
  );

  // Get user's associated token account for wXNT
  const userWxntAccount = await getAssociatedTokenAddress(
    wxntMint,
    provider.wallet.publicKey
  );

  console.log("User:", provider.wallet.publicKey.toString());
  console.log("wXNT Mint:", wxntMint.toString());
  console.log("User wXNT Account:", userWxntAccount.toString());

  // Amount to wrap (0.1 XNT = 100,000,000 lamports, like SOL)
  const wrapAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);

  try {
    // Get initial balances
    const initialNativeBalance = await provider.connection.getBalance(provider.wallet.publicKey);
    console.log("\n📊 Initial Balances:");
    console.log(`Native XNT: ${initialNativeBalance / LAMPORTS_PER_SOL} XNT`);

    // Test WRAP
    console.log("\n🔄 Wrapping XNT...");
    const wrapTx = await program.methods
      .wrap(wrapAmount)
      .accounts({
        wxntMint: wxntMint,
        wrapperAuthority: wrapperAuthority,
        user: provider.wallet.publicKey,
        userWxntAccount: userWxntAccount,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("✅ Wrap transaction:", wrapTx);

    // Check balances after wrap
    const nativeBalanceAfterWrap = await provider.connection.getBalance(provider.wallet.publicKey);
    const wxntBalance = await provider.connection.getTokenAccountBalance(userWxntAccount);
    
    console.log("\n📊 After Wrapping:");
    console.log(`Native XNT: ${nativeBalanceAfterWrap / LAMPORTS_PER_SOL} XNT`);
    console.log(`wXNT: ${wxntBalance.value.uiAmount} wXNT`);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test UNWRAP
    console.log("\n🔄 Unwrapping wXNT...");
    const unwrapTx = await program.methods
      .unwrap(wrapAmount)
      .accounts({
        wxntMint: wxntMint,
        wrapperAuthority: wrapperAuthority,
        user: provider.wallet.publicKey,
        userWxntAccount: userWxntAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("✅ Unwrap transaction:", unwrapTx);

    // Check final balances
    const finalNativeBalance = await provider.connection.getBalance(provider.wallet.publicKey);
    const finalWxntBalance = await provider.connection.getTokenAccountBalance(userWxntAccount);
    
    console.log("\n📊 After Unwrapping:");
    console.log(`Native XNT: ${finalNativeBalance / LAMPORTS_PER_SOL} XNT`);
    console.log(`wXNT: ${finalWxntBalance.value.uiAmount} wXNT`);

    console.log("\n✅ Wrap/Unwrap test completed successfully!");

  } catch (err) {
    console.error("Error during wrap/unwrap test:", err);
    throw err;
  }
}

testWrapUnwrap()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
