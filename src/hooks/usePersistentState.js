import { useEffect, useState } from 'react'

// useState that's saved to localStorage under `key` and restored on load,
// falling back to `defaultValue` when nothing usable is saved. Pass
// `serialize`/`deserialize` defined outside the component, so they stay
// the same function between renders.
export function usePersistentState(key, defaultValue, { serialize = JSON.stringify, deserialize = JSON.parse } = {}) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw == null ? defaultValue : deserialize(raw)
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, serialize(value))
    } catch {
      // Storage can be unavailable (private browsing); the value just won't persist.
    }
  }, [key, value, serialize])

  return [value, setValue]
}
