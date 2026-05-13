const GITHUB_REPO = 'Moyuin-aka/Mileage'

export interface UpdateInfo {
  current: string
  latest: string
  hasUpdate: boolean
  releaseUrl: string
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  const current = __APP_VERSION__
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
    { headers: { Accept: 'application/vnd.github+json' } },
  )
  if (!res.ok) throw new Error(`GitHub API ${res.status}`)

  const data = await res.json() as { tag_name: string; html_url: string }
  const latest = data.tag_name.replace(/^(mileage-v|app-v|v)/, '')

  return {
    current,
    latest,
    hasUpdate: compareVersions(latest, current) > 0,
    releaseUrl: data.html_url,
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1
  }
  return 0
}
