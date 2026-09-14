// Reorder helper for the program builder. Groups items by `section_id`,
// swaps an item with its same-section neighbour, then renumbers `sort`
// to 1..n within each section. Returns a new array; never mutates input.
export function moveItem(list, index, dir) {
  const items = list ?? []
  const target = index + (dir === 'up' ? -1 : 1)
  if (target < 0 || target >= items.length) return items
  if (items[index]?.section_id !== items[target]?.section_id) return items

  const next = items.map((it) => ({ ...it }))
  ;[next[index], next[target]] = [next[target], next[index]]

  const done = new Set()
  for (const it of next) {
    if (done.has(it.section_id)) continue
    done.add(it.section_id)
    let sort = 1
    for (const o of next) if (o.section_id === it.section_id) o.sort = sort++
  }
  return next
}
