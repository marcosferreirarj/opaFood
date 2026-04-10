'use client';

import { useRouter }   from 'next/navigation';
import Image           from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart }     from '@/context/CartContext';

const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

const itemVariants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit:    { opacity: 0, x: -24, transition: { duration: 0.18, ease: 'easeIn' } },
};

export default function CartDrawer() {
  const router   = useRouter();
  const pathname = usePathname();
  const {
    items, itemCount, subtotal, total, deliveryFee,
    notes, setNotes,
    isCartOpen, setIsCartOpen,
    updateQuantity, storeSlug,
  } = useCart();

  // Never render on checkout page
  if (pathname.endsWith('/checkout')) return null;

  function goToCheckout() {
    if (items.length === 0) return;
    setIsCartOpen(false);
    router.push(`/${storeSlug}/checkout`);
  }

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40
                    transition-opacity duration-300
                    ${isCartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsCartOpen(false)}
      />

      {/* ── Panel ────────────────────────────────────────────────────── */}
      {/*
        Mobile  (default): full-screen overlay, slides UP from bottom
        Desktop (md+)     : right side-drawer (max-w-md), slides in from RIGHT
      */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sua sacola"
        className={`fixed inset-0 bg-white z-50 flex flex-col
                    md:inset-y-0 md:left-auto md:right-0 md:w-full md:max-w-md md:shadow-2xl
                    transition-transform duration-300 ease-in-out
                    ${isCartOpen
                      ? 'translate-y-0      md:translate-x-0'
                      : 'translate-y-full   md:translate-y-0 md:translate-x-full'
                    }`}
      >

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
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

        {/* ── Items list ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-hide">
          {items.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <span className="text-6xl mb-4" aria-hidden="true">🛍️</span>
              <p className="text-gray-400 font-medium">Sua sacola está vazia</p>
              <button
                onClick={() => setIsCartOpen(false)}
                className="mt-4 text-brand-red font-semibold text-sm hover:underline underline-offset-2"
              >
                Continuar comprando
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Item rows */}
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    variants={itemVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    layout
                    className="flex items-center gap-3"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="64px" />
                      ) : (
                        <div className="w-full h-full bg-brand-orange-light" />
                      )}
                    </div>

                    {/* Name + price */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm leading-snug line-clamp-2">
                        {item.name}
                      </p>
                      <p className="text-brand-red font-bold text-sm mt-0.5">
                        {brl(item.price * item.quantity)}
                      </p>
                    </div>

                    {/* Quantity stepper */}
                    <div className="flex items-center gap-1 flex-shrink-0" role="group" aria-label={`Quantidade de ${item.name}`}>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-full border-2 border-brand-red text-brand-red
                                   flex items-center justify-center font-bold text-base leading-none
                                   hover:bg-brand-red hover:text-white transition-colors"
                        aria-label={item.quantity === 1 ? `Remover ${item.name}` : `Diminuir quantidade de ${item.name}`}
                      >
                        {item.quantity === 1 ? <TrashIcon /> : '−'}
                      </motion.button>

                      <motion.span
                        key={item.quantity}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                        className="font-bold text-gray-800 w-5 text-center text-sm"
                        aria-live="polite"
                      >
                        {item.quantity}
                      </motion.span>

                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-full bg-brand-red text-white
                                   flex items-center justify-center font-bold text-base leading-none
                                   hover:bg-brand-red-dark transition-colors"
                        aria-label={`Adicionar mais 1 ${item.name}`}
                      >+</motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* ── Order notes ──────────────────────────────────── */}
              <div className="pt-2 pb-1">
                <label htmlFor="cart-notes" className="block text-xs font-medium text-gray-600 mb-1.5">
                  Observações do pedido
                </label>
                <textarea
                  id="cart-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="Ex: sem cebola, ponto da carne bem passado…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                             text-gray-700 resize-none leading-relaxed
                             focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent
                             placeholder:text-gray-300"
                />
                {notes.length > 0 && (
                  <p className="text-right text-xs text-gray-300 mt-0.5">
                    {notes.length}/300
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div className="border-t px-5 py-4 space-y-2 flex-shrink-0">
          {items.length > 0 && (
            <>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>{brl(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Taxa de entrega</span>
                <span>{deliveryFee === 0 ? 'Grátis' : brl(deliveryFee)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-800 pt-1.5 border-t">
                <span>Total</span>
                <span className="text-brand-red">{brl(total)}</span>
              </div>
            </>
          )}

          {/* Proceed to checkout — disabled + labelled when cart is empty */}
          <motion.button
            whileTap={items.length > 0 ? { scale: 0.97 } : undefined}
            onClick={goToCheckout}
            disabled={items.length === 0}
            aria-disabled={items.length === 0}
            className="mt-3 w-full bg-brand-red text-white font-bold py-4 rounded-2xl text-base
                       hover:bg-brand-red-dark transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {items.length === 0
              ? 'Adicione itens para continuar'
              : `Finalizar pedido · ${brl(total)}`}
          </motion.button>
        </div>

      </div>
    </>
  );
}
