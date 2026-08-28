import { useState } from 'react'

export default function TokenGate({ onSubmit, error, loading }) {
  const [value, setValue] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (value.trim()) onSubmit(value.trim())
  }

  return (
    <div className="token-gate">
      <h1>TopDoist</h1>
      <p>
        Paste your Todoist API token to load and rank your tasks. Find it under{' '}
        <strong>Todoist Settings &rarr; Integrations &rarr; Developer</strong>. It's stored only in
        this browser and used to talk directly to Todoist.
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Todoist API token"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Loading…' : 'Load tasks'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
