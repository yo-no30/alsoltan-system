import { jsPDF } from 'jspdf'

export type PdfCell = string | number | boolean | null | undefined

export interface PdfTableExportInput {
  title: string
  subtitle?: string
  filename: string
  headers: string[]
  rows: PdfCell[][]
}

const FONT_FAMILY = 'AlsoltanReportArabic'
const FONT_URL = '/fonts/NotoNaskhArabic-Regular.ttf'

let fontReady: Promise<void> | null = null

function cellText(value: PdfCell): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا'
  return String(value)
}

async function ensureArabicFont(): Promise<void> {
  if (!fontReady) {
    fontReady = (async () => {
      const existing = Array.from(document.fonts).some(
        (face) => face.family === FONT_FAMILY,
      )
      if (!existing) {
        const face = new FontFace(FONT_FAMILY, `url(${FONT_URL})`, {
          display: 'block',
        })
        const loaded = await face.load()
        document.fonts.add(loaded)
      }
      await document.fonts.load(`16px "${FONT_FAMILY}"`)
    })().catch((error) => {
      fontReady = null
      throw error
    })
  }
  await fontReady
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const value = text.trim() || '—'
  if (ctx.measureText(value).width <= maxWidth) {
    return [value]
  }

  const lines: string[] = []
  let current = ''
  for (const char of value) {
    const next = current + char
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current)
      current = char
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines.length > 0 ? lines : [value]
}

async function renderReportCanvas(
  input: PdfTableExportInput,
): Promise<HTMLCanvasElement> {
  await ensureArabicFont()

  const cssWidth = 794
  const scale = 2
  const paddingX = 28
  const contentWidth = cssWidth - paddingX * 2
  const colCount = Math.max(input.headers.length, 1)
  const colWidth = contentWidth / colCount
  const cellPad = 8
  const textMaxWidth = colWidth - cellPad * 2

  const measure = document.createElement('canvas').getContext('2d')
  if (!measure) {
    throw new Error('تعذر تهيئة الرسم للتقرير')
  }

  measure.font = `600 12px "${FONT_FAMILY}"`
  const headerLines = input.headers.map((header) =>
    wrapText(measure, header, textMaxWidth),
  )
  const headerRowHeight = Math.max(
    34,
    ...headerLines.map((lines) => lines.length * 16 + 14),
  )

  measure.font = `400 12px "${FONT_FAMILY}"`
  const bodyLineMap = input.rows.map((row) =>
    input.headers.map((_, index) =>
      wrapText(measure, cellText(row[index]), textMaxWidth),
    ),
  )
  const bodyRowHeights = bodyLineMap.map((cells) =>
    Math.max(30, ...cells.map((lines) => lines.length * 15 + 12)),
  )

  const topBlock = 108
  const tableHeight =
    headerRowHeight + bodyRowHeights.reduce((sum, height) => sum + height, 0)
  const cssHeight = Math.max(topBlock + tableHeight + 36, 400)

  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(cssWidth * scale)
  canvas.height = Math.floor(cssHeight * scale)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('تعذر إنشاء لوحة التقرير')
  }

  ctx.scale(scale, scale)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, cssWidth, cssHeight)

  // Brand header
  ctx.direction = 'rtl'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'

  ctx.fillStyle = '#800020'
  ctx.font = `700 22px "${FONT_FAMILY}"`
  ctx.fillText('مشروبات السلطان', cssWidth - paddingX, 28)

  ctx.fillStyle = '#94a3b8'
  ctx.font = `400 12px "${FONT_FAMILY}"`
  ctx.fillText('Sultan Beverages', cssWidth - paddingX, 48)

  ctx.fillStyle = '#64748b'
  ctx.font = `400 11px "${FONT_FAMILY}"`
  ctx.textAlign = 'left'
  ctx.fillText(new Date().toLocaleString('ar-YE'), paddingX, 28)

  ctx.textAlign = 'right'
  ctx.fillStyle = '#0f172a'
  ctx.font = `700 16px "${FONT_FAMILY}"`
  ctx.fillText(input.title, cssWidth - paddingX, 74)

  if (input.subtitle) {
    ctx.fillStyle = '#64748b'
    ctx.font = `400 12px "${FONT_FAMILY}"`
    ctx.fillText(input.subtitle, cssWidth - paddingX, 94)
  }

  ctx.strokeStyle = '#800020'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(paddingX, 108)
  ctx.lineTo(cssWidth - paddingX, 108)
  ctx.stroke()

  let y = 110

  const drawRow = (
    cells: string[][],
    rowHeight: number,
    options: { header?: boolean; zebra?: boolean },
  ): void => {
    if (options.header) {
      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(paddingX, y, contentWidth, rowHeight)
    } else if (options.zebra) {
      ctx.fillStyle = '#fafafa'
      ctx.fillRect(paddingX, y, contentWidth, rowHeight)
    }

    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1
    ctx.strokeRect(paddingX, y, contentWidth, rowHeight)

    ctx.font = options.header
      ? `600 12px "${FONT_FAMILY}"`
      : `400 12px "${FONT_FAMILY}"`
    ctx.fillStyle = options.header ? '#334155' : '#0f172a'
    ctx.textAlign = 'right'
    ctx.direction = 'rtl'

    for (let col = 0; col < colCount; col += 1) {
      // RTL: first header appears on the right
      const xRight = cssWidth - paddingX - col * colWidth - cellPad
      const lines = cells[col] ?? ['—']
      const blockHeight = lines.length * (options.header ? 16 : 15)
      let lineY = y + (rowHeight - blockHeight) / 2 + (options.header ? 8 : 7)

      for (const line of lines) {
        ctx.fillText(line, xRight, lineY)
        lineY += options.header ? 16 : 15
      }

      if (col > 0) {
        const gridX = cssWidth - paddingX - col * colWidth
        ctx.beginPath()
        ctx.moveTo(gridX, y)
        ctx.lineTo(gridX, y + rowHeight)
        ctx.stroke()
      }
    }

    y += rowHeight
  }

  drawRow(headerLines, headerRowHeight, { header: true })

  bodyLineMap.forEach((cells, index) => {
    drawRow(cells, bodyRowHeights[index] ?? 30, {
      zebra: index % 2 === 1,
    })
  })

  return canvas
}

function canvasToPdfBlob(canvas: HTMLCanvasElement): Blob {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 8
  const usableWidth = pageWidth - margin * 2
  const usableHeight = pageHeight - margin * 2
  const imgHeight = (canvas.height * usableWidth) / canvas.width

  // JPEG is lighter and avoids some PNG memory spikes
  const imgData = canvas.toDataURL('image/jpeg', 0.95)

  let heightLeft = imgHeight
  let offset = margin
  let pages = 0
  const maxPages = 40

  pdf.addImage(imgData, 'JPEG', margin, offset, usableWidth, imgHeight)
  heightLeft -= usableHeight
  pages += 1

  while (heightLeft > 1 && pages < maxPages) {
    offset = margin - (imgHeight - heightLeft)
    pdf.addPage()
    pdf.addImage(imgData, 'JPEG', margin, offset, usableWidth, imgHeight)
    heightLeft -= usableHeight
    pages += 1
  }

  return pdf.output('blob')
}

export async function buildTablePdf(
  input: PdfTableExportInput,
): Promise<{ blob: Blob; filename: string }> {
  const filename = input.filename.endsWith('.pdf')
    ? input.filename
    : `${input.filename}.pdf`

  // Let the UI unlock a frame before heavy canvas work
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0)
  })

  const canvas = await renderReportCanvas(input)
  const blob = canvasToPdfBlob(canvas)
  return { blob, filename }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

function isLikelyMobile(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

export function canShareFiles(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  )
}

async function shareWithTimeout(
  data: ShareData,
  timeoutMs: number,
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      navigator.share(data),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('share-timeout')), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function sharePdfFile(
  blob: Blob,
  filename: string,
  title: string,
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: 'application/pdf' })

  if (
    isLikelyMobile() &&
    canShareFiles() &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await shareWithTimeout(
        {
          files: [file],
          title,
          text: title,
        },
        15000,
      )
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled'
      }
      console.warn('[pdfExport] share unavailable, downloading instead:', error)
    }
  }

  downloadBlob(blob, filename)
  return 'downloaded'
}
