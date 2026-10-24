import { describe, expect, it } from 'vitest'
import { publicConfigValid } from './public-config'

const url = 'https://demonstracao.supabase.co'
const token = (role: string) => `header.${btoa(JSON.stringify({ role }))}.signature`
describe('configuração pública', () => {
  it('recusa segredos e JWT de serviço, sem devolvê-los no erro', () => {
    expect(publicConfigValid(url, 'sb_secret_segredo')).toBe(false)
    expect(publicConfigValid(url, token('service_role'))).toBe(false)
    expect(publicConfigValid(url, token('authenticated'))).toBe(false)
  })
  it('aceita somente formatos de chave pública e destino esperado', () => {
    expect(publicConfigValid(url, 'sb_publishable_exemplo')).toBe(true)
    expect(publicConfigValid(url, token('anon'))).toBe(true)
    expect(publicConfigValid('https://supabase.co.evil.invalid', token('anon'))).toBe(false)
    expect(publicConfigValid(url, 'malformada')).toBe(false)
    expect(publicConfigValid(url)).toBe(false)
  })
})
