// Small display helpers shared between the ranked task table and Up Next,
// so the two don't drift out of sync on how a task's link or meta line is
// built.

// Todoist's unified API v1 dropped the `url` field the old REST v2 tasks
// had, so we reconstruct the web-app deep link from the task id ourselves.
export function taskUrl(task) {
  return task.url ?? `https://todoist.com/app/task/${task.id}`
}

// "Project" or "Project · Section" when the task sits in a section.
export function formatProjectMeta(task, projectsById, sectionsById) {
  const projectName = projectsById[task.project_id]?.name ?? '—'
  const section = task.section_id ? sectionsById[task.section_id] : null
  return section ? `${projectName} · ${section.name}` : projectName
}
