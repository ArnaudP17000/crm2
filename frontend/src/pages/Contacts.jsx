import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, Phone, Mail, MapPin, Filter } from 'lucide-react'
import api from '../api'

const TYPE_COLORS = {
  'École de surf':   'bg-emerald-100 text-emerald-700',
  'École Kitesurf':  'bg-blue-100 text-blue-700',
  'Surf Shop':       'bg-purple-100 text-purple-700',
  'École & Shop':    'bg-teal-100 text-teal-700',
  default:           'bg-gray-100 text-gray-600',
}

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/contacts', { params: { search, type: filter } })
      .then(r => setContacts(r.data))
      .finally(() => setLoading(false))
  }, [search, filter])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          Contacts <span className="text-gray-400 font-normal text-base ml-1">({contacts.length})</span>
        </h1>
        <Link to="/contacts/new"
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Nouveau contact
        </Link>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-600">
          <option value="">Tous les types</option>
          <option>École de surf</option>
          <option>École Kitesurf</option>
          <option>Surf Shop</option>
          <option>École & Shop</option>
        </select>
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
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[c.type] || TYPE_COLORS.default}`}>
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
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      c.statut === 'client'    ? 'bg-green-100 text-green-700' :
                      c.statut === 'prospect'  ? 'bg-blue-100 text-blue-700' :
                      c.statut === 'inactif'   ? 'bg-gray-100 text-gray-500' :
                      'bg-gray-100 text-gray-500'
                    }`}>{c.statut || 'prospect'}</span>
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
