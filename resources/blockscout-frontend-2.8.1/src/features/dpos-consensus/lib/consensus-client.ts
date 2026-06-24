// SPDX-License-Identifier: LicenseRef-Blockscout

import { createPublicClient, formatUnits, http, type Address } from 'viem';

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
  const decimals = await client.readContract({
    address: address(),
    abi: CONSENSUS_ABI,
    functionName: 'DECIMALS',
  }) as bigint;
  const balance = await client.getBalance({ address: address() });

  return Number(formatUnits(balance, Number(decimals)));
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
