import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, TrendingUp, FileText, AlertCircle, Euro, Clock, Mail, PhoneCall, CalendarCheck, MessageSquare } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import api from '../api'

const STAGE_LABELS = {
  nouveau: 'Nouveau', qualifie: 'Qualifié', proposition: 'Proposition',
  negociation: 'Négociation', gagne: 'Gagné',
}
const STAGE_COLORS = ['#94a3b8','#3b82f6','#a855f7','#f59e0b','#10b981']
const STATUT_COLORS = { prospect: '#3b82f6', qualifie: '#a855f7', client: '#10b981', inactif: '#94a3b8' }
const ACTIVITY_ICONS = { email: Mail, appel: PhoneCall, rdv: CalendarCheck, note: MessageSquare }

function KPI({ icon: Icon, label, value, sub, color = 'text-gray-900', to }) {
  const content = (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className="p-2 bg-gray-50 rounded-lg"><Icon size={18} className="text-gray-400"/></div>
      </div>
    </div>
  )
  return to ? <Link to={to}>{content}</Link> : content
}

function fmt(n) {
  return (n || 0).toLocaleString('fr', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'
}

export default function Dashboard() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get('/dashboard/stats').then(r => setData(r.data)).catch(() => {})
  }, [])

  if (!data) return (
    <div className="p-6 flex items-center justify-center h-64 text-gray-400">Chargement…</div>
  )

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Tableau de bord</h1>

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={Euro}        label="CA encaissé (année)" value={fmt(data.ca_annee)}         color="text-emerald-600" />
        <KPI icon={Clock}       label="En attente paiement" value={fmt(data.total_en_attente)} color="text-amber-600" />
        <KPI icon={Users}       label="Contacts"            value={data.contacts}               to="/contacts" />
        <KPI icon={TrendingUp}  label="Opportunités actives" value={data.opportunities}         to="/pipeline" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <KPI icon={FileText}   label="Devis en attente"   value={data.quotes_pending}    to="/devis" />
        <KPI icon={AlertCircle} label="Factures en retard" value={data.invoices_overdue}  color={data.invoices_overdue > 0 ? 'text-red-600' : 'text-gray-900'} to="/factures" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* CA mensuel */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">CA mensuel (6 mois)</h2>
          {data.ca_mensuel?.some(m => m.ca > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.ca_mensuel} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
                <Tooltip formatter={v => [`${v.toLocaleString('fr')} €`, 'CA']}
                  contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 8 }} />
                <Bar dataKey="ca" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-gray-300 text-sm">
              Aucune facture payée encore
            </div>
          )}
        </div>

        {/* Pipeline par étape */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Pipeline commercial</h2>
          {data.pipeline?.some(s => s.count > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.pipeline.map(s => ({ ...s, label: STAGE_LABELS[s.stage] }))}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, n) => [n === 'count' ? v + ' opp.' : `${v.toLocaleString('fr')} €`, n === 'count' ? 'Nombre' : 'Montant']}
                  contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 8 }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-gray-300 text-sm">
              Aucune opportunité dans le pipeline
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Contacts par statut */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Contacts par statut</h2>
          {data.contacts_statuts?.some(s => s.count > 0) ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={data.contacts_statuts.filter(s => s.count > 0)}
                  dataKey="count" nameKey="statut"
                  cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
                  {data.contacts_statuts.filter(s => s.count > 0).map((s, i) => (
                    <Cell key={i} fill={STATUT_COLORS[s.statut] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-300 text-sm">Aucun contact</div>
          )}
        </div>

        {/* Activités récentes */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Activités récentes</h2>
          {data.recent_activities?.length > 0 ? (
            <div className="space-y-2">
              {data.recent_activities.map(a => {
                const Icon = ACTIVITY_ICONS[a.type] || MessageSquare
                return (
                  <div key={a.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="p-1.5 bg-gray-100 rounded-lg shrink-0">
                      <Icon size={13} className="text-gray-500"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{a.subject}</p>
                      <p className="text-xs text-gray-400">{a.contact_nom}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {a.date ? new Date(a.date).toLocaleDateString('fr') : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-300 text-sm">
              Aucune activité enregistrée
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
