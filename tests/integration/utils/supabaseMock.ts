import { vi } from 'vitest'

type SupabaseMock = {
  from: ReturnType<typeof vi.fn>
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  upsert: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  neq: ReturnType<typeof vi.fn>
  gte: ReturnType<typeof vi.fn>
  lte: ReturnType<typeof vi.fn>
  ilike: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  rpc: ReturnType<typeof vi.fn>
  functions: {
    invoke: ReturnType<typeof vi.fn>
  }
}

const chainableMethods: (keyof SupabaseMock)[] = [
  'from',
  'select',
  'insert',
  'update',
  'delete',
  'upsert',
  'eq',
  'neq',
  'gte',
  'lte',
  'ilike',
  'in',
  'order',
  'single',
  'maybeSingle',
  'rpc',
]

export function createSupabaseMock() {
  const mock = chainableMethods.reduce((acc, key) => {
    acc[key] = vi.fn()
    return acc
  }, {} as SupabaseMock)

  chainableMethods.forEach((key) => {
    mock[key].mockReturnValue(mock)
  })

  return {
    ...mock,
    functions: {
      invoke: vi.fn(),
    },
  }
}
