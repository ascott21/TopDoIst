import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatDue, formatProjectMeta, isOverdue, taskUrl } from './taskDisplay'
import { addHours, localDate, localDateTime } from '../test/dates'

const NOW = new Date(2026, 8, 30, 12, 0, 0)
const daysFromNow = (days) => ({ date: localDate(addHours(NOW, days * 24)) })

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('formatDue', () => {
  it('reads relative within a week either way', () => {
    expect(formatDue(daysFromNow(0))).toBe('Today')
    expect(formatDue(daysFromNow(1))).toBe('Tomorrow')
    expect(formatDue(daysFromNow(-1))).toBe('Yesterday')
    expect(formatDue(daysFromNow(3))).toBe('in 3 days')
    expect(formatDue(daysFromNow(-3))).toBe('3 days ago')
  })

  it('shows a calendar date beyond a week', () => {
    expect(formatDue(daysFromNow(10))).not.toMatch(/days|Today|Tomorrow/)
  })

  it('appends the time only when one is set', () => {
    expect(formatDue({ date: localDateTime(addHours(NOW, 3)) })).toMatch(/^Today at /)
    expect(formatDue(daysFromNow(0))).toBe('Today')
  })

  it('shows a dash with no due date', () => {
    expect(formatDue(null)).toBe('—')
  })
})

describe('isOverdue', () => {
  it('flags a timed task once its time has passed', () => {
    expect(isOverdue({ date: localDateTime(addHours(NOW, -1)) })).toBe(true)
    expect(isOverdue({ date: localDateTime(addHours(NOW, 1)) })).toBe(false)
  })

  it('flags a date-only task only after its day has ended', () => {
    expect(isOverdue(daysFromNow(0))).toBe(false)
    expect(isOverdue(daysFromNow(-1))).toBe(true)
  })

  it('is false with no due date', () => {
    expect(isOverdue(null)).toBe(false)
  })
})

describe('taskUrl', () => {
  it('links to the web app by default and the desktop app when asked', () => {
    expect(taskUrl({ id: '42' })).toBe('https://todoist.com/app/task/42')
    expect(taskUrl({ id: '42' }, { desktopApp: true })).toBe('todoist://task?id=42')
  })
})

describe('formatProjectMeta', () => {
  const projectsById = { p1: { name: 'Work' } }
  const sectionsById = { s1: { name: 'Admin' } }

  it('shows the project, plus the section when there is one', () => {
    expect(formatProjectMeta({ project_id: 'p1' }, projectsById, sectionsById)).toBe('Work')
    expect(formatProjectMeta({ project_id: 'p1', section_id: 's1' }, projectsById, sectionsById)).toBe('Work · Admin')
  })
})
