import { describe, it, expect } from 'vitest'
import { DAY_KEYS, dayLabel, todayDayKey, buildDaysForKeys, dateForWeekday } from '../programDays.js'

describe('programDays', () => {
  it('has 7 keys and Persian labels', () => {
    expect(DAY_KEYS).toEqual(['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'])
    expect(dayLabel('sat')).toBe('شنبه')
    expect(dayLabel('fri')).toBe('جمعه')
  })
  it('todayDayKey maps Sat=6 and Sun=0 and Thu=4', () => {
    expect(todayDayKey(new Date(2026, 8, 12))).toBe('sat') // Sat
    expect(todayDayKey(new Date(2026, 8, 13))).toBe('sun') // Sun
    expect(todayDayKey(new Date(2026, 8, 17))).toBe('thu') // Thu
  })
  it('buildDaysForKeys returns rows with label, title, sort', () => {
    const rows = buildDaysForKeys(['mon', 'fri'])
    expect(rows).toEqual([
      { day_key: 'mon', day_label: 'دوشنبه', title: 'دوشنبه', focus: null, sort: 1 },
      { day_key: 'fri', day_label: 'جمعه', title: 'جمعه', focus: null, sort: 2 },
    ])
  })
  it('buildDaysForKeys ignores unknown keys', () => {
    expect(buildDaysForKeys(['nope'])).toEqual([])
  })
  it('dateForWeekday returns the date of that day within the current Sat-start week', () => {
    // 2026-09-12 is a Saturday
    expect(dateForWeekday('sat', new Date(2026, 8, 12))).toBe('2026-09-12')
    expect(dateForWeekday('sun', new Date(2026, 8, 12))).toBe('2026-09-13')
    expect(dateForWeekday('fri', new Date(2026, 8, 12))).toBe('2026-09-18')
  })
  it('dateForWeekday keeps the same week when "now" is mid-week', () => {
    // 2026-09-16 is a Wednesday; week still starts on 2026-09-12 (Sat)
    expect(dateForWeekday('sat', new Date(2026, 8, 16))).toBe('2026-09-12')
    expect(dateForWeekday('wed', new Date(2026, 8, 16))).toBe('2026-09-16')
    expect(dateForWeekday('thu', new Date(2026, 8, 16))).toBe('2026-09-17')
  })
})
