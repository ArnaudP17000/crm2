import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, Phone, Mail, MapPin } from 'lucide-react'
import api from '../api'

const STATUT_STYLES = {
  client:   'bg-green-100 text-green-700',
  prospect: 'bg-blue-100 text-blue-700',
  qualifie: 'bg-amber-100 text-amber-700',
  inactif:  'bg-gray-100 text-gray-500',
}
const STATUT_LABELS = { client: 'Client', prospect: 'Prospect', qualifie: 'Qualifié', inactif: 'Inactif' }

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [search, setSearch]     = useState('')
  const [statut, setStatut]     = useState('')
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/contacts', { params: { search: search || undefined, statut: statut || undefined } })
      .then(r => setContacts(r.data))
      .finally(() => setLoading(false))
  }, [search, statut])

  const tabs = [
    { value: '',         label: 'Tous' },
    { value: 'client',   label: 'Clients' },
    { value: 'prospect', label: 'Prospects' },
    { value: 'qualifie', label: 'Qualifiés' },
    { value: 'inactif',  label: 'Inactifs' },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">
          Contacts <span className="text-gray-400 font-normal text-base ml-1">({contacts.length})</span>
        </h1>
        <Link to="/contacts/new"
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Nouveau contact
        </Link>
      </div>

      {/* Onglets statut */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button key={t.value} onClick={() => setStatut(t.value)}
            className={`text-sm px-4 py-1.5 rounded-md font-medium transition-colors ${
              statut === t.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Recherche */}
      <div className="relative mb-4 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Nom</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Ville</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Contact</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contacts.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/contacts/${c.id}`} className="font-medium text-gray-900 hover:text-emerald-600">
                      {c.nom}
                    </Link>
                    {c.site_web && (
                      <a href={c.site_web} target="_blank" rel="noopener"
                        className="block text-xs text-gray-400 hover:text-emerald-500 truncate max-w-[200px]">
                        {c.site_web.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {c.type || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <div className="flex items-center gap-1">
                      <MapPin size={12} className="shrink-0" />
                      {c.ville || c.region || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-600">
                          <Mail size={11} /> {c.email}
                        </a>
                      )}
                      {c.telephone && (
                        <a href={`tel:${c.telephone}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-600">
                          <Phone size={11} /> {c.telephone}
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_STYLES[c.statut] || 'bg-gray-100 text-gray-500'}`}>
                      {STATUT_LABELS[c.statut] || c.statut || 'prospect'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!contacts.length && (
            <div className="text-center py-12 text-gray-400">Aucun contact trouvé</div>
          )}
        </div>
      )}
    </div>
  )
}
