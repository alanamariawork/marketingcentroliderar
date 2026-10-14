import { describe, expect, it } from 'vitest'
import { CHAVE_SIMULAR_ERRO, ErroDeDados, criarRepositorioLocal } from '../data/repositorio'

class Memoria implements Storage {
  m = new Map<string, string>()
  get length() { return this.m.size }
  clear() { this.m.clear() }
  getItem(k: string) { return this.m.get(k) ?? null }
  key(i: number) { return [...this.m.keys()][i] ?? null }
  removeItem(k: string) { this.m.delete(k) }
  setItem(k: string, v: string) { this.m.set(k, v) }
}

describe('repositório local', () => {
  it('isola os registros por empresa', async () => {
    const mem = new Memoria()
    const repo = criarRepositorioLocal(() => mem, 0)
    await repo.criar('smart-games', 'contas', { nome: 'IG', plataforma: 'Instagram', perfil: '@sg' })
    expect(await repo.listar('smart-games', 'contas')).toHaveLength(1)
    expect(await repo.listar('up-machines', 'contas')).toHaveLength(0)
    expect(await repo.listar('centro-liderar', 'contas')).toHaveLength(0)
  })

  it('cria, atualiza e exclui', async () => {
    const mem = new Memoria()
    const repo = criarRepositorioLocal(() => mem, 0)
    const l = await repo.criar('up-machines', 'links', { nome: 'Pasta', tipo: 'Pasta', descricao: '', url: 'https://x.y' })
    const a = await repo.atualizar('up-machines', 'links', l.id, { nome: 'Renomeada' })
    expect(a.nome).toBe('Renomeada')
    expect(a.empresaId).toBe('up-machines')
    await repo.excluir('up-machines', 'links', l.id)
    expect(await repo.listar('up-machines', 'links')).toEqual([])
  })

  it('falha de gravação rejeita com mensagem e não altera os dados', async () => {
    const mem = new Memoria()
    const repo = criarRepositorioLocal(() => mem, 0)
    mem.setItem(CHAVE_SIMULAR_ERRO, '1')
    await expect(repo.criar('smart-games', 'contas', { nome: 'X', plataforma: 'Outro', perfil: '@x' })).rejects.toBeInstanceOf(ErroDeDados)
    expect(await repo.listar('smart-games', 'contas')).toEqual([])
  })
})
