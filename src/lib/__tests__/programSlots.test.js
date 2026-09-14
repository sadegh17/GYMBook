import { describe, it, expect } from 'vitest'
import { MAX_PROGRAMS, countActivePrograms, isProgramLimitError, programLimitErrorFa } from '../programSlots.js'

describe('programSlots', () => {
  it('MAX is 3', () => expect(MAX_PROGRAMS).toBe(3))
  it('counts owned + assigned global together', () => {
    const owned = [{ id: 'a' }, { id: 'b' }]
    expect(countActivePrograms(owned, 'global1')).toBe(3)
  })
  it('does not double-count when assigned program is the owned one', () => {
    expect(countActivePrograms([{ id: 'a' }], 'a')).toBe(1)
  })
  it('null assigned adds nothing', () => {
    expect(countActivePrograms([{ id: 'a' }], null)).toBe(1)
  })
  it('recognizes the limit error from a raised exception', () => {
    expect(isProgramLimitError({ message: 'USER_PROGRAM_LIMIT' })).toBe(true)
    expect(isProgramLimitError({ message: 'some other' })).toBe(false)
    expect(isProgramLimitError(null)).toBe(false)
  })
  it('maps limit error to Persian copy', () => {
    expect(programLimitErrorFa({ message: 'USER_PROGRAM_LIMIT' }))
      .toBe('می‌توانید حداکثر ۳ برنامه داشته باشید. برای ساخت برنامه جدید، یکی را حذف کنید.')
  })
})
