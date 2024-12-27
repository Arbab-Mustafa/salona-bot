const fs = require("fs");
const { Keypair } = require("@solana/web3.js");
const bs58 = require("bs58");
const prompt = require("prompt-sync")(); // For user input

async function generateAndUseKeypairs() {
  try {
    // Step 1: Generate keypairs dynamically and store them in a JSON file
    function generateKeypairs(numKeypairs) {
      const keypairs = [];

      for (let i = 0; i < numKeypairs; i++) {
        const keypair = Keypair.generate(); // Generate a new keypair
        const secretKeyBase58 = bs58.encode(keypair.secretKey); // Encode the secret key in base58
        keypairs.push(secretKeyBase58); // Store the encoded secret key in the array
      }

      // Step 2: Write the keypairs to a JSON file (wallets.json)
      fs.writeFileSync("./wallets.json", JSON.stringify(keypairs, null, 2));
      console.log(
        `${numKeypairs} keypairs generated and saved to wallets.json`
      );
    }

    // Step 3: Ask how many wallets to generate
    const numKeypairs = parseInt(
      prompt("Enter the number of wallets to generate (1-21): "),
      10
    );
    if (isNaN(numKeypairs) || numKeypairs < 1 || numKeypairs > 21) {
      console.error(
        "Invalid input: The number of wallets must be between 1 and 21."
      );
      return;
    }

    // Step 4: Generate keypairs and store them in the JSON file
    generateKeypairs(numKeypairs);

    // Step 5: Load the keypairs from wallets.json
    const wallets = JSON.parse(fs.readFileSync("./wallets.json", "utf8"));

    // Step 6: Validate if the number of keypairs is correct
    if (!Array.isArray(wallets) || wallets.length !== numKeypairs) {
      console.error(
        "Error: The number of keypairs in wallets.json does not match the expected value."
      );
      return;
    }

    // Step 7: Load keypairs from the wallets.json file
    const keypairs = wallets.map((secretKeyBase58) => {
      const secretKey = bs58.decode(secretKeyBase58); // Decode the secret key from Base58
      return Keypair.fromSecretKey(secretKey); // Create a Keypair object
    });

    // Step 8: Prompt for the number of wallets to use
    const numWalletsToUse = parseInt(
      prompt(`Enter the number of wallets to use (1-${numKeypairs}): `),
      10
    );
    if (
      isNaN(numWalletsToUse) ||
      numWalletsToUse < 1 ||
      numWalletsToUse > numKeypairs
    ) {
      console.error(
        "Invalid input: The number of wallets to use must be between 1 and the total number of generated wallets."
      );
      return;
    }

    // Step 9: Prompt for transaction amounts
    const transactionAmounts = [];
    for (let i = 0; i < numWalletsToUse; i++) {
      const amount = parseFloat(
        prompt(`Enter the amount for Wallet ${i + 1} (in SOL): `)
      );
      if (isNaN(amount) || amount <= 0) {
        console.error("Invalid input: Amount must be a positive number.");
        return;
      }
      transactionAmounts.push(amount);
    }

    // Step 10: Prompt for token metadata
    const tokenMetadata = {
      name: prompt("Enter token name: "),
      symbol: prompt("Enter token symbol: "),
      description: prompt("Enter token description: "),
      twitter: prompt("Enter token Twitter URL: "),
      telegram: prompt("Enter token Telegram URL: "),
      website: prompt("Enter token website URL: "),
    };

    // Step 11: Process and log the information (e.g., prepare the transaction bundle)
    const bundledTxArgs = [];
    for (let i = 0; i < numWalletsToUse; i++) {
      bundledTxArgs.push({
        publicKey: keypairs[i].publicKey.toBase58(),
        action: i === 0 ? "create" : "buy", // First wallet creates, others buy
        tokenMetadata:
          i === 0
            ? {
                name: tokenMetadata.name,
                symbol: tokenMetadata.symbol,
                description: tokenMetadata.description,
                twitter: tokenMetadata.twitter,
                telegram: tokenMetadata.telegram,
                website: tokenMetadata.website,
              }
            : undefined,
        amount: transactionAmounts[i],
        slippage: 10,
        priorityFee: i === 0 ? 0.001 : 0.0,
        pool: "pump",
      });
    }

    console.log("Bundled transaction arguments:", bundledTxArgs);

    // You can now continue to process the transactions, sign them, and submit them as needed.
    // For example, signing and submitting transactions to a Solana endpoint would follow here.

    // Step 12: Return the keypairs and the transaction bundle
    return {
      keypairs,
      bundledTxArgs,
    };
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Execute the function
generateAndUseKeypairs();
