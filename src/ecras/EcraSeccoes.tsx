import { DndContext, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { IconePega } from '../componentes/Icones'
import { reordenarSeccoes } from '../lib/acoes'
import type { Seccao } from '../lib/tipos'
import { useSeccoes } from '../lib/usar'

export function EcraSeccoes() {
  const seccoes = useSeccoes()
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
  )

  async function aoLargar(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return
    const de = seccoes.findIndex((s) => s.id === e.active.id)
    const para = seccoes.findIndex((s) => s.id === e.over!.id)
    await reordenarSeccoes(arrayMove(seccoes, de, para).map((s) => s.id))
  }

  return (
    <>
      <h1 className="titulo-ecra">Secções</h1>
      <div className="conteudo">
        <p className="nota">Arrasta pela pega para ficarem pela ordem em que andas na loja. A lista segue esta ordem.</p>
        <div className="cartao">
          <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoLargar}>
            <SortableContext items={seccoes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {seccoes.map((s) => (
                <LinhaSeccao key={s.id} seccao={s} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </>
  )
}

function LinhaSeccao({ seccao }: { seccao: Seccao }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: seccao.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={'linha-seccao' + (isDragging ? ' a-arrastar' : '')}
    >
      <span>{seccao.nome}</span>
      <button className="pega" {...attributes} {...listeners} aria-label={`Arrastar ${seccao.nome}`}>
        <IconePega />
      </button>
    </div>
  )
}
