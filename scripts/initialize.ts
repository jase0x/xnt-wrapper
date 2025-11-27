import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { XntWrapper } from "../target/types/xnt_wrapper";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

/**
 * Initialize the wXNT mint
 * This is a ONE-TIME operation to set up the wrapper
 */
async function initialize() {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.XntWrapper as Program<XntWrapper>;

  // Derive the wrapper authority PDA
  const [wrapperAuthority, wrapperBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("wrapper-authority")],
    program.programId
  );

  console.log("Program ID:", program.programId.toString());
  console.log("Wrapper Authority PDA:", wrapperAuthority.toString());

  // Generate a new keypair for the wXNT mint
  const wxntMint = anchor.web3.Keypair.generate();
  console.log("wXNT Mint:", wxntMint.publicKey.toString());

  try {
    // Initialize the wXNT mint
    const tx = await program.methods
      .initialize()
      .accounts({
        wxntMint: wxntMint.publicKey,
        wrapperAuthority: wrapperAuthority,
        payer: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([wxntMint])
      .rpc();

    console.log("✅ wXNT mint initialized!");
    console.log("Transaction signature:", tx);
    console.log("\n📝 Save these addresses:");
    console.log("wXNT Mint Address:", wxntMint.publicKey.toString());
    console.log("Wrapper Authority:", wrapperAuthority.toString());
    
  } catch (err) {
    console.error("Error initializing wXNT:", err);
    throw err;
  }
}

initialize()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
