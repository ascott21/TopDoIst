// The Todoist label used to mark a task as "in Up Next," so membership
// syncs across every device/browser instead of living only in one
// browser's localStorage. Manual drag-order still lives locally — Todoist
// has no concept of a custom order within a label, only whether a task
// carries it.
export const UP_NEXT_LABEL = 'Up Next'

export function hasUpNextLabel(task) {
  return task.labels?.includes(UP_NEXT_LABEL) ?? false
}

export function withLabelAdded(labels, label) {
  return labels?.includes(label) ? labels : [...(labels ?? []), label]
}

export function withLabelRemoved(labels, label) {
  return (labels ?? []).filter((l) => l !== label)
}
