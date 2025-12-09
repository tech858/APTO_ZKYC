import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import 'dotenv/config';
import { publishCommitment, verifyCommitment, getCommitment } from './aptos.js';

const app = express();
const PORT = process.env.PORT || 3000;
const startTime = Date.now();

app.use(express.json());
app.use(cors({ origin: true }));

// Helper: hex string to bytes array
const hexToBytes = (hex: string): number[] => {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.substr(i, 2), 16));
  }
  return bytes;
};

// Generate commitment hash from proof
const generateCommitmentHash = (proof: {
  task: string;
  result: { verify_timestamp: number; data: string };
  validatorAddress: string;
}): Buffer => {
  // Deterministic hash: task + timestamp + validator + data
  const input = `${proof.task}:${proof.result.verify_timestamp}:${proof.validatorAddress}:${proof.result.data}`;
  return crypto.createHash('sha256').update(input).digest();
};

// GET /api/status - Health check
app.get('/api/status', (req, res) => {
  res.json({
    status: 'OK',
    uptime: Date.now() - startTime,
    timestamp: Date.now(),
  });
});

// POST /api/proof/commit - Take proof, store commitment on-chain
app.post('/api/proof/commit', async (req, res) => {
  try {
    const proof = req.body;

    // Validate required fields
    if (!proof.task || !proof.result || !proof.validatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: task, result, validatorAddress',
      });
    }

    // Check proof is valid
    if (!proof.result.verify_result) {
      return res.status(400).json({
        success: false,
        error: 'Proof verification failed (verify_result is false)',
      });
    }

    // Generate commitment hash from proof
    const hash = generateCommitmentHash(proof);
    const hashBytes = Array.from(hash);

    // Set validity: 1 year from now
    const issuer_id = 1;
    const validity_window = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

    // Store on-chain
    const txHash = await publishCommitment(hashBytes, issuer_id, validity_window);

    res.json({
      success: true,
      commitmentHash: '0x' + hash.toString('hex'),
      transactionHash: txHash,
      issuer_id,
      validity_window,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/commitment - Submit raw commitment (direct hash)
app.post('/api/commitment', async (req, res) => {
  try {
    const { hash, issuer_id, validity_window } = req.body;

    if (!hash || !issuer_id || !validity_window) {
      return res.status(400).json({ success: false, error: 'Missing: hash, issuer_id, validity_window' });
    }

    const hashBytes = hexToBytes(hash);
    const txHash = await publishCommitment(hashBytes, issuer_id, validity_window);

    res.json({ success: true, transactionHash: txHash });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/commitment/:hash - Get commitment status
app.get('/api/commitment/:hash', async (req, res) => {
  try {
    const hashBytes = hexToBytes(req.params.hash);
    const exists = await verifyCommitment(hashBytes);

    if (!exists) {
      return res.json({ success: true, exists: false });
    }

    const commitment = await getCommitment(hashBytes);
    res.json({ success: true, exists: true, commitment });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`zKYC API running on port ${PORT}`);
});
