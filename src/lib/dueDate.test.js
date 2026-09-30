import { describe, expect, it } from 'vitest'
import { dueCalendarDate, dueHasTime, dueInstant, dueTime } from './dueDate'

describe('dueDate', () => {
  it('reads a date-only due date as a local calendar day, not UTC', () => {
    expect(dueCalendarDate({ date: '2026-03-05' })).toEqual(new Date(2026, 2, 5))
  })

  it('places a date-only due instant at the end of that local day', () => {
    expect(dueInstant({ date: '2026-03-05' })).toEqual(new Date(2026, 2, 5, 23, 59, 59))
  })

  it('uses the actual time when one is set', () => {
    expect(dueInstant({ date: '2026-03-05T09:30:00' })).toEqual(new Date(2026, 2, 5, 9, 30))
    expect(dueHasTime({ date: '2026-03-05T09:30:00' })).toBe(true)
    expect(dueTime({ date: '2026-03-05T09:30:00' })).toEqual(new Date(2026, 2, 5, 9, 30))
  })

  it('reports no time for a date-only due date', () => {
    expect(dueHasTime({ date: '2026-03-05' })).toBe(false)
    expect(dueTime({ date: '2026-03-05' })).toBeNull()
  })

  it('returns null when there is no due date', () => {
    expect(dueCalendarDate(null)).toBeNull()
    expect(dueInstant(undefined)).toBeNull()
  })
})
