// How to handle tasks in shared projects, based on who they're assigned to.
// Assignment only exists in shared projects — a task in a project only you
// belong to is never filtered out by this setting.
export const ASSIGNMENT_MODES = {
  ALL: 'all',
  UNASSIGNED_OR_ME: 'unassigned-or-me',
  ME_ONLY: 'me-only',
}

export const DEFAULT_ASSIGNMENT_MODE = ASSIGNMENT_MODES.UNASSIGNED_OR_ME

export const ASSIGNMENT_MODE_OPTIONS = [
  { value: ASSIGNMENT_MODES.ALL, label: 'Include all tasks' },
  { value: ASSIGNMENT_MODES.UNASSIGNED_OR_ME, label: 'Include tasks not assigned to anyone else' },
  { value: ASSIGNMENT_MODES.ME_ONLY, label: 'Only include tasks assigned to me' },
]

export function passesAssignmentFilter(task, { mode, project, currentUserId }) {
  if (mode === ASSIGNMENT_MODES.ALL) return true
  if (!project?.is_shared) return true // assignment is meaningless outside shared projects

  const assignedTo = task.responsible_uid ?? null

  if (mode === ASSIGNMENT_MODES.ME_ONLY) {
    return assignedTo != null && assignedTo === currentUserId
  }
  // UNASSIGNED_OR_ME
  return assignedTo == null || assignedTo === currentUserId
}
