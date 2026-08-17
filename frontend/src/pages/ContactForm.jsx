import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import api from '../api'

const TYPES = ['École de surf', 'École Kitesurf', 'Surf Shop', 'École & Shop', 'Autre']
const STATUTS = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'qualifie', label: 'Qualifié' },
  { value: 'client',   label: 'Client' },
  { value: 'inactif',  label: 'Inactif' },
]

const EMPTY = {
  nom: '', type: '', email: '', telephone: '', whatsapp: '',
  site_web: '', instagram: '', adresse: '', code_postal: '',
  ville: '', region: '', siren: '', statut: 'prospect', notes: '',
}

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

function Input({ value, onChange, ...props }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      {...props} />
  )
}

export default function ContactForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = id && id !== 'new'

  const [form, setForm]     = useState(EMPTY)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    if (!isEdit) return
    api.get(`/contacts/${id}`)
      .then(r => setForm({ ...EMPTY, ...r.data }))
      .finally(() => setLoading(false))
  }, [id])

  function set(field) {
    return v => setForm(f => ({ ...f, [field]: v }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nom.trim()) { setError('Le nom est obligatoire'); return }
    setSaving(true); setError('')
    try {
      if (isEdit) {
        await api.put(`/contacts/${id}`, form)
        navigate(`/contacts/${id}`)
      } else {
        const r = await api.post('/contacts', form)
        navigate(`/contacts/${r.data.id}`)
      }
    } catch {
      setError('Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer ce contact définitivement ?')) return
    await api.delete(`/contacts/${id}`)
    navigate('/contacts')
  }

  if (loading) return <div className="p-6 text-gray-400">Chargement…</div>

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to={isEdit ? `/contacts/${id}` : '/contacts'}
          className="text-gray-400 hover:text-gray-600"><ArrowLeft size={18}/></Link>
        <h1 className="text-xl font-bold text-gray-900">
          {isEdit ? 'Modifier le contact' : 'Nouveau contact'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Identité */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Identité</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Nom *">
                <Input value={form.nom} onChange={set('nom')} placeholder="Nom de l'établissement" required />
              </Field>
            </div>
            <Field label="Type">
              <select value={form.type} onChange={e => set('type')(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-700">
                <option value="">— Choisir —</option>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Statut">
              <select value={form.statut} onChange={e => set('statut')(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-700">
                {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="SIREN" hint="Obligatoire pour Factur-X (9 chiffres)">
              <Input value={form.siren || ''} onChange={set('siren')} placeholder="452 731 714" maxLength={14} />
            </Field>
          </div>
        </div>

        {/* Coordonnées */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Coordonnées</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email">
              <Input type="email" value={form.email || ''} onChange={set('email')} placeholder="contact@ecole.fr" />
            </Field>
            <Field label="Téléphone">
              <Input type="tel" value={form.telephone || ''} onChange={set('telephone')} placeholder="06 12 34 56 78" />
            </Field>
            <Field label="WhatsApp">
              <Input type="tel" value={form.whatsapp || ''} onChange={set('whatsapp')} placeholder="06 12 34 56 78" />
            </Field>
            <Field label="Site web">
              <Input value={form.site_web || ''} onChange={set('site_web')} placeholder="https://…" />
            </Field>
            <Field label="Instagram">
              <Input value={form.instagram || ''} onChange={set('instagram')} placeholder="@ecole_surf" />
            </Field>
          </div>
        </div>

        {/* Adresse */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Adresse</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Adresse">
                <Input value={form.adresse || ''} onChange={set('adresse')} placeholder="12 rue de la Plage" />
              </Field>
            </div>
            <Field label="Code postal">
              <Input value={form.code_postal || ''} onChange={set('code_postal')} placeholder="33150" maxLength={10} />
            </Field>
            <Field label="Ville">
              <Input value={form.ville || ''} onChange={set('ville')} placeholder="Hossegor" />
            </Field>
            <Field label="Région">
              <Input value={form.region || ''} onChange={set('region')} placeholder="Nouvelle-Aquitaine" />
            </Field>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <Field label="Notes">
            <textarea rows={3} value={form.notes || ''} onChange={e => set('notes')(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </Field>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3">
          {isEdit && (
            <button type="button" onClick={handleDelete}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 text-sm px-4 py-2 rounded-lg transition-colors">
              <Trash2 size={14}/> Supprimer
            </button>
          )}
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors ml-auto">
            <Save size={14}/> {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le contact'}
          </button>
        </div>
      </form>
    </div>
  )
}
