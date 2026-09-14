import { describe, it, expect, vi, beforeEach } from 'vitest'

const from = vi.fn()
vi.mock('../supabase.js', () => ({ supabase: { from } }))

const builder = (resolved) => {
  const b = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(), single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (res, rej) => Promise.resolve(resolved).then(res, rej),
  }
  b.select.mockReturnValue(b)
  return b
}

let lib
beforeEach(async () => { vi.resetModules(); from.mockReset(); lib = await import('../programs.js') })

describe('createProgramWithDays', () => {
  it('inserts program with owner_id then program_days per selected key', async () => {
    const b = builder({ data: { id: 'p1' }, error: null })
    from.mockReturnValue(b)
    await expect(lib.createProgramWithDays({ userId: 'u1', title: 'من', dayKeys: ['mon', 'fri'] }))
      .resolves.toEqual({ id: 'p1' })
    expect(from).toHaveBeenCalledWith('programs')
    const ins = b.insert.mock.calls[0][0]
    expect(ins).toMatchObject({ title: 'من', owner_id: 'u1', is_deleted: false })
    expect(from).toHaveBeenCalledWith('program_days')
  })
})

describe('softDeleteProgram', () => {
  it('updates is_deleted=true for the given id', async () => {
    const b = builder({ data: null, error: null })
    from.mockReturnValue(b)
    await lib.softDeleteProgram('p1')
    expect(b.update).toHaveBeenCalledWith({ is_deleted: true })
    expect(b.eq).toHaveBeenCalledWith('id', 'p1')
  })
})

describe('setDefaultProgram', () => {
  it('updates profiles.program_id', async () => {
    const b = builder({ data: null, error: null })
    from.mockReturnValue(b)
    await lib.setDefaultProgram('u1', 'p9')
    expect(from).toHaveBeenCalledWith('profiles')
    expect(b.update).toHaveBeenCalledWith({ program_id: 'p9' })
    expect(b.eq).toHaveBeenCalledWith('id', 'u1')
  })
})
