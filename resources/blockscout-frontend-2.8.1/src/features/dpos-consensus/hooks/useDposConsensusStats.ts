// SPDX-License-Identifier: LicenseRef-Blockscout

import React from 'react';

import chainConfig from 'src/slices/chain/config';

import {
  getActiveValidators,
  getCurrentCycleBlocks,
  getCycleEndSeconds,
  getTotalStaked,
} from '../lib/consensus-client';
import {
  calcCycleEndPercent,
  calcCycleLengthSeconds,
  secondsToDhms,
} from '../lib/cycle-utils';

const REFRESH_INTERVAL_MS = 30_000;

export default function useDposConsensusStats() {
  const [ isLoading, setIsLoading ] = React.useState(true);
  const [ totalStaked, setTotalStaked ] = React.useState(0);
  const [ validators, setValidators ] = React.useState(0);
  const [ startBlock, setStartBlock ] = React.useState(0);
  const [ endBlock, setEndBlock ] = React.useState(0);
  const [ cycleEndSeconds, setCycleEndSeconds ] = React.useState(0);
  const [ cycleLengthSeconds, setCycleLengthSeconds ] = React.useState(0);

  const blockTimeSeconds = chainConfig.blockTimeSeconds;

  const refresh = React.useCallback(async() => {
    const [
      stakedResult,
      validatorsResult,
      cycleBlocksResult,
      cycleEndResult,
    ] = await Promise.allSettled([
      getTotalStaked(),
      getActiveValidators(),
      getCurrentCycleBlocks(),
      getCycleEndSeconds(blockTimeSeconds),
    ]);

    if (stakedResult.status === 'fulfilled') {
      setTotalStaked(stakedResult.value);
    }

    if (validatorsResult.status === 'fulfilled') {
      setValidators(validatorsResult.value);
    }

    if (cycleBlocksResult.status === 'fulfilled') {
      const [ cycleStart, cycleEnd ] = cycleBlocksResult.value;
      const start = Number(cycleStart);
      const end = Number(cycleEnd);
      setStartBlock(start);
      setEndBlock(end);
      setCycleLengthSeconds(calcCycleLengthSeconds(start, end, blockTimeSeconds));
    }

    if (cycleEndResult.status === 'fulfilled') {
      setCycleEndSeconds(Math.max(0, cycleEndResult.value));
    }

    setIsLoading(false);
  }, [ blockTimeSeconds ]);

  React.useEffect(() => {
    refresh();
    const refreshTimer = window.setInterval(refresh, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(refreshTimer);
  }, [ refresh ]);

  React.useEffect(() => {
    const countdownTimer = window.setInterval(() => {
      setCycleEndSeconds((prev) => {
        if (prev <= 0) {
          if (cycleLengthSeconds > 0) {
            return cycleLengthSeconds;
          }

          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(countdownTimer);
  }, [ cycleLengthSeconds ]);

  const cyclePercent = calcCycleEndPercent(cycleEndSeconds, cycleLengthSeconds);

  return {
    isLoading,
    totalStaked,
    validators,
    startBlock,
    endBlock,
    cycleEndLabel: secondsToDhms(cycleEndSeconds),
    cyclePercent,
  };
}
