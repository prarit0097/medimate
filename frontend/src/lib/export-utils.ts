function escapeCsvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  const escaped = text.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

export function downloadCsv(
  filename: string,
  rows: Array<Record<string, unknown>>,
  columns?: string[],
) {
  if (rows.length === 0) {
    return;
  }

  const header = columns ?? Object.keys(rows[0]);
  const lines = [
    header.join(","),
    ...rows.map((row) => header.map((column) => escapeCsvCell(row[column])).join(",")),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
