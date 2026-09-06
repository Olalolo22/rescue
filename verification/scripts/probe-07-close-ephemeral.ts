/**
 * PROBE 07: Ephemeral Account Lifecycle & Zero-L1-Trace Cleanup Probe
 * 
 * Verifies Assumption #7 from ARCHITECTURE.md:
 * "close_ephemeral_account cleans up LenderBidPDA on ER without leaving state on L1"
 * 
 * Tests:
 * 1. An ephemeral account (simulating private LenderBidPDA) is initialized directly on TEE ER.
 * 2. Proves the account exists on TEE ER but has 0 presence on Solana base layer.
 * 3. Closes the ephemeral account on TEE ER (refunding rent lamports).
 * 4. Verifies the account is purged from TEE ER and leaves ZERO trace on Solana base layer.
 */
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  getBaseConnection,
  getErConnection,
  loadKeypair,
  createWallet,
  getAnchorProgram,
  findEphemeralPda,
  findProbePda,
  authorizeSigner,
  TEE_VALIDATOR,
  DELEGATION_PROGRAM_ID,
} from "./common";

export interface Probe07Result {
  probeName: string;
  createdOnEr: boolean;
  neverExistedOnBase: boolean;
  closedOnEr: boolean;
  zeroFootprintOnBase: boolean;
  details: string;
  verdict: "PASS" | "FAIL";
}

export async function runProbe07(): Promise<Probe07Result> {
  console.log("\n=======================================================");
  console.log("PROBE 07: Ephemeral Account Lifecycle & Zero-L1-Trace");
  console.log("=======================================================");

  const baseConn = getBaseConnection();
  const authority = loadKeypair("AUTHORITY_KEYPAIR_PATH", "probe_auth.json");
  const authWallet = createWallet(authority);
  const baseProgram = getAnchorProgram(baseConn, authWallet);

  const [probePda] = findProbePda(authority.publicKey);
  const [itemPda] = findEphemeralPda(authority.publicKey);
  console.log(`[probePda]          ${probePda.toBase58()}`);
  console.log(`[ephemeralItemPda]  ${itemPda.toBase58()}`);

  // 0. Ensure delegated session account exists on base and is delegated
  let info = await baseConn.getAccountInfo(probePda);
  if (!info) {
    console.log("[step 0] Initializing probe account on base...");
    await baseProgram.methods
      .initializeProbe(0)
      .accounts({
        payer: authority.publicKey,
        authority: authority.publicKey,
        probe: probePda,
        systemProgram: PublicKey.default,
      })
      .rpc();
    info = await baseConn.getAccountInfo(probePda);
  }

  if (info?.owner.toBase58() !== DELEGATION_PROGRAM_ID.toBase58()) {
    console.log("[step 0] Delegating probe account to anchor ER session...");
    await baseProgram.methods
      .delegateProbe()
      .accounts({
        payer: authority.publicKey,
        authority: authority.publicKey,
        probe: probePda,
        validator: TEE_VALIDATOR,
      })
      .rpc();
    await new Promise((r) => setTimeout(r, 2500));
  }

  // 1. Authorize on TEE and get ER connection
  console.log("[step 1] Authorizing on TEE ER...");
  const authToken = await authorizeSigner(authority);
  const erConn = getErConnection(authToken);
  const erProgram = getAnchorProgram(erConn, authWallet);

  // 2. Create ephemeral item directly on ER
  console.log("[step 2] Creating ephemeral item directly on TEE ER...");
  try {
    const tx = await erProgram.methods
      .createEphemeralItem(new anchor.BN(99999))
      .accounts({
        authority: authority.publicKey,
        item: itemPda,
        systemProgram: PublicKey.default,
      })
      .remainingAccounts([
        { pubkey: probePda, isWritable: true, isSigner: false },
      ])
      .rpc({ skipPreflight: true });
    console.log(`✅ Ephemeral item created on ER. tx: ${tx}`);
  } catch (e: any) {
    console.error("❌ Failed to create ephemeral item on ER:", e.message || e);
    return {
      probeName: "Probe 07: Ephemeral Cleanup",
      createdOnEr: false,
      neverExistedOnBase: false,
      closedOnEr: false,
      zeroFootprintOnBase: false,
      details: `Failed to create ephemeral item on ER: ${e.message}`,
      verdict: "FAIL",
    };
  }

  // 3. Verify existence on ER
  console.log("[step 3] Checking state on ER...");
  const erInfo = await erConn.getAccountInfo(itemPda);
  const existsOnEr = !!(erInfo && erInfo.data.length > 0);
  console.log(`ER account status: exists=${existsOnEr}, len=${erInfo?.data.length || 0}`);

  // 4. Verify NON-existence on Solana Base layer
  console.log("[step 4] Verifying account is NOT on Solana base layer...");
  const baseInfoBefore = await baseConn.getAccountInfo(itemPda);
  const neverExistedOnBase = baseInfoBefore === null;
  console.log(`Base layer status: exists=${!neverExistedOnBase} (expected false)`);

  // 5. Close ephemeral account on ER
  console.log("[step 5] Closing ephemeral item on TEE ER...");
  try {
    const closeTx = await erProgram.methods
      .closeEphemeralItem()
      .accounts({
        authority: authority.publicKey,
        item: itemPda,
      })
      .remainingAccounts([
        { pubkey: probePda, isWritable: true, isSigner: false },
      ])
      .rpc({ skipPreflight: true });
    console.log(`✅ Ephemeral item closed on ER. tx: ${closeTx}`);
  } catch (e: any) {
    console.error("❌ Failed to close ephemeral item on ER:", e.message || e);
    return {
      probeName: "Probe 07: Ephemeral Cleanup",
      createdOnEr: existsOnEr,
      neverExistedOnBase,
      closedOnEr: false,
      zeroFootprintOnBase: false,
      details: `Failed to close ephemeral item: ${e.message}`,
      verdict: "FAIL",
    };
  }

  // 6. Verify ER account is gone / empty
  console.log("[step 6] Verifying ER account is wiped...");
  const erInfoAfter = await erConn.getAccountInfo(itemPda);
  const closedOnEr = !erInfoAfter || erInfoAfter.lamports === 0 || erInfoAfter.data.length === 0;
  console.log(`ER account post-close: wiped=${closedOnEr}`);

  // 7. Verify base layer still has zero trace
  console.log("[step 7] Verifying base layer has zero footprint...");
  const baseInfoAfter = await baseConn.getAccountInfo(itemPda);
  const zeroFootprintOnBase = baseInfoAfter === null;
  console.log(`Base layer post-close: exists=${!zeroFootprintOnBase} (expected false)`);

  const passed = existsOnEr && neverExistedOnBase && closedOnEr && zeroFootprintOnBase;

  return {
    probeName: "Probe 07: Ephemeral Cleanup",
    createdOnEr: existsOnEr,
    neverExistedOnBase,
    closedOnEr,
    zeroFootprintOnBase,
    details: passed
      ? "LenderBidPDA lifecycle confirmed: Exists purely on ER and closes with 0 base layer trace."
      : "Ephemeral lifecycle failed invariant checks.",
    verdict: passed ? "PASS" : "FAIL",
  };
}

if (require.main === module) {
  runProbe07()
    .then((r) => {
      console.log("\nResult:", r);
      process.exit(r.verdict === "PASS" ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
