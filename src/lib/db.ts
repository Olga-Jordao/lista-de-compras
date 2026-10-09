import Dexie, { type EntityTable } from 'dexie'
import type { Artigo, Compra, Lista, NomeTabela, Produto, Seccao } from './tipos'

// Base de dados no próprio aparelho (IndexedDB). É aqui que a aplicação lê e
// escreve sempre; o Supabase é só a cópia que mantém os aparelhos iguais.
export class BaseDados extends Dexie {
  seccoes!: EntityTable<Seccao, 'id'>
  produtos!: EntityTable<Produto, 'id'>
  listas!: EntityTable<Lista, 'id'>
  artigos!: EntityTable<Artigo, 'id'>
  compras!: EntityTable<Compra, 'id'>
  meta!: EntityTable<{ chave: string; valor: unknown }, 'chave'>

  constructor(nome = 'lista-de-compras') {
    super(nome)
    this.version(1).stores({
      seccoes: 'id, sujo',
      produtos: 'id, sujo',
      listas: 'id, sujo',
      artigos: 'id, listaId, produtoId, sujo',
      compras: 'id, listaId, data, sujo',
      meta: 'chave',
    })
  }

  tabela(nome: NomeTabela) {
    return this.table(nome)
  }
}

export const db = new BaseDados()
