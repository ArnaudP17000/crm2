import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, Globe, MapPin, Plus, MessageSquare, PhoneCall, CalendarCheck, Pencil, ShieldCheck } from 'lucide-react'
import api from '../api'
import toast from 'react-hot-toast'

const ACTIVITY_ICONS = { email: Mail, appel: PhoneCall, rdv: CalendarCheck, note: MessageSquare }
const ACTIVITY_COLORS = { email: 'bg-blue-100 text-blue-600', appel: 'bg-green-100 text-green-600', rdv: 'bg-purple-100 text-purple-600', note: 'bg-gray-100 text-gray-600' }

export default function ContactDetail() {
  const { id } = useParams()
  const [contact, setContact] = useState(null)
  const [activities, setActivities] = useState([])
  const [newNote, setNewNote] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'note', subject: '', description: '', date: new Date().toISOString().slice(0,10) })

  const load = () => {
    if (id === 'new') return
    api.get(`/contacts/${id}`).then(r => setContact(r.data))
    api.get(`/contacts/${id}/activities`).then(r => setActivities(r.data))
  }
  useEffect(load, [id])

  async function changeStatut(s) {
    const r = await api.patch(`/contacts/${id}/statut`, { statut: s })
    setContact(r.data)
    toast.success('Statut mis à jour')
  }

  const addActivity = async e => {
    e.preventDefault()
    await api.post(`/contacts/${id}/activities`, form)
    toast.success('Activité ajoutée')
    setShowForm(false)
    setForm({ type: 'note', subject: '', description: '', date: new Date().toISOString().slice(0,10) })
    load()
  }

  if (!contact && id !== 'new') return <div className="p-6 text-gray-400">Chargement...</div>

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <Link to="/contacts" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={14} /> Retour aux contacts
        </Link>
        <Link to={`/contacts/${id}/edit`}
          className="flex items-center gap-1.5 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors">
          <Pencil size={13}/> Modifier
        </Link>
      </div>

      {contact && (
        <div className="grid grid-cols-3 gap-6">
          {/* Fiche */}
          <div className="col-span-1 space-y-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h1 className="font-bold text-gray-900 text-lg mb-1">{contact.nom}</h1>
              <div className="flex flex-wrap gap-1 mb-3">
                {contact.type && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{contact.type}</span>}
                {contact.siren
                  ? <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1"><ShieldCheck size={10}/> SIREN {contact.siren}</span>
                  : <span className="text-xs bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full">SIREN manquant</span>
                }
              </div>
              {/* Statut rapide */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-400 mb-2">Statut</p>
                <div className="flex gap-1 flex-wrap">
                  {[
                    { value: 'prospect', label: 'Prospect', cls: 'bg-blue-100 text-blue-700 ring-blue-300' },
                    { value: 'qualifie', label: 'Qualifié', cls: 'bg-amber-100 text-amber-700 ring-amber-300' },
                    { value: 'client',   label: 'Client',   cls: 'bg-green-100 text-green-700 ring-green-300' },
                    { value: 'inactif',  label: 'Inactif',  cls: 'bg-gray-100 text-gray-500 ring-gray-300' },
                  ].map(s => (
                    <button key={s.value} onClick={() => changeStatut(s.value)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${s.cls} ${
                        contact.statut === s.value ? 'ring-2' : 'opacity-40 hover:opacity-80'
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                {contact.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-emerald-600"><Mail size={14}/>{contact.email}</a>}
                {contact.telephone && <a href={`tel:${contact.telephone}`} className="flex items-center gap-2 hover:text-emerald-600"><Phone size={14}/>{contact.telephone}</a>}
                {contact.site_web && <a href={contact.site_web} target="_blank" rel="noopener" className="flex items-center gap-2 hover:text-emerald-600"><Globe size={14}/>{contact.site_web.replace(/^https?:\/\//,'')}</a>}
                {(contact.ville || contact.region) && <div className="flex items-center gap-2"><MapPin size={14}/>{contact.ville}{contact.ville && contact.region ? ', ' : ''}{contact.region}</div>}
              </div>
            </div>
            {contact.instagram && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-sm">
                <span className="text-gray-400 text-xs block mb-1">Instagram</span>
                <span className="text-gray-700">@{contact.instagram.replace('@','')}</span>
              </div>
            )}
          </div>

          {/* Journal d'activités */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-700">Journal d'activités</h2>
              <button onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-1 text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-colors">
                <Plus size={14}/> Ajouter
              </button>
            </div>

            {showForm && (
              <form onSubmit={addActivity} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4 space-y-3">
                <div className="flex gap-2">
                  {['note','email','appel','rdv'].map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({...f, type: t}))}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${form.type === t ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 text-gray-600'}`}>
                      {t}
                    </button>
                  ))}
                </div>
                <input value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))}
                  placeholder="Sujet" required
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  placeholder="Notes..." rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">Annuler</button>
                  <button type="submit" className="text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg">Enregistrer</button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {activities.map(a => {
                const Icon = ACTIVITY_ICONS[a.type] || MessageSquare
                const color = ACTIVITY_COLORS[a.type] || ACTIVITY_COLORS.note
                return (
                  <div key={a.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex gap-3">
                    <div className={`p-2 rounded-lg h-fit ${color}`}><Icon size={14}/></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800 text-sm">{a.subject}</span>
                        <span className="text-xs text-gray-400">{new Date(a.date).toLocaleDateString('fr')}</span>
                      </div>
                      {a.description && <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{a.description}</p>}
                    </div>
                  </div>
                )
              })}
              {!activities.length && <p className="text-gray-400 text-sm text-center py-8">Aucune activité — commencez par noter un appel ou un email</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
