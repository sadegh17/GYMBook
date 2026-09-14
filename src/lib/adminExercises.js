// Pure validation + helpers for the admin exercise-bank form (Task 11).
// Kept free of React/Supabase so they are trivially unit-testable.

export function validateExercise(form) {
  const errors = []
  const nameFa = typeof form?.name_fa === 'string' ? form.name_fa.trim() : ''
  if (!nameFa) errors.push('نام فارسی الزامی است')

  const met = Number(form?.met)
  if (!(met >= 1 && met <= 15)) errors.push('MET باید عددی بین ۱ تا ۱۵ باشد')

  const spr = Number(form?.sec_per_rep)
  if (!(spr >= 0.5 && spr <= 20)) errors.push('ثانیه بر تکرار باید عددی بین ۰.۵ تا ۲۰ باشد')

  return errors
}

// program_items usage counts keyed by exercise_id.
export function countUsages(items) {
  const counts = {}
  for (const it of items ?? []) {
    if (it?.exercise_id) counts[it.exercise_id] = (counts[it.exercise_id] ?? 0) + 1
  }
  return counts
}

// Client-side name_en duplicate detection (warning only, not a DB constraint).
export function isDuplicateNameEn(nameEn, all, editingId) {
  const key = (nameEn ?? '').trim().toLowerCase()
  if (!key) return false
  return (all ?? []).some((e) => e.id !== editingId && (e.name_en ?? '').trim().toLowerCase() === key)
}
