'use client';

import ProductCard from './ProductCard';

export default function ProductGrid({ products, storeName }) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-5xl mb-4">🍽️</p>
        <p className="text-gray-400 text-base">
          {storeName} ainda não tem produtos disponíveis.
        </p>
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-bold text-gray-800 mb-4">Cardápio</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
