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
    try {
      const [
        staked,
        activeValidators,
        [ cycleStart, cycleEnd ],
        cycleEndInSeconds,
      ] = await Promise.all([
        getTotalStaked(),
        getActiveValidators(),
        getCurrentCycleBlocks(),
        getCycleEndSeconds(blockTimeSeconds),
      ]);

      const start = Number(cycleStart);
      const end = Number(cycleEnd);
      const length = calcCycleLengthSeconds(start, end, blockTimeSeconds);

      setTotalStaked(staked);
      setValidators(activeValidators);
      setStartBlock(start);
      setEndBlock(end);
      setCycleEndSeconds(Math.max(0, cycleEndInSeconds));
      setCycleLengthSeconds(length);
      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
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
