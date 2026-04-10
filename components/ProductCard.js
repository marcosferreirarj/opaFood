'use client';

import Image       from 'next/image';
import { useCart } from '@/context/CartContext';

const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function PlaceholderImg() {
  return (
    <div className="w-full h-full bg-brand-orange-light flex items-center justify-center">
      <svg className="w-14 h-14 text-brand-orange opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14
             m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );
}

export default function ProductCard({ product }) {
  const { addItem, items, updateQuantity } = useCart();
  const cartItem = items.find((i) => i.id === product.id);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden
                    hover:shadow-md transition-shadow flex flex-col">
      {/* Imagem */}
      <div className="relative w-full h-36 flex-shrink-0">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
        ) : (
          <PlaceholderImg />
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{product.description}</p>
        )}

        <div className="mt-auto pt-3 flex items-center justify-between">
          <span className="font-bold text-brand-red text-sm">{brl(product.price)}</span>

          {cartItem ? (
            /* Controle de quantidade */
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
                className="w-7 h-7 rounded-full bg-brand-red text-white flex items-center justify-center
                           font-bold text-base leading-none hover:bg-brand-red-dark transition-colors"
                aria-label="Remover 1"
              >
                −
              </button>
              <span className="font-bold text-gray-800 w-5 text-center text-sm">
                {cartItem.quantity}
              </span>
              <button
                onClick={() => addItem(product)}
                className="w-7 h-7 rounded-full bg-brand-red text-white flex items-center justify-center
                           font-bold text-base leading-none hover:bg-brand-red-dark transition-colors"
                aria-label="Adicionar 1"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={() => addItem(product)}
              className="bg-brand-red text-white text-xs font-semibold px-3 py-1.5 rounded-full
                         hover:bg-brand-red-dark transition-colors"
            >
              Adicionar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
