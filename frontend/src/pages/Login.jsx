import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Waves } from 'lucide-react'
import api from '../api'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('crm_token', data.access_token)
      navigate('/')
    } catch {
      toast.error('Email ou mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Waves size={32} className="text-emerald-400" />
          <span className="text-white text-xl font-bold">surf-atlantique CRM</span>
        </div>
        <form onSubmit={submit} className="bg-slate-800 rounded-2xl p-6 space-y-4">
          <h1 className="text-white font-semibold text-lg">Connexion</h1>
          <div>
            <label className="text-slate-400 text-sm block mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              required autoFocus />
          </div>
          <div>
            <label className="text-slate-400 text-sm block mb-1">Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              required />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
