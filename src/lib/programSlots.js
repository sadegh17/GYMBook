export const MAX_PROGRAMS = 3

export function countActivePrograms(owned = [], assignedId = null) {
  const ids = new Set(owned.map((p) => p.id))
  if (assignedId) ids.add(assignedId)
  return ids.size
}

export function isProgramLimitError(err) {
  return typeof err?.message === 'string' && err.message.includes('USER_PROGRAM_LIMIT')
}

export function programLimitErrorFa(err) {
  if (isProgramLimitError(err)) {
    return 'می‌توانید حداکثر ۳ برنامه داشته باشید. برای ساخت برنامه جدید، یکی را حذف کنید.'
  }
  return 'خطا در ساخت برنامه — لطفاً دوباره تلاش کنید'
}
