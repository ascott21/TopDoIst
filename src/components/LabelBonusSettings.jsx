import { useState } from 'react'

// Lets the user decide which labels bump a task's score, and by how much.
// Points are added directly to the final score (see src/lib/scoring.js) —
// a positive number pushes matching tasks up, a negative one pushes them
// down.
export default function LabelBonusSettings({ labelBonuses, availableLabels, onSetBonus, onRemoveBonus, onReset }) {
  const [newLabel, setNewLabel] = useState('')
  const [newPoints, setNewPoints] = useState('')

  const entries = Object.entries(labelBonuses)
  // Suggest labels that don't already have a bonus configured, so the
  // autocomplete list doesn't clutter up with ones already in the list above.
  const suggestions = availableLabels.filter((l) => !(l.toLowerCase() in labelBonuses))

  function handleAdd(e) {
    e.preventDefault()
    const label = newLabel.trim().toLowerCase()
    const points = parseFloat(newPoints)
    if (!label || Number.isNaN(points)) return
    onSetBonus(label, points)
    setNewLabel('')
    setNewPoints('')
  }

  function handlePointsChange(label, rawValue) {
    const points = parseFloat(rawValue)
    if (!Number.isNaN(points)) onSetBonus(label, points)
  }

  return (
    <div className="label-bonus-settings">
      <div className="settings-subheader">
        <h2>Label bonuses</h2>
        <button type="button" className="link-button" onClick={onReset}>
          Reset to defaults
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="label-bonus-empty">No label bonuses configured.</p>
      ) : (
        <ul className="label-bonus-list">
          {entries.map(([label, points]) => (
            <li key={label} className="label-bonus-row">
              <span className="label-bonus-name">{label}</span>
              <input
                type="number"
                step="1"
                value={points}
                onChange={(e) => handlePointsChange(label, e.target.value)}
                className="label-bonus-points"
                aria-label={`Points for ${label}`}
              />
              <button type="button" className="link-button" onClick={() => onRemoveBonus(label)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="label-bonus-add" onSubmit={handleAdd}>
        <input
          type="text"
          list="topdoist-label-suggestions"
          placeholder="Label name"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          className="label-bonus-add-name"
        />
        <datalist id="topdoist-label-suggestions">
          {suggestions.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>
        <input
          type="number"
          step="1"
          placeholder="Points"
          value={newPoints}
          onChange={(e) => setNewPoints(e.target.value)}
          className="label-bonus-points"
          aria-label="Points for new label"
        />
        <button type="submit">Add</button>
      </form>
      <p className="weight-hint">
        Points are added straight to a task's score. Use a negative number to push tasks with that
        label down instead of up.
      </p>
    </div>
  )
}
