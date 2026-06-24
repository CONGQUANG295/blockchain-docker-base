// SPDX-License-Identifier: LicenseRef-Blockscout

import { Flex } from '@chakra-ui/react';
import React from 'react';
import { buildStyles, CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

import { getEnvValue } from 'src/config/utils/envs';

import { useColorModeValue } from 'src/toolkit/chakra/color-mode';

type Props = {
  cyclePercent: number;
  isLoading?: boolean;
};

const DposCycleGauge = ({ cyclePercent, isLoading }: Props) => {
  const textColor = useColorModeValue('#1A202C', 'white');
  const gaugeColor = getEnvValue('NEXT_PUBLIC_DPOS_GAUGE_COLOR') || '#FFC107';
  const percent = Math.max(0, Math.min(100, cyclePercent * 100));

  return (
    <Flex
      alignItems="center"
      justifyContent="center"
      bgColor={ isLoading ? { _light: 'blackAlpha.50', _dark: 'whiteAlpha.50' } : { _light: 'theme.stats.bg._light', _dark: 'theme.stats.bg._dark' } }
      p={ 3 }
      borderRadius="base"
      w="100%"
      h="100%"
      minH="86px"
    >
      <div style={{ width: 86, height: 86, margin: '0 auto' }}>
        <CircularProgressbar
          value={ percent }
          text={ `${ percent.toFixed(0) }%` }
          maxValue={ 100 }
          styles={ buildStyles({
            rotation: 0,
            strokeLinecap: 'round',
            textSize: '16px',
            pathTransitionDuration: 0.5,
            pathColor: gaugeColor,
            textColor,
            trailColor: '#d6d6d6',
            backgroundColor: '#F7FAFC',
          }) }
        />
      </div>
    </Flex>
  );
};

export default React.memo(DposCycleGauge);
