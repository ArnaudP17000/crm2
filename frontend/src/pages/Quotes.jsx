import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, FileText, X, Trash2 } from 'lucide-react'
import api from '../api'

const STATUS_STYLES = {
  brouillon: 'bg-gray-100 text-gray-600',
  envoye:    'bg-blue-100 text-blue-600',
  accepte:   'bg-emerald-100 text-emerald-600',
  refuse:    'bg-red-100 text-red-600',
}
const STATUS_LABELS = {
  brouillon: 'Brouillon',
  envoye:    'Envoyé',
  accepte:   'Accepté',
  refuse:    'Refusé',
}

const EMPTY_LINE = { description: '', quantity: 1, unit_price: 0, vat_rate: 0 }

export default function Quotes() {
  const [quotes, setQuotes]     = useState([])
  const [contacts, setContacts] = useState([])
  const [modal, setModal]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({ contact_id: '', validity_date: '', notes: '' })
  const [lines, setLines]       = useState([{ ...EMPTY_LINE }])
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/quotes').then(r => setQuotes(r.data)).catch(() => {})
    api.get('/contacts').then(r => setContacts(r.data)).catch(() => {})
  }, [])

  function openModal() {
    setForm({ contact_id: '', validity_date: '', notes: '' })
    setLines([{ ...EMPTY_LINE }])
    setModal(true)
  }

  function setLine(i, field, val) {
    setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [field]: val } : l))
  }

  function addLine() { setLines(ls => [...ls, { ...EMPTY_LINE }]) }
  function removeLine(i) { setLines(ls => ls.filter((_, idx) => idx !== i)) }

  const totalHT  = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0)
  const totalTTC = lines.reduce((s, l) => {
    const ht = (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0)
    return s + ht * (1 + (parseFloat(l.vat_rate) || 0) / 100)
  }, 0)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        contact_id: form.contact_id ? parseInt(form.contact_id) : null,
        lines: lines.filter(l => l.description.trim()).map(l => ({
          ...l,
          quantity: parseFloat(l.quantity) || 1,
          unit_price: parseFloat(l.unit_price) || 0,
          vat_rate: parseFloat(l.vat_rate) || 0,
        })),
      }
      const r = await api.post('/quotes', payload)
      setModal(false)
      navigate(`/devis/${r.data.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          Devis <span className="text-gray-400 font-normal text-base ml-1">({quotes.length})</span>
        </h1>
        <button onClick={openModal}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Nouveau devis
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Numéro</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Client</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">HT</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">TTC</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {quotes.map(q => (
              <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link to={`/devis/${q.id}`} className="flex items-center gap-2 font-medium text-gray-900 hover:text-emerald-600">
                    <FileText size={14} className="text-gray-400" /> {q.number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{q.contact_nom || '—'}</td>
                <td className="px-4 py-3 text-gray-500">
                  {q.date ? new Date(q.date).toLocaleDateString('fr') : '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-700">
                  {(q.total_ht || 0).toLocaleString('fr', { minimumFractionDigits: 2 })} €
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                  {(q.total_ttc || 0).toLocaleString('fr', { minimumFractionDigits: 2 })} €
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[q.status] || STATUS_STYLES.brouillon}`}>
                    {STATUS_LABELS[q.status] || q.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!quotes.length && (
          <div className="text-center py-16 text-gray-400">
            <FileText size={32} className="mx-auto mb-2 opacity-30" />
            Aucun devis — créez le premier
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Nouveau devis</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Client</label>
                  <select value={form.contact_id} onChange={e => setForm(f => ({...f, contact_id: e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-700">
                    <option value="">— Aucun —</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Validité jusqu'au</label>
                  <input type="date" value={form.validity_date}
                    onChange={e => setForm(f => ({...f, validity_date: e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>

              {/* Lignes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Lignes</label>
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-1 text-xs text-gray-400 px-1">
                    <span className="col-span-5">Description</span>
                    <span className="col-span-2 text-right">Qté</span>
                    <span className="col-span-2 text-right">P.U. HT</span>
                    <span className="col-span-2 text-right">TVA %</span>
                    <span className="col-span-1"></span>
                  </div>
                  {lines.map((l, i) => (
                    <div key={i} className="grid grid-cols-12 gap-1 items-center">
                      <input value={l.description} onChange={e => setLine(i, 'description', e.target.value)}
                        placeholder="Description…"
                        className="col-span-5 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                      <input type="number" min="0" step="0.01" value={l.quantity}
                        onChange={e => setLine(i, 'quantity', e.target.value)}
                        className="col-span-2 border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                      <input type="number" min="0" step="0.01" value={l.unit_price}
                        onChange={e => setLine(i, 'unit_price', e.target.value)}
                        className="col-span-2 border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                      <input type="number" min="0" max="100" step="0.1" value={l.vat_rate}
                        onChange={e => setLine(i, 'vat_rate', e.target.value)}
                        className="col-span-2 border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                      <button type="button" onClick={() => removeLine(i)}
                        className="col-span-1 flex justify-center text-gray-300 hover:text-red-400">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addLine}
                  className="mt-2 text-xs text-emerald-600 hover:text-emerald-500 font-medium flex items-center gap-1">
                  <Plus size={12}/> Ajouter une ligne
                </button>
              </div>

              {/* Totaux */}
              <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Total HT</span>
                  <span className="font-mono">{totalHT.toLocaleString('fr', { minimumFractionDigits: 2 })} €</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1">
                  <span>Total TTC</span>
                  <span className="font-mono">{totalTTC.toLocaleString('fr', { minimumFractionDigits: 2 })} €</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold py-2 rounded-lg">
                  {saving ? 'Création…' : 'Créer le devis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
