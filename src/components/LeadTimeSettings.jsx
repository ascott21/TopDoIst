import { useState } from 'react'
import { LEAD_UNITS } from '../lib/leadTime'

// Which labels hold a task back until it's close enough to its due date to
// work on, and by how much (see src/lib/leadTime.js).
export default function LeadTimeSettings({
  leadTimes,
  availableLabels,
  onSet,
  onRemove,
  onReset,
  holdLabels,
  onAddHold,
  onRemoveHold,
}) {
  const [newLabel, setNewLabel] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newUnit, setNewUnit] = useState('days')
  const [newHold, setNewHold] = useState('')

  const entries = Object.entries(leadTimes).sort(([, a], [, b]) => toHours(a) - toHours(b))
  const suggestions = availableLabels.filter((l) => !Object.hasOwn(leadTimes, l.toLowerCase()))

  function handleAdd(e) {
    e.preventDefault()
    const label = newLabel.trim().toLowerCase()
    const amount = parseFloat(newAmount)
    if (!label || Number.isNaN(amount) || amount < 0) return
    onSet(label, { amount, unit: newUnit })
    setNewLabel('')
    setNewAmount('')
    setNewUnit('days')
  }

  function handleAddHold(e) {
    e.preventDefault()
    const label = newHold.trim().toLowerCase()
    if (!label) return
    onAddHold(label)
    setNewHold('')
  }

  function handleAmountChange(label, current, rawValue) {
    const amount = parseFloat(rawValue)
    if (!Number.isNaN(amount) && amount >= 0) onSet(label, { ...current, amount })
  }

  return (
    <div className="lead-time-settings">
      <div className="settings-subheader">
        <h2>Lead times</h2>
        <button type="button" className="link-button" onClick={onReset}>
          Reset to defaults
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="lead-time-empty">No lead-time labels configured.</p>
      ) : (
        <ul className="lead-time-list">
          {entries.map(([label, value]) => (
            <li key={label} className="lead-time-row">
              <span className="lead-time-name">{label}</span>
              <input
                type="number"
                min="0"
                step="1"
                value={value.amount}
                onChange={(e) => handleAmountChange(label, value, e.target.value)}
                className="lead-time-amount"
                aria-label={`Lead time for ${label}`}
              />
              <select
                value={value.unit}
                onChange={(e) => onSet(label, { ...value, unit: e.target.value })}
                aria-label={`Unit for ${label}`}
              >
                {LEAD_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <button type="button" className="link-button" onClick={() => onRemove(label)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="lead-time-add" onSubmit={handleAdd}>
        <input
          type="text"
          list="topdoist-label-suggestions"
          placeholder="Label name"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          className="lead-time-add-name"
        />
        <datalist id="topdoist-label-suggestions">
          {suggestions.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>
        <input
          type="number"
          min="0"
          step="1"
          placeholder="0"
          value={newAmount}
          onChange={(e) => setNewAmount(e.target.value)}
          className="lead-time-amount"
          aria-label="Lead time for new label"
        />
        <select value={newUnit} onChange={(e) => setNewUnit(e.target.value)} aria-label="Unit for new label">
          {LEAD_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <button type="submit">Add</button>
      </form>
      <p className="weight-hint">
        A task with one of these labels stays in "Not yet" until this long before it's due. Days open
        at midnight; hours count back from the due time (or from the start of the due day if it has
        no time). With two lead labels on one task, the longer one wins and the task gets a ⚠ flag.
      </p>

      <h3 className="hold-heading">Hold labels</h3>
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
                onClick={() => onRemoveHold(label)}
                aria-label={`Remove hold label ${label}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="lead-time-add" onSubmit={handleAddHold}>
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
        A task with one of these labels stays in "Not yet" regardless of its due date or lead time — even
        if it's overdue — until you take the label off. Up Next still overrides it.
      </p>
    </div>
  )
}

function toHours({ amount, unit }) {
  return unit === 'hours' ? amount : amount * 24
}
