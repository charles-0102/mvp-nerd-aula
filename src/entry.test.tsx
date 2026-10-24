// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

const fixture = vi.hoisted(() => ({
  service: { participantProfile: vi.fn(), register: vi.fn().mockRejectedValue(new Error('Failed to fetch')) },
  client: { auth: { signInAnonymously: vi.fn() } },
}))
vi.mock('./api', () => ({ configured: true, getClient: () => fixture.client, api: () => fixture.service, participantToken: () => null, forgetParticipant: vi.fn() }))
afterEach(cleanup)
it('mantém o e-mail na falha de cadastro sem criar sessão no Auth compartilhado', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter><App /></MemoryRouter>)
  await screen.findByLabelText('Seu e-mail')
  await user.type(screen.getByLabelText('Seu e-mail'), 'ana@teste.invalid')
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await screen.findByText(/Não foi possível confirmar/)
  expect((screen.getByLabelText('Seu e-mail') as HTMLInputElement).value).toBe('ana@teste.invalid')
  expect((screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement).disabled).toBe(false)
  expect(fixture.service.register).toHaveBeenCalledWith('ana@teste.invalid')
  expect(fixture.client.auth.signInAnonymously).not.toHaveBeenCalled()
  expect(screen.queryByRole('heading', { name: 'Minhas demandas' })).toBeNull()
})
