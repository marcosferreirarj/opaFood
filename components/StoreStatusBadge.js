'use client';

import { useEffect, useState } from 'react';

const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

/**
 * Shows real-time open/closed status for a store.
 * Subscribes to Firestore onSnapshot so the badge updates without a page reload
 * when the store owner toggles their status.
 *
 * In dev mode (NEXT_PUBLIC_DEV_LOGIN=true) the subscription is skipped and
 * `initialIsOpen` is used as a static value to avoid hitting Firebase.
 */
export default function StoreStatusBadge({ storeId, initialIsOpen, deliveryFee }) {
  const [isOpen, setIsOpen] = useState(initialIsOpen);

  useEffect(() => {
    const devMode = process.env.NEXT_PUBLIC_DEV_LOGIN === 'true';
    if (devMode || !storeId) return;

    let unsub;
    Promise.all([
      import('firebase/firestore'),
      import('@/lib/firebase'),
    ]).then(([{ doc, onSnapshot }, { db }]) => {
      unsub = onSnapshot(
        doc(db, 'stores', storeId),
        (snap) => { if (snap.exists()) setIsOpen(snap.data().isOpen); },
        (err) => console.warn('StoreStatusBadge snapshot error:', err)
      );
    });

    return () => unsub?.();
  }, [storeId]);

  return (
    <p className="flex items-center gap-2 text-xs mt-0.5">
      {isOpen ? (
        <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
          Aberto
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-red-500 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" aria-hidden="true" />
          Fechado
        </span>
      )}
      {deliveryFee !== undefined && (
        <span className="text-gray-400">
          · Entrega{' '}
          {deliveryFee === 0 ? (
            <span className="text-green-600 font-medium">grátis</span>
          ) : (
            brl(deliveryFee)
          )}
        </span>
      )}
    </p>
  );
}
