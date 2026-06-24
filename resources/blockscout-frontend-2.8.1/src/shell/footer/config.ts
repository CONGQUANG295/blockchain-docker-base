// SPDX-License-Identifier: LicenseRef-Blockscout

import { getEnvValue, getExternalAssetFilePath, parseEnvJson } from 'src/config/utils/envs';

export interface FooterProjectConfig {
  title: string;
  taglineUrl?: string;
  description?: string;
  copyright?: string;
}

const projectConfig = parseEnvJson<FooterProjectConfig>(
  getEnvValue('NEXT_PUBLIC_FOOTER_PROJECT_CONFIG'),
);

const config = Object.freeze({
  links: getExternalAssetFilePath('NEXT_PUBLIC_FOOTER_LINKS'),
  projectConfig: projectConfig ?? undefined,
  frontendVersion: getEnvValue('NEXT_PUBLIC_GIT_TAG'),
  frontendCommit: getEnvValue('NEXT_PUBLIC_GIT_COMMIT_SHA'),
});

export default config;
