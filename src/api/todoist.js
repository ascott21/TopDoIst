// Thin client for the Todoist REST API v2. The user's personal API token
// (found in Todoist under Settings -> Integrations -> Developer) is kept in
// browser localStorage only — it never leaves the browser except to talk
// directly to api.todoist.com.

const BASE_URL = 'https://api.todoist.com/rest/v2'
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

async function request(token, path) {
  const res = await fetch(`${BASE_URL}${path}`, {
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

export function fetchActiveTasks(token) {
  return request(token, '/tasks')
}

export function fetchProjects(token) {
  return request(token, '/projects')
}
