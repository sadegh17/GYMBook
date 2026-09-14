import { supabase } from './supabase.js'
import { calcKcal } from './calc.js'

export async function fetchProgramTree(programId) {
  if (!programId) return []
  const { data: days, error } = await supabase.from('program_days')
    .select('*, sections:program_sections(*), items:program_items(*, exercise:exercises(*))')
    .eq('program_id', programId).order('sort')
  if (error) throw error
  return days.map((d) => ({
    ...d,
    sections: (d.sections ?? []).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)),
  }))
}

export async function fetchChecks(userId, date) {
  const { data, error } = await supabase.from('checks').select('*').eq('user_id', userId).eq('date', date)
  if (error) throw error
  return data
}

export async function toggleCheck({ userId, date, dayKey, item, exercise, weightKg, existing }) {
  if (existing) {
    const { error } = await supabase.from('checks').delete().eq('id', existing.id)
    if (error) throw error
    return null
  }
  const { error } = await supabase.from('checks').insert({
    user_id: userId, date, day_key: dayKey, item_id: item.id,
    kcal: calcKcal(exercise, item, weightKg),
    exercise_name: exercise?.name_fa ?? null,
    sets: item.sets,
  })
  if (error) throw error
  return { item_id: item.id, date }
}
