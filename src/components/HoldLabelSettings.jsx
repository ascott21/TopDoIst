import { useState } from 'react'

// Labels (e.g. "waiting") that keep a task in "Not yet" regardless of its
// dates, until the label comes off (see src/lib/leadTime.js).
export default function HoldLabelSettings({ holdLabels, onAdd, onRemove }) {
  const [newHold, setNewHold] = useState('')

  function handleAdd(e) {
    e.preventDefault()
    const label = newHold.trim().toLowerCase()
    if (!label) return
    onAdd(label)
    setNewHold('')
  }

  return (
    <div className="hold-label-settings">
      {holdLabels.length === 0 ? (
        <p className="lead-time-empty">No hold labels configured.</p>
      ) : (
        <ul className="hold-list">
          {holdLabels.map((label) => (
            <li key={label} className="hold-chip">
              {label}
              <button
                type="button"
                className="hold-remove"
                onClick={() => onRemove(label)}
                aria-label={`Remove hold label ${label}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {/* Label suggestions come from the datalist in SettingsPanel. */}
      <form className="lead-time-add" onSubmit={handleAdd}>
        <input
          type="text"
          list="topdoist-label-suggestions"
          placeholder="Label name"
          value={newHold}
          onChange={(e) => setNewHold(e.target.value)}
          className="lead-time-add-name"
        />
        <button type="submit">Add</button>
      </form>
      <p className="weight-hint">
        A task with one of these labels stays in "Not yet" regardless of its due date or lead time — even if it's
        overdue — until you take the label off. Up Next still overrides it.
      </p>
    </div>
  )
}
