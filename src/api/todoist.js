// Thin client for Todoist's unified API v1. The user's personal API token is
// kept in this browser's localStorage and sent only to api.todoist.com.

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
    // Storage can be unavailable (private browsing); the session still works.
  }
}

export function clearStoredToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nothing stored, then.
  }
}

// `json` is sent as a JSON body, `form` as a form-encoded one. Returns the
// parsed response, or null for an empty one.
async function request(token, path, { method = 'GET', params, json, form } = {}) {
  const url = new URL(`${BASE_URL}${path}`)
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value)
  }

  const headers = { Authorization: `Bearer ${token}` }
  let body
  if (json) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  } else if (form) {
    body = new URLSearchParams(form)
  }

  const res = await fetch(url, { method, headers, body })
  if (res.status === 401 || res.status === 403) {
    throw new Error('Todoist rejected that API token. Double-check it under Settings > Integrations > Developer.')
  }
  if (!res.ok) {
    throw new Error(`Todoist API error (${res.status})`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// List endpoints are cursor-paginated as { results, next_cursor }; this walks
// every page and returns the combined results.
async function fetchAllPages(token, path, params) {
  const results = []
  let cursor = null
  do {
    const page = await request(token, path, { params: cursor ? { ...params, cursor } : params })
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

// Includes comments on the project itself, which have no `task_id`.
export function fetchCommentsForProject(token, projectId) {
  return fetchAllPages(token, '/comments', { project_id: projectId })
}

// Marks a task complete. A recurring task advances to its next occurrence
// instead, keeping its id and labels.
export async function closeTask(token, taskId) {
  await request(token, `/tasks/${taskId}/close`, { method: 'POST' })
}

// Replaces the task's whole label list, so pass every label it should keep.
export async function updateTaskLabels(token, taskId, labels) {
  await request(token, `/tasks/${taskId}`, { method: 'POST', json: { labels } })
}

// The unified API has no plain user endpoint; the user comes from /sync.
export async function fetchCurrentUser(token) {
  const data = await request(token, '/sync', {
    method: 'POST',
    form: { sync_token: '*', resource_types: '["user"]' },
  })
  return data?.user ?? null
}
