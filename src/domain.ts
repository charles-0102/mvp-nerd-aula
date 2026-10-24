export const priorities = { low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica' } as const
export const statuses = { open: 'Aberta', in_progress: 'Em andamento', completed: 'Concluída' } as const
export type Priority = keyof typeof priorities
export type Status = keyof typeof statuses
export type Profile = { id: string; role: 'requester' | 'admin'; email: string; display_name: string }
export type RequestRecord = {
  id: string; number: string; title: string; description: string;
  author_id: string; author_label: string; status: Status; priority: Priority;
  version: number; created_at: string;
}
export type CommentRecord = {
  id: string; request_id: string; author_id: string; author_label: string; body: string;
  kind: 'comment' | 'critical_opening' | 'priority_change';
  previous_priority: Priority | null; new_priority: Priority | null; created_at: string;
}
export type Counts = Record<Status, number>
export const length = (text: string) => Array.from(text.trim()).length
export const validText = (text: string, maximum: number) => length(text) >= 1 && length(text) <= maximum
export const validEmail = (text: string) => text.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(text.trim())
export function errorMessage(error: unknown): string {
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : String(error)
  const mappings: [string, string][] = [
    ['STORAGE_UNAVAILABLE', 'Este navegador não permite guardar seu acesso. Habilite o armazenamento local antes de continuar.'],
    ['timeout', 'O serviço demorou para responder. Seus campos foram mantidos. Atualize a consulta antes de repetir o envio.'],
    ['aborted', 'Não foi possível confirmar a operação. Seus campos foram mantidos. Atualize a consulta antes de repetir o envio.'],
    ['STALE_REQUEST', 'Esta demanda mudou enquanto você estava aqui. Atualize a consulta e reavalie a situação e a prioridade antes de tentar novamente.'],
    ['REQUEST_COMPLETED', 'Esta demanda já foi concluída. Ela continua disponível para consulta, mas não aceita novas alterações ou comentários.'],
    ['INVALID_TRANSITION', 'Esta mudança de situação não é permitida. Atualize a consulta e confira a próxima etapa.'],
    ['NOT_FOUND_OR_DENIED', 'Demanda não encontrada ou acesso não permitido.'],
    ['ACCESS_DENIED', 'Seu acesso não permite esta ação.'],
    ['SESSION_REQUIRED', 'Seu acesso foi encerrado. Volte à entrada para continuar.'],
    ['PARTICIPANT_SESSION_REQUIRED', 'Não foi possível identificar seu acesso. Volte à entrada e tente novamente.'],
    ['IDENTITY_ALREADY_DEFINED', 'Este navegador já está identificado com outro e-mail. Atualize para continuar no acesso existente.'],
    ['INVALID_TEXT', 'Confira os campos: preencha um texto e respeite o limite de caracteres.'],
    ['INVALID_PRIORITY', 'Escolha uma das quatro prioridades disponíveis.'],
    ['INVALID_EMAIL', 'Informe um e-mail válido.'],
    ['Invalid login credentials', 'E-mail ou senha incorretos. Confira os dados e tente novamente.'],
    ['Anonymous sign-ins are disabled', 'A entrada de participantes ainda não está habilitada. Avise o instrutor.'],
    ['rate limit', 'Muitas tentativas em pouco tempo. Aguarde um momento antes de tentar novamente.'],
    ['Failed to fetch', 'Não foi possível confirmar a operação. Confira sua conexão e atualize a consulta antes de tentar novamente.'],
    ['fetch failed', 'Não foi possível confirmar a operação. Confira sua conexão e atualize a consulta antes de tentar novamente.'],
    ['CONFIGURATION_REQUIRED', 'A central ainda não está conectada. Avise o instrutor para concluir a preparação.'],
  ]
  for (const [key, value] of mappings) if (message.toLowerCase().includes(key.toLowerCase())) return value
  return 'Não foi possível concluir a operação. Seus campos foram mantidos. Atualize a consulta antes de tentar novamente.'
}
export const formatDate = (iso: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
export const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
