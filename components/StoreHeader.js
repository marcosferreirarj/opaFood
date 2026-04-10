'use client';

import Image              from 'next/image';
import { useCart }        from '@/context/CartContext';
import { useStoreContext } from '@/context/StoreContext';
import StoreStatusBadge   from './StoreStatusBadge';

function CartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

export default function StoreHeader() {
  const store                     = useStoreContext();
  const { itemCount, setIsCartOpen } = useCart();

  return (
    <header>
      {/* ── Banner (scrolls away) ───────────────────────────────────────────── */}
      <div className="relative w-full h-28 sm:h-36 md:h-52 overflow-hidden" role="img" aria-label={`Banner de ${store.name}`}>
        {store.bannerUrl ? (
          <Image
            src={store.bannerUrl}
            alt=""
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-red via-brand-red-dark to-brand-orange" />
        )}
        {/* Gradient overlay for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* ── Sticky info bar ─────────────────────────────────────────────────── */}
      {/* h-16 = 64 px — CategoryNav uses top-16 to stick right below this */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto h-16 px-4 flex items-center gap-3">

          {/* Logo */}
          <div
            className="w-10 h-10 rounded-full bg-white shadow border-2 border-white
                       overflow-hidden flex-shrink-0"
            aria-hidden="true"
          >
            {store.logoUrl ? (
              <Image
                src={store.logoUrl}
                alt={store.name}
                width={40}
                height={40}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-brand-red flex items-center justify-center
                              text-white font-black text-lg select-none">
                {store.name?.[0]?.toUpperCase()}
              </div>
            )}
          </div>

          {/* Name + status — StoreStatusBadge lê storeId/isOpen/deliveryFee do StoreContext */}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 text-sm leading-tight truncate">
              {store.name}
            </h1>
            <StoreStatusBadge />
          </div>

          {/* Cart button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 bg-brand-red text-white rounded-full shadow-md
                       hover:bg-brand-red-dark transition-colors
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-brand-red focus-visible:ring-offset-2"
            aria-label={`Abrir sacola${itemCount > 0 ? ` (${itemCount} ${itemCount === 1 ? 'item' : 'itens'})` : ''}`}
          >
            <CartIcon />
            {itemCount > 0 && (
              <span
                className="absolute -top-1 -right-1 bg-brand-orange text-white text-xs
                           font-bold rounded-full w-5 h-5 flex items-center justify-center
                           pointer-events-none"
                aria-hidden="true"
              >
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
