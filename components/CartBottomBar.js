'use client';

// Barra fixa na parte inferior — visível somente em mobile (md:hidden).
// Aparece quando há pelo menos 1 item no carrinho.
import { usePathname } from 'next/navigation';
import { useCart }     from '@/context/CartContext';

const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function CartBottomBar() {
  const pathname = usePathname();
  const { itemCount, subtotal, setIsCartOpen } = useCart();

  if (itemCount === 0 || pathname.endsWith('/checkout')) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-3 z-50 md:hidden">
      <button
        onClick={() => setIsCartOpen(true)}
        className="w-full bg-brand-red text-white rounded-2xl py-4 px-5
                   flex items-center justify-between shadow-xl
                   hover:bg-brand-red-dark transition-colors active:scale-[0.98]"
      >
        <div className="flex items-center gap-2">
          <span className="bg-white/20 rounded-lg px-2 py-0.5 text-sm font-bold">
            {itemCount}
          </span>
          <span className="font-semibold text-base">Ver sacola</span>
        </div>
        <span className="font-bold text-base">{brl(subtotal)}</span>
      </button>
    </div>
  );
}
