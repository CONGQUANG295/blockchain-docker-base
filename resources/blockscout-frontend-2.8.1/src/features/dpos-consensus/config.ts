// SPDX-License-Identifier: LicenseRef-Blockscout

import chain from 'src/slices/chain/config';
import type { Feature } from 'src/config/utils/features';

const isValidAddress = (v?: string) => Boolean(v && /^0x[a-fA-F0-9]{40}$/.test(v));

const config: Feature<{ isEnabled: true }> = Object.freeze(
  isValidAddress(chain.consensusAddress) && chain.rpcUrls.length > 0 ?
    { title: 'DPoS consensus stats', isEnabled: true } :
    { title: 'DPoS consensus stats', isEnabled: false },
);

export default config;
