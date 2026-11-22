// Puts projects in the order Todoist's sidebar shows them, with each
// project's nesting depth. The API returns projects as a flat list where
// each one carries a `parent_id` (null for top-level projects) and a
// `child_order` that only orders it among its own siblings — so the tree
// has to be rebuilt here, depth-first, sorting each level by child_order.
//
// Inbox goes first, the way Todoist pins it above "My Projects". Workspace
// (team) projects, which Todoist lists in their own block below personal
// ones, come after the personal tree.
export function orderProjectsLikeTodoist(projects) {
  const ids = new Set(projects.map((p) => p.id))
  const childrenByParent = new Map()

  for (const p of projects) {
    // A parent that's missing from the list (archived, or not visible to
    // this token) would orphan the child — treat it as top-level instead.
    const parentKey = p.parent_id && ids.has(p.parent_id) ? p.parent_id : null
    if (!childrenByParent.has(parentKey)) childrenByParent.set(parentKey, [])
    childrenByParent.get(parentKey).push(p)
  }

  const byChildOrder = (a, b) => (a.child_order ?? 0) - (b.child_order ?? 0)
  for (const list of childrenByParent.values()) list.sort(byChildOrder)

  const roots = childrenByParent.get(null) ?? []
  const rootRank = (p) => (p.inbox_project ? 0 : p.workspace_id ? 2 : 1)
  roots.sort((a, b) => rootRank(a) - rootRank(b) || byChildOrder(a, b))

  const ordered = []
  const visited = new Set()
  function walk(project, depth) {
    if (visited.has(project.id)) return // guards against a malformed cycle
    visited.add(project.id)
    ordered.push({ project, depth })
    for (const child of childrenByParent.get(project.id) ?? []) walk(child, depth + 1)
  }
  for (const root of roots) walk(root, 0)

  // Anything a cycle kept unreachable still gets listed, at the top level.
  for (const p of projects) if (!visited.has(p.id)) walk(p, 0)

  return ordered
}
