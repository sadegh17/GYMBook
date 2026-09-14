import { describe, it, expect, vi, beforeEach } from 'vitest'

const from = vi.fn()
vi.mock('../supabase.js', () => ({ supabase: { from } }))

const tail = (resolved) => {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    then: (resolve, reject) => Promise.resolve(resolved).then(resolve, reject)
  }
  return builder
}

let api
beforeEach(async () => {
  vi.resetModules()
  from.mockReset()
  api = await import('../api.js')
})

describe('fetchProgramTree', () => {
  it('queries program_days with nested items+exercise ordered by sort', async () => {
    const days = [{ id: 'd1', items: [] }]
    const b = tail({ data: days, error: null })
    from.mockReturnValue(b)
    await expect(api.fetchProgramTree('p1')).resolves.toEqual(days)
    expect(from).toHaveBeenCalledWith('program_days')
    expect(b.select).toHaveBeenCalledWith('*, items:program_items(*, exercise:exercises(*))')
    expect(b.eq).toHaveBeenCalledWith('program_id', 'p1')
    expect(b.order).toHaveBeenCalledWith('sort')
  })

  it('returns [] for null/undefined programId without touching supabase', async () => {
    from.mockImplementation(() => { throw new Error('supabase must not be called') })
    await expect(api.fetchProgramTree(null)).resolves.toEqual([])
    await expect(api.fetchProgramTree(undefined)).resolves.toEqual([])
    expect(from).not.toHaveBeenCalled()
  })
})

describe('fetchChecks', () => {
  it('queries checks filtered by user and date', async () => {
    const rows = [{ id: 'c1' }]
    const b = tail({ data: rows, error: null })
    from.mockReturnValue(b)
    await expect(api.fetchChecks('u1', '2026-09-14')).resolves.toEqual(rows)
    expect(from).toHaveBeenCalledWith('checks')
    expect(b.select).toHaveBeenCalledWith('*')
    expect(b.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(b.eq).toHaveBeenCalledWith('date', '2026-09-14')
  })
})

describe('toggleCheck', () => {
  const exercise = { met: 8, sec_per_rep: 4 }
  const item = { id: 'i1', sets: 3, reps: 12 }

  it('inserts exactly {user_id,date,day_key,item_id,kcal} with correct kcal and returns {item_id,date}', async () => {
    const b = tail({ data: null, error: null })
    from.mockReturnValue(b)
    const result = await api.toggleCheck({
      userId: 'u1', date: '2026-09-14', dayKey: 'tue',
      item, exercise, weightKg: 70, existing: null
    })
    // work_min = 3*12*4/60 = 2.4 ; kcal = 8*3.5*70/200*2.4 = 23.52 -> 23.5
    expect(b.insert).toHaveBeenCalledWith({
      user_id: 'u1', date: '2026-09-14', day_key: 'tue', item_id: 'i1', kcal: 23.5
    })
    expect(b.insert.mock.calls[0][0]).toEqual({
      user_id: 'u1', date: '2026-09-14', day_key: 'tue', item_id: 'i1', kcal: 23.5
    })
    expect(result).toEqual({ item_id: 'i1', date: '2026-09-14' })
  })

  it('deletes the existing row by id and returns null', async () => {
    const b = tail({ data: null, error: null })
    from.mockReturnValue(b)
    const result = await api.toggleCheck({
      userId: 'u1', date: '2026-09-14', dayKey: 'tue',
      item, exercise, weightKg: 70, existing: { id: 'c9' }
    })
    expect(from).toHaveBeenCalledWith('checks')
    expect(b.delete).toHaveBeenCalled()
    expect(b.eq).toHaveBeenCalledWith('id', 'c9')
    expect(b.insert).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })
})
