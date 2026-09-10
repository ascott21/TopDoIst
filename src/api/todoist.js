// Thin client for Todoist's unified API v1 (api.todoist.com/api/v1). The
// user's personal API token (found in Todoist under Settings ->
// Integrations -> Developer) is kept in browser localStorage only — it
// never leaves the browser except to talk directly to api.todoist.com.
//
// Note: Todoist's older REST API v2 (rest/v2) was sunset in early 2026 in
// favor of this unified v1 API, which paginates every list endpoint as
// { results: [...], next_cursor: "..." } instead of returning a flat array.

const BASE_URL = 'https://api.todoist.com/api/v1'
const TOKEN_KEY = 'topdoist:token'

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

export function storeToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // ignore storage failures (private browsing, etc.)
  }
}

export function clearStoredToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}

async function requestPage(token, path, cursor, params) {
  const url = new URL(`${BASE_URL}${path}`)
  if (cursor) url.searchParams.set('cursor', cursor)
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value)
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error('Todoist rejected that API token. Double-check it under Settings > Integrations > Developer.')
    }
    throw new Error(`Todoist API error (${res.status})`)
  }
  return res.json()
}

// Every list endpoint in the unified API is cursor-paginated. Walk all pages
// and return the combined results. `params` are extra query params sent on
// every page alongside the cursor (e.g. filtering comments to one project).
async function fetchAllPages(token, path, params) {
  let cursor = null
  const results = []
  do {
    const page = await requestPage(token, path, cursor, params)
    results.push(...(page.results ?? []))
    cursor = page.next_cursor ?? null
  } while (cursor)
  return results
}

export function fetchActiveTasks(token) {
  return fetchAllPages(token, '/tasks')
}

export function fetchProjects(token) {
  return fetchAllPages(token, '/projects')
}

export function fetchSections(token) {
  return fetchAllPages(token, '/sections')
}

export function fetchLabels(token) {
  return fetchAllPages(token, '/labels')
}

// A task's own object never includes whether it has comments (no count,
// no flag) — the only way to find out is to ask for a project's comments
// and see which tasks they belong to. Comments can also be posted on the
// project itself rather than a task, hence filtering by `task_id` at the
// call site.
export function fetchCommentsForProject(token, projectId) {
  return fetchAllPages(token, '/comments', { project_id: projectId })
}

// Marks a task complete (Todoist's term is "close"). A recurring task just
// advances to its next occurrence rather than disappearing — either way,
// the closed instance stops showing up here.
export async function closeTask(token, taskId) {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}/close`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error(`Todoist API error (${res.status})`)
  }
}

// Replaces a task's full label list — the update endpoint takes the whole
// array, not an add/remove delta, so callers must include every label the
// task should keep, not just the one changing.
export async function updateTaskLabels(token, taskId, labels) {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ labels }),
  })
  if (!res.ok) {
    throw new Error(`Todoist API error (${res.status})`)
  }
}

// There's no plain REST-style "/user" endpoint in the unified API — current
// user info comes back from the sync endpoint when you ask for the "user"
// resource. We only need the id, to tell "assigned to me" apart from
// "assigned to a collaborator" in shared projects.
export async function fetchCurrentUser(token) {
  const res = await fetch(`${BASE_URL}/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ sync_token: '*', resource_types: '["user"]' }),
  })
  if (!res.ok) {
    throw new Error(`Todoist API error (${res.status})`)
  }
  const data = await res.json()
  return data.user ?? null
}
