// Pure reorder helper for the admin program builder (Task 12).
// Swaps an item with its same-section neighbour and renumbers `sort`
// to 1..n inside each section. Returns a new array; never mutates input.

export function moveItem(list, index, dir) {
  const target = index + (dir === 'up' ? -1 : 1)
  const items = list ?? []
  if (target < 0 || target >= items.length) return items
  if (items[index]?.section !== items[target]?.section) return items

  const next = items.map((it) => ({ ...it }))
  ;[next[index], next[target]] = [next[target], next[index]]

  for (const section of ['warm', 'main', 'cool']) {
    let sort = 1
    for (const it of next) {
      if (it.section === section) it.sort = sort++
    }
  }
  return next
}
