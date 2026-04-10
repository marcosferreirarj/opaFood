'use client';

import { useState, useEffect } from 'react';
import { useRouter }           from 'next/navigation';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth }                from '@/lib/firebase';
import { checkAdminToken }     from './actions';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [checking, setChecking] = useState(true);

  // Se já logado como admin, redireciona.
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

  if (checking) return <FullPageSpinner />;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-black text-xl">O</span>
            </div>
            <span className="font-black text-2xl text-white">
              Opa<span className="text-brand-red">Admin</span>
            </span>
          </div>
          <p className="text-gray-500 mt-2 text-sm">Painel do Administrador</p>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h1 className="font-bold text-xl text-white mb-6">Acesso Admin</h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@opadelivery.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                           text-sm text-white placeholder-gray-600
                           focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                           text-sm text-white placeholder-gray-600
                           focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
              />
            </div>

            {error && <p className="text-brand-red text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-red text-white font-bold py-3 rounded-xl
                         hover:bg-brand-red-dark transition-colors disabled:opacity-60"
            >
              {loading ? 'Verificando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
