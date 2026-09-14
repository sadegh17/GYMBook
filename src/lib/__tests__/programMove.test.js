import { describe, it, expect } from 'vitest'
import { moveItem } from '../programMove.js'

const mk = (id, section_id, sort) => ({ id, section_id, sort })

describe('moveItem (section_id groups)', () => {
  it('swaps same-section neighbours and renumbers sort within section', () => {
    const list = [mk('a', 'S1', 1), mk('b', 'S1', 2), mk('c', 'S2', 1)]
    const out = moveItem(list, 1, 'up')
    expect(out.map((i) => `${i.id}:${i.sort}`)).toEqual(['b:1', 'a:2', 'c:1'])
  })
  it('no-op across sections', () => {
    const list = [mk('a', 'S1', 1), mk('b', 'S2', 1)]
    expect(moveItem(list, 1, 'up').map((i) => i.id)).toEqual(['a', 'b'])
  })
  it('no-op at boundaries', () => {
    const list = [mk('a', 'S1', 1)]
    expect(moveItem(list, 0, 'up')).toBe(list)
  })
  it('does not mutate input', () => {
    const list = [mk('a', 'S1', 1), mk('b', 'S1', 2)]
    moveItem(list, 0, 'down')
    expect(list[0].sort).toBe(1)
  })
})
