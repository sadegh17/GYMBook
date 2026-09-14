const FA = '۰۱۲۳۴۵۶۷۸۹'
export const fa = (v) => String(v).replace(/[0-9%]/g, (c) => (c === '%' ? '٪' : FA[c]))

export function calcKcal(exercise, item, weightKg) {
  const workMin = (item.sets * item.reps * Number(exercise.sec_per_rep)) / 60
  const kcal = (Number(exercise.met) * 3.5 * Number(weightKg) / 200) * workMin
  return Math.max(0, Math.round(kcal * 10) / 10)
}

const toUTC = (d) => new Date(d + 'T00:00:00Z')
const addDays = (iso, n) => {
  const dt = toUTC(iso); dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}

export function computeStreak(dateSet, today) {
  if (!dateSet.has(today) && !dateSet.has(addDays(today, -1))) return 0
  let cur = dateSet.has(today) ? today : addDays(today, -1)
  let n = 0
  while (dateSet.has(cur)) { n++; cur = addDays(cur, -1) }
  return n
}

export function bestStreak(dateSet) {
  const days = [...dateSet].sort()
  let best = 0, run = 0
  days.forEach((d, i) => {
    run = i > 0 && toUTC(d) - toUTC(days[i - 1]) === 86400000 ? run + 1 : 1
    if (run > best) best = run
  })
  return best
}

export const dayPercent = (done, total) => (total ? Math.round((done / total) * 100) : 0)