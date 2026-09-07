export type CsvCell = string | number | boolean | null | undefined

function escapeCsvValue(value: CsvCell): string {
  if (value === null || value === undefined) {
    return ''
  }

  const raw = String(value)
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`
  }
  return raw
}

export function downloadCsv(
  filename: string,
  rows: Record<string, CsvCell>[],
): void {
  if (rows.length === 0) {
    const emptyBlob = new Blob(['\uFEFF'], { type: 'text/csv;charset=utf-8;' })
    triggerDownload(filename, emptyBlob)
    return
  }

  const headers = Object.keys(rows[0])
  const lines = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvValue(row[header])).join(','),
    ),
  ]

  const blob = new Blob([`\uFEFF${lines.join('\n')}`], {
    type: 'text/csv;charset=utf-8;',
  })
  triggerDownload(filename, blob)
}

function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}
