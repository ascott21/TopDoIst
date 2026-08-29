// Doubles as the drag handle: dnd-kit's activation constraints (a small
// move for mouse, a brief hold for touch) mean a plain tap still reaches
// onComplete instead of starting a drag, while a deliberate press-and-move
// picks the task up. Spread `dragProps` (dnd-kit's attributes + listeners)
// here, not on the row/item itself, so dragging can only start from this
// control — never from a stray touch on the task title or a page scroll.
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
