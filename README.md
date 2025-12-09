# zKYC Commitment Backend

Zero-knowledge KYC commitment anchoring on Aptos blockchain. This project allows you to publish and verify KYC proof commitments on-chain using Aptos smart contracts.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Aptos CLI Setup](#aptos-cli-setup)
  - [Install Aptos CLI](#1-install-aptos-cli)
  - [Create and Fund Account](#2-create-and-fund-account)
  - [Configure Move Module](#3-configure-move-module)
  - [Publish Move Module](#4-publish-move-module)
- [Backend Server Setup](#backend-server-setup)
  - [Install Dependencies](#1-install-dependencies)
  - [Configure Environment](#2-configure-environment)
  - [Run the Server](#3-run-the-server)
- [API Endpoints](#api-endpoints)
- [Example Usage](#example-usage)
- [Project Structure](#project-structure)

## Prerequisites

- **Node.js** (v18 or higher) and npm
- **Aptos CLI** (for deploying Move modules)
- An Aptos account with testnet tokens (for deployment)

## Aptos CLI Setup

### 1. Install Aptos CLI

Install the Aptos CLI using one of the following methods:

**Using Homebrew (macOS/Linux):**
```bash
brew install aptos
```

**Using Cargo (Rust):**
```bash
cargo install --git https://github.com/aptos-labs/aptos-core.git --branch mainnet aptos
```

**Using pre-built binaries:**
Download from [Aptos CLI releases](https://github.com/aptos-labs/aptos-core/releases)

Verify installation:
```bash
aptos --version
```

### 2. Create and Fund Account

Navigate to the Move module directory:
```bash
cd move-architecture
```

Initialize a new Aptos profile (this creates a new account):
```bash
aptos init --profile default --network testnet
```

This will:
- Generate a new account with a private key
- Save the profile to `~/.aptos/config.yaml`
- Display your account address

**Fund your account:**
Get testnet tokens from the [Aptos Faucet](https://faucet.testnet.aptoslabs.com/). Enter your account address to receive testnet APT.

Verify your account balance:
```bash
aptos account list --profile default
```

### 3. Configure Move Module

Edit `move-architecture/Move.toml` and update the `zkyc_addr` in the `[addresses]` section with your account address:

```toml
[addresses]
zkyc_addr = "YOUR_ACCOUNT_ADDRESS_HERE"
```

**Important:** The address should be in hex format (0x-prefixed) or without the 0x prefix. You can find your address by running:
```bash
aptos account list --profile default
```

### 4. Publish Move Module

Compile the Move module:
```bash
aptos move compile --named-addresses zkyc_addr=default
```

Run tests (optional):
```bash
aptos move test --named-addresses zkyc_addr=default
```

Publish the module to testnet:
```bash
aptos move publish --named-addresses zkyc_addr=default --profile default
```

**Note the published module address:** After successful publication, the module will be deployed at your account address. You'll need this address for the backend configuration.

Verify the module is published:
```bash
aptos move list --profile default
```

## Backend Server Setup

### 1. Install Dependencies

Navigate to the backend directory:
```bash
cd backend
npm install
```

### 2. Configure Environment

Copy the example environment file:
```bash
cp env.example .env
```

Edit `.env` and configure the following variables:

```env
# Server Configuration
PORT=3000

# Aptos Configuration
APTOS_NETWORK=testnet
APTOS_PRIVATE_KEY=ed25519-priv-0x...your_private_key_here
APTOS_MODULE_ADDRESS=0x...your_module_address_here
```

**Getting your private key:**
- Your private key is stored in `~/.aptos/config.yaml` under the profile you created
- Look for the `private_key` field in the `default` profile section
- Copy the entire value (it should start with `ed25519-priv-0x`)

**Getting your module address:**
- This is the same address you used in `Move.toml` as `zkyc_addr`
- It's also your account address from `aptos account list`
- Make sure it's in the format `0x...` (with 0x prefix)

**Example `.env` file:**
```env
PORT=3000
APTOS_NETWORK=testnet
APTOS_PRIVATE_KEY=ed25519-priv-0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
APTOS_MODULE_ADDRESS=0x9175b7f40af784e87c61d184c1da91c090893348b5fc64b3484fe44c25081af1
```

### 3. Run the Server

**Development mode (with hot reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

Verify the server is running:
```bash
curl http://localhost:3000/api/status
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | Health check endpoint |
| `/api/proof/commit` | POST | Submit proof → generate and store commitment on-chain |
| `/api/commitment` | POST | Submit raw commitment hash directly |
| `/api/commitment/:hash` | GET | Verify commitment exists and get details |

### Request/Response Examples

**POST `/api/proof/commit`**
```json
{
  "task": "789595670821474304",
  "signature": "0x0649fc1e...",
  "result": {
    "verify_result": true,
    "data": "0x3130",
    "verify_timestamp": 1765054286
  },
  "validatorAddress": "0x66E2046b187EB688E4b33ca6C0Ceb2669414A20a"
}
```

Response:
```json
{
  "success": true,
  "commitmentHash": "0x...",
  "transactionHash": "0x...",
  "issuer_id": 1,
  "validity_window": 1765054286
}
```

**POST `/api/commitment`**
```json
{
  "hash": "0xa1b2c3d4...",
  "issuer_id": 1,
  "validity_window": 1765054286
}
```

**GET `/api/commitment/:hash`**
```bash
curl http://localhost:3000/api/commitment/0xa1b2c3d4...
```

## Example Usage

### Submit a proof and commit to chain:
```bash
curl -X POST http://localhost:3000/api/proof/commit \
  -H "Content-Type: application/json" \
  -d '{
    "task": "789595670821474304",
    "signature": "0x0649fc1e...",
    "result": {
      "verify_result": true,
      "data": "0x3130",
      "verify_timestamp": 1765054286
    },
    "validatorAddress": "0x66E2046b187EB688E4b33ca6C0Ceb2669414A20a"
  }'
```

### Submit a raw commitment hash:
```bash
curl -X POST http://localhost:3000/api/commitment \
  -H "Content-Type: application/json" \
  -d '{
    "hash": "0xa1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    "issuer_id": 1,
    "validity_window": 1765054286
  }'
```

### Verify a commitment:
```bash
curl http://localhost:3000/api/commitment/0xa1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
```

## Project Structure

```
ZKYCCommitment/
├── backend/                 # Node.js backend server
│   ├── src/
│   │   ├── aptos.ts        # Aptos SDK integration
│   │   └── server.ts       # Express API server
│   ├── .env                # Environment variables (create from env.example)
│   ├── package.json
│   └── tsconfig.json
├── move-architecture/      # Move smart contract
│   ├── sources/
│   │   └── ZKYCCommitment.move
│   └── Move.toml
└── README.md
```

## Troubleshooting

### Aptos CLI Issues

**Module address mismatch:**
- Ensure the `zkyc_addr` in `Move.toml` matches your account address
- Verify the address format (with or without 0x prefix, but be consistent)

**Insufficient funds:**
- Check your balance: `aptos account list --profile default`
- Get testnet tokens from the [Aptos Faucet](https://faucet.testnet.aptoslabs.com/)

**Compilation errors:**
- Ensure you're using the correct Aptos framework version
- Check that all dependencies are properly configured in `Move.toml`

### Backend Server Issues

**"Invalid private key" error:**
- Ensure the private key in `.env` starts with `ed25519-priv-0x`
- Copy the entire private key from `~/.aptos/config.yaml`

**"Module not found" error:**
- Verify `APTOS_MODULE_ADDRESS` matches your deployed module address
- Ensure the module was successfully published to the network
- Check that you're using the correct network (testnet/mainnet)

**Transaction failures:**
- Ensure your account has sufficient APT for gas fees
- Verify the network matches between Aptos CLI and backend config

## Security Notes

- **Never commit `.env` file** - It contains your private key
- **Use testnet for development** - Only use mainnet with proper security measures
- **Keep private keys secure** - Store them in environment variables or secure key management systems
- **Validate all inputs** - The API performs basic validation, but add additional checks for production use
