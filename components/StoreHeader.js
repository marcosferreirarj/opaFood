'use client';

import Image    from 'next/image';
import { useCart } from '@/context/CartContext';

function CartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

export default function StoreHeader({ store }) {
  const { itemCount, setIsCartOpen } = useCart();

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      {/* Banner */}
      <div className="relative w-full h-28 md:h-44 overflow-hidden">
        {store.bannerUrl ? (
          <Image src={store.bannerUrl} alt={store.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-brand-red to-brand-red-dark" />
        )}
      </div>

      {/* Info bar */}
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo + nome */}
        <div className="flex items-center gap-3">
          {/* Logo sobreposta ao banner */}
          <div className="w-14 h-14 rounded-full bg-white shadow-md border-2 border-brand-red
                          overflow-hidden flex-shrink-0 -mt-10">
            {store.logoUrl ? (
              <Image src={store.logoUrl} alt={store.name} width={56} height={56} className="object-cover" />
            ) : (
              <div className="w-full h-full bg-brand-red flex items-center justify-center
                              text-white font-black text-2xl">
                {store.name?.[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <div>
            <h1 className="font-bold text-gray-800 text-base leading-tight">{store.name}</h1>
            <p className="text-xs mt-0.5">
              {store.isOpen ? (
                <span className="text-green-600 font-semibold">● Aberto</span>
              ) : (
                <span className="text-red-500 font-semibold">● Fechado</span>
              )}
              {store.deliveryFee !== undefined && (
                <span className="text-gray-400 ml-2">
                  Entrega{' '}
                  {store.deliveryFee === 0
                    ? 'grátis'
                    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(store.deliveryFee)}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Botão carrinho */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="relative p-2.5 bg-brand-red text-white rounded-full shadow-md
                     hover:bg-brand-red-dark transition-colors"
          aria-label="Abrir sacola"
        >
          <CartIcon />
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-brand-orange text-white text-xs
                             font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {itemCount > 9 ? '9+' : itemCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
