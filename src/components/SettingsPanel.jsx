import { useEffect, useState } from 'react'
import WeightControls from './WeightControls'
import ProjectFilter from './ProjectFilter'
import LeadTimeSettings from './LeadTimeSettings'
import HoldLabelSettings from './HoldLabelSettings'
import SectionToggle from './SectionToggle'
import { ASSIGNMENT_MODE_OPTIONS } from '../lib/assignment'

// Settings sections the user has collapsed. Every section starts open; the
// choice is remembered in this browser, like the main page's sections.
const COLLAPSED_KEY = 'topdoist:settingsCollapsed'

function loadCollapsed() {
  try {
    const raw = JSON.parse(localStorage.getItem(COLLAPSED_KEY))
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function SettingsSection({ id, title, action, collapsed, onToggle, children }) {
  const expanded = !collapsed.includes(id)
  return (
    <section className="settings-section">
      <SectionToggle title={title} expanded={expanded} onToggle={() => onToggle(id)} extra={action} />
      {expanded && <div className="settings-section-body">{children}</div>}
    </section>
  )
}

function ResetButton({ onClick }) {
  return (
    <button type="button" className="link-button" onClick={onClick}>
      Reset to defaults
    </button>
  )
}

export default function SettingsPanel({
  open,
  onClose,
  weights,
  onWeightsChange,
  onResetWeights,
  defaultDurationMinutes,
  onDefaultDurationChange,
  projects,
  isProjectSelected,
  allProjectsSelected,
  onToggleProject,
  onToggleAllProjects,
  assignmentMode,
  onAssignmentModeChange,
  leadTimes,
  availableLabels,
  onSetLeadTime,
  onRemoveLeadTime,
  onResetLeadTimes,
  holdLabels,
  onAddHoldLabel,
  onRemoveHoldLabel,
  onResetHoldLabels,
  openInDesktopApp,
  onOpenInDesktopAppChange,
  hideSubtasks,
  onHideSubtasksChange,
}) {
  const [collapsed, setCollapsed] = useState(loadCollapsed)

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed))
    } catch {
      // ignore storage failures
    }
  }, [collapsed])

  function toggleSection(id) {
    setCollapsed((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  // Close on Escape, for anyone who doesn't want to reach for the mouse.
  useEffect(() => {
    if (!open) return
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const sectionProps = { collapsed, onToggle: toggleSection }
  // Your Todoist labels not already used as a lead time or hold label —
  // offered as suggestions in both "add label" boxes.
  const labelSuggestions = availableLabels.filter((l) => {
    const key = l.toLowerCase()
    return !Object.hasOwn(leadTimes, key) && !holdLabels.includes(key)
  })

  return (
    <div className="settings-overlay" onClick={onClose}>
      <aside className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-panel-header">
          <h2>Settings</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </div>

        <datalist id="topdoist-label-suggestions">
          {labelSuggestions.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>

        <SettingsSection id="assignment" title="Shared project tasks" {...sectionProps}>
          {ASSIGNMENT_MODE_OPTIONS.map((opt) => (
            <label key={opt.value} className="radio-option">
              <input
                type="radio"
                name="assignment-mode"
                value={opt.value}
                checked={assignmentMode === opt.value}
                onChange={() => onAssignmentModeChange(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </SettingsSection>

        <SettingsSection id="project" title="Project" {...sectionProps}>
          <ProjectFilter
            projects={projects}
            isSelected={isProjectSelected}
            allSelected={allProjectsSelected}
            onToggleProject={onToggleProject}
            onToggleAll={onToggleAllProjects}
          />
        </SettingsSection>

        <SettingsSection id="subtasks" title="Subtasks" {...sectionProps}>
          <label className="checkbox-option">
            <input type="checkbox" checked={hideSubtasks} onChange={(e) => onHideSubtasksChange(e.target.checked)} />
            Hide subtasks
          </label>
          <span className="weight-hint">
            Keeps subtasks out of the ranked list and Not yet, so only top-level tasks are ranked.
            A subtask already in Up Next stays there. Tasks with open subtasks show a small
            branch icon either way.
          </span>
        </SettingsSection>

        <SettingsSection
          id="weights"
          title="Weights"
          action={<ResetButton onClick={onResetWeights} />}
          {...sectionProps}
        >
          <WeightControls
            weights={weights}
            onChange={onWeightsChange}
            defaultDurationMinutes={defaultDurationMinutes}
            onDefaultDurationChange={onDefaultDurationChange}
          />
        </SettingsSection>

        <SettingsSection
          id="leadTimes"
          title="Lead times"
          action={<ResetButton onClick={onResetLeadTimes} />}
          {...sectionProps}
        >
          <LeadTimeSettings leadTimes={leadTimes} onSet={onSetLeadTime} onRemove={onRemoveLeadTime} />
        </SettingsSection>

        <SettingsSection
          id="holdLabels"
          title="Hold labels"
          action={<ResetButton onClick={onResetHoldLabels} />}
          {...sectionProps}
        >
          <HoldLabelSettings holdLabels={holdLabels} onAdd={onAddHoldLabel} onRemove={onRemoveHoldLabel} />
        </SettingsSection>

        <SettingsSection id="links" title="Links" {...sectionProps}>
          <label className="checkbox-option">
            <input
              type="checkbox"
              checked={openInDesktopApp}
              onChange={(e) => onOpenInDesktopAppChange(e.target.checked)}
            />
            Open tasks in the Todoist desktop app
          </label>
          <span className="weight-hint">
            Uses Todoist's todoist:// links instead of the website. Only turn this on if the
            Todoist desktop app is installed on this device — otherwise clicking a task will do
            nothing. This is a per-device setting, not synced anywhere.
          </span>
        </SettingsSection>
      </aside>
    </div>
  )
}
