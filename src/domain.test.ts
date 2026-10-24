import { describe, expect, it } from 'vitest'
import { errorMessage, validEmail, validText, length } from './domain'

describe('entradas de texto da demonstração', () => {
  it('recusa texto em branco e preserva limites após remover espaços externos', () => {
    expect(validText(' \n\t ', 120)).toBe(false)
    expect(validText(' ' + 'a'.repeat(120) + ' ', 120)).toBe(true)
    expect(validText('a'.repeat(121), 120)).toBe(false)
    expect(validText('a'.repeat(2001), 2000)).toBe(false)
    expect(validText('a'.repeat(1001), 1000)).toBe(false)
  })
  it('conta caracteres Unicode, sem contar duas vezes um emoji', () => {
    expect(length(' 🧑 '.trim())).toBe(1)
    expect(validText('🧑'.repeat(120), 120)).toBe(true)
  })
  it('valida o formato do e-mail sem afirmar titularidade', () => {
    expect(validEmail(' pessoa@exemplo.com ')).toBe(true)
    for (const value of ['', '   ', 'pessoa', 'pessoa@', 'a b@teste.com', 'a@@b.com']) expect(validEmail(value)).toBe(false)
  })
})
describe('erros seguros e acionáveis', () => {
  it('explica contexto alterado e não afirma sucesso', () => {
    expect(errorMessage({ message: 'STALE_REQUEST' })).toContain('reaval')
    expect(errorMessage({ message: 'REQUEST_COMPLETED' })).toContain('concluída')
    expect(errorMessage({ message: 'Failed to fetch' })).toContain('Não foi possível confirmar')
  })
  it('não expõe mensagens internas desconhecidas', () => {
    const text = errorMessage({ message: 'detalhes privados do banco' })
    expect(text).not.toContain('detalhes privados')
    expect(text).toContain('campos foram mantidos')
  })
})
