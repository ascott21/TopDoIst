// The Todoist label that puts a task in Up Next (see hooks/useUpNext.js).
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
