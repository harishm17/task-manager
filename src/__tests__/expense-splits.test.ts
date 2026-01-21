import {
  buildExactSplits,
  calculateEqualSplits,
  calculatePercentageSplits,
  calculateShareSplits,
} from '../lib/api/expenses';

describe('calculateEqualSplits', () => {
  it('splits evenly and distributes remainder', () => {
    const splits = calculateEqualSplits(100, ['a', 'b', 'c']);

    expect(splits).toEqual([
      { personId: 'a', amountCents: 34 },
      { personId: 'b', amountCents: 33 },
      { personId: 'c', amountCents: 33 },
    ]);
  });

  it('returns empty array when no participants', () => {
    expect(calculateEqualSplits(100, [])).toEqual([]);
  });
});

describe('buildExactSplits', () => {
  it('accepts valid exact splits', () => {
    const splits = buildExactSplits(250, [
      { personId: 'a', amountCents: 100 },
      { personId: 'b', amountCents: 150 },
    ]);

    expect(splits).toEqual([
      { personId: 'a', amountCents: 100 },
      { personId: 'b', amountCents: 150 },
    ]);
  });

  it('throws when totals do not match', () => {
    expect(() =>
      buildExactSplits(250, [
        { personId: 'a', amountCents: 100 },
        { personId: 'b', amountCents: 100 },
      ])
    ).toThrow(/add up to the total/i);
  });
});

describe('calculatePercentageSplits', () => {
  it('creates splits from percentages and balances rounding', () => {
    const splits = calculatePercentageSplits(100, [
      { personId: 'a', percentage: 33.33 },
      { personId: 'b', percentage: 33.33 },
      { personId: 'c', percentage: 33.34 },
    ]);

    expect(splits).toEqual([
      { personId: 'a', amountCents: 33 },
      { personId: 'b', amountCents: 33 },
      { personId: 'c', amountCents: 34 },
    ]);
  });

  it('throws when percentages do not sum to 100', () => {
    expect(() =>
      calculatePercentageSplits(100, [
        { personId: 'a', percentage: 50 },
        { personId: 'b', percentage: 40 },
      ])
    ).toThrow(/100/i);
  });
});

describe('calculateShareSplits', () => {
  it('creates splits from shares', () => {
    const splits = calculateShareSplits(100, [
      { personId: 'a', shares: 1 },
      { personId: 'b', shares: 2 },
    ]);

    expect(splits).toEqual([
      { personId: 'a', amountCents: 33 },
      { personId: 'b', amountCents: 67 },
    ]);
  });

  it('throws when total shares is zero', () => {
    expect(() =>
      calculateShareSplits(100, [
        { personId: 'a', shares: 0 },
        { personId: 'b', shares: 0 },
      ])
    ).toThrow(/share/i);
  });
});
