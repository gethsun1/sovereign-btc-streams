import {
  btcToSats,
  satsToBtc,
  nowUnix,
  computeVestedAmount,
  SATS_PER_BTC,
} from '@/lib/utils';

describe('lib/utils', () => {
  describe('btcToSats', () => {
    it('converts BTC to satoshis correctly', () => {
      expect(btcToSats(1)).toBe(100_000_000);
      expect(btcToSats(0.5)).toBe(50_000_000);
      expect(btcToSats(0.00000001)).toBe(1);
      expect(btcToSats(0)).toBe(0);
    });

    it('rounds to nearest satoshi', () => {
      expect(btcToSats(0.000000015)).toBe(2);
      expect(btcToSats(0.000000014)).toBe(1);
    });

    it('handles large amounts', () => {
      expect(btcToSats(21_000_000)).toBe(2_100_000_000_000_000);
    });
  });

  describe('satsToBtc', () => {
    it('converts satoshis to BTC correctly', () => {
      expect(satsToBtc(100_000_000)).toBe(1);
      expect(satsToBtc(50_000_000)).toBe(0.5);
      expect(satsToBtc(1)).toBe(0.00000001);
      expect(satsToBtc(0)).toBe(0);
    });

    it('handles precision correctly', () => {
      expect(satsToBtc(12345678)).toBe(0.12345678);
    });
  });

  describe('nowUnix', () => {
    it('returns current Unix timestamp in seconds', () => {
      const before = Math.floor(Date.now() / 1000);
      const result = nowUnix();
      const after = Math.floor(Date.now() / 1000);

      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });

    it('returns an integer', () => {
      const result = nowUnix();
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('computeVestedAmount', () => {
    const startUnix = 1000;
    const cliffUnix = 1100;
    const rateSatsPerSec = 100;
    const totalAmountSats = 100_000;

    it('returns 0 before cliff', () => {
      const timestamp = 1050;
      expect(computeVestedAmount(startUnix, cliffUnix, rateSatsPerSec, totalAmountSats, timestamp)).toBe(0);
    });

    it('returns 0 at cliff time', () => {
      const timestamp = cliffUnix;
      expect(computeVestedAmount(startUnix, cliffUnix, rateSatsPerSec, totalAmountSats, timestamp)).toBe(0);
    });

    it('calculates vested amount after cliff', () => {
      const timestamp = 1200;
      const elapsed = timestamp - startUnix;
      const expected = elapsed * rateSatsPerSec;
      expect(computeVestedAmount(startUnix, cliffUnix, rateSatsPerSec, totalAmountSats, timestamp)).toBe(expected);
    });

    it('caps vested amount at total amount', () => {
      const timestamp = 10000;
      expect(computeVestedAmount(startUnix, cliffUnix, rateSatsPerSec, totalAmountSats, timestamp)).toBe(totalAmountSats);
    });

    it('handles immediate start (no cliff)', () => {
      const timestamp = 1050;
      const result = computeVestedAmount(startUnix, startUnix, rateSatsPerSec, totalAmountSats, timestamp);
      const expected = (timestamp - startUnix) * rateSatsPerSec;
      expect(result).toBe(expected);
    });

    it('returns 0 for timestamp before start', () => {
      const timestamp = 900;
      expect(computeVestedAmount(startUnix, cliffUnix, rateSatsPerSec, totalAmountSats, timestamp)).toBe(0);
    });

    it('handles zero rate', () => {
      const timestamp = 1200;
      expect(computeVestedAmount(startUnix, cliffUnix, 0, totalAmountSats, timestamp)).toBe(0);
    });

    it('calculates correct vesting for realistic scenario', () => {
      const start = 1700000000;
      const cliff = start + 86400;
      const rate = 1157;
      const total = 100_000_000;
      const timestamp = cliff + 3600;

      const elapsed = timestamp - start;
      const vested = elapsed * rate;
      expect(computeVestedAmount(start, cliff, rate, total, timestamp)).toBe(vested);
    });
  });

  describe('SATS_PER_BTC constant', () => {
    it('has correct value', () => {
      expect(SATS_PER_BTC).toBe(100_000_000);
    });
  });
});
