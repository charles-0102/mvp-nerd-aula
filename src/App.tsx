import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { ArrowDown, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight, Circle, Clock3, Inbox, LayoutGrid, LoaderCircle, LockKeyhole, LogOut, MessageSquare, Plus, RefreshCw, Send, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react'
import { api, configured, forgetParticipant, getClient, participantToken } from './api'
import { errorMessage, formatDate, length, priorities, statuses, timezone, validEmail, validText, type CommentRecord, type Counts, type Priority, type Profile, type RequestRecord, type Status } from './domain'

function Brand() {
  return <span className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><span>central<span className="brand-dot">.</span></span></span>
}
function Notice({ children, success = false }: { children: ReactNode; success?: boolean }) {
  return <div className={`notice ${success ? 'success' : ''}`} role={success ? 'status' : 'alert'}>{success ? <CheckCircle2 size={18} /> : <TriangleAlert size={18} />}<span>{children}</span></div>
}
function Loading({ label = 'Carregando…' }: { label?: string }) {
  return <div className="loading" role="status"><LoaderCircle className="spin" size={22} />{label}</div>
}
function BusyText({ busy, children }: { busy: boolean; children: ReactNode }) {
  return <>{busy ? <LoaderCircle className="spin" size={17} /> : children}</>
}
function useAction() {
  const lock = useRef(false)
  const [busy, setBusy] = useState(false)
  return { busy, run: async (fn: () => Promise<void>) => {
    if (lock.current) return
    lock.current = true; setBusy(true)
    try { await fn() } finally { lock.current = false; setBusy(false) }
  } }
}
function Counter({ value, max }: { value: string; max: number }) {
  return <span className={`counter ${length(value) > max ? 'invalid' : ''}`}>{length(value)} / {max.toLocaleString('pt-BR')}</span>
}
function PriorityBadge({ value }: { value: Priority }) {
  return <span className={`priority priority-${value}`}><span aria-hidden="true">{value === 'low' ? '↓' : value === 'medium' ? '−' : value === 'high' ? '↑' : '!'}</span>{priorities[value]}</span>
}
function StatusBadge({ value }: { value: Status }) {
  return <span className={`status status-${value}`}><span className="status-dot" />{statuses[value]}</span>
}
function PriorityField({ value, onChange, disabled = false }: { value: Priority; onChange: (p: Priority) => void; disabled?: boolean }) {
  return <fieldset className="priority-field" disabled={disabled}><legend>Prioridade</legend><div className="priority-options">
    {(Object.keys(priorities) as Priority[]).map(p => <label key={p} className={value === p ? 'selected' : ''}>
      <input type="radio" name="priority" value={p} checked={value === p} onChange={() => onChange(p)} />
      <PriorityBadge value={p} />{value === p && <Check size={14} className="selected-check" />}
    </label>)}
  </div></fieldset>
}
const criticalHelp = 'Crítica indica um bloqueio que impede o trabalho e não tem alternativa temporária. Explique o impacto; o administrador avaliará a classificação.'

export default function App() {
  const { pathname } = useLocation()
  const admin = pathname === '/admin' || pathname.startsWith('/admin/')
  return <Workspace key={admin ? 'admin' : 'participant'} admin={admin} />
}

function Workspace({ admin }: { admin: boolean }) {
  const client = configured ? getClient(admin) : null
  const [session, setSession] = useState<Session | null | undefined>(client && admin ? undefined : null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [checking, setChecking] = useState(Boolean(client))
  const [authError, setAuthError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const authAction = useAction()
  const [retry, setRetry] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()
  const prefix = admin ? '/admin' : ''
  const home = `${prefix}/demandas`

  useEffect(() => {
    if (!client || !admin) return
    let active = true
    let eventReceived = false
    client.auth.getSession().then(({ data, error }) => {
      if (!active || eventReceived) return
      if (error) { setAuthError(errorMessage(error)); setChecking(false) }
      setSession(data.session)
    })
    const { data } = client.auth.onAuthStateChange((event, current) => {
      eventReceived = true
      if (!active) return
      setSession(current)
      if (event === 'SIGNED_OUT') {
        setProfile(null)
        setAuthError(admin ? 'Sua sessão foi encerrada. Entre novamente para administrar.' : 'O acesso anterior foi encerrado. Informe seu e-mail para começar um novo acesso neste navegador.')
      }
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [client, admin])

  const sessionId = session?.user.id
  useEffect(() => {
    if (session === undefined || !client) return
    let active = true
    setProfile(null)
    if (!admin) {
      setChecking(true)
      Promise.resolve().then(async () => participantToken() ? api(client).participantProfile() : null)
        .then(p => { if (active) setProfile(p) })
        .catch(e => {
          if (!active) return
          setAuthError(errorMessage(e))
          if (String(e?.message).includes('SESSION_REQUIRED')) forgetParticipant()
        }).finally(() => { if (active) setChecking(false) })
      return () => { active = false }
    }
    if (!sessionId) { setChecking(false); return }
    setChecking(true)
    api(client).profile(sessionId).then(p => {
      if (!active) return
      if (p && p.role !== (admin ? 'admin' : 'requester')) {
        setAuthError('Esta conta não possui o perfil necessário para esta área.')
      } else { setProfile(p) }
    }).catch(e => { if (active) setAuthError(errorMessage(e)) }).finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  // A atualização de token da mesma sessão não deve descartar formulários preenchidos.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, sessionId, retry, admin, session === undefined])

  async function identify(email: string, password: string) {
    if (!client) throw new Error('CONFIGURATION_REQUIRED')
    setAuthError('')
    if (admin) {
      const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      const p = await api(client).profile(data.user.id)
      if (p?.role !== 'admin') {
        await client.auth.signOut({ scope: 'local' })
        throw new Error('ACCESS_DENIED')
      }
      setProfile(p)
    } else {
      if (participantToken()) {
        const existing = await api(client).participantProfile()
        if (existing.email !== email.trim()) throw new Error('IDENTITY_ALREADY_DEFINED')
        setProfile(existing)
      } else {
        const p = await api(client).register(email)
        setProfile(p)
      }
    }
    setRetry(n => n + 1)
    navigate(home, { replace: true })
  }
  async function logout() {
    if (!client) return
    const { error } = await client.auth.signOut({ scope: 'local' })
    if (error) { setAuthError(errorMessage(error)); return }
    setProfile(null); navigate('/admin', { replace: true })
  }
  async function submitIdentity(event: FormEvent) {
    event.preventDefault(); setAuthError('')
    if (!validEmail(email)) { setAuthError('Informe um e-mail válido para continuar.'); return }
    if (admin && !password) { setAuthError('Informe sua senha.'); return }
    await authAction.run(async () => {
      try { await identify(email, password); setPassword('') }
      catch (e) { setAuthError(errorMessage(e)) }
    })
  }

  if (checking || session === undefined) return <div className="bootstrap"><Brand /><Loading label="Preparando seu espaço…" /></div>
  if (!profile || !client) return <Entry admin={admin} authError={authError} email={email} setEmail={setEmail} password={password} setPassword={setPassword} submit={submitIdentity} busy={authAction.busy} />

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Ir para o conteúdo</a>
    <header className="topbar"><div className="topbar-inner">
      <Link to={home} aria-label="Central — início"><Brand /></Link>
      <nav aria-label="Principal"><Link className="nav-active" to={home}><LayoutGrid size={16} />Demandas</Link></nav>
      <div className="user-menu"><span className="avatar">{admin ? 'A' : '@'}</span><span className="user-label"><strong>{admin ? profile.display_name : 'Meu espaço'}</strong><small>{admin ? 'Administrador' : profile.email}</small></span>
        {admin && <button className="icon-button" onClick={logout} title="Sair da conta" aria-label="Sair da conta"><LogOut size={17} /></button>}
      </div>
    </div></header>
    <main id="main-content" className="main-container">
      {authError && <Notice>{authError}</Notice>}
      <Routes>
        <Route path={prefix || '/'} element={<Navigate to={home} replace />} />
        <Route path={home} element={<RequestList clientApi={api(client)} admin={admin} prefix={prefix} />} />
        <Route path={`${prefix}/nova`} element={<NewRequest clientApi={api(client)} prefix={prefix} />} />
        <Route path={`${home}/:id`} element={<RequestDetails key={location.pathname} clientApi={api(client)} profile={profile} prefix={prefix} />} />
        <Route path="*" element={<div className="empty card"><Inbox size={34} /><h1>Página não encontrada</h1><Link className="button" to={home}>Voltar às demandas</Link></div>} />
      </Routes>
    </main>
    <footer className="app-footer"><span>Central de Demandas da Equipe</span><span>{admin ? 'Um pedido. Uma conversa. Um próximo passo.' : <>Seu histórico fica neste navegador. <Link to="/admin">Área do administrador <ArrowRight size={12} /></Link></>}</span></footer>
  </div>
}

function Entry({ admin, authError, email, setEmail, password, setPassword, submit, busy }: {
  admin: boolean; authError: string; email: string; setEmail: (value: string) => void;
  password: string; setPassword: (value: string) => void; submit: (event: FormEvent) => Promise<void>; busy: boolean;
}) {
  return <div className="entry-page">
    <header className="entry-header"><Link to="/" aria-label="Central — início"><Brand /></Link><span className="live-label"><span />DEMONSTRAÇÃO AO VIVO</span></header>
    <main className="entry-layout">
      <section className="entry-story">
        <span className="eyebrow"><span className="tiny-line" /> CENTRAL DE DEMANDAS DA EQUIPE</span>
        <h1>Seu pedido,<br />no lugar <span>certo.</span></h1>
        <p>Um espaço para solicitar o que você precisa<br className="desktop-break" /> e acompanhar cada próximo passo.</p>
        <div className="journey-preview" aria-label="Etapas do atendimento">
          <div><span className="step-icon"><Inbox size={20} /></span><strong>Solicite</strong><small>Conte o que precisa</small></div>
          <ArrowRight size={18} className="step-arrow" />
          <div><span className="step-icon"><MessageSquare size={20} /></span><strong>Acompanhe</strong><small>Converse e veja avanços</small></div>
          <ArrowRight size={18} className="step-arrow" />
          <div><span className="step-icon last"><Check size={20} /></span><strong>Resolva</strong><small>Tudo no mesmo lugar</small></div>
        </div>
        <div className="entry-note"><span className="little-orbit" aria-hidden="true">✳</span><span>Menos mensagens espalhadas.<br /><strong>Mais clareza para a equipe.</strong></span></div>
      </section>
      <section className="entry-card" aria-labelledby="entry-title">
        <div className="card-top-icon">{admin ? <ShieldCheck size={24} /> : <ArrowRight size={24} />}</div>
        <span className="eyebrow">{admin ? 'ÁREA RESTRITA' : 'VAMOS COMEÇAR'}</span>
        <h2 id="entry-title">{admin ? 'Acesso do administrador' : 'Qual é o seu e-mail?'}</h2>
        <p>{admin ? 'Entre para organizar as demandas e dar retorno à equipe.' : 'Só precisamos disso para identificar seus pedidos. Sem senha, sem complicação.'}</p>
        {!configured && <Notice>A central está sendo preparada. A conexão com o serviço de dados ainda não foi configurada.</Notice>}
        {authError && <Notice>{authError}</Notice>}
        <form onSubmit={submit} noValidate>
          <label className="field" htmlFor="entry-email">{admin ? 'E-mail de acesso' : 'Seu e-mail'}<input id="entry-email" name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} disabled={busy} required aria-invalid={Boolean(authError && !validEmail(email))} /></label>
          {admin && <label className="field" htmlFor="entry-password">Senha<input id="entry-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} disabled={busy} required /></label>}
          <button className="button full" disabled={busy || !configured}><BusyText busy={busy}>{admin ? 'Entrar como administrador' : 'Continuar'}<ArrowRight size={17} /></BusyText></button>
        </form>
        <p className="entry-privacy"><LockKeyhole size={14} />{admin ? 'Somente contas autorizadas acessam esta área.' : 'Seus pedidos ficam acessíveis neste navegador. Em outro dispositivo, você começa um novo histórico.'}</p>
        <div className="entry-switch"><Link to={admin ? '/' : '/admin'}>{admin ? 'Voltar ao acesso do solicitante' : 'Sou administrador'}<ArrowRight size={14} /></Link></div>
      </section>
    </main>
    <footer className="entry-footer"><span>Feito para simplificar o dia a dia.</span><span>Uma equipe, um lugar para acompanhar.</span></footer>
  </div>
}

type ClientApi = ReturnType<typeof api>
function RequestList({ clientApi, admin, prefix }: { clientApi: ClientApi; admin: boolean; prefix: string }) {
  const [data, setData] = useState<{ requests: RequestRecord[]; counts: Counts } | null>(null)
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true; setLoading(true); setError('')
    clientApi.list().then(result => { if (active) setData(result) }).catch(e => { if (active) setError(errorMessage(e)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  // clientApi é uma fachada sem estado; a consulta muda somente por atualização explícita.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision])
  const rows = data?.requests.filter(r => filter === 'all' || r.status === filter) ?? []
  return <>
    <div className="page-heading"><div><span className="eyebrow">{admin ? 'VISÃO DA EQUIPE' : 'SEU ESPAÇO'}</span><h1>{admin ? 'Todas as demandas' : 'Minhas demandas'}</h1><p>{admin ? 'Organize o que chegou e dê visibilidade ao próximo passo.' : 'Acompanhe seus pedidos e mantenha a conversa em dia.'}</p></div><Link className="button" to={`${prefix}/nova`}><Plus size={18} />Nova demanda</Link></div>
    <section className="stats" aria-label="Contagens de todas as demandas acessíveis">
      {(Object.keys(statuses) as Status[]).map((status, i) => <div className={`stat stat-${status}`} key={status}>
        <div><span>{statuses[status]}</span>{i === 0 ? <Circle size={18} /> : i === 1 ? <Clock3 size={18} /> : <CheckCircle2 size={18} />}</div>
        <strong>{loading || error ? '—' : data?.counts[status] ?? '—'}</strong><small>{i === 0 ? 'Aguardando o próximo passo' : i === 1 ? 'Com atendimento iniciado' : 'Atendimento finalizado'}</small>
      </div>)}
    </section>
    <p className="counts-caption">Totais de todas as demandas que você pode consultar. O filtro abaixo altera apenas a lista.</p>
    <section className="card list-card">
      <div className="list-toolbar"><div className="filters" aria-label="Filtrar demandas por situação">{(['all', ...Object.keys(statuses)] as (Status | 'all')[]).map(s => <button key={s} className={filter === s ? 'active' : ''} aria-pressed={filter === s} onClick={() => setFilter(s)}>{s === 'all' ? 'Todas' : statuses[s]}</button>)}</div><button className="button ghost compact" disabled={loading} onClick={() => setRevision(n => n + 1)}><RefreshCw size={15} className={loading ? 'spin' : ''} />Atualizar</button></div>
      {loading ? <Loading label="Buscando suas demandas…" /> : error ? <div className="panel-space"><Notice>{error}</Notice><button className="button secondary" onClick={() => setRevision(n => n + 1)}>Tentar novamente</button></div> : rows.length === 0 ? <div className="empty">
        <div className="empty-art"><Inbox size={35} strokeWidth={1.3} /><span className="empty-spark"><Plus size={14} /></span></div>
        <h2>{data?.requests.length ? 'Nada por aqui nesta situação' : admin ? 'Pronto para receber a equipe' : 'Seu próximo pedido começa aqui'}</h2>
        <p>{data?.requests.length ? 'Experimente outro filtro para encontrar suas demandas.' : admin ? 'Os pedidos enviados pelos participantes aparecerão neste espaço.' : 'Ainda não há demandas. Conte o que você precisa e acompanhe o atendimento neste espaço.'}</p>
        {data?.requests.length ? <button className="button secondary" onClick={() => setFilter('all')}>Ver todas as demandas</button> : <Link className="button secondary" to={`${prefix}/nova`}><Plus size={16} />Criar primeira demanda</Link>}
      </div> : <div className="table-wrap"><table><thead><tr><th>Demanda</th><th>Situação</th><th>Prioridade</th><th>Criada em <ArrowDown size={12} /></th><th><span className="sr-only">Abrir</span></th></tr></thead><tbody>
        {rows.map(r => <tr key={r.id}><td><Link className="request-title" to={`${prefix}/demandas/${r.id}`}><span>{r.number}</span><strong>{r.title}</strong>{admin && <small>{r.author_label}</small>}</Link></td><td><StatusBadge value={r.status} /></td><td><PriorityBadge value={r.priority} /></td><td className="date-cell">{formatDate(r.created_at)}</td><td><Link to={`${prefix}/demandas/${r.id}`} aria-label={`Abrir ${r.number}`} className="icon-button"><ChevronRight size={18} /></Link></td></tr>)}
      </tbody></table></div>}
      {!loading && !error && data && data.requests.length > 0 && <div className="list-bottom">{rows.length} {rows.length === 1 ? 'demanda' : 'demandas'} nesta visualização<span>Horários em {timezone}</span></div>}
    </section>
    <div className="help-line"><MessageSquare size={16} /><span>{admin ? 'A prioridade ajuda a organizar o atendimento. Não representa uma promessa de prazo.' : 'Uma mudança de contexto? Abra sua demanda e deixe um comentário para o administrador.'}</span></div>
  </>
}

export function NewRequest({ clientApi, prefix }: { clientApi: ClientApi; prefix: string }) {
  const [title, setTitle] = useState(''), [description, setDescription] = useState(''), [reason, setReason] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [error, setError] = useState('')
  const action = useAction(), navigate = useNavigate()
  async function submit(e: FormEvent) {
    e.preventDefault(); setError('')
    if (!validText(title, 120) || !validText(description, 2000) || (priority === 'critical' && !validText(reason, 1000))) { setError('Preencha os campos obrigatórios e respeite os limites indicados.'); return }
    await action.run(async () => {
      try { const saved = await clientApi.create(title, description, priority, reason); navigate(`${prefix}/demandas/${saved.id}`, { state: { message: `Demanda ${saved.number} criada. Seu pedido já pode ser acompanhado.` } }) }
      catch (e) { setError(errorMessage(e)) }
    })
  }
  return <div className="narrow"><Link className="back-link" to={`${prefix}/demandas`}><ArrowLeft size={16} />Voltar às demandas</Link><div className="page-heading"><div><span className="eyebrow">UM NOVO PEDIDO</span><h1>O que você precisa?</h1><p>Conte o contexto para a equipe entender como ajudar.</p></div></div>
    <form className="card form-card" onSubmit={submit} noValidate>
      <label className="field" htmlFor="title"><span>Título <Counter value={title} max={120} /></span><input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Solicitar teclado e mouse" disabled={action.busy} required aria-describedby="title-help" /><small id="title-help">Uma frase para resumir seu pedido. Até 120 caracteres.</small></label>
      <label className="field" htmlFor="description"><span>Descrição <Counter value={description} max={2000} /></span><textarea id="description" rows={5} value={description} onChange={e => setDescription(e.target.value)} placeholder="Explique o que precisa e por que isso é importante para o seu trabalho." disabled={action.busy} required aria-describedby="description-help" /><small id="description-help">Inclua o contexto necessário. Até 2.000 caracteres.</small></label>
      <PriorityField value={priority} onChange={setPriority} disabled={action.busy} />
      <p className="field-help">Indique a urgência percebida. O administrador pode revisar a prioridade com uma justificativa.</p>
      {priority === 'critical' && <div className="critical-box"><p><TriangleAlert size={17} />{criticalHelp}</p><label className="field" htmlFor="critical-reason"><span>Justificativa da prioridade Crítica <Counter value={reason} max={1000} /></span><textarea id="critical-reason" rows={3} value={reason} onChange={e => setReason(e.target.value)} disabled={action.busy} required placeholder="Qual é o bloqueio e por que não há uma alternativa temporária?" /><small>Obrigatória. De 1 a 1.000 caracteres.</small></label></div>}
      {error && <Notice>{error}</Notice>}
      <div className="form-bottom"><span><LockKeyhole size={14} />O pedido fica registrado após o envio.</span><button className="button" disabled={action.busy}><BusyText busy={action.busy}>Enviar demanda<ArrowRight size={16} /></BusyText></button></div>
    </form><p className="below-form">Depois de enviar, título e descrição ficam preservados. Para acrescentar contexto, use os comentários.</p>
  </div>
}

export function RequestDetails({ clientApi, profile, prefix }: { clientApi: ClientApi; profile: Profile; prefix: string }) {
  const { id = '' } = useParams()
  const [record, setRecord] = useState<RequestRecord | null>(null)
  const [comments, setComments] = useState<CommentRecord[]>([])
  const [loading, setLoading] = useState(true), [fetchError, setFetchError] = useState(''), [error, setError] = useState('')
  const location = useLocation()
  const [success, setSuccess] = useState<string>((location.state as { message?: string } | null)?.message ?? '')
  const [body, setBody] = useState(''), [reason, setReason] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const action = useAction()
  const mounted = useRef(true)
  const generation = useRef(0)
  const refresh = useCallback(async (showLoading = true, resetPriority = true) => {
    const requestGeneration = ++generation.current
    if (showLoading) setLoading(true)
    setFetchError('')
    try {
      const data = await clientApi.details(id)
      if (mounted.current && requestGeneration === generation.current) {
        setRecord(data.request); setComments(data.comments)
        if (resetPriority) setPriority(data.request.priority)
      }
    } catch (e) { if (mounted.current && requestGeneration === generation.current) setFetchError(errorMessage(e)) }
    finally { if (mounted.current && requestGeneration === generation.current) setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  useEffect(() => { mounted.current = true; void refresh(); return () => { mounted.current = false; generation.current++ } }, [refresh])

  async function mutate(operation: () => Promise<unknown>, message: string, clear?: () => void) {
    setError(''); setSuccess('')
    await action.run(async () => {
      try { await operation(); clear?.(); setSuccess(message); await refresh(false) }
      catch (e) {
        setError(errorMessage(e))
        const code = e && typeof e === 'object' && 'message' in e ? String(e.message) : ''
        await refresh(false, /STALE_REQUEST|REQUEST_COMPLETED|INVALID_TRANSITION/.test(code))
      }
    })
  }
  const completed = record?.status === 'completed'
  return <>
    <div className="detail-top"><Link className="back-link" to={`${prefix}/demandas`}><ArrowLeft size={16} />Voltar às demandas</Link><button className="button ghost compact" onClick={() => void refresh()} disabled={loading || action.busy}><RefreshCw size={15} />Atualizar consulta</button></div>
    {success && <Notice success>{success}</Notice>}{error && <Notice>{error}</Notice>}
    {loading ? <Loading label="Abrindo demanda…" /> : fetchError ? <div className="card panel-space"><Notice>{fetchError}</Notice><button className="button secondary" onClick={() => void refresh()}>Tentar novamente</button></div> : record && <>
      <div className="detail-heading"><div className="detail-number">{record.number}<span>•</span>Criada em {formatDate(record.created_at)}</div><h1>{record.title}</h1><div><StatusBadge value={record.status} /><PriorityBadge value={record.priority} /></div></div>
      <div className="detail-grid"><div className="detail-main">
        <section className="card description-card"><h2>Sobre o pedido</h2><p className="preserve-lines">{record.description}</p><div className="author-line"><span className="avatar small">@</span>Solicitado por <strong>{record.author_id === profile.id ? 'você' : record.author_label}</strong></div></section>
        <section className="card conversation-card"><div className="section-title"><h2><MessageSquare size={18} />Conversa e atualizações</h2><span>{comments.length}</span></div>
          {comments.length === 0 ? <div className="conversation-empty">A conversa começa aqui. Use os comentários para dar retorno ou acrescentar contexto.</div> : <ol className="timeline">{comments.map(c => <li key={c.id} className={c.kind === 'comment' ? '' : 'decision'}>
            <div className="timeline-icon">{c.kind === 'comment' ? <MessageSquare size={15} /> : <RefreshCw size={15} />}</div>
            <div className="timeline-content"><div className="comment-meta"><strong>{c.author_id === profile.id ? 'Você' : c.author_label}</strong><time dateTime={c.created_at}>{formatDate(c.created_at)}</time></div>
              {c.kind === 'priority_change' && <div className="decision-label">Prioridade revisada <PriorityBadge value={c.previous_priority!} /><ArrowRight size={13} /><PriorityBadge value={c.new_priority!} /></div>}
              {c.kind === 'critical_opening' && <div className="decision-label"><TriangleAlert size={14} />Justificativa de abertura Crítica</div>}
              <p className="preserve-lines">{c.body}</p>
            </div></li>)}</ol>}
          {completed ? <div className="read-only"><CheckCircle2 size={19} /><div><strong>Atendimento concluído</strong><p>Esta demanda está disponível para consulta. Novos comentários e alterações estão encerrados.</p></div></div> : <form className="comment-form" onSubmit={async e => { e.preventDefault(); if (!validText(body, 1000)) { setError('Escreva um comentário de 1 a 1.000 caracteres.'); return } await mutate(() => clientApi.comment(record.id, body), 'Comentário enviado.', () => setBody('')) }} noValidate>
            <label className="field" htmlFor="comment"><span>Acrescentar um comentário <Counter value={body} max={1000} /></span><textarea id="comment" rows={3} value={body} onChange={e => setBody(e.target.value)} placeholder="Escreva uma atualização ou acrescente contexto…" disabled={action.busy} required /><small>Visível ao solicitante e ao administrador. Até 1.000 caracteres.</small></label><button className="button secondary" disabled={action.busy}><BusyText busy={action.busy}><Send size={15} />Enviar comentário</BusyText></button>
          </form>}
          {completed && body && <div className="preserved-draft"><strong>Seu texto não foi enviado e foi preservado:</strong><p className="preserve-lines">{body}</p></div>}
        </section><p className="timezone-note">Horários em {timezone}.</p>
      </div><aside className="detail-aside">
        <section className="card summary-card"><span className="eyebrow">ACOMPANHAMENTO</span><h2>Passo a passo</h2><ol className="status-steps">{(Object.keys(statuses) as Status[]).map((s, i) => { const current = Object.keys(statuses).indexOf(record.status); return <li key={s} className={i <= current ? 'reached' : ''}><span>{i < current || completed ? <Check size={13} /> : i + 1}</span><div><strong>{statuses[s]}</strong><small>{i === 0 ? 'Pedido recebido' : i === 1 ? 'Equipe trabalhando no pedido' : 'Atendimento finalizado'}</small></div></li> })}</ol></section>
        {profile.role === 'admin' && !completed && <section className="card manage-card"><span className="eyebrow">ORGANIZAR ATENDIMENTO</span><h2>Próximo passo</h2><p>Situação atual: <strong>{statuses[record.status]}</strong></p><button className="button full" disabled={action.busy} onClick={() => void mutate(() => clientApi.advance(record, record.status === 'open' ? 'in_progress' : 'completed'), record.status === 'open' ? 'Atendimento iniciado.' : 'Demanda concluída.')}><BusyText busy={action.busy}>{record.status === 'open' ? <><Clock3 size={16} />Iniciar atendimento</> : <><CheckCircle2 size={16} />Concluir demanda</>}</BusyText></button>
          <form onSubmit={async e => { e.preventDefault(); if (priority !== record.priority && !validText(reason, 1000)) { setError('Justifique a mudança com um texto de 1 a 1.000 caracteres.'); return } await mutate(() => clientApi.revise(record, priority, reason), priority === record.priority ? 'A prioridade foi mantida. Nenhuma revisão foi criada.' : 'Prioridade revisada e justificativa registrada.', () => setReason('')) }} noValidate>
            <h3>Revisar prioridade</h3><p>Atual: <PriorityBadge value={record.priority} /></p><label className="field" htmlFor="review-priority">Nova prioridade<select id="review-priority" value={priority} onChange={e => setPriority(e.target.value as Priority)} disabled={action.busy}>{Object.entries(priorities).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            {priority === 'critical' && <p className="field-help">{criticalHelp}</p>}
            {priority !== record.priority && <label className="field" htmlFor="review-reason"><span>Motivo da mudança <Counter value={reason} max={1000} /></span><textarea id="review-reason" rows={3} value={reason} onChange={e => setReason(e.target.value)} disabled={action.busy} required placeholder="Explique por que a prioridade mudou." /><small>Obrigatório. Até 1.000 caracteres.</small></label>}
            {priority === record.priority && reason && <div className="preserved-draft"><strong>Motivo preservado</strong><p className="preserve-lines">{reason}</p></div>}
            <button className="button secondary full" disabled={action.busy}><BusyText busy={action.busy}>Confirmar prioridade</BusyText></button>
          </form>
        </section>}
        {completed && reason && <div className="card preserved-draft"><strong>Motivo não enviado, preservado:</strong><p className="preserve-lines">{reason}</p></div>}
        <div className="aside-note"><Sparkles size={17} /><p>Prioridade indica urgência e impacto percebidos, sem promessa de prazo.</p></div>
      </aside></div>
    </>}
  </>
}
