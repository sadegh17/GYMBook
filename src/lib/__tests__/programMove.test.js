import { describe, it, expect } from 'vitest'
import { moveItem } from '../programMove.js'

const list = [
  { id: 'a', section: 'main', sort: 1 },
  { id: 'b', section: 'main', sort: 2 },
  { id: 'c', section: 'main', sort: 3 },
]

describe('moveItem', () => {
  it('swaps middle item up', () => {
    const out = moveItem(list, 1, 'up')
    expect(out.map((i) => i.id)).toEqual(['b', 'a', 'c'])
    expect(out.map((i) => i.sort)).toEqual([1, 2, 3])
  })

  it('swaps middle item down', () => {
    const out = moveItem(list, 1, 'down')
    expect(out.map((i) => i.id)).toEqual(['a', 'c', 'b'])
    expect(out.map((i) => i.sort)).toEqual([1, 2, 3])
  })

  it('is a boundary no-op at top and bottom', () => {
    expect(moveItem(list, 0, 'up')).toEqual(list)
    expect(moveItem(list, 2, 'down')).toEqual(list)
  })

  it('moves only within the same section and renumbers 1..n', () => {
    const mixed = [
      { id: 'w1', section: 'warm', sort: 1 },
      { id: 'm1', section: 'main', sort: 1 },
      { id: 'm2', section: 'main', sort: 2 },
      { id: 'c1', section: 'cool', sort: 1 },
    ]
    const out = moveItem(mixed, 2, 'up')
    expect(out.map((i) => i.id)).toEqual(['w1', 'm2', 'm1', 'c1'])
    expect(out.filter((i) => i.section === 'main').map((i) => i.sort)).toEqual([1, 2])
  })

  it('does not mutate the input array', () => {
    const before = list.map((i) => ({ ...i }))
    moveItem(list, 1, 'up')
    expect(list).toEqual(before)
  })
})
