export interface CsvExportOptions {
  filename: string;
  rows: Array<Record<string, unknown>>;
}

function formatTimestamp(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${min}`;
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildExportFilename(scope: string): string {
  return `dealerpulse-${scope}-${formatTimestamp(new Date())}.csv`;
}

export function exportRowsToCsv(options: CsvExportOptions): void {
  const { filename, rows } = options;
  if (!rows || rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map((h) => escapeCsvValue(h)).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(','))
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
