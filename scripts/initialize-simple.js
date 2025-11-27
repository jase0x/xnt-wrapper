const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");

async function initialize() {
  // Setup
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const programId = new PublicKey("2Q8A2o2NkAeze9i38XJqMwdKNkygg52xK9HaXkSc539a");

  // Derive wrapper authority PDA
  const [wrapperAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("wrapper-authority")],
    programId
  );

  // Generate wXNT mint keypair
  const wxntMint = anchor.web3.Keypair.generate();

  console.log("Program ID:", programId.toString());
  console.log("Wrapper Authority:", wrapperAuthority.toString());
  console.log("wXNT Mint:", wxntMint.publicKey.toString());
  console.log("\nInitializing...");

  // Create instruction data (discriminator for "initialize")
  const data = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);

  // Build instruction
  const keys = [
    { pubkey: wxntMint.publicKey, isSigner: true, isWritable: true },
    { pubkey: wrapperAuthority, isSigner: false, isWritable: false },
    { pubkey: provider.wallet.publicKey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ];

  const ix = new anchor.web3.TransactionInstruction({
    keys,
    programId,
    data,
  });

  // Send transaction
  const tx = new anchor.web3.Transaction().add(ix);
  const sig = await provider.sendAndConfirm(tx, [wxntMint]);

  console.log("\n✅ wXNT mint initialized!");
  console.log("Transaction:", sig);
  console.log("\n📝 SAVE THESE ADDRESSES:");
  console.log("wXNT Mint Address:", wxntMint.publicKey.toString());
  console.log("Wrapper Authority:", wrapperAuthority.toString());
}

initialize()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
