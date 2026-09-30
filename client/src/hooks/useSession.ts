import { useEffect, useSyncExternalStore } from 'react'
import { initializeSession, sessionSnapshot, subscribeSession } from '../lib/api'
export function useSession() {
  const session = useSyncExternalStore(subscribeSession, sessionSnapshot)
  useEffect(initializeSession, [])
  return session
}
