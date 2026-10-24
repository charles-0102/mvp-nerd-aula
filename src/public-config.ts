// Esta checagem evita empacotar acidentalmente uma chave privilegiada.
// A autenticidade da chave e das sessões continua sendo validada pelo Supabase.
export function publicConfigValid(url?: string, key?: string): boolean {
  if (!url || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url) || !key) return false
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true
  try {
    const segments = key.split('.')
    if (segments.length !== 3) return false
    const payload = JSON.parse(atob(segments[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.role === 'anon'
  } catch { return false }
}
