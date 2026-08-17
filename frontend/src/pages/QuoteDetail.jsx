import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, FileText, CheckCircle, XCircle, Send, Trash2, ArrowRight, Download, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
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

export default function QuoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/quotes/${id}`).then(r => setQuote(r.data)).finally(() => setLoading(false))
  }, [id])

  async function setStatus(status) {
    const r = await api.patch(`/quotes/${id}/status`, { status })
    setQuote(q => ({ ...q, ...r.data }))
  }

  async function convertToInvoice() {
    if (!confirm('Convertir ce devis en facture ?')) return
    const r = await api.post(`/invoices/from-quote/${id}`)
    navigate(`/factures/${r.data.id}`)
  }

  function downloadPdf() {
    const token = localStorage.getItem('crm_token')
    fetch(`/api/quotes/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `${quote.number}.pdf`
        a.click(); URL.revokeObjectURL(url)
      })
  }

  async function sendByEmail() {
    if (!confirm(`Envoyer le devis ${quote.number} par email à ${quote.contact_nom} ?`)) return
    try {
      await api.post(`/quotes/${id}/send`)
      toast.success('Devis envoyé par email')
      const r = await api.get(`/quotes/${id}`)
      setQuote(r.data)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur lors de l\'envoi')
    }
  }

  async function deleteQuote() {
    if (!confirm('Supprimer ce devis ?')) return
    await api.delete(`/quotes/${id}`)
    navigate('/devis')
  }

  if (loading) return <div className="p-6 text-gray-400">Chargement…</div>
  if (!quote)  return <div className="p-6 text-gray-400">Devis introuvable</div>

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/devis" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={18}/></Link>
        <FileText size={18} className="text-gray-400"/>
        <h1 className="text-xl font-bold text-gray-900">{quote.number}</h1>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[quote.status]}`}>
          {STATUS_LABELS[quote.status]}
        </span>
      </div>

      {/* Infos */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-400 text-xs">Client</span>
            <p className="font-medium text-gray-800 mt-0.5">{quote.contact_nom || '—'}</p>
          </div>
          <div>
            <span className="text-gray-400 text-xs">Date</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {quote.date ? new Date(quote.date).toLocaleDateString('fr') : '—'}
            </p>
          </div>
          <div>
            <span className="text-gray-400 text-xs">Validité</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {quote.validity_date ? new Date(quote.validity_date).toLocaleDateString('fr') : '—'}
            </p>
          </div>
        </div>
        {quote.notes && <p className="text-sm text-gray-500 mt-4 border-t border-gray-100 pt-3">{quote.notes}</p>}
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
            {(quote.lines || []).map(l => (
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
          <span className="text-gray-500">Total HT : <span className="font-mono text-gray-800">{(quote.total_ht || 0).toLocaleString('fr', { minimumFractionDigits: 2 })} €</span></span>
          <span className="font-semibold text-gray-900">Total TTC : <span className="font-mono">{(quote.total_ttc || 0).toLocaleString('fr', { minimumFractionDigits: 2 })} €</span></span>
        </div>
      </div>

      {/* Téléchargement / Envoi */}
      <div className="flex gap-2 justify-end mb-4">
        <button onClick={downloadPdf}
          className="flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Download size={14}/> Télécharger PDF
        </button>
        {quote.contact_nom && (
          <button onClick={sendByEmail}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            <Mail size={14}/> Envoyer par email
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {quote.status === 'brouillon' && (
          <button onClick={() => setStatus('envoye')}
            className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg font-medium transition-colors">
            <Send size={14}/> Marquer envoyé
          </button>
        )}
        {quote.status === 'envoye' && (<>
          <button onClick={() => setStatus('accepte')}
            className="flex items-center gap-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg font-medium transition-colors">
            <CheckCircle size={14}/> Accepté
          </button>
          <button onClick={() => setStatus('refuse')}
            className="flex items-center gap-1.5 text-sm bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-lg font-medium transition-colors">
            <XCircle size={14}/> Refusé
          </button>
        </>)}
        {quote.status === 'accepte' && (
          <button onClick={convertToInvoice}
            className="flex items-center gap-1.5 text-sm bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg font-medium transition-colors">
            <ArrowRight size={14}/> Convertir en facture
          </button>
        )}
        <button onClick={deleteQuote}
          className="flex items-center gap-1.5 text-sm border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 px-3 py-2 rounded-lg font-medium transition-colors ml-auto">
          <Trash2 size={14}/> Supprimer
        </button>
      </div>
    </div>
  )
}
