const pad2 = (n) => String(n).padStart(2, '0')
const iso = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`
// JS getDay(): 0=Sun..6=Sat -> Saturday-first column index 0..6
const satIndex = (jsDay) => (jsDay + 1) % 7

export function monthMatrix(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leading = satIndex(new Date(year, month, 1).getDay())
  const cells = [
    ...Array(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => iso(year, month, i + 1)),
  ]
  const trailing = (7 - (cells.length % 7)) % 7
  return [...cells, ...Array(trailing).fill(null)]
}
