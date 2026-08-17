import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Waves, ShieldCheck } from 'lucide-react'
import api from '../api'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep]         = useState(1)   // 1=password, 2=totp
  const [tempToken, setTempToken] = useState('')
  const [code, setCode]         = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()

  const submitPassword = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      if (data.totp_required) {
        setTempToken(data.temp_token)
        setStep(2)
      } else {
        localStorage.setItem('crm_token', data.access_token)
        navigate('/')
      }
    } catch {
      toast.error('Email ou mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  const submitTotp = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/totp/verify', { temp_token: tempToken, code })
      localStorage.setItem('crm_token', data.access_token)
      navigate('/')
    } catch {
      toast.error('Code incorrect ou expiré')
      setCode('')
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

        {step === 1 ? (
          <form onSubmit={submitPassword} className="bg-slate-800 rounded-2xl p-6 space-y-4">
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
        ) : (
          <form onSubmit={submitTotp} className="bg-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-emerald-400" />
              <h1 className="text-white font-semibold text-lg">Vérification 2FA</h1>
            </div>
            <p className="text-slate-400 text-sm">Entre le code à 6 chiffres de ton application d'authentification.</p>
            <input
              type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
              value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-3 text-2xl tracking-widest text-center outline-none focus:ring-2 focus:ring-emerald-500"
              required autoFocus />
            <button type="submit" disabled={loading || code.length !== 6}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Vérification...' : 'Valider'}
            </button>
            <button type="button" onClick={() => { setStep(1); setCode(''); setTempToken('') }}
              className="w-full text-slate-500 text-sm hover:text-slate-300 transition-colors">
              Retour
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
