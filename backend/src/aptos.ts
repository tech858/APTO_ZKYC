import {
  Ed25519PrivateKey,
  Aptos,
  AptosConfig,
  Network,
  NetworkToNetworkName,
  Account,
  InputViewFunctionData,
} from '@aptos-labs/ts-sdk';

const APTOS_NETWORK: Network = NetworkToNetworkName[Network.TESTNET];
const config = new AptosConfig({ network: APTOS_NETWORK });
const aptos = new Aptos(config);

const PRIVATE_KEY = process.env.APTOS_PRIVATE_KEY || '';
const MODULE_ADDRESS = process.env.APTOS_MODULE_ADDRESS || '';
const MODULE_NAME = 'ZKYCCommitment';

const getSigner = () => {
  const privateKey = new Ed25519PrivateKey(PRIVATE_KEY);
  return Account.fromPrivateKey({ privateKey });
};

// Publish commitment on-chain
export const publishCommitment = async (
  hash: number[],
  issuerId: number,
  validityWindow: number
): Promise<string> => {
  const signer = getSigner();

  const txn = await aptos.transaction.build.simple({
    sender: signer.accountAddress,
    data: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::publish_commitment`,
      typeArguments: [],
      functionArguments: [hash, issuerId, validityWindow],
    },
  });

  const committedTxn = await aptos.signAndSubmitTransaction({
    signer,
    transaction: txn,
  });

  await aptos.waitForTransaction({ transactionHash: committedTxn.hash });
  return committedTxn.hash;
};

// Verify commitment exists on-chain
export const verifyCommitment = async (hash: number[]): Promise<boolean> => {
  const payload: InputViewFunctionData = {
    function: `${MODULE_ADDRESS}::${MODULE_NAME}::verify`,
    typeArguments: [],
    functionArguments: [hash],
  };

  try {
    const result = await aptos.view({ payload });
    return result[0] as boolean;
  } catch {
    return false;
  }
};

// Get commitment details
export const getCommitment = async (hash: number[]) => {
  const payload: InputViewFunctionData = {
    function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_commitment`,
    typeArguments: [],
    functionArguments: [hash],
  };

  try {
    const result = await aptos.view({ payload });
    return result[0];
  } catch {
    return null;
  }
};

export { aptos, getSigner };

