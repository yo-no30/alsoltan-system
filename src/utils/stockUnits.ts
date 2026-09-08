export type StockBreakdown = {
  cartons: number
  pieces: number
  totalPieces: number
  piecesPerCarton: number
}

export function normalizePiecesPerCarton(value: number | null | undefined): number {
  if (!Number.isFinite(value) || value === null || value === undefined || value < 1) {
    return 1
  }
  return Math.floor(value)
}

/** Split total pieces into full cartons + leftover pieces. */
export function splitStock(
  totalPieces: number,
  piecesPerCarton: number | null | undefined,
): StockBreakdown {
  const ppc = normalizePiecesPerCarton(piecesPerCarton)
  const total = Math.max(0, Math.floor(totalPieces))
  return {
    cartons: Math.floor(total / ppc),
    pieces: total % ppc,
    totalPieces: total,
    piecesPerCarton: ppc,
  }
}

/** Combine carton + piece counts into total pieces. */
export function combineStock(
  cartons: number,
  pieces: number,
  piecesPerCarton: number | null | undefined,
): number {
  const ppc = normalizePiecesPerCarton(piecesPerCarton)
  const safeCartons = Math.max(0, Math.floor(cartons))
  const safePieces = Math.max(0, Math.floor(pieces))
  return safeCartons * ppc + safePieces
}

/** Human-readable stock for UI, e.g. "4 كرتون و 18 قطعة". */
export function formatStockLabel(
  totalPieces: number,
  piecesPerCarton: number | null | undefined,
): string {
  const {
    cartons,
    pieces,
    totalPieces: total,
    piecesPerCarton: ppc,
  } = splitStock(totalPieces, piecesPerCarton)

  if (ppc <= 1) {
    return `${total} قطعة`
  }

  if (cartons === 0) {
    return `${pieces} قطعة`
  }

  if (pieces === 0) {
    return `${cartons} كرتون`
  }

  return `${cartons} كرتون و ${pieces} قطعة`
}
