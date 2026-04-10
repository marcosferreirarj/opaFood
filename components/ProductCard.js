'use client';

import Image       from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/context/CartContext';

const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function PlaceholderImg() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-brand-orange-light to-orange-100
                    flex items-center justify-center">
      <svg
        className="w-12 h-12 text-brand-orange opacity-30"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
          d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9zm0 0v2m0 14v2M3 12H1m22 0h-2
             M5.6 5.6 4.2 4.2m15.6 15.6-1.4-1.4M5.6 18.4 4.2 19.8M19.8 4.2l-1.4 1.4" />
        <circle cx="12" cy="12" r="4" strokeWidth={1.5} />
      </svg>
    </div>
  );
}

function QtyButton({ onClick, label, children }) {
  return (
    <motion.button
      onClick={onClick}
      aria-label={label}
      whileTap={{ scale: 0.85 }}
      className="w-7 h-7 rounded-full bg-brand-red text-white flex items-center justify-center
                 font-bold text-base leading-none hover:bg-brand-red-dark transition-colors
                 focus-visible:outline-none focus-visible:ring-2
                 focus-visible:ring-brand-red focus-visible:ring-offset-1"
    >
      {children}
    </motion.button>
  );
}

export default function ProductCard({ product }) {
  const { addItem, items, updateQuantity } = useCart();
  const cartItem = items.find((i) => i.id === product.id);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden
                 hover:shadow-md transition-shadow flex flex-col"
    >
      {/* Product image */}
      <div className="relative w-full h-36 sm:h-40 flex-shrink-0">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, 33vw"
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <PlaceholderImg />
        )}
      </div>

      {/* Card content */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          <span className="font-bold text-brand-red text-sm" aria-label={`Preço: ${brl(product.price)}`}>
            {brl(product.price)}
          </span>

          <AnimatePresence mode="wait" initial={false}>
            {cartItem ? (
              /* Quantity stepper */
              <motion.div
                key="stepper"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5"
                role="group"
                aria-label={`Quantidade de ${product.name}`}
              >
                <QtyButton
                  onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
                  label={`Remover 1 ${product.name}`}
                >
                  −
                </QtyButton>
                <motion.span
                  key={cartItem.quantity}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className="font-bold text-gray-800 w-5 text-center text-sm"
                  aria-live="polite"
                >
                  {cartItem.quantity}
                </motion.span>
                <QtyButton
                  onClick={() => addItem(product)}
                  label={`Adicionar mais 1 ${product.name}`}
                >
                  +
                </QtyButton>
              </motion.div>
            ) : (
              /* Quick-add button */
              <motion.button
                key="add"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => addItem(product)}
                aria-label={`Adicionar ${product.name} à sacola`}
                className="flex items-center gap-1 bg-brand-red text-white text-xs font-semibold
                           pl-2.5 pr-3 py-1.5 rounded-full hover:bg-brand-red-dark transition-colors
                           focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-brand-red focus-visible:ring-offset-1"
              >
                <span className="text-base leading-none font-bold" aria-hidden="true">+</span>
                Adicionar
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
}
