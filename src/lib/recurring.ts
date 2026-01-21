export type RecurringFrequency = 'daily' | 'weekly' | 'monthly';

const toLocalDateString = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const parseDate = (dateString: string) => new Date(`${dateString}T00:00:00`);

export const getTodayDateString = () => toLocalDateString(new Date());

export const getNextOccurrence = (
  currentDate: string,
  frequency: RecurringFrequency,
  interval: number
) => {
  const safeInterval = Math.max(1, Math.floor(interval));
  const date = parseDate(currentDate);

  if (frequency === 'daily') {
    date.setDate(date.getDate() + safeInterval);
  } else if (frequency === 'weekly') {
    date.setDate(date.getDate() + safeInterval * 7);
  } else {
    date.setMonth(date.getMonth() + safeInterval);
  }

  return toLocalDateString(date);
};

export const getDueOccurrences = (params: {
  nextOccurrence: string;
  endDate: string | null;
  frequency: RecurringFrequency;
  interval: number;
  today: string;
  maxCount?: number;
}) => {
  const { nextOccurrence, endDate, frequency, interval, today, maxCount = 12 } = params;
  const occurrences: string[] = [];
  let cursor = nextOccurrence;
  let active = true;

  while (cursor <= today && (!endDate || cursor <= endDate)) {
    occurrences.push(cursor);
    if (occurrences.length >= maxCount) {
      break;
    }
    cursor = getNextOccurrence(cursor, frequency, interval);
  }

  if (endDate && cursor > endDate) {
    active = false;
  }

  return { occurrences, nextOccurrence: cursor, isActive: active };
};
