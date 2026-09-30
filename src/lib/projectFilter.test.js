import { describe, expect, it } from 'vitest'
import { areAllProjectsSelected, isProjectSelected, toggleAllProjects, toggleProject } from './projectFilter'

const projects = [{ id: 'p1' }, { id: 'p2' }]

describe('projectFilter', () => {
  it('treats null as every project selected', () => {
    expect(isProjectSelected(null, 'anything')).toBe(true)
    expect(areAllProjectsSelected(null, projects)).toBe(true)
  })

  it('judges "all selected" against existing projects, not the saved list length', () => {
    expect(areAllProjectsSelected(['p1', 'deleted'], projects)).toBe(false)
    expect(areAllProjectsSelected(['p1', 'p2', 'deleted'], projects)).toBe(true)
  })

  it('drops deleted project ids when toggling', () => {
    expect(toggleProject(['p1', 'p2', 'deleted'], projects, 'p2')).toEqual(['p1'])
  })

  it('returns to no filter once every project is selected', () => {
    expect(toggleProject(['p1'], projects, 'p2')).toBeNull()
  })

  it('toggles all off, then back to no filter', () => {
    expect(toggleAllProjects(null, projects)).toEqual([])
    expect(toggleAllProjects(['p1', 'deleted'], projects)).toBeNull()
  })
})
