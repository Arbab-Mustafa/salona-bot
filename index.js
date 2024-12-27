const fs = require("fs");
const bs58 = require("bs58");
const prompt = require("prompt-sync")(); // For user input
const { Keypair, VersionedTransaction } = require("@solana/web3.js");

async function sendLocalCreateBundle() {
  try {
    // Step 1: Load wallets from wallets.json
    let wallets;
    try {
      wallets = JSON.parse(fs.readFileSync("./wallets.json", "utf8"));
    } catch (error) {
      console.error("Error reading or parsing wallets.json:", error.message);
      return;
    }

    // Ensure wallets.json has valid data
    if (!Array.isArray(wallets) || wallets.length === 0) {
      console.error("Invalid wallets.json: No wallet data found.");
      return;
    }

    // Step 2: Prompt for number of wallets to use
    const numWallets = parseInt(
      prompt(`Enter the number of wallets to use (1-21): `)
    );
    if (isNaN(numWallets) || numWallets < 1 || numWallets > 21) {
      console.error(
        "Invalid input: Number of wallets must be between 1 and 21."
      );
      return;
    }

    // Step 3: Validate and load the wallets
    if (numWallets > wallets.length) {
      console.error(
        `Not enough wallets in wallets.json. Found only ${wallets.length}.`
      );
      return;
    }

    const signerKeyPairs = wallets
      .slice(0, numWallets)
      .map((wallet) => Keypair.fromSecretKey(bs58.decode(wallet)));

    // Step 4: Prompt for token metadata
    const tokenMetadata = {
      name: prompt("Enter token name: "),
      symbol: prompt("Enter token symbol: "),
      description: prompt("Enter token description: "),
      twitter: prompt("Enter Twitter URL: "),
      telegram: prompt("Enter Telegram URL: "),
      website: prompt("Enter Website URL: "),
    };

    // Step 5: Prompt for transaction amounts
    const transactionAmounts = [];
    for (let i = 0; i < numWallets; i++) {
      const amount = parseFloat(
        prompt(`Enter the amount for Wallet ${i + 1} (in SOL): `)
      );
      if (isNaN(amount) || amount <= 0) {
        console.error("Invalid input: Amount must be a positive number.");
        return;
      }
      transactionAmounts.push(amount);
    }

    // Step 6: Generate token metadata
    const mintKeypair = Keypair.generate(); // Random token mint
    // let tokenFile = fs.readFileSync("./example.png");

    let metadataResponse;
    try {
      metadataResponse = await fetch("https://pump.fun/api/ipfs", {
        method: "POST",
        body: formData,
      });

      // Check if the response is valid
      if (!metadataResponse.ok) {
        console.error(
          "Failed to upload metadata, status code:",
          metadataResponse.status
        );
        const errorText = await metadataResponse.text();
        console.error("Error response body:", errorText);
        return;
      }

      // Attempt to parse the response body as JSON
      metadataResponseJSON = await metadataResponse.json();
    } catch (error) {
      console.error("Error parsing API response:", error.message);
      if (metadataResponse) {
        const responseText = await metadataResponse.text();
        console.error("Raw response body:", responseText);
      }
      return;
    }

    // Step 7: Build bundledTxArgs dynamically
    const bundledTxArgs = [];

    // Create transaction (signed by wallet 1)
    bundledTxArgs.push({
      publicKey: signerKeyPairs[0].publicKey.toBase58(),
      action: "create",
      tokenMetadata: {
        name: tokenMetadata.name,
        symbol: tokenMetadata.symbol,
        uri: metadataResponseJSON.metadataUri,
      },
      mint: mintKeypair.publicKey.toBase58(),
      denominatedInSol: "true",
      amount: transactionAmounts[0],
      slippage: 10,
      priorityFee: 0.001,
      pool: "pump",
    });

    // Create buy transactions (signed by wallets 2–n)
    for (let i = 1; i < numWallets; i++) {
      bundledTxArgs.push({
        publicKey: signerKeyPairs[i].publicKey.toBase58(),
        action: "buy",
        tokenMetadata: undefined,
        mint: mintKeypair.publicKey.toBase58(),
        denominatedInSol: "true",
        amount: transactionAmounts[i],
        slippage: 10,
        priorityFee: 0.0,
        pool: "pump",
      });
    }

    // Step 8: Send bundled transactions in batches of 5
    const transactionBatches = [];
    while (bundledTxArgs.length > 0) {
      const batch = bundledTxArgs.splice(0, 5); // Take up to 5 transactions for each batch
      transactionBatches.push(batch);
    }

    // Step 9: Sign each batch of transactions dynamically
    let encodedSignedTransactions = [];
    let signatures = [];
    let currentSignerIndex = 0;

    for (
      let batchIndex = 0;
      batchIndex < transactionBatches.length;
      batchIndex++
    ) {
      const batch = transactionBatches[batchIndex];
      const signers = batch.map(
        (_, idx) => signerKeyPairs[currentSignerIndex++]
      );

      const batchTxs = batch.map((txData) => {
        const tx = new VersionedTransaction();
        tx.add(txData);
        return tx;
      });

      // Sign each transaction in the batch
      batchTxs.forEach((tx, idx) => {
        tx.sign(signers[idx]);
        encodedSignedTransactions.push(bs58.encode(tx.serialize()));
        signatures.push(bs58.encode(tx.signatures[0]));
      });
    }

    // Step 10: Submit the transactions to Jito
    try {
      const jitoResponse = await fetch(
        `https://mainnet.block-engine.jito.wtf/api/v1/bundles`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "sendBundle",
            params: [encodedSignedTransactions],
          }),
        }
      );

      console.log(await jitoResponse.json());
    } catch (e) {
      console.error("Jito submission failed:", e.message);
    }

    // Step 11: Output transaction signatures
    for (let i = 0; i < signatures.length; i++) {
      console.log(`Transaction ${i}: https://solscan.io/tx/${signatures[i]}`);
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Call the function to execute the transaction process
sendLocalCreateBundle();
