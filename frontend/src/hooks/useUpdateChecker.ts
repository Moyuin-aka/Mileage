import { useState } from 'react'
import { checkForUpdates, type UpdateInfo } from '@/lib/updater'

type CheckState = 'idle' | 'checking' | 'latest' | 'update-available' | 'error'

export function useUpdateChecker() {
  const [state, setState] = useState<CheckState>('idle')
  const [info, setInfo] = useState<UpdateInfo | null>(null)

  async function check() {
    if (state === 'checking') return
    setState('checking')
    try {
      const result = await checkForUpdates()
      setInfo(result)
      setState(result.hasUpdate ? 'update-available' : 'latest')
    } catch {
      setState('error')
    }
  }

  function reset() {
    setState('idle')
    setInfo(null)
  }

  return { state, info, check, reset }
}
