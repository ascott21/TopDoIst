// The project filter is saved as `null` (no filter, every project shown) or
// as the list of selected project ids. That list can still hold ids of
// projects deleted since, so "all selected" is always judged against the
// projects that exist now.

export function isProjectSelected(selectedIds, projectId) {
  return selectedIds === null || selectedIds.includes(projectId)
}

export function areAllProjectsSelected(selectedIds, projects) {
  return projects.length > 0 && projects.every((p) => isProjectSelected(selectedIds, p.id))
}

// Rebuilt from the current projects, so deleted projects' ids drop out.
// Selecting every project goes back to `null`, so projects created later
// show up too.
export function toggleProject(selectedIds, projects, projectId) {
  const selected = new Set(projects.filter((p) => isProjectSelected(selectedIds, p.id)).map((p) => p.id))
  if (selected.has(projectId)) selected.delete(projectId)
  else selected.add(projectId)
  return selected.size === projects.length ? null : Array.from(selected)
}

export function toggleAllProjects(selectedIds, projects) {
  return areAllProjectsSelected(selectedIds, projects) ? [] : null
}
