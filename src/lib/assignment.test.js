import { describe, expect, it } from 'vitest'
import { ASSIGNMENT_MODES, passesAssignmentFilter } from './assignment'

const shared = { is_shared: true }
const passes = (responsible_uid, mode, project = shared) =>
  passesAssignmentFilter({ responsible_uid }, { mode, project, currentUserId: 'me' })

describe('passesAssignmentFilter', () => {
  it('includes everything in ALL mode', () => {
    expect(passes('someone', ASSIGNMENT_MODES.ALL)).toBe(true)
  })

  it('never filters tasks in unshared projects', () => {
    expect(passes('someone', ASSIGNMENT_MODES.ME_ONLY, { is_shared: false })).toBe(true)
  })

  it('keeps unassigned and my tasks in UNASSIGNED_OR_ME mode', () => {
    expect(passes(null, ASSIGNMENT_MODES.UNASSIGNED_OR_ME)).toBe(true)
    expect(passes('me', ASSIGNMENT_MODES.UNASSIGNED_OR_ME)).toBe(true)
    expect(passes('someone', ASSIGNMENT_MODES.UNASSIGNED_OR_ME)).toBe(false)
  })

  it('keeps only my tasks in ME_ONLY mode', () => {
    expect(passes('me', ASSIGNMENT_MODES.ME_ONLY)).toBe(true)
    expect(passes(null, ASSIGNMENT_MODES.ME_ONLY)).toBe(false)
  })
})
