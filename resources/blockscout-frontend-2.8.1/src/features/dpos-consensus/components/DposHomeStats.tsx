// SPDX-License-Identifier: LicenseRef-Blockscout

import React from 'react';

import config from 'src/config';

import { useColorMode } from 'src/toolkit/chakra/color-mode';

import useDposConsensusStats from '../hooks/useDposConsensusStats';
import DposCycleGauge from './DposCycleGauge';
import DposStatsWidget from './DposStatsWidget';

const DposHomeStats = () => {
  const { colorMode } = useColorMode();
  const {
    isLoading,
    totalStaked,
    validators,
    startBlock,
    endBlock,
    cycleEndLabel,
    cyclePercent,
  } = useDposConsensusStats();

  const symbol = config.chain.currency.symbol;
  const validatorsIcon = colorMode === 'light' ? 'validators' : 'validators-white';
  const cycleIcon = colorMode === 'light' ? 'cycle' : 'cycle-white';

  return (
    <>
      <DposStatsWidget
        icon="clock-light"
        title="Total Staked"
        value={ `${ totalStaked.toLocaleString() } ${ symbol }` }
        isLoading={ isLoading }
      />
      <DposStatsWidget
        icon={ validatorsIcon }
        title="Active Validators"
        value={ `${ String(validators) } validators` }
        url={ config.chain.validatorsStatusUrl }
        isLoading={ isLoading }
      />
      <DposStatsWidget
        icon={ cycleIcon }
        title="Next Cycle"
        value={ cycleEndLabel }
        isLoading={ isLoading }
      />
      <DposStatsWidget
        icon="block"
        title="Current cycle blocks"
        value={ `${ startBlock.toLocaleString() } - ${ endBlock.toLocaleString() }` }
        isLoading={ isLoading }
      />
      <DposCycleGauge cyclePercent={ cyclePercent } isLoading={ isLoading }/>
    </>
  );
};

export default React.memo(DposHomeStats);
