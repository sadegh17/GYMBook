export const THEMES = [
  { key: 'sadeq', label: 'آبی', color: '#38bdf8' },
  { key: 'saghar', label: 'صورتی', color: '#f472b6' },
  { key: 'black', label: 'مشکی', color: '#e5e7eb' },
  { key: 'red', label: 'قرمز', color: '#f43f5e' },
  { key: 'purple', label: 'بنفش', color: '#a855f7' },
  { key: 'green', label: 'سبز', color: '#22c55e' },
]

export const isKnownTheme = (t) => THEMES.some((x) => x.key === t)
