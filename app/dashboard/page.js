'use client';

// Tela de Login — redireciona para /dashboard/produtos se já estiver autenticado.
import { useState, useEffect } from 'react';
import { useRouter }           from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { isDevLoginEnabled, setDevUser, onAuthStateChangedOrDev } from '@/lib/dev-auth';

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [checking, setChecking] = useState(true); // aguarda verificação inicial de auth

  // Se já logado, redireciona imediatamente.
  useEffect(() => {
    const unsub = onAuthStateChangedOrDev(auth, (user) => {
      if (user) router.replace('/dashboard/produtos');
      else setChecking(false);
    });
    return unsub;
  }, [router]);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/dashboard/produtos');
    } catch {
      setError('E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  }

  if (checking) return <FullPageSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-black text-xl">O</span>
            </div>
            <span className="font-black text-2xl text-gray-800">
              Opa<span className="text-brand-red">Delivery</span>
            </span>
          </div>
          <p className="text-gray-400 mt-2 text-sm">Painel do Lojista</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h1 className="font-bold text-xl text-gray-800 mb-6">Entrar</h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm
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
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          {isDevLoginEnabled && (
            <>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-gray-400">modo dev</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setDevUser(); router.replace('/dashboard/produtos'); }}
                className="w-full border-2 border-dashed border-gray-200 text-gray-500
                           font-semibold py-3 rounded-xl hover:border-gray-400
                           hover:text-gray-700 transition-colors text-sm"
              >
                Entrar como Desenvolvedor
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
