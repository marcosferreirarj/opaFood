'use client';

import Link        from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut }  from 'firebase/auth';
import { auth }     from '@/lib/firebase';
import { isDevLoginEnabled, clearDevUser } from '@/lib/dev-auth';

const NAV_LINKS = [
  { href: '/dashboard/produtos', label: 'Produtos',  icon: '🍔' },
  { href: '/dashboard/pedidos',  label: 'Pedidos',   icon: '📋' },
];

export default function DashboardNav({ storeName, storeSlug }) {
  const pathname = usePathname();
  const router   = useRouter();

  async function handleSignOut() {
    if (isDevLoginEnabled) {
      clearDevUser();
    } else {
      await signOut(auth);
    }
    router.replace('/dashboard');
  }

  return (
    <nav className="bg-white border-b sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4">
        {/* Linha superior: logo + loja + sair */}
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black text-base">O</span>
            </div>
            <span className="font-bold text-gray-800 text-sm truncate max-w-[140px] md:max-w-xs">
              {storeName || 'Minha loja'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {storeSlug && (
              <a
                href={`/${storeSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:block text-xs text-brand-red font-semibold hover:underline"
              >
                Ver cardápio ↗
              </a>
            )}
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Tabs de navegação */}
        <div className="flex gap-1 -mb-px">
          {NAV_LINKS.map(({ href, label, icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold
                            border-b-2 transition-colors ${
                  active
                    ? 'border-brand-red text-brand-red'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                <span>{icon}</span>
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
