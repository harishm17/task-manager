import { getDueOccurrences, getNextOccurrence } from '../lib/recurring';

describe('getNextOccurrence', () => {
  it('advances daily by interval', () => {
    expect(getNextOccurrence('2024-01-01', 'daily', 2)).toBe('2024-01-03');
  });

  it('advances weekly by interval', () => {
    expect(getNextOccurrence('2024-01-01', 'weekly', 1)).toBe('2024-01-08');
  });

  it('advances monthly by interval', () => {
    expect(getNextOccurrence('2024-01-15', 'monthly', 1)).toBe('2024-02-15');
  });
});

describe('getDueOccurrences', () => {
  it('returns all occurrences up to today', () => {
    const result = getDueOccurrences({
      nextOccurrence: '2024-01-01',
      endDate: null,
      frequency: 'weekly',
      interval: 1,
      today: '2024-01-15',
    });

    expect(result.occurrences).toEqual(['2024-01-01', '2024-01-08', '2024-01-15']);
    expect(result.nextOccurrence).toBe('2024-01-22');
    expect(result.isActive).toBe(true);
  });

  it('stops after end date', () => {
    const result = getDueOccurrences({
      nextOccurrence: '2024-01-01',
      endDate: '2024-01-10',
      frequency: 'weekly',
      interval: 1,
      today: '2024-01-20',
    });

    expect(result.occurrences).toEqual(['2024-01-01', '2024-01-08']);
    expect(result.isActive).toBe(false);
  });
});
