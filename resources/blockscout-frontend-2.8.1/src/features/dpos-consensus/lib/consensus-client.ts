// SPDX-License-Identifier: LicenseRef-Blockscout

import { createPublicClient, http, type Address } from 'viem';

import chainConfig from 'src/slices/chain/config';

import { CONSENSUS_ABI } from './consensus-abi';

function getClient() {
  const rpcUrl = chainConfig.rpcUrls[0];
  if (!rpcUrl || !chainConfig.consensusAddress) {
    throw new Error('DPoS RPC/consensus not configured');
  }

  return createPublicClient({ transport: http(rpcUrl) });
}

const address = () => chainConfig.consensusAddress as Address;

/** Consensus.DECIMALS is 10**18 (wei factor), not the decimal digit count. */
function tokensFromWei(wei: bigint, weiFactor: bigint): number {
  return Number(wei) / Number(weiFactor);
}

export async function getActiveValidators(): Promise<number> {
  const client = getClient();
  const validators = await client.readContract({
    address: address(),
    abi: CONSENSUS_ABI,
    functionName: 'getValidators',
  }) as Array<Address>;

  return validators?.length ?? 0;
}

export async function getTotalStaked(): Promise<number> {
  const client = getClient();
  const consensus = address();
  const weiFactor = await client.readContract({
    address: consensus,
    abi: CONSENSUS_ABI,
    functionName: 'DECIMALS',
  }) as bigint;

  const [ consensusBalance, validators ] = await Promise.all([
    client.getBalance({ address: consensus }),
    client.readContract({
      address: consensus,
      abi: CONSENSUS_ABI,
      functionName: 'getValidators',
    }) as Promise<Array<Address>>,
  ]);

  const stakeAmounts = await Promise.all(
    validators.map((validator) =>
      client.readContract({
        address: consensus,
        abi: CONSENSUS_ABI,
        functionName: 'stakeAmount',
        args: [ validator ],
      }) as Promise<bigint>,
    ),
  );

  let totalWei = consensusBalance + stakeAmounts.reduce((sum, amount) => sum + amount, BigInt(0));

  const vaultAddress = chainConfig.stakingVaultAddress;
  if (vaultAddress) {
    totalWei += await client.getBalance({ address: vaultAddress as Address });
  }

  return tokensFromWei(totalWei, weiFactor);
}

export async function getCurrentCycleBlocks(): Promise<[ bigint, bigint ]> {
  const client = getClient();

  const [ startBlock, endBlock ] = await Promise.all([
    client.readContract({
      address: address(),
      abi: CONSENSUS_ABI,
      functionName: 'getCurrentCycleStartBlock',
    }),
    client.readContract({
      address: address(),
      abi: CONSENSUS_ABI,
      functionName: 'getCurrentCycleEndBlock',
    }),
  ]);

  return [ startBlock as bigint, endBlock as bigint ];
}

export async function getCycleEndSeconds(blockTimeSeconds: number): Promise<number> {
  const client = getClient();
  const [ endBlock, head ] = await Promise.all([
    client.readContract({
      address: address(),
      abi: CONSENSUS_ABI,
      functionName: 'getCurrentCycleEndBlock',
    }) as Promise<bigint>,
    client.getBlockNumber(),
  ]);

  return Number(endBlock - head) * blockTimeSeconds;
}
