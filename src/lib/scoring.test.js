import { describe, expect, it } from 'vitest'
import { rankTasks, scoreTask } from './scoring'
import { addHours, localDateTime } from '../test/dates'

const NOW = new Date(2026, 8, 30, 12, 0, 0)
const WEIGHTS = { priority: 1, due: 1, staleness: 1 }

function score(task, options = {}) {
  return scoreTask({ priority: 1, labels: [], ...task }, { weights: WEIGHTS, labelBonuses: {}, now: NOW, ...options })
}

function dueIn(hours) {
  return { date: localDateTime(addHours(NOW, hours)) }
}

describe('priority', () => {
  it('doubles per tier, with P1 at 1.0', () => {
    expect(score({ priority: 4 }).breakdown.priority.raw).toBe(1)
    expect(score({ priority: 3 }).breakdown.priority.raw).toBe(0.5)
    expect(score({ priority: 2 }).breakdown.priority.raw).toBe(0.25)
    expect(score({ priority: 1 }).breakdown.priority.raw).toBe(0.125)
  })
})

describe('due date urgency', () => {
  const dueRaw = (due) => score({ due }).breakdown.due.raw

  it('is zero with no due date', () => {
    expect(dueRaw(null)).toBe(0)
  })

  it('runs from 1.0 when due now to 0.3 when due in a week', () => {
    expect(dueRaw(dueIn(0))).toBeCloseTo(1)
    expect(dueRaw(dueIn(7 * 24))).toBeCloseTo(0.3)
    expect(dueRaw(dueIn(6))).toBeGreaterThan(dueRaw(dueIn(30)))
  })

  it('climbs past 1.0 when overdue, capped at 2.0 after 14 days', () => {
    expect(dueRaw(dueIn(-7 * 24))).toBeCloseTo(1.5)
    expect(dueRaw(dueIn(-30 * 24))).toBe(2)
  })

  it('keeps decaying beyond a week, floored at 0.1', () => {
    expect(dueRaw(dueIn(10 * 24))).toBeCloseTo(0.27)
    expect(dueRaw(dueIn(365 * 24))).toBe(0.1)
  })

  it('treats a date-only due date as due at the end of that day', () => {
    const today = localDateTime(NOW).slice(0, 10)
    expect(dueRaw({ date: today })).toBeLessThan(1)
    expect(dueRaw({ date: today })).toBeGreaterThan(dueRaw(dueIn(24)))
  })
})

describe('staleness', () => {
  it('grows linearly to 1.0 at 30 days old', () => {
    expect(score({ added_at: addHours(NOW, -15 * 24).toISOString() }).breakdown.staleness.raw).toBeCloseTo(0.5)
    expect(score({ added_at: addHours(NOW, -90 * 24).toISOString() }).breakdown.staleness.raw).toBe(1)
  })

  it('is zero without a creation date', () => {
    expect(score({}).breakdown.staleness.raw).toBe(0)
  })
})

describe('label bonuses', () => {
  it('adds a flat bonus per matching label, case-insensitively', () => {
    const result = score({ labels: ['Long', 'other'] }, { labelBonuses: { long: 5 } })
    expect(result.breakdown.labels.weighted).toBe(5)
  })

  it('ignores labels named like built-in object properties', () => {
    const result = score({ labels: ['constructor', 'toString'] }, { labelBonuses: { long: 5 } })
    expect(result.total).toBe(score({}).total)
  })
})

describe('rankTasks', () => {
  it('sorts highest score first', () => {
    const tasks = [
      { id: 'low', priority: 1, labels: [] },
      { id: 'high', priority: 4, labels: [], due: dueIn(-24) },
      { id: 'mid', priority: 4, labels: [] },
    ]
    const ranked = rankTasks(tasks, { weights: WEIGHTS, labelBonuses: {}, now: NOW })
    expect(ranked.map((r) => r.task.id)).toEqual(['high', 'mid', 'low'])
  })
})
