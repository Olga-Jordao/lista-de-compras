import { useLiveQuery } from 'dexie-react-hooks'
import { useSyncExternalStore } from 'react'
import { db } from './db'
import { estadoSync, ouvirSync } from './sync'
import type { Artigo, Lista, Produto, Seccao } from './tipos'

// Leituras que se atualizam sozinhas quando os dados mudam (aqui ou vindos do
// outro aparelho).

const porOrdem = <T extends { ordem: number; nome?: string }>(a: T, b: T) =>
  a.ordem - b.ordem || (a.nome ?? '').localeCompare(b.nome ?? '', 'pt')

export function useSeccoes(): Seccao[] {
  return useLiveQuery(async () => (await db.seccoes.toArray()).filter((s) => !s.apagado).sort(porOrdem), [], [])
}

export function useListas(): Lista[] {
  return useLiveQuery(async () => (await db.listas.toArray()).filter((l) => !l.apagado).sort(porOrdem), [], [])
}

export function useProdutos(): Produto[] {
  return useLiveQuery(
    async () =>
      (await db.produtos.toArray()).filter((p) => !p.apagado).sort((a, b) => a.nome.localeCompare(b.nome, 'pt')),
    [],
    [],
  )
}

export function useArtigos(listaId: string | null): Artigo[] {
  return useLiveQuery(
    async () =>
      listaId
        ? (await db.artigos.where('listaId').equals(listaId).toArray()).filter((a) => !a.apagado).sort(porOrdem)
        : [],
    [listaId],
    [],
  )
}

export function useNumeroCompras(): number {
  return useLiveQuery(async () => (await db.compras.toArray()).filter((c) => !c.apagado).length, [], 0)
}

export function useEstadoSync() {
  return useSyncExternalStore(ouvirSync, estadoSync)
}

/** Para procurar sem ligar a acentos nem maiúsculas: "laticínios" = "laticinios". */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}
