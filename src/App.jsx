import { useEffect, useMemo, useState } from 'react'
import {
  clearStoredToken,
  fetchActiveTasks,
  fetchCurrentUser,
  fetchProjects,
  getStoredToken,
  storeToken,
} from './api/todoist'
import { DEFAULT_WEIGHTS, rankTasks } from './lib/scoring'
import { DEFAULT_ASSIGNMENT_MODE, passesAssignmentFilter } from './lib/assignment'
import TokenGate from './components/TokenGate'
import SettingsPanel from './components/SettingsPanel'
import TaskTable from './components/TaskTable'
import UpNext from './components/UpNext'

const UP_NEXT_KEY = 'topdoist:upnext'
const ASSIGNMENT_MODE_KEY = 'topdoist:assignmentMode'
const PROJECT_FILTER_KEY = 'topdoist:selectedProjectIds'

function loadUpNextIds() {
  try {
    return JSON.parse(localStorage.getItem(UP_NEXT_KEY)) ?? []
  } catch {
    return []
  }
}

function saveUpNextIds(ids) {
  try {
    localStorage.setItem(UP_NEXT_KEY, JSON.stringify(ids))
  } catch {
    // ignore storage failures
  }
}

function loadAssignmentMode() {
  try {
    return localStorage.getItem(ASSIGNMENT_MODE_KEY) ?? DEFAULT_ASSIGNMENT_MODE
  } catch {
    return DEFAULT_ASSIGNMENT_MODE
  }
}

// `null` means "no filter" (every project selected) — the default, and what
// a fresh install starts with. Once the user unchecks anything, this holds
// the explicit list of project ids still selected.
function loadSelectedProjectIds() {
  try {
    const raw = localStorage.getItem(PROJECT_FILTER_KEY)
    return raw == null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

export default function App() {
  const [token, setToken] = useState(() => getStoredToken())
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS)
  const [selectedProjectIds, setSelectedProjectIds] = useState(loadSelectedProjectIds)
  const [assignmentMode, setAssignmentMode] = useState(loadAssignmentMode)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [upNextIds, setUpNextIds] = useState(loadUpNextIds)

  useEffect(() => saveUpNextIds(upNextIds), [upNextIds])
  useEffect(() => {
    try {
      localStorage.setItem(ASSIGNMENT_MODE_KEY, assignmentMode)
    } catch {
      // ignore storage failures
    }
  }, [assignmentMode])
  useEffect(() => {
    try {
      if (selectedProjectIds === null) localStorage.removeItem(PROJECT_FILTER_KEY)
      else localStorage.setItem(PROJECT_FILTER_KEY, JSON.stringify(selectedProjectIds))
    } catch {
      // ignore storage failures
    }
  }, [selectedProjectIds])

  async function loadFromTodoist(activeToken) {
    setLoading(true)
    setError('')
    try {
      const [taskData, projectData, user] = await Promise.all([
        fetchActiveTasks(activeToken),
        fetchProjects(activeToken),
        fetchCurrentUser(activeToken),
      ])
      setTasks(taskData)
      setProjects(projectData)
      setCurrentUserId(user?.id ?? null)
      storeToken(activeToken)
      setToken(activeToken)
    } catch (err) {
      setError(err.message || 'Something went wrong loading your tasks.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) loadFromTodoist(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const projectsById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects])
  const tasksById = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks])

  // Tasks the user has manually dragged into Up Next, in the order they put
  // them, dropping any ids for tasks that no longer exist (completed/deleted).
  const upNextTasks = useMemo(
    () => upNextIds.map((id) => tasksById[id]).filter(Boolean),
    [upNextIds, tasksById],
  )

  const filteredTasks = useMemo(() => {
    const upNextSet = new Set(upNextIds)
    return tasks.filter((t) => {
      if (upNextSet.has(t.id)) return false
      if (selectedProjectIds !== null && !selectedProjectIds.includes(t.project_id)) return false
      if (!passesAssignmentFilter(t, { mode: assignmentMode, project: projectsById[t.project_id], currentUserId })) {
        return false
      }
      return true
    })
  }, [tasks, selectedProjectIds, upNextIds, assignmentMode, projectsById, currentUserId])

  const ranked = useMemo(() => rankTasks(filteredTasks, { weights }), [filteredTasks, weights])

  function handleUpNextDrop(taskId, targetIndex) {
    setUpNextIds((prev) => {
      const withoutTask = prev.filter((id) => id !== taskId)
      const insertAt = Math.min(targetIndex, withoutTask.length)
      return [...withoutTask.slice(0, insertAt), taskId, ...withoutTask.slice(insertAt)]
    })
  }

  function handleUpNextRemove(taskId) {
    setUpNextIds((prev) => prev.filter((id) => id !== taskId))
  }

  function isProjectSelected(projectId) {
    return selectedProjectIds === null || selectedProjectIds.includes(projectId)
  }

  function handleToggleProject(projectId) {
    setSelectedProjectIds((prev) => {
      const current = new Set(prev === null ? projects.map((p) => p.id) : prev)
      if (current.has(projectId)) current.delete(projectId)
      else current.add(projectId)
      return Array.from(current)
    })
  }

  function handleToggleAllProjects() {
    setSelectedProjectIds((prev) => {
      const allSelected = prev === null || prev.length === projects.length
      return allSelected ? [] : null
    })
  }

  function handleSignOut() {
    clearStoredToken()
    setToken('')
    setTasks([])
    setProjects([])
    setCurrentUserId(null)
    setUpNextIds([])
  }

  if (!token) {
    return <TokenGate onSubmit={loadFromTodoist} error={error} loading={loading} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>TopDoist</h1>
        <div className="app-header-actions">
          <button type="button" onClick={() => loadFromTodoist(token)} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Open settings">
            ⚙
          </button>
          <button type="button" className="link-button" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <UpNext
        tasks={upNextTasks}
        projectsById={projectsById}
        onDrop={handleUpNextDrop}
        onRemove={handleUpNextRemove}
      />

      <main className="app-main">
        <TaskTable ranked={ranked} projectsById={projectsById} />
      </main>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        weights={weights}
        onWeightsChange={setWeights}
        onResetWeights={() => setWeights(DEFAULT_WEIGHTS)}
        projects={projects}
        isProjectSelected={isProjectSelected}
        onToggleProject={handleToggleProject}
        onToggleAllProjects={handleToggleAllProjects}
        assignmentMode={assignmentMode}
        onAssignmentModeChange={setAssignmentMode}
      />
    </div>
  )
}
