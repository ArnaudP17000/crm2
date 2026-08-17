import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link, NavLink } from 'react-router-dom'
import { ArrowLeft, Receipt, Send, CheckCircle, XCircle, Trash2, Plus, X, Download, ShieldCheck, AlertTriangle, Pencil, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'

const STATUS_STYLES = {
  brouillon:  'bg-gray-100 text-gray-600',
  envoye:     'bg-blue-100 text-blue-600',
  paye:       'bg-emerald-100 text-emerald-600',
  en_retard:  'bg-red-100 text-red-600',
  annule:     'bg-gray-100 text-gray-400',
}
const STATUS_LABELS = {
  brouillon: 'Brouillon', envoye: 'Envoyée', paye: 'Payée', en_retard: 'En retard', annule: 'Annulée',
}

const METHODS = ['virement', 'chèque', 'carte', 'espèces', 'autre']

export default function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [payModal, setPayModal] = useState(false)
  const [payForm, setPayForm] = useState({ amount: '', method: 'virement', reference: '', date: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get(`/invoices/${id}`).then(r => setInvoice(r.data)).finally(() => setLoading(false))
  }, [id])

  async function setStatus(status) {
    const r = await api.patch(`/invoices/${id}/status`, { status })
    setInvoice(inv => ({ ...inv, ...r.data }))
  }

  async function addPayment(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await api.post(`/invoices/${id}/payments`, {
        ...payForm,
        amount: parseFloat(payForm.amount),
      })
      setInvoice(r.data)
      setPayModal(false)
      setPayForm({ amount: '', method: 'virement', reference: '', date: '' })
    } finally {
      setSaving(false)
    }
  }

  async function deleteInvoice() {
    if (!confirm('Supprimer cette facture ?')) return
    await api.delete(`/invoices/${id}`)
    navigate('/factures')
  }

  async function sendByEmail() {
    if (!confirm(`Envoyer la facture ${invoice.number} par email à ${invoice.contact_nom} ?`)) return
    try {
      await api.post(`/invoices/${id}/send`)
      toast.success('Facture envoyée par email')
      const r = await api.get(`/invoices/${id}`)
      setInvoice(r.data)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur lors de l\'envoi')
    }
  }

  function downloadPdf() {
    const token = localStorage.getItem('crm_token')
    const a = document.createElement('a')
    a.href = `/api/invoices/${id}/pdf`
    // Axios interceptor won't fire on direct link, on passe le token en header via fetch
    fetch(`/api/invoices/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob)
        a.href = url
        a.download = `${invoice.number}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      })
  }

  if (loading) return <div className="p-6 text-gray-400">Chargement…</div>
  if (!invoice) return <div className="p-6 text-gray-400">Facture introuvable</div>

  const remainingPct = invoice.total_ttc > 0
    ? Math.min(100, Math.round(((invoice.paid || 0) / invoice.total_ttc) * 100))
    : 0

  const NATURE_LABELS = {
    prestation_services: 'Prestation de services',
    livraison_biens: 'Livraison de biens',
    mixte: 'Opération mixte',
  }
  const CONFORMITE_LABELS = {
    siren_emetteur:    'SIREN émetteur',
    siren_client:      'SIREN client',
    nature_operation:  "Nature d'opération",
    lignes:            'Lignes de facturation',
    echeance:          "Date d'échéance",
    mode_paiement:     'Mode de paiement',
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/factures" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={18}/></Link>
        <Receipt size={18} className="text-gray-400"/>
        <h1 className="text-xl font-bold text-gray-900">{invoice.number}</h1>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[invoice.status]}`}>
          {STATUS_LABELS[invoice.status]}
        </span>
        {invoice.facturx_conforme
          ? <span className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium ml-auto">
              <ShieldCheck size={12}/> Factur-X conforme
            </span>
          : <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium ml-auto">
              <AlertTriangle size={12}/> Factur-X incomplet
            </span>
        }
      </div>

      {/* Infos */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-400 text-xs">Client</span>
            <p className="font-medium text-gray-800 mt-0.5">{invoice.contact_nom || '—'}</p>
            {invoice.contact_siren
              ? <p className="text-xs text-gray-500">SIREN : {invoice.contact_siren}</p>
              : <p className="text-xs text-amber-500">SIREN client manquant</p>
            }
          </div>
          <div>
            <span className="text-gray-400 text-xs">Date</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {invoice.date ? new Date(invoice.date).toLocaleDateString('fr') : '—'}
            </p>
          </div>
          <div>
            <span className="text-gray-400 text-xs">Échéance</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('fr') : '—'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm mt-3 pt-3 border-t border-gray-100">
          <div>
            <span className="text-gray-400 text-xs">Nature de l'opération</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {NATURE_LABELS[invoice.nature_operation] || invoice.nature_operation}
            </p>
          </div>
          <div>
            <span className="text-gray-400 text-xs">Mode de paiement</span>
            <p className="font-medium text-gray-800 mt-0.5 capitalize">{invoice.mode_paiement || 'virement'}</p>
          </div>
          <div>
            <span className="text-gray-400 text-xs">TVA</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {invoice.franchise_tva ? 'Franchise art. 293 B CGI' : 'Assujetti TVA'}
            </p>
          </div>
        </div>
        {invoice.quote_id && (
          <p className="text-xs text-gray-400 mt-3">
            Depuis <Link to={`/devis/${invoice.quote_id}`} className="text-emerald-600 hover:underline">devis #{invoice.quote_id}</Link>
          </p>
        )}
        {invoice.notes && <p className="text-sm text-gray-500 mt-3 border-t border-gray-100 pt-3">{invoice.notes}</p>}
      </div>

      {/* Lignes */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Description</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Qté</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">P.U. HT</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">TVA</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Total TTC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(invoice.lines || []).map(l => (
              <tr key={l.id}>
                <td className="px-4 py-3 text-gray-800">{l.description}</td>
                <td className="px-4 py-3 text-right text-gray-600 font-mono">{l.quantity}</td>
                <td className="px-4 py-3 text-right text-gray-600 font-mono">
                  {(l.unit_price || 0).toLocaleString('fr', { minimumFractionDigits: 2 })} €
                </td>
                <td className="px-4 py-3 text-right text-gray-500">{l.vat_rate}%</td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                  {(l.total || 0).toLocaleString('fr', { minimumFractionDigits: 2 })} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-8 text-sm">
          <span className="text-gray-500">Total HT : <span className="font-mono text-gray-800">{(invoice.total_ht || 0).toLocaleString('fr', { minimumFractionDigits: 2 })} €</span></span>
          <span className="font-semibold text-gray-900">Total TTC : <span className="font-mono">{(invoice.total_ttc || 0).toLocaleString('fr', { minimumFractionDigits: 2 })} €</span></span>
        </div>
      </div>

      {/* Checklist Factur-X */}
      {invoice.conformite && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
          <h3 className="font-medium text-gray-800 text-sm mb-3 flex items-center gap-2">
            <ShieldCheck size={15} className="text-emerald-600"/> Conformité Factur-X (obligatoire sept. 2027)
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(invoice.conformite).map(([key, ok]) => (
              <div key={key} className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded ${ok ? 'text-emerald-700' : 'text-amber-700 bg-amber-50'}`}>
                {ok
                  ? <CheckCircle size={12} className="text-emerald-500 shrink-0"/>
                  : <AlertTriangle size={12} className="text-amber-500 shrink-0"/>
                }
                {CONFORMITE_LABELS[key]}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paiements */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-800 text-sm">Paiements</h3>
          {invoice.status !== 'paye' && invoice.status !== 'annule' && (
            <button onClick={() => { setPayForm(f => ({...f, amount: invoice.remaining || ''})); setPayModal(true) }}
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-500 font-medium">
              <Plus size={12}/> Ajouter
            </button>
          )}
        </div>
        {/* Barre de progression */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Encaissé : {(invoice.paid || 0).toLocaleString('fr', { minimumFractionDigits: 2 })} €</span>
            <span>Restant : {(invoice.remaining || 0).toLocaleString('fr', { minimumFractionDigits: 2 })} €</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${remainingPct}%` }} />
          </div>
        </div>
        {(invoice.payments || []).length > 0 ? (
          <div className="space-y-2">
            {invoice.payments.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-500"/>
                  <span className="text-gray-600">{p.method}</span>
                  {p.reference && <span className="text-gray-400 text-xs">réf. {p.reference}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs">{p.date ? new Date(p.date).toLocaleDateString('fr') : ''}</span>
                  <span className="font-mono font-semibold text-emerald-600">+{p.amount.toLocaleString('fr', { minimumFractionDigits: 2 })} €</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">Aucun paiement enregistré</p>
        )}
      </div>

      {/* Actions */}
      {/* Téléchargement Factur-X */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-4 mb-4 flex items-center justify-between">
        <div>
          <p className="text-white text-sm font-semibold flex items-center gap-2">
            <ShieldCheck size={15} className="text-emerald-400"/> Factur-X
          </p>
          <p className="text-slate-300 text-xs mt-0.5">PDF/A-3 avec XML CII embarqué — format légal France 2027</p>
        </div>
        <div className="flex gap-2">
          {invoice.contact_nom && (
            <button onClick={sendByEmail}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              <Mail size={14}/> Envoyer par email
            </button>
          )}
          <button onClick={downloadPdf}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            <Download size={14}/> Télécharger
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {invoice.status === 'brouillon' && (
          <button onClick={() => setStatus('envoye')}
            className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg font-medium transition-colors">
            <Send size={14}/> Marquer envoyée
          </button>
        )}
        {invoice.status === 'envoye' && (
          <button onClick={() => setStatus('en_retard')}
            className="flex items-center gap-1.5 text-sm bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-lg font-medium transition-colors">
            <XCircle size={14}/> Marquer en retard
          </button>
        )}
        {invoice.status !== 'annule' && invoice.status !== 'paye' && (
          <button onClick={() => setStatus('annule')}
            className="flex items-center gap-1.5 text-sm border border-gray-200 text-gray-500 hover:bg-gray-50 px-3 py-2 rounded-lg font-medium transition-colors">
            Annuler
          </button>
        )}
        <Link to={`/factures/${id}/edit`}
          className="flex items-center gap-1.5 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg font-medium transition-colors">
          <Pencil size={14}/> Modifier
        </Link>
        <button onClick={deleteInvoice}
          className="flex items-center gap-1.5 text-sm border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 px-3 py-2 rounded-lg font-medium transition-colors ml-auto">
          <Trash2 size={14}/> Supprimer
        </button>
      </div>

      {/* Modal paiement */}
      {payModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">Enregistrer un paiement</h2>
              <button onClick={() => setPayModal(false)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
            </div>
            <form onSubmit={addPayment} className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Montant (€)</label>
                <input required type="number" min="0.01" step="0.01" value={payForm.amount}
                  onChange={e => setPayForm(f => ({...f, amount: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Moyen</label>
                  <select value={payForm.method} onChange={e => setPayForm(f => ({...f, method: e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-700">
                    {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                  <input type="date" value={payForm.date} onChange={e => setPayForm(f => ({...f, date: e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Référence</label>
                <input value={payForm.reference} onChange={e => setPayForm(f => ({...f, reference: e.target.value}))}
                  placeholder="N° virement, chèque…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setPayModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold py-2 rounded-lg">
                  {saving ? 'Enregistrement…' : 'Valider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
