import { useEffect, useState } from 'react'

// True when the device's primary pointer is touch/coarse (phones, tablets)
// rather than a mouse or trackpad. Used to decide how big a drag target to
// offer: the whole row on a precise pointer, just the handle on touch (a
// touch drag zone spanning the whole row would fight with scrolling).
export function useCoarsePointer() {
  const [isCoarse, setIsCoarse] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  )

  useEffect(() => {
    const mql = window.matchMedia('(pointer: coarse)')
    const handleChange = (e) => setIsCoarse(e.matches)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  return isCoarse
}
