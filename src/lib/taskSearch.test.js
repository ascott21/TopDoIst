import { describe, expect, it } from 'vitest'
import { taskMatchesSearch } from './taskSearch'

const lookups = {
  projectsById: { p1: { name: 'Home Renovation' } },
  sectionsById: { s1: { name: 'Kitchen' } },
}
const task = { content: 'Buy paint', description: 'Satin finish', labels: ['errands'], project_id: 'p1', section_id: 's1' }
const matches = (query, t = task) => taskMatchesSearch(t, query, lookups)

describe('taskMatchesSearch', () => {
  it('matches every task with an empty query', () => {
    expect(matches('')).toBe(true)
  })

  it('matches title, description, labels, project, and section case-insensitively', () => {
    expect(matches('PAINT')).toBe(true)
    expect(matches('satin')).toBe(true)
    expect(matches('errand')).toBe(true)
    expect(matches('renovation')).toBe(true)
    expect(matches('kitchen')).toBe(true)
  })

  it('does not match unrelated text', () => {
    expect(matches('garage')).toBe(false)
  })

  it('handles tasks without a description, labels, or section', () => {
    expect(matches('paint', { content: 'Buy paint', project_id: 'p1' })).toBe(true)
    expect(matches('kitchen', { content: 'Buy paint', project_id: 'p1' })).toBe(false)
  })
})
