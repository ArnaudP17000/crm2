import { useEffect, useState } from 'react'
import { ShieldCheck, ShieldOff, KeyRound, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'

export default function Settings() {
  const [me, setMe]           = useState(null)
  const [qr, setQr]           = useState(null)
  const [secret, setSecret]   = useState('')
  const [code, setCode]       = useState('')
  const [step, setStep]       = useState('idle') // idle | setup | confirm | disable
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/auth/me').then(r => setMe(r.data)).catch(() => {})
  }, [])

  async function startSetup() {
    setLoading(true)
    try {
      const { data } = await api.get('/auth/totp/setup')
      setQr(data.qr_base64)
      setSecret(data.secret)
      setStep('confirm')
    } catch { toast.error('Erreur') }
    finally { setLoading(false) }
  }

  async function enable() {
    if (code.length !== 6) return
    setLoading(true)
    try {
      await api.post('/auth/totp/enable', { code })
      toast.success('2FA activé')
      setMe(m => ({ ...m, totp_enabled: true }))
      setStep('idle'); setQr(null); setCode('')
    } catch { toast.error('Code incorrect') }
    finally { setLoading(false) }
  }

  async function disable() {
    if (code.length !== 6) return
    setLoading(true)
    try {
      await api.post('/auth/totp/disable', { code })
      toast.success('2FA désactivé')
      setMe(m => ({ ...m, totp_enabled: false }))
      setStep('idle'); setCode('')
    } catch { toast.error('Code incorrect') }
    finally { setLoading(false) }
  }

  if (!me) return <div className="p-6 text-gray-400">Chargement…</div>

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Paramètres</h1>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-1">
          {me.totp_enabled
            ? <ShieldCheck size={20} className="text-emerald-500" />
            : <ShieldOff size={20} className="text-gray-400" />}
          <h2 className="font-semibold text-gray-800">Double authentification (2FA)</h2>
          {me.totp_enabled && (
            <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Actif</span>
          )}
        </div>
        <p className="text-sm text-gray-400 mb-4 ml-8">
          Protège ton compte avec Google Authenticator ou Authy.
        </p>

        {/* État IDLE */}
        {step === 'idle' && !me.totp_enabled && (
          <button onClick={startSetup} disabled={loading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
            <ShieldCheck size={15}/> Activer le 2FA
          </button>
        )}

        {step === 'idle' && me.totp_enabled && (
          <button onClick={() => { setStep('disable'); setCode('') }}
            className="flex items-center gap-2 border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <ShieldOff size={15}/> Désactiver le 2FA
          </button>
        )}

        {/* Setup — affichage QR */}
        {step === 'confirm' && qr && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Scanne ce QR code avec <strong>Google Authenticator</strong> ou <strong>Authy</strong>.
            </p>
            <div className="flex justify-center">
              <img src={`data:image/png;base64,${qr}`} alt="QR code TOTP" className="w-48 h-48 border border-gray-200 rounded-lg" />
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Clé manuelle :</p>
              <code className="text-xs text-gray-700 break-all font-mono">{secret}</code>
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Code de confirmation (6 chiffres)</label>
              <div className="flex gap-2">
                <input type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
                  value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-lg tracking-widest text-center outline-none focus:ring-2 focus:ring-emerald-500" />
                <button onClick={enable} disabled={loading || code.length !== 6}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                  <CheckCircle size={15}/> Confirmer
                </button>
              </div>
            </div>
            <button onClick={() => { setStep('idle'); setQr(null); setCode('') }}
              className="text-sm text-gray-400 hover:text-gray-600">Annuler</button>
          </div>
        )}

        {/* Disable */}
        {step === 'disable' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Entre le code de ton application pour confirmer la désactivation.</p>
            <div className="flex gap-2">
              <input type="text" inputMode="numeric" maxLength={6}
                value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-lg tracking-widest text-center outline-none focus:ring-2 focus:ring-red-400" />
              <button onClick={disable} disabled={loading || code.length !== 6}
                className="bg-red-500 hover:bg-red-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                Désactiver
              </button>
            </div>
            <button onClick={() => { setStep('idle'); setCode('') }}
              className="text-sm text-gray-400 hover:text-gray-600">Annuler</button>
          </div>
        )}
      </div>

      {/* Infos compte */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mt-4">
        <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <KeyRound size={17} className="text-gray-400"/> Compte
        </h2>
        <div className="text-sm text-gray-600 space-y-1">
          <p><span className="text-gray-400">Email :</span> {me.email}</p>
          <p><span className="text-gray-400">Nom :</span> {me.nom || '—'}</p>
          <p><span className="text-gray-400">Rôle :</span> {me.role}</p>
        </div>
      </div>
    </div>
  )
}
