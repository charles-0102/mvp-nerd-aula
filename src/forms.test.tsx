// @vitest-environment jsdom
// Contratos de interface com respostas controladas; não são testes HTTP do Supabase.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { NewRequest, RequestDetails } from './App'
import type { api } from './api'
import type { Profile, RequestRecord } from './domain'

afterEach(cleanup)
const record: RequestRecord = { id: '00000000-0000-0000-0000-000000000001', number: 'DEM-12345678', title: 'Solicitar teclado', description: 'Preciso para trabalhar.', author_id: 'ana', author_label: 'Ana (fixture)', status: 'open', priority: 'medium', version: 1, created_at: '2026-10-23T12:00:00Z' }
const admin: Profile = { id: 'rui', role: 'admin', email: 'rui@teste.invalid', display_name: 'Rui (fixture)' }
function client(): ReturnType<typeof api> {
  return {
    profile: vi.fn(), participantProfile: vi.fn(), register: vi.fn(), list: vi.fn(),
    details: vi.fn().mockResolvedValue({ request: record, comments: [] }),
    create: vi.fn(), revise: vi.fn(), comment: vi.fn(), advance: vi.fn(),
  }
}
function details(service: ReturnType<typeof api>) {
  render(<MemoryRouter initialEntries={[`/admin/demandas/${record.id}`]}><Routes><Route path="/admin/demandas/:id" element={<RequestDetails clientApi={service} profile={admin} prefix="/admin" />} /></Routes></MemoryRouter>)
}
describe('formulários preservam o trabalho quando não há confirmação', () => {
  it('exige motivo Crítico, bloqueia repetição durante envio e preserva todos os campos na falha', async () => {
    const service = client(), user = userEvent.setup()
    let reject!: (error: Error) => void
    vi.mocked(service.create).mockImplementation(() => new Promise((_resolve, fail) => { reject = fail }))
    render(<MemoryRouter><NewRequest clientApi={service} prefix="" /></MemoryRouter>)
    expect((screen.getByRole('radio', { name: /Média/ }) as HTMLInputElement).checked).toBe(true)
    await user.type(screen.getByLabelText(/^Título/), 'Solicitar teclado')
    await user.type(screen.getByLabelText(/^Descrição/), 'Preciso para trabalhar.')
    await user.click(screen.getByRole('radio', { name: /Crítica/ }))
    await user.click(screen.getByRole('button', { name: /Enviar demanda/ }))
    expect(service.create).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText(/^Justificativa/), 'Trabalho bloqueado sem alternativa.')
    await user.click(screen.getByRole('button', { name: /Enviar demanda/ }))
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true)
    expect(service.create).toHaveBeenCalledTimes(1)
    reject(new Error('Failed to fetch'))
    await screen.findByText(/Não foi possível confirmar/)
    expect((screen.getByLabelText(/^Título/) as HTMLInputElement).value).toBe('Solicitar teclado')
    expect((screen.getByLabelText(/^Descrição/) as HTMLTextAreaElement).value).toBe('Preciso para trabalhar.')
    expect((screen.getByLabelText(/^Justificativa/) as HTMLTextAreaElement).value).toBe('Trabalho bloqueado sem alternativa.')
    expect(screen.queryByText(/Demanda .* criada/)).toBeNull()
    expect((screen.getByRole('button', { name: /Enviar demanda/ }) as HTMLButtonElement).disabled).toBe(false)
  })
  it('preserva seleção e justificativa quando a revisão falha', async () => {
    const service = client(), user = userEvent.setup()
    vi.mocked(service.revise).mockRejectedValue(new Error('Failed to fetch'))
    details(service)
    await screen.findByRole('heading', { name: record.title })
    await user.selectOptions(screen.getByLabelText('Nova prioridade'), 'high')
    await user.type(screen.getByLabelText(/^Motivo da mudança/), 'Sem itens para trabalhar.')
    await user.click(screen.getByRole('button', { name: 'Confirmar prioridade' }))
    await screen.findByText(/Não foi possível confirmar/)
    await waitFor(() => expect(service.details).toHaveBeenCalledTimes(2))
    expect((screen.getByLabelText('Nova prioridade') as HTMLSelectElement).value).toBe('high')
    expect((screen.getByLabelText(/^Motivo da mudança/) as HTMLTextAreaElement).value).toBe('Sem itens para trabalhar.')
    expect(screen.queryByText('Prioridade revisada e justificativa registrada.')).toBeNull()
  })
  it('exibe o texto não enviado quando a demanda foi concluída por outra sessão', async () => {
    const service = client(), user = userEvent.setup()
    vi.mocked(service.details).mockResolvedValueOnce({ request: record, comments: [] }).mockResolvedValue({ request: { ...record, status: 'completed', version: 3 }, comments: [] })
    vi.mocked(service.comment).mockRejectedValue(new Error('REQUEST_COMPLETED'))
    details(service)
    await screen.findByRole('heading', { name: record.title })
    await user.type(screen.getByLabelText(/^Acrescentar um comentário/), 'Texto escrito antes de concluir.')
    await user.click(screen.getByRole('button', { name: 'Enviar comentário' }))
    await screen.findByText('Seu texto não foi enviado e foi preservado:')
    expect(screen.getByText('Texto escrito antes de concluir.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Enviar comentário' })).toBeNull()
    expect(screen.queryByText('Comentário enviado.')).toBeNull()
  })
})
