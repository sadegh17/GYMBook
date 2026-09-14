export const DAY_KEYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri']
export const DAY_LABELS = {
  sat: 'شنبه', sun: 'یکشنبه', mon: 'دوشنبه', tue: 'سه‌شنبه',
  wed: 'چهارشنبه', thu: 'پنجشنبه', fri: 'جمعه',
}
export const dayLabel = (k) => DAY_LABELS[k] ?? k

// JS getDay(): 0=Sun..6=Sat. Persian week starts Saturday.
const GETDAY_TO_KEY = { 6: 'sat', 0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri' }
export function todayDayKey(now = new Date()) {
  return GETDAY_TO_KEY[now.getDay()] ?? 'sat'
}

export function buildDaysForKeys(keys = []) {
  return keys
    .filter((k) => DAY_KEYS.includes(k))
    .map((k, i) => ({ day_key: k, day_label: DAY_LABELS[k], title: DAY_LABELS[k], focus: null, sort: i + 1 }))
}
