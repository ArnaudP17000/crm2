import { useEffect, useState } from 'react'
import { Plus, Euro, X } from 'lucide-react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDroppable, useDraggable, closestCenter,
} from '@dnd-kit/core'
import api from '../api'

const STAGES = [
  { key: 'nouveau',      label: 'Nouveau contact',      color: 'bg-gray-100 text-gray-600',     border: 'border-gray-200' },
  { key: 'qualifie',    label: 'Qualifié',              color: 'bg-blue-100 text-blue-600',     border: 'border-blue-200' },
  { key: 'proposition', label: 'Proposition envoyée',   color: 'bg-purple-100 text-purple-600', border: 'border-purple-200' },
  { key: 'negociation', label: 'Négociation',           color: 'bg-amber-100 text-amber-600',   border: 'border-amber-200' },
  { key: 'gagne',       label: 'Gagné',                 color: 'bg-emerald-100 text-emerald-600', border: 'border-emerald-200' },
  { key: 'perdu',       label: 'Perdu',                 color: 'bg-red-100 text-red-600',       border: 'border-red-200' },
]

const EMPTY = { nom: '', contact_id: '', stage: 'nouveau', amount: '', probability: 20, notes: '' }

/* ── Carte draggable ── */
function OppCard({ opp, isDragging }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: opp.id })
  const style = transform
    ? { transform: `translate(${transform.x}px,${transform.y}px)`, opacity: isDragging ? 0.4 : 1 }
    : {}
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none">
      <div className="font-medium text-gray-800 text-sm">{opp.nom}</div>
      {opp.contact_nom && <div className="text-xs text-gray-500 mt-1">{opp.contact_nom}</div>}
      {opp.amount > 0 && (
        <div className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-0.5">
          <Euro size={10}/>{opp.amount.toLocaleString('fr')}
        </div>
      )}
      {opp.probability != null && (
        <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${opp.probability}%` }} />
        </div>
      )}
    </div>
  )
}

/* ── Colonne droppable ── */
function Column({ stage, opps, activeId }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key })
  const total = opps.reduce((s, o) => s + (o.amount || 0), 0)
  return (
    <div className="flex-shrink-0 w-60">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${stage.color}`}>{stage.label}</span>
        <span className="text-xs text-gray-400 font-medium">{opps.length}</span>
      </div>
      {total > 0 && (
        <div className="text-xs text-gray-400 mb-2 flex items-center gap-0.5">
          <Euro size={10}/>{total.toLocaleString('fr')} €
        </div>
      )}
      <div ref={setNodeRef}
        className={`space-y-2 min-h-24 rounded-lg p-1 transition-colors ${isOver ? `bg-emerald-50 border-2 border-dashed ${stage.border}` : ''}`}>
        {opps.map(opp => (
          <OppCard key={opp.id} opp={opp} isDragging={activeId === opp.id} />
        ))}
        {!opps.length && !isOver && (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-xs text-gray-300">
            Déposer ici
          </div>
        )}
      </div>
    </div>
  )
}

export default function Pipeline() {
  const [opps, setOpps]         = useState([])
  const [contacts, setContacts] = useState([])
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    api.get('/opportunities').then(r => setOpps(r.data)).catch(() => {})
    api.get('/contacts').then(r => setContacts(r.data)).catch(() => {})
  }, [])

  const byStage = stage => opps.filter(o => o.stage === stage)
  const activeOpp = opps.find(o => o.id === activeId)

  function onDragStart({ active }) { setActiveId(active.id) }

  async function onDragEnd({ active, over }) {
    setActiveId(null)
    if (!over || active.id === over.id) return
    const targetStage = STAGES.find(s => s.key === over.id)
    if (!targetStage) return
    const opp = opps.find(o => o.id === active.id)
    if (!opp || opp.stage === targetStage.key) return
    setOpps(prev => prev.map(o => o.id === active.id ? { ...o, stage: targetStage.key } : o))
    try {
      await api.patch(`/opportunities/${active.id}`, { stage: targetStage.key })
    } catch {
      setOpps(prev => prev.map(o => o.id === active.id ? { ...o, stage: opp.stage } : o))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        contact_id: form.contact_id ? parseInt(form.contact_id) : null,
        amount: parseFloat(form.amount) || 0,
        probability: parseInt(form.probability) || 20,
      }
      const r = await api.post('/opportunities', payload)
      setOpps(prev => [r.data, ...prev])
      setModal(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Pipeline commercial</h1>
        <button onClick={() => { setForm(EMPTY); setModal(true) }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Nouvelle opportunité
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter}
        onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => (
            <Column key={stage.key} stage={stage} opps={byStage(stage.key)} activeId={activeId} />
          ))}
        </div>
        <DragOverlay>
          {activeOpp && (
            <div className="bg-white rounded-lg p-3 shadow-xl border border-emerald-200 w-56 rotate-2 cursor-grabbing">
              <div className="font-medium text-gray-800 text-sm">{activeOpp.nom}</div>
              {activeOpp.contact_nom && <div className="text-xs text-gray-500 mt-1">{activeOpp.contact_nom}</div>}
              {activeOpp.amount > 0 && (
                <div className="text-xs font-semibold text-emerald-600 mt-2">{activeOpp.amount.toLocaleString('fr')} €</div>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Modal nouvelle opportunité */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Nouvelle opportunité</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nom de l'opportunité *</label>
                <input required value={form.nom} onChange={e => setForm(f => ({...f, nom: e.target.value}))}
                  placeholder="Ex : Partenariat premium Hossegor"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Contact</label>
                <select value={form.contact_id} onChange={e => setForm(f => ({...f, contact_id: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-700">
                  <option value="">— Aucun —</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.nom}{c.ville ? ` (${c.ville})` : ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Étape</label>
                  <select value={form.stage} onChange={e => setForm(f => ({...f, stage: e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-700">
                    {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Montant (€)</label>
                  <input type="number" min="0" step="0.01" value={form.amount}
                    onChange={e => setForm(f => ({...f, amount: e.target.value}))}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Probabilité : {form.probability}%</label>
                <input type="range" min="0" max="100" step="5" value={form.probability}
                  onChange={e => setForm(f => ({...f, probability: e.target.value}))}
                  className="w-full accent-emerald-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold py-2 rounded-lg">
                  {saving ? 'Enregistrement…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
