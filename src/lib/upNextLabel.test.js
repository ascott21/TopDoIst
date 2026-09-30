import { describe, expect, it } from 'vitest'
import { UP_NEXT_LABEL, hasUpNextLabel, withLabelAdded, withLabelRemoved } from './upNextLabel'

describe('upNextLabel', () => {
  it('detects the Up Next label', () => {
    expect(hasUpNextLabel({ labels: [UP_NEXT_LABEL] })).toBe(true)
    expect(hasUpNextLabel({ labels: [] })).toBe(false)
    expect(hasUpNextLabel({})).toBe(false)
  })

  it('adds a label once, keeping the others', () => {
    expect(withLabelAdded(['a'], 'b')).toEqual(['a', 'b'])
    expect(withLabelAdded(['a', 'b'], 'b')).toEqual(['a', 'b'])
    expect(withLabelAdded(undefined, 'b')).toEqual(['b'])
  })

  it('removes only the given label', () => {
    expect(withLabelRemoved(['a', 'b'], 'b')).toEqual(['a'])
    expect(withLabelRemoved(undefined, 'b')).toEqual([])
  })
})
