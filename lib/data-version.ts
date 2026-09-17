// Intentional one-time clean start requested September 18, 2026.
export const DATA_VERSION = 'fresh-20260918'

export function resetLegacyBrowserData(storage: Storage) {
  if (storage.getItem('cjc.data-version') === DATA_VERSION) return
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
  for (const key of keys) if (key?.startsWith('cjc.')) storage.removeItem(key)
  storage.setItem('cjc.data-version', DATA_VERSION)
}
