import { describe, it, expect } from 'vitest'
import { validateExercise } from '../adminExercises.js'

const valid = { name_fa: 'پرس سینه', name_en: 'Bench Press', met: 5, sec_per_rep: 3 }

describe('validateExercise', () => {
  it('rejects empty name_fa', () => {
    expect(validateExercise({ ...valid, name_fa: '' })).not.toHaveLength(0)
    expect(validateExercise({ ...valid, name_fa: '   ' })).not.toHaveLength(0)
  })

  it('rejects met below 1', () => {
    const errs = validateExercise({ ...valid, met: 0.5 })
    expect(errs.length).toBeGreaterThan(0)
    expect(errs.join(' ')).toContain('MET')
  })

  it('rejects met above 15', () => {
    expect(validateExercise({ ...valid, met: 16 })).not.toHaveLength(0)
  })

  it('rejects sec_per_rep below 0.5', () => {
    const errs = validateExercise({ ...valid, sec_per_rep: 0.4 })
    expect(errs.length).toBeGreaterThan(0)
    expect(errs.join(' ')).toContain('تکرار')
  })

  it('rejects sec_per_rep above 20', () => {
    expect(validateExercise({ ...valid, sec_per_rep: 21 })).not.toHaveLength(0)
  })

  it('accepts a fully valid form', () => {
    expect(validateExercise(valid)).toEqual([])
  })

  it('accepts numeric strings for met and sec_per_rep', () => {
    expect(validateExercise({ ...valid, met: '6', sec_per_rep: '2.5' })).toEqual([])
  })

  describe('inclusive boundaries', () => {
    it('accepts met at the exact endpoints 1 and 15', () => {
      expect(validateExercise({ ...valid, met: 1 })).toEqual([])
      expect(validateExercise({ ...valid, met: 15 })).toEqual([])
    })

    it('rejects met just outside the endpoints (0.99 and 15.01)', () => {
      expect(validateExercise({ ...valid, met: 0.99 })).not.toHaveLength(0)
      expect(validateExercise({ ...valid, met: 15.01 })).not.toHaveLength(0)
    })

    it('accepts sec_per_rep at the exact endpoints 0.5 and 20', () => {
      expect(validateExercise({ ...valid, sec_per_rep: 0.5 })).toEqual([])
      expect(validateExercise({ ...valid, sec_per_rep: 20 })).toEqual([])
    })

    it('rejects sec_per_rep just outside the endpoints (0.49 and 20.1)', () => {
      expect(validateExercise({ ...valid, sec_per_rep: 0.49 })).not.toHaveLength(0)
      expect(validateExercise({ ...valid, sec_per_rep: 20.1 })).not.toHaveLength(0)
    })
  })
})
