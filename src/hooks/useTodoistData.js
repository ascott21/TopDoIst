import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearStoredToken,
  fetchActiveTasks,
  fetchCommentsForProject,
  fetchCurrentUser,
  fetchLabels,
  fetchProjects,
  fetchSections,
  getStoredToken,
  storeToken,
  updateTaskLabels,
} from '../api/todoist'

const POLL_INTERVAL_MS = 15000

// Returns an updater that keeps the current state when the fetched data is
// identical, so an unchanged poll doesn't re-render the whole app.
function keepIfUnchanged(next) {
  return (prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next)
}

// Tasks don't say whether they have comments, so this fetches the comments
// of every project that has active tasks and collects their task ids.
async function fetchTaskIdsWithComments(token, tasks) {
  const projectIds = [...new Set(tasks.map((t) => t.project_id))]
  const results = await Promise.allSettled(projectIds.map((id) => fetchCommentsForProject(token, id)))
  const ids = new Set()
  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    for (const comment of result.value) {
      if (comment.task_id) ids.add(comment.task_id)
    }
  }
  return ids
}

// Everything that comes from Todoist: the token, the fetched data, loading
// and error state, background polling, and optimistic label writes.
export function useTodoistData() {
  const [token, setToken] = useState(getStoredToken)
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [sections, setSections] = useState([])
  const [labels, setLabels] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
  const [taskIdsWithComments, setTaskIdsWithComments] = useState(() => new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // A fetch that was already in flight when a local change began (a label
  // write, a completion, a drag, signing out) returns data from before that
  // change, and applying it would briefly undo it. Every such change bumps
  // `localChangeCountRef`, and a fetch drops its result if the count moved
  // while it waited. `busyCountRef` counts changes still in progress, which
  // pause polling.
  const localChangeCountRef = useRef(0)
  const busyCountRef = useRef(0)

  // Call when a local change starts; call the returned function when it's
  // done. Calling that more than once is harmless.
  const beginLocalChange = useCallback(() => {
    localChangeCountRef.current++
    busyCountRef.current++
    let ended = false
    return () => {
      if (ended) return
      ended = true
      busyCountRef.current--
    }
  }, [])

  // A full load fetches everything. A `silent` background poll skips what
  // rarely changes (labels, the user, comment presence), and swallows errors
  // rather than flashing a banner every 15 seconds. Returns whether the
  // fetched data was applied.
  const load = useCallback(async (activeToken, { silent = false } = {}) => {
    const changeCountAtStart = localChangeCountRef.current
    const isStale = () => localChangeCountRef.current !== changeCountAtStart || busyCountRef.current > 0

    if (!silent) {
      setLoading(true)
      setError('')
    }
    try {
      const requests = [fetchActiveTasks(activeToken), fetchProjects(activeToken), fetchSections(activeToken)]
      if (!silent) requests.push(fetchLabels(activeToken), fetchCurrentUser(activeToken))
      const [taskData, projectData, sectionData, labelData, user] = await Promise.all(requests)
      if (isStale()) return false

      setTasks(keepIfUnchanged(taskData))
      setProjects(keepIfUnchanged(projectData))
      setSections(keepIfUnchanged(sectionData))
      if (!silent) {
        setLabels(keepIfUnchanged(labelData))
        setCurrentUserId(user?.id ?? null)
        // Filled in after the task list renders rather than holding it up.
        // A failure is ignored: the icons are a hint, not core data.
        fetchTaskIdsWithComments(activeToken, taskData)
          .then(setTaskIdsWithComments)
          .catch(() => {})
      }
      return true
    } catch (err) {
      if (!silent && !isStale()) setError(err.message || 'Something went wrong loading your tasks.')
      return false
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // Only for the token stored when the app opens; signIn loads a new one.
  useEffect(() => {
    if (token) load(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Polls while the tab is visible and nothing is in progress, and catches
  // up as soon as the tab is shown again.
  useEffect(() => {
    if (!token) return

    function poll() {
      if (document.visibilityState === 'hidden' || busyCountRef.current > 0) return
      load(token, { silent: true })
    }

    const intervalId = setInterval(poll, POLL_INTERVAL_MS)
    document.addEventListener('visibilitychange', poll)
    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [token, load])

  // The token is saved only once Todoist accepts it, so a typo never is.
  async function signIn(newToken) {
    if (await load(newToken)) {
      storeToken(newToken)
      setToken(newToken)
    }
  }

  function signOut() {
    localChangeCountRef.current++
    clearStoredToken()
    setToken('')
    setTasks([])
    setProjects([])
    setSections([])
    setLabels([])
    setCurrentUserId(null)
    setTaskIdsWithComments(new Set())
    setError('')
  }

  function setTaskLabelsLocally(taskId, newLabels) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, labels: newLabels } : t)))
  }

  // Shown immediately; rolled back, with `errorMessage` shown, if Todoist
  // rejects the write.
  async function updateLabels(taskId, newLabels, errorMessage) {
    const previousLabels = tasks.find((t) => t.id === taskId)?.labels
    setTaskLabelsLocally(taskId, newLabels)
    const endChange = beginLocalChange()
    try {
      await updateTaskLabels(token, taskId, newLabels)
    } catch (err) {
      setTaskLabelsLocally(taskId, previousLabels)
      setError(err.message || errorMessage)
    } finally {
      endChange()
    }
  }

  return {
    token,
    signIn,
    signOut,
    refresh: () => load(token),
    loading,
    error,
    setError,
    tasks,
    setTasks,
    projects,
    sections,
    labels,
    currentUserId,
    taskIdsWithComments,
    beginLocalChange,
    updateLabels,
  }
}
