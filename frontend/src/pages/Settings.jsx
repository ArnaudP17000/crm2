import { useEffect, useState } from 'react'
import { ShieldCheck, ShieldOff, KeyRound, CheckCircle, Pencil, Save, X, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'

export default function Settings() {
  const [me, setMe]               = useState(null)
  const [qr, setQr]               = useState(null)
  const [secret, setSecret]       = useState('')
  const [code, setCode]           = useState('')
  const [step, setStep]           = useState('idle') // idle | setup | confirm | disable
  const [loading, setLoading]     = useState(false)
  const [editing, setEditing]     = useState(false)
  const [form, setForm]           = useState({ nom: '', email: '', current_password: '', new_password: '', confirm_password: '' })
  const [saving, setSaving]       = useState(false)
  const [company, setCompany]     = useState(null)
  const [editCo, setEditCo]       = useState(false)
  const [coForm, setCoForm]       = useState({})
  const [savingCo, setSavingCo]   = useState(false)

  useEffect(() => {
    api.get('/auth/me').then(r => {
      setMe(r.data)
      setForm(f => ({ ...f, nom: r.data.nom || '', email: r.data.email || '' }))
    }).catch(() => {})
    api.get('/settings/company').then(r => setCompany(r.data)).catch(() => {})
  }, [])

  function startEditCo() {
    setCoForm({ ...company })
    setEditCo(true)
  }

  async function saveCompany() {
    setSavingCo(true)
    try {
      const r = await api.put('/settings/company', coForm)
      setCompany(r.data)
      setEditCo(false)
      toast.success('Informations entreprise mises à jour')
    } catch { toast.error('Erreur') }
    finally { setSavingCo(false) }
  }

  function startEdit() {
    setForm(f => ({ ...f, nom: me.nom || '', email: me.email || '', current_password: '', new_password: '', confirm_password: '' }))
    setEditing(true)
  }

  async function saveProfile() {
    if (form.new_password && form.new_password !== form.confirm_password) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    setSaving(true)
    try {
      const payload = { nom: form.nom, email: form.email }
      if (form.new_password) {
        payload.current_password = form.current_password
        payload.new_password = form.new_password
      }
      const { data } = await api.patch('/auth/me', payload)
      setMe(m => ({ ...m, nom: data.nom, email: data.email }))
      setEditing(false)
      toast.success('Profil mis à jour')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

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
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <KeyRound size={17} className="text-gray-400"/> Compte
          </h2>
          {!editing && (
            <button onClick={startEdit}
              className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-500 transition-colors">
              <Pencil size={14}/> Modifier
            </button>
          )}
        </div>

        {!editing ? (
          <div className="text-sm text-gray-600 space-y-1.5">
            <p><span className="text-gray-400">Email :</span> {me.email}</p>
            <p><span className="text-gray-400">Nom :</span> {me.nom || '—'}</p>
            <p><span className="text-gray-400">Rôle :</span> {me.role}</p>
            <p><span className="text-gray-400">Mot de passe :</span> <span className="tracking-widest">••••••••</span></p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Nom</label>
              <input type="text" value={form.nom}
                onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Email</label>
              <input type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2">Changer le mot de passe (laisser vide pour ne pas modifier)</p>
              <div className="space-y-2">
                <input type="password" placeholder="Mot de passe actuel" value={form.current_password}
                  onChange={e => setForm(f => ({ ...f, current_password: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                <input type="password" placeholder="Nouveau mot de passe (8 car. min)" value={form.new_password}
                  onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                <input type="password" placeholder="Confirmer le nouveau mot de passe" value={form.confirm_password}
                  onChange={e => setForm(f => ({ ...f, confirm_password: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveProfile} disabled={saving}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                <Save size={14}/> {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button onClick={() => setEditing(false)}
                className="flex items-center gap-1.5 border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                <X size={14}/> Annuler
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Entreprise */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Building2 size={17} className="text-gray-400"/> Mon entreprise
          </h2>
          {!editCo && company && (
            <button onClick={startEditCo}
              className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-500 transition-colors">
              <Pencil size={14}/> Modifier
            </button>
          )}
        </div>

        {!editCo ? (
          company ? (
            <div className="text-sm text-gray-600 space-y-1.5">
              {company.nom       && <p><span className="text-gray-400">Nom :</span> {company.nom}</p>}
              {company.siren     && <p><span className="text-gray-400">SIREN :</span> {company.siren}</p>}
              {company.siret     && <p><span className="text-gray-400">SIRET :</span> {company.siret}</p>}
              {company.tva_number && <p><span className="text-gray-400">N° TVA :</span> {company.tva_number}</p>}
              {company.adresse   && <p><span className="text-gray-400">Adresse :</span> {company.adresse}{company.code_postal ? `, ${company.code_postal}` : ''}{company.ville ? ` ${company.ville}` : ''}</p>}
              {company.telephone && <p><span className="text-gray-400">Téléphone :</span> {company.telephone}</p>}
              {company.email     && <p><span className="text-gray-400">Email :</span> {company.email}</p>}
              {company.site_web  && <p><span className="text-gray-400">Site web :</span> {company.site_web}</p>}
              {company.iban      && <p><span className="text-gray-400">IBAN :</span> {company.iban}</p>}
              {company.bic       && <p><span className="text-gray-400">BIC :</span> {company.bic}</p>}
              {company.mentions  && <p className="pt-1 border-t border-gray-100 mt-1"><span className="text-gray-400">Mentions :</span> {company.mentions}</p>}
              {!company.nom && <p className="text-gray-400 italic">Aucune information renseignée</p>}
            </div>
          ) : <p className="text-gray-400 text-sm">Chargement…</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'nom',         label: 'Nom de l\'entreprise', col: 2 },
                { key: 'siren',       label: 'SIREN (9 chiffres)' },
                { key: 'siret',       label: 'SIRET (14 chiffres)' },
                { key: 'tva_number',  label: 'N° TVA intracommunautaire' },
                { key: 'adresse',     label: 'Adresse', col: 2 },
                { key: 'code_postal', label: 'Code postal' },
                { key: 'ville',       label: 'Ville' },
                { key: 'telephone',   label: 'Téléphone' },
                { key: 'email',       label: 'Email' },
                { key: 'site_web',    label: 'Site web', col: 2 },
                { key: 'iban',        label: 'IBAN' },
                { key: 'bic',         label: 'BIC' },
              ].map(({ key, label, col }) => (
                <div key={key} className={col === 2 ? 'col-span-2' : ''}>
                  <label className="text-xs text-gray-500 block mb-1">{label}</label>
                  <input type="text" value={coForm[key] || ''}
                    onChange={e => setCoForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-xs text-gray-500 block mb-1">Mentions légales (bas de devis/facture)</label>
                <textarea rows={3} value={coForm.mentions || ''}
                  onChange={e => setCoForm(f => ({ ...f, mentions: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveCompany} disabled={savingCo}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                <Save size={14}/> {savingCo ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button onClick={() => setEditCo(false)}
                className="flex items-center gap-1.5 border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                <X size={14}/> Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
