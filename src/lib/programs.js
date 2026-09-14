import { supabase } from './supabase.js'
import { buildDaysForKeys } from './programDays.js'

export async function fetchSelectablePrograms(userId, assignedId) {
  const { data: owned, error } = await supabase.from('programs')
    .select('id,title,owner_id').eq('owner_id', userId).eq('is_deleted', false).order('created_at')
  if (error) throw error
  const list = (owned ?? []).map((p) => ({ id: p.id, title: p.title, isOwned: true, isDefault: p.id === assignedId }))
  if (assignedId && !list.some((p) => p.id === assignedId)) {
    const { data: g } = await supabase.from('programs').select('id,title').eq('id', assignedId).maybeSingle()
    if (g) list.push({ id: g.id, title: g.title, isOwned: false, isDefault: true })
  }
  return list
}

export async function createProgramWithDays({ userId, title, dayKeys }) {
  const { data: created, error } = await supabase.from('programs')
    .insert({ title, owner_id: userId, is_deleted: false }).select('id').single()
  if (error) throw error
  const rows = buildDaysForKeys(dayKeys).map((d) => ({ ...d, program_id: created.id }))
  if (rows.length) {
    const { error: e2 } = await supabase.from('program_days').insert(rows)
    if (e2) throw e2
  }
  return { id: created.id }
}

export async function softDeleteProgram(id) {
  const { error } = await supabase.from('programs').update({ is_deleted: true }).eq('id', id)
  if (error) throw error
}

export async function setDefaultProgram(userId, programId) {
  const { error } = await supabase.from('profiles').update({ program_id: programId }).eq('id', userId)
  if (error) throw error
}
