const configuredApiUrl = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')

export const apiUrl = configuredApiUrl.endsWith('/api')
  ? configuredApiUrl.slice(0, -4)
  : configuredApiUrl
