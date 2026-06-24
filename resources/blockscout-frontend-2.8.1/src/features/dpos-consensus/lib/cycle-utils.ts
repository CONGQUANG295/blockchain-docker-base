// SPDX-License-Identifier: LicenseRef-Blockscout

export function secondsToDhms(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  return [
    d ? `${ d }d ` : '',
    h ? `${ h }h ` : '',
    m ? `${ m }m ` : '',
    sec ? `${ sec }s` : '',
  ].join('').trim() || '0s';
}

export function calcCycleLengthSeconds(start: number, end: number, blockTimeSeconds: number): number {
  return (end - start) * blockTimeSeconds;
}

export function calcCycleEndPercent(cycleEndSeconds: number, cycleLengthSeconds: number): number {
  if (cycleLengthSeconds <= 0) {
    return 0;
  }

  return 1 - cycleEndSeconds / cycleLengthSeconds;
}
