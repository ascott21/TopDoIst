// Case-insensitive substring match against a task's title, description,
// labels, project name, and section name.
export function taskMatchesSearch(task, query, { projectsById, sectionsById }) {
  if (!query) return true
  const q = query.toLowerCase()
  const includesQuery = (text) => text?.toLowerCase().includes(q) ?? false

  return (
    includesQuery(task.content) ||
    includesQuery(task.description) ||
    (task.labels ?? []).some(includesQuery) ||
    includesQuery(projectsById[task.project_id]?.name) ||
    includesQuery(sectionsById[task.section_id]?.name)
  )
}
