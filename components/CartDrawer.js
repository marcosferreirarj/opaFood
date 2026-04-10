'use client';

import { useRouter }   from 'next/navigation';
import Image           from 'next/image';
import { usePathname } from 'next/navigation';
import { useCart }     from '@/context/CartContext';

const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function CartDrawer() {
  const router   = useRouter();
  const pathname = usePathname();
  const {
    items, itemCount, subtotal, total, deliveryFee,
    isCartOpen, setIsCartOpen,
    updateQuantity, storeSlug,
  } = useCart();

  // Não mostra na página de checkout (evita loop visual)
  if (!isCartOpen || pathname.endsWith('/checkout')) return null;

  function goToCheckout() {
    setIsCartOpen(false);
    router.push(`/${storeSlug}/checkout`);
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={() => setIsCartOpen(false)}
      />

      {/* Painel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 flex flex-col shadow-2xl">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="font-bold text-xl text-gray-800">Sua sacola</h2>
            {itemCount > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                {itemCount} {itemCount === 1 ? 'item' : 'itens'}
              </p>
            )}
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Fechar sacola"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Lista de itens */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-hide">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <p className="text-5xl mb-4">🛍️</p>
              <p className="text-gray-400">Sua sacola está vazia</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                {/* Miniatura */}
                <div className="relative w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-brand-orange-light" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{item.name}</p>
                  <p className="text-brand-red font-bold text-sm mt-0.5">{brl(item.price)}</p>
                </div>

                {/* Quantidade */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-7 h-7 rounded-full border-2 border-brand-red text-brand-red
                               flex items-center justify-center font-bold text-base
                               hover:bg-brand-red hover:text-white transition-colors"
                    aria-label="Remover 1"
                  >−</button>
                  <span className="font-bold text-gray-800 w-5 text-center text-sm">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-7 h-7 rounded-full bg-brand-red text-white
                               flex items-center justify-center font-bold text-base
                               hover:bg-brand-red-dark transition-colors"
                    aria-label="Adicionar 1"
                  >+</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rodapé */}
        {items.length > 0 && (
          <div className="border-t px-5 py-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{brl(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Taxa de entrega</span>
              <span>{deliveryFee === 0 ? 'Grátis' : brl(deliveryFee)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-800 pt-1 border-t">
              <span>Total</span>
              <span className="text-brand-red">{brl(total)}</span>
            </div>

            <button
              onClick={goToCheckout}
              className="mt-3 w-full bg-brand-red text-white font-bold py-4 rounded-2xl
                         hover:bg-brand-red-dark transition-colors text-base active:scale-[0.98]"
            >
              Finalizar pedido · {brl(total)}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
