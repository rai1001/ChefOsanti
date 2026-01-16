export type ProductType = 'fresh' | 'pasteurized' | 'frozen'

export type Product = {
  id: string
  name: string
  baseUnit: 'kg' | 'ud'
  productType?: ProductType
  leadTimeDays?: number | null
}

export type Recipe = {
  id: string
  name: string
  defaultServings: number
}

export type RecipeLine = {
  id?: string
  productId: string
  qty: number
  unit: 'kg' | 'ud'
  productBaseUnit?: 'kg' | 'ud'
}

export function scaleRecipeLines(
  lines: RecipeLine[],
  fromServings: number,
  toServings: number,
): RecipeLine[] {
  if (fromServings <= 0 || toServings <= 0) {
    throw new Error('Las raciones deben ser mayores que cero')
  }
  const factor = toServings / fromServings
  return lines.map((line) => ({ ...line, qty: line.qty * factor }))
}

export function computeRecipeNeeds(
  lines: RecipeLine[],
  servingsWanted: number,
  defaultServings: number,
): { productId: string; qty: number; unit: 'kg' | 'ud' }[] {
  if (servingsWanted <= 0 || defaultServings <= 0) {
    throw new Error('Las raciones deben ser mayores que cero')
  }
  return scaleRecipeLines(lines, defaultServings, servingsWanted).map((line) => {
    if (line.productBaseUnit && line.productBaseUnit !== line.unit) {
      throw new Error('Unidad incompatible con el producto')
    }
    return { productId: line.productId, qty: line.qty, unit: line.unit }
  })
}
