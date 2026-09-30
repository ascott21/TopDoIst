// Also the drag handle on touch screens, where `dragProps` (dnd-kit's
// attributes and listeners) are passed in; a drag only starts after a short
// hold, so a plain tap still completes the task.
export default function CompleteCheckbox({ checked, onComplete, dragProps }) {
  return (
    <button
      type="button"
      className={`complete-checkbox${checked ? ' is-checked' : ''}`}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!checked) onComplete()
      }}
      disabled={checked}
      {...dragProps}
      role="checkbox"
      aria-checked={checked}
      aria-label={checked ? 'Completing…' : 'Mark task complete'}
    >
      {checked && (
        <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
          <path d="M2 8.5 6 12l8-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}
