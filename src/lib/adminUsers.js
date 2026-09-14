import { supabase } from './supabase.js'

const LOOKUP_TRIES = 3
const LOOKUP_DELAY_MS = 400

export async function createUserWithRestore({ email, password, name, role, weightKg, theme, programId }) {
  // Supabase session trap: signUp replaces the admin session with the new
  // user's. Order below is load-bearing: getSession -> signUp -> signOut ->
  // setSession(saved) -> profile work. Never reorder; finally re-guarantees it.
  let saved = null
  let signUpHappened = false
  let restored = false
  const restore = async () => {
    await supabase.auth.signOut()
    await supabase.auth.setSession({ access_token: saved.access_token, refresh_token: saved.refresh_token })
    restored = true
  }
  try {
    const { data } = await supabase.auth.getSession()
    saved = data.session
    if (!saved?.access_token || !saved?.refresh_token) throw new Error('no-admin-session')

    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
    signUpHappened = true
    if (error) throw error

    await restore()

    let prof = null
    for (let i = 0; i < LOOKUP_TRIES; i++) {
      const r = await supabase.from('profiles').select('id').eq('email', email).maybeSingle()
      prof = r.data
      if (prof) break
      if (i < LOOKUP_TRIES - 1) await new Promise((res) => setTimeout(res, LOOKUP_DELAY_MS))
    }
    if (!prof) throw new Error('profile-not-found')

    const { error: upErr } = await supabase.from('profiles').update({
      approved: true, status: 'approved', role, weight_kg: weightKg, theme, program_id: programId,
    }).eq('id', prof.id)
    if (upErr) throw upErr
    return prof.id
  } finally {
    // Restore guarantee: even if signUp/lookup/update threw, the admin must be
    // left signed in as themselves — never as the created user, never logged out.
    if (signUpHappened && !restored && saved?.access_token) {
      await supabase.auth.signOut()
      await supabase.auth.setSession({ access_token: saved.access_token, refresh_token: saved.refresh_token })
    }
  }
}

export function createUserErrorFa(err) {
  const msg = String(err?.message ?? err ?? '')
  if (/already registered|already exists|rate limit/i.test(msg)) return 'این ایمیل قبلاً ثبت شده است'
  if (/password.*(at least|weak|short)/i.test(msg)) return 'رمز عبور باید حداقل ۸ کاراکتر باشد'
  if (msg === 'profile-not-found') return 'پروفایل کاربر تازه ساخته نشد — لطفاً صفحه را تازه‌سازی کنید'
  if (msg === 'no-admin-session') return 'نشست ادمین نامعتبر است — دوباره وارد شوید'
  return 'خطا در ساخت کاربر'
}

export async function setMemberStatus(id, status) {
  const { error } = await supabase.from('profiles')
    .update({ status, approved: status === 'approved' })
    .eq('id', id)
  if (error) throw error
}
