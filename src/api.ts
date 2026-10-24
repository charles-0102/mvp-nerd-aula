import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { CommentRecord, Counts, Priority, Profile, RequestRecord, Status } from './domain'
import { publicConfigValid } from './public-config'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
export const configured = publicConfigValid(url, key)
const clients: Partial<Record<'admin' | 'participant', SupabaseClient>> = {}
export const PREFIX = 'dinamica_nerd_aula_'
const participantKey = `${PREFIX}participant_access_v1`
export function participantToken(): string | null {
  try { return localStorage.getItem(participantKey) } catch { throw new Error('STORAGE_UNAVAILABLE') }
}
export function forgetParticipant() { localStorage.removeItem(participantKey) }
export function getClient(admin: boolean): SupabaseClient {
  if (!configured) throw new Error('CONFIGURATION_REQUIRED')
  const scope = admin ? 'admin' : 'participant'
  return clients[scope] ??= createClient(url!, key!, { auth: {
    storageKey: `${PREFIX}${scope}`, persistSession: admin, autoRefreshToken: admin, detectSessionInUrl: false,
  } })
}

export function api(client: SupabaseClient) {
  const token = () => client === clients.admin ? null : participantToken()
  async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
    const { data, error } = await client.rpc(PREFIX + name, args).abortSignal(AbortSignal.timeout(20000))
    if (error) throw error
    return data as T
  }
  return {
    async profile(authUserId: string): Promise<Profile | null> {
      const { data, error } = await client.from(PREFIX + 'profiles').select('*').eq('auth_user_id', authUserId).maybeSingle()
      if (error) throw error
      return data as Profile | null
    },
    participantProfile: () => rpc<Profile>('current_profile', { p_token: token() }),
    async register(email: string): Promise<Profile> {
      // Verificar o armazenamento antes de criar uma identidade irrecuperável.
      try { localStorage.setItem(`${participantKey}_check`, '1'); localStorage.removeItem(`${participantKey}_check`) }
      catch { throw new Error('STORAGE_UNAVAILABLE') }
      const result = await rpc<{profile: Profile; token: string}>('register_participant', { p_email: email.trim() })
      try { localStorage.setItem(participantKey, result.token) } catch { throw new Error('STORAGE_UNAVAILABLE') }
      return result.profile
    },
    async list(): Promise<{ requests: RequestRecord[]; counts: Counts }> {
      const requests: RequestRecord[] = []
      for (let offset = 0; ; offset += 500) {
        const data = await rpc<RequestRecord[]>('list_requests', { p_token: token(), p_offset: offset })
        requests.push(...data)
        if (data.length < 500) break
      }
      return { requests, counts: await rpc<Counts>('counts', { p_token: token() }) }
    },
    async details(id: string): Promise<{ request: RequestRecord; comments: CommentRecord[] }> {
      if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('NOT_FOUND_OR_DENIED')
      const request = await rpc<RequestRecord>('get_request', { p_request_id: id, p_token: token() })
      const comments: CommentRecord[] = []
      for (let offset = 0; ; offset += 500) {
        const data = await rpc<CommentRecord[]>('list_comments', { p_request_id: id, p_token: token(), p_offset: offset })
        comments.push(...data)
        if (data.length < 500) break
      }
      return { request, comments }
    },
    create: (title: string, description: string, priority: Priority, reason: string) => rpc<RequestRecord>('create_request', {
      p_title: title.trim(), p_description: description.trim(), p_priority: priority, p_reason: priority === 'critical' ? reason.trim() : null, p_token: token(),
    }),
    comment: (id: string, body: string) => rpc<CommentRecord>('add_comment', { p_request_id: id, p_body: body.trim(), p_token: token() }),
    revise: (request: RequestRecord, priority: Priority, reason: string) => rpc<RequestRecord>('revise_priority', {
      p_request_id: request.id, p_priority: priority, p_reason: reason.trim(), p_expected_version: request.version, p_expected_priority: request.priority,
    }),
    advance: (request: RequestRecord, next: Status) => rpc<RequestRecord>('advance_status', {
      p_request_id: request.id, p_next_status: next, p_expected_version: request.version,
    }),
  }
}
