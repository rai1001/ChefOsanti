import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listHotelsByOrg } from './hotels'
import { getSupabaseClient } from '@/lib/supabaseClient'

vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: vi.fn(),
}))

describe('Hotels Data', () => {
  const mockFrom = vi.fn()
  const mockSelect = vi.fn()
  const mockEq = vi.fn()
  const mockClient = {
    from: mockFrom,
    select: mockSelect,
    eq: mockEq,
  } as any

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getSupabaseClient as any).mockReturnValue(mockClient)
    mockFrom.mockReturnValue(mockClient)
    mockSelect.mockReturnValue(mockClient)
    mockEq.mockReturnValue(mockClient)
  })

  it('listHotelsByOrg returns mapped hotels', async () => {
    mockEq.mockResolvedValueOnce({
      data: [
        {
          id: 'h1',
          org_id: 'org1',
          name: 'Hotel Test',
          city: 'Madrid',
          country: 'ES',
          currency: 'EUR',
        },
      ],
      error: null,
    })

    const result = await listHotelsByOrg('org1')

    expect(mockFrom).toHaveBeenCalledWith('hotels')
    expect(mockSelect).toHaveBeenCalledWith('*')
    expect(mockEq).toHaveBeenCalledWith('org_id', 'org1')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: 'h1',
      orgId: 'org1',
      name: 'Hotel Test',
      city: 'Madrid',
      country: 'ES',
      currency: 'EUR',
    })
  })

  it('listHotelsByOrg throws error on failure', async () => {
    mockEq.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB Error', code: '500' },
    })

    await expect(listHotelsByOrg('org1')).rejects.toThrow()
  })
})
