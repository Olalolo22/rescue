import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getAuthToken,
  verifyTeeRpcIntegrity,
  EPHEMERAL_VAULT_ID,
  MAGIC_CONTEXT_ID,
  MAGIC_PROGRAM_ID,
  PERMISSION_PROGRAM_ID,
  permissionPdaFromAccount,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import nacl from "tweetnacl";

dotenv.config();

// -----------------------------------------------------------------------------
// Network Endpoints & Identifiers
// -----------------------------------------------------------------------------
export const BASE_RPC_URL =
  process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
export const BASE_WS_URL =
  process.env.SOLANA_WS_URL || "wss://api.devnet.solana.com";
export const ER_RPC_URL =
  process.env.MB_TEE_RPC_URL ||
  process.env.MB_ER_RPC_URL ||
  "https://devnet-tee.magicblock.app";
export const ER_WS_URL =
  process.env.MB_TEE_WS_URL || "wss://devnet-as.magicblock.app";

export const TEE_VALIDATOR = new PublicKey(
  process.env.TEE_VALIDATOR_DEVNET ||
    "MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo"
);

export const DELEGATION_PROGRAM_ID = new PublicKey(
  "DELeGATE7qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq"
);

export const PROBE_PROGRAM_ID = new PublicKey(
  process.env.PROBE_PROGRAM_ID || "Probe11111111111111111111111111111111111111"
);

export const PYTH_FEED_DEVNET = new PublicKey(
  process.env.PYTH_PRICE_FEED_ACCOUNT ||
    "7UVimffxr9ow1ukKttssstvBiapRmncnxWuBkfm3mc9Y"
);

export {
  EPHEMERAL_VAULT_ID,
  MAGIC_CONTEXT_ID,
  MAGIC_PROGRAM_ID,
  PERMISSION_PROGRAM_ID,
  permissionPdaFromAccount,
};

// -----------------------------------------------------------------------------
// Connection & Wallet Utilities
// -----------------------------------------------------------------------------

export class KeypairWallet implements anchor.Wallet {
  constructor(readonly payer: Keypair) {}

  get publicKey(): PublicKey {
    return this.payer.publicKey;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T
  ): Promise<T> {
    if (tx instanceof VersionedTransaction) {
      tx.sign([this.payer]);
    } else {
      tx.partialSign(this.payer);
    }
    return tx;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[]
  ): Promise<T[]> {
    return Promise.all(txs.map((tx) => this.signTransaction(tx)));
  }
}

export function createWallet(keypair: Keypair): anchor.Wallet {
  return new KeypairWallet(keypair);
}

export function getBaseConnection(): Connection {
  return new Connection(BASE_RPC_URL, {
    commitment: "confirmed",
    wsEndpoint: BASE_WS_URL,
  });
}

export function getErConnection(authToken?: string): Connection {
  const rpcUrl = authToken ? `${ER_RPC_URL}?token=${authToken}` : ER_RPC_URL;
  const wsUrl = authToken ? `${ER_WS_URL}?token=${authToken}` : ER_WS_URL;
  return new Connection(rpcUrl, {
    commitment: "confirmed",
    wsEndpoint: wsUrl,
  });
}

export async function authorizeSigner(wallet: Keypair): Promise<string> {
  await verifyTeeRpcIntegrity(ER_RPC_URL);
  const authToken = await getAuthToken(
    ER_RPC_URL,
    wallet.publicKey,
    (message: Uint8Array) =>
      Promise.resolve(nacl.sign.detached(message, wallet.secretKey))
  );
  return authToken.token;
}

export async function verifyTeeIdentity(): Promise<{
  expected: string;
  actual: string;
  matches: boolean;
}> {
  const res = await fetch(ER_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getIdentity" }),
  }).then((r) => r.json());

  const actual = res.result?.identity || "UNKNOWN";
  const expected = TEE_VALIDATOR.toBase58();
  return {
    expected,
    actual,
    matches: actual === expected,
  };
}

export function loadKeypair(
  envVar: string,
  fallbackFilename = "probe_test_key.json"
): Keypair {
  const customPath = process.env[envVar];
  if (customPath && fs.existsSync(customPath)) {
    const raw = fs.readFileSync(customPath, "utf-8");
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  }

  // Check solana default config
  const solanaConfigKey = path.join(
    process.env.HOME || "",
    ".config",
    "solana",
    "id.json"
  );
  if (fs.existsSync(solanaConfigKey)) {
    const raw = fs.readFileSync(solanaConfigKey, "utf-8");
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  }

  // Fallback to local temporary key
  const localKeyPath = path.join(__dirname, "..", fallbackFilename);
  if (fs.existsSync(localKeyPath)) {
    const raw = fs.readFileSync(localKeyPath, "utf-8");
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  }

  const generated = Keypair.generate();
  fs.writeFileSync(
    localKeyPath,
    JSON.stringify(Array.from(generated.secretKey)),
    "utf-8"
  );
  console.log(
    `[common] Generated ephemeral keypair at ${localKeyPath}: ${generated.publicKey.toBase58()}`
  );
  return generated;
}

// -----------------------------------------------------------------------------
// PDA Derivations
// -----------------------------------------------------------------------------

export function findProbePda(
  authority: PublicKey,
  programId = PROBE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("probe"), authority.toBuffer()],
    programId
  );
}

export function findEphemeralPda(
  authority: PublicKey,
  programId = PROBE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("ephemeral_item"), authority.toBuffer()],
    programId
  );
}

export function findPermissionPda(account: PublicKey): PublicKey {
  return permissionPdaFromAccount(account);
}

// -----------------------------------------------------------------------------
// Ownership Polling Helper (The Tenor-proven settlement pipe)
// -----------------------------------------------------------------------------

export async function waitForProgramOwnership(
  connection: Connection,
  account: PublicKey,
  expectedProgramId: PublicKey,
  maxWaitSeconds = 45
): Promise<{ success: boolean; elapsedSeconds: number; owner: string }> {
  const start = Date.now();
  for (let i = 0; i < maxWaitSeconds; i++) {
    const info = await connection.getAccountInfo(account);
    const owner = info?.owner ? info.owner.toBase58() : "UNALLOCATED";
    if (owner === expectedProgramId.toBase58()) {
      const elapsedSeconds = (Date.now() - start) / 1000;
      return { success: true, elapsedSeconds, owner };
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  const info = await connection.getAccountInfo(account);
  return {
    success: false,
    elapsedSeconds: (Date.now() - start) / 1000,
    owner: info?.owner?.toBase58() || "UNKNOWN",
  };
}

// -----------------------------------------------------------------------------
// Anchor Client Loader
// -----------------------------------------------------------------------------

export function getAnchorProgram(
  connection: Connection,
  wallet: anchor.Wallet,
  programId = PROBE_PROGRAM_ID
): anchor.Program {
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Attempt to load IDL from target directory or fallback
  const idlPath = path.join(
    __dirname,
    "..",
    "target",
    "idl",
    "probe.json"
  );
  if (fs.existsSync(idlPath)) {
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
    return new anchor.Program(idl, programId, provider);
  }

  // Fallback minimal IDL definition if target hasn't been built locally yet
  const minimalIdl: anchor.Idl = {
    version: "0.1.0",
    name: "probe",
    instructions: [
      {
        name: "initializeProbe",
        accounts: [
          { name: "payer", isMut: true, isSigner: true },
          { name: "authority", isMut: false, isSigner: true },
          { name: "probe", isMut: true, isSigner: false },
          { name: "systemProgram", isMut: false, isSigner: false },
        ],
        args: [{ name: "extraRentMembers", type: "u8" }],
      },
      {
        name: "delegateProbe",
        accounts: [
          { name: "payer", isMut: true, isSigner: true },
          { name: "authority", isMut: false, isSigner: true },
          { name: "probe", isMut: true, isSigner: false },
          { name: "validator", isMut: false, isSigner: false, isOptional: true },
        ],
        args: [],
      },
      {
        name: "mutateProbe",
        accounts: [
          { name: "authority", isMut: false, isSigner: true },
          { name: "probe", isMut: true, isSigner: false },
        ],
        args: [{ name: "increment", type: "u64" }],
      },
      {
        name: "liquidateProbe",
        accounts: [
          { name: "liquidator", isMut: false, isSigner: true },
          { name: "authority", isMut: false, isSigner: false },
          { name: "probe", isMut: true, isSigner: false },
        ],
        args: [],
      },
      {
        name: "initProbePermission",
        accounts: [
          { name: "authority", isMut: true, isSigner: true },
          { name: "probe", isMut: true, isSigner: false },
          { name: "permission", isMut: true, isSigner: false },
          { name: "ephemeralVault", isMut: true, isSigner: false },
          { name: "magicProgram", isMut: false, isSigner: false },
          { name: "permissionProgram", isMut: false, isSigner: false },
        ],
        args: [
          { name: "isPrivate", type: "bool" },
          { name: "members", type: { vec: "publicKey" } },
        ],
      },
      {
        name: "probeCrossRead",
        accounts: [
          { name: "reader", isMut: false, isSigner: true },
          { name: "probe", isMut: false, isSigner: false },
        ],
        args: [],
      },
      {
        name: "undelegateProbe",
        accounts: [
          { name: "payer", isMut: true, isSigner: true },
          { name: "probe", isMut: true, isSigner: false },
          { name: "magicContext", isMut: true, isSigner: false },
          { name: "magicProgram", isMut: false, isSigner: false },
        ],
        args: [],
      },
      {
        name: "createEphemeralItem",
        accounts: [
          { name: "authority", isMut: true, isSigner: true },
          { name: "item", isMut: true, isSigner: false },
          { name: "systemProgram", isMut: false, isSigner: false },
        ],
        args: [{ name: "data", type: "u64" }],
      },
      {
        name: "closeEphemeralItem",
        accounts: [
          { name: "authority", isMut: true, isSigner: true },
          { name: "item", isMut: true, isSigner: false },
        ],
        args: [],
      },
    ],
    accounts: [
      {
        name: "ProbeAccount",
        type: {
          kind: "struct",
          fields: [
            { name: "authority", type: "publicKey" },
            { name: "counter", type: "u64" },
            { name: "bump", type: "u8" },
          ],
        },
      },
    ],
  };

  return new anchor.Program(minimalIdl, programId, provider);
}
