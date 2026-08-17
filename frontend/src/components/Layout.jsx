import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, KanbanSquare, FileText, Receipt, LogOut, Waves } from 'lucide-react'

const nav = [
  { to: '/',          icon: LayoutDashboard, label: 'Tableau de bord', end: true },
  { to: '/contacts',  icon: Users,           label: 'Contacts' },
  { to: '/pipeline',  icon: KanbanSquare,    label: 'Pipeline' },
  { to: '/devis',     icon: FileText,        label: 'Devis' },
  { to: '/factures',  icon: Receipt,         label: 'Factures' },
]

export default function Layout() {
  const navigate = useNavigate()
  const logout = () => { localStorage.removeItem('crm_token'); navigate('/login') }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 flex flex-col">
        <div className="p-4 flex items-center gap-2 border-b border-slate-700">
          <Waves size={22} className="text-emerald-400" />
          <span className="text-white font-bold text-sm">surf-atlantique CRM</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button onClick={logout}
          className="flex items-center gap-3 px-6 py-4 text-slate-400 hover:text-white text-sm border-t border-slate-700 transition-colors">
          <LogOut size={16} /> Déconnexion
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
