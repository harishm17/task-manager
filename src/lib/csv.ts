export type CsvValue = string | number | boolean | null | undefined;

export type CsvRow = Record<string, CsvValue>;

const needsQuoting = (value: string) => /[",\n\r]/.test(value);

const escapeCsvValue = (value: CsvValue) => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  const escaped = stringValue.replace(/"/g, '""');
  return needsQuoting(escaped) ? `"${escaped}"` : escaped;
};

export const toCsv = (rows: CsvRow[], headers: string[]) => {
  const headerRow = headers.join(',');
  const lines = rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(','));
  return [headerRow, ...lines].join('\n');
};

export const downloadCsv = (filename: string, content: string) => {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
