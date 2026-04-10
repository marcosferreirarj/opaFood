'use client';

import { useState, useEffect } from 'react';
import { useRouter }           from 'next/navigation';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth }                from '@/lib/firebase';
import { checkAdminToken }     from './actions';

// ─── icons ────────────────────────────────────────────────────────────────────

function IconEye({ off }) {
  return off ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
         viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 3l18 18M10.477 10.477A3 3 0 0013.5 13.5M6.343 6.343A9.953 9.953 0 003 12
               c1.657 3.314 5.373 6 9 6a9.95 9.95 0 004.657-1.151M9.88 9.879A3 3 0 0112 9
               a3 3 0 013 3c0 .768-.29 1.47-.762 2M21 12c-1.107 2.212-2.966 4.097-5.124 5.175" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
         viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7
               -1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AdminLoginPage() {
  const router = useRouter();
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [checking,    setChecking]    = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token  = await user.getIdToken();
        const result = await checkAdminToken(token);
        if (result.ok) { router.replace('/admin/lojistas'); return; }
        await signOut(auth);
      }
      setChecking(false);
    });
    return unsub;
  }, [router]);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const token      = await credential.user.getIdToken();
      const result     = await checkAdminToken(token);
      if (!result.ok) {
        await signOut(auth);
        setError('Acesso não autorizado para este painel.');
        return;
      }
      router.replace('/admin/lojistas');
    } catch {
      setError('E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  }

  const emailError = emailTouched && email && !isValidEmail(email);

  if (checking) return <FullPageSpinner />;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4
                    bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(234,29,44,0.08),transparent)]">
      <div className="w-full max-w-sm">

        {/* ── Logo ── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center
                            shadow-lg shadow-brand-red/20">
              <span className="text-white font-black text-xl leading-none">O</span>
            </div>
            <span className="font-black text-2xl text-white tracking-tight">
              Opa<span className="text-brand-red">Admin</span>
            </span>
          </div>
          <p className="text-gray-600 mt-2 text-xs tracking-widest uppercase">
            Painel do Administrador
          </p>
        </div>

        {/* ── Card ── */}
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-800
                        p-7 shadow-2xl shadow-black/40
                        ring-1 ring-white/[0.03]">

          <h1 className="font-bold text-lg text-white mb-5 tracking-tight">Acesso Admin</h1>

          <form onSubmit={handleLogin} className="space-y-4">

            {/* email */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                onBlur={() => setEmailTouched(true)}
                required
                autoComplete="email"
                placeholder="admin@opadelivery.com"
                className={`w-full bg-gray-800/70 border rounded-xl px-4 py-3 text-sm text-white
                            placeholder-gray-600 transition-all duration-150
                            focus:outline-none focus:ring-2 focus:border-transparent
                            ${emailError
                              ? 'border-brand-red/70 focus:ring-brand-red/50'
                              : 'border-gray-700 focus:ring-brand-red'}`}
              />
              {emailError && (
                <p className="text-xs text-brand-red mt-1.5">Insira um e-mail válido.</p>
              )}
            </div>

            {/* password */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full bg-gray-800/70 border border-gray-700 rounded-xl px-4 py-3
                             pr-11 text-sm text-white placeholder-gray-600 transition-all duration-150
                             focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500
                             hover:text-gray-300 transition-colors p-1"
                  aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <IconEye off={showPass} />
                </button>
              </div>
            </div>

            {/* error */}
            {error && (
              <div className="flex items-center gap-2 bg-brand-red/10 border border-brand-red/20
                              rounded-xl px-4 py-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-brand-red flex-shrink-0"
                     fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94
                           a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <p className="text-brand-red text-sm">{error}</p>
              </div>
            )}

            {/* submit */}
            <button
              type="submit"
              disabled={loading || !!emailError}
              className="w-full bg-brand-red text-white font-bold py-3 rounded-xl mt-1
                         hover:bg-brand-red-dark active:scale-[0.98] transition-all duration-150
                         disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white
                                   rounded-full animate-spin" />
                  Verificando…
                </>
              ) : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-700 text-xs mt-6">
          Acesso restrito a administradores OpaDelivery
        </p>
      </div>
    </div>
  );
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gray-700 border-t-brand-red rounded-full animate-spin" />
    </div>
  );
}
