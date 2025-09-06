import { useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, FileText, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login, register, session, clearError } = useUser();
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (mode === 'login') await login(email, password); else await register(email, password, name || email.split('@')[0]);
      navigate('/');
    } catch {/* handled in context */}
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-white to-indigo-50 p-4">
      <div className="w-full max-w-md relative">
        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-indigo-400/40 to-violet-400/40 blur opacity-60" />
        <div className="relative rounded-xl bg-white/90 backdrop-blur shadow-xl border border-indigo-100/60 p-8">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md">
            <FileText size={28} />
          </div>
          <h1 className="text-center text-2xl font-semibold bg-gradient-to-br from-indigo-600 to-violet-600 bg-clip-text text-transparent">FileTaggerPro</h1>
          <p className="mt-2 text-center text-sm text-slate-500">Gérez vos documents en toute simplicité</p>

          {/* Tabs */}
          <div className="mt-6 mb-2 flex rounded-md overflow-hidden border border-slate-200 text-sm font-medium">
            <button type="button" onClick={()=>setMode('login')} className={`flex-1 px-4 py-2 flex items-center justify-center gap-1 transition ${mode==='login' ? 'bg-white text-indigo-600 shadow inset-shadow border-r border-slate-200' : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-r border-slate-200'}`}>↪ Connexion</button>
            <button type="button" onClick={()=>setMode('register')} className={`flex-1 px-4 py-2 flex items-center justify-center gap-1 transition ${mode==='register' ? 'bg-white text-indigo-600 shadow inset-shadow' : 'bg-slate-50 hover:bg-slate-100 text-slate-500'}`}>👤 Inscription</button>
          </div>

          <form onSubmit={submit} className="space-y-5 mt-4">
            {session.error && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 border border-red-200 cursor-pointer" onClick={clearError}>{session.error}</div>
            )}
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Nom</label>
                <input className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200" value={name} onChange={e=>setName(e.target.value)} placeholder="Votre nom" />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Email</label>
              <input type="email" required className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200" value={email} onChange={e=>setEmail(e.target.value)} placeholder="votre@email.com" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-600">Mot de passe</label>
                {mode==='login' && <button type="button" className="text-[11px] text-indigo-600 hover:underline" onClick={()=>alert('Flow à implémenter')}>Mot de passe oublié ?</button>}
              </div>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 pr-9 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  value={password}
                  onChange={e=>setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button type="button" onClick={()=>setShowPwd(s=>!s)} className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button disabled={session.isLoading} className="group relative w-full overflow-hidden rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-medium text-white shadow hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <span className="relative z-10 flex items-center justify-center gap-2">
                {session.isLoading && <Loader2 size={16} className="animate-spin" />}
                {mode === 'login' ? 'Se connecter' : "Créer un compte"}
              </span>
              <span className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition" />
            </button>
            <div className="text-center text-[11px] text-slate-500">
              {mode === 'login' ? (
                <span>Pas de compte ? <button type="button" className="text-indigo-600 underline-offset-2 hover:underline" onClick={()=>setMode('register')}>Inscription</button></span>
              ) : (
                <span>Déjà un compte ? <button type="button" className="text-indigo-600 underline-offset-2 hover:underline" onClick={()=>setMode('login')}>Connexion</button></span>
              )}
            </div>
            <div className="text-center text-[10px] text-slate-400">© {new Date().getFullYear()} FileTaggerPro</div>
            <div className="text-center text-[10px] text-slate-400">
              <Link to="/" className="hover:underline">Retour accueil</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
