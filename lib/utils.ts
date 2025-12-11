export const SATS_PER_BTC = 100_000_000;

export function btcToSats(amountBtc: number): number {
  return Math.round(amountBtc * SATS_PER_BTC);
}

export function satsToBtc(amountSats: number): number {
  return amountSats / SATS_PER_BTC;
}

export function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

export function computeVestedAmount(
  startUnix: number,
  cliffUnix: number,
  rateSatsPerSec: number,
  totalAmountSats: number,
  timestamp: number,
): number {
  if (timestamp < cliffUnix) return 0;
  const elapsed = Math.max(0, timestamp - startUnix);
  const streamed = elapsed * rateSatsPerSec;
  return Math.min(streamed, totalAmountSats);
}
