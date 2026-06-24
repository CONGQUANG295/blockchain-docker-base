// SPDX-License-Identifier: LicenseRef-Blockscout

import { Flex } from '@chakra-ui/react';
import React from 'react';

import type { IconName } from 'src/sprite/SpriteIcon';
import SpriteIcon from 'src/sprite/SpriteIcon';

import { Link } from 'src/toolkit/chakra/link';
import { Skeleton } from 'src/toolkit/chakra/skeleton';

type Props = {
  icon: IconName;
  title: string;
  value: string;
  url?: string;
  isLoading?: boolean;
};

const DposStatsWidget = ({ icon, title, value, url, isLoading }: Props) => {
  const content = (
    <Flex
      alignItems="center"
      bgColor={ isLoading ? { _light: 'blackAlpha.50', _dark: 'whiteAlpha.50' } : { _light: 'theme.stats.bg._light', _dark: 'theme.stats.bg._dark' } }
      p={ 3 }
      borderRadius="base"
      columnGap={ 3 }
      rowGap={ 2 }
      w="100%"
      h="100%"
    >
      <SpriteIcon
        name={ icon }
        p={ 2 }
        boxSize="40px"
        isLoading={ isLoading }
        borderRadius="base"
      />
      <Flex flexDirection="column" alignItems="start" minW={ 0 }>
        <Skeleton color="text.secondary" fontSize="xs" lineHeight="16px" borderRadius="base" loading={ Boolean(isLoading) }>
          <span>{ title }</span>
        </Skeleton>
        <Skeleton fontWeight={ 500 } fontSize="sm" loading={ Boolean(isLoading) }>
          <span>{ value }</span>
        </Skeleton>
      </Flex>
    </Flex>
  );

  if (url && !isLoading) {
    return (
      <Link href={ url } external noIcon display="block" h="100%">
        { content }
      </Link>
    );
  }

  return content;
};

export default React.memo(DposStatsWidget);
