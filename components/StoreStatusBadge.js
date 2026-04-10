'use client';

import { useEffect, useState }  from 'react';
import { useStoreContext }       from '@/context/StoreContext';

const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

/**
 * StoreStatusBadge — exibe o status aberto/fechado e a taxa de entrega da loja.
 *
 * Subscreve ao Firestore via onSnapshot para refletir mudanças de status em
 * tempo real (o lojista pode abrir/fechar a loja pelo dashboard sem que o
 * cliente precise recarregar a página).
 *
 * Lê todos os dados de que precisa via useStoreContext() — sem props.
 * Em dev mode (NEXT_PUBLIC_DEV_LOGIN=true) a subscrição é ignorada e o
 * valor inicial do contexto é usado como estático.
 */
export default function StoreStatusBadge() {
  const { id: storeId, isOpen: initialIsOpen, deliveryFee } = useStoreContext();
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
