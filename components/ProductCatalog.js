'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import ProductCard  from './ProductCard';
import CategoryNav  from './CategoryNav';

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function EmptySearch({ query }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-4xl mb-3">🔍</p>
      <p className="font-semibold text-gray-700">Nenhum resultado para &ldquo;{query}&rdquo;</p>
      <p className="text-sm text-gray-400 mt-1">Tente outro nome ou descrição.</p>
    </div>
  );
}

function EmptyMenu() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-5xl mb-4">🍽️</p>
      <p className="text-gray-400 text-base">Este cardápio ainda não tem itens disponíveis.</p>
    </div>
  );
}

/**
 * Main storefront product listing.
 *
 * – Search bar (client-side, filters name + description)
 * – Sticky CategoryNav (visible when there are categories and no active search)
 * – Products grouped by category with scroll-to-section behaviour
 * – Falls back to a flat grid when no categories exist
 */
export default function ProductCatalog({ products, categories }) {
  const [search,          setSearch]          = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const sectionRefs = useRef({});

  // ── Filtered products ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [products, search]);

  // ── Group by category ──────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
    const byId   = {};
    const uncategorized = [];

    filtered.forEach((p) => {
      if (p.categoryId && catMap[p.categoryId]) {
        (byId[p.categoryId] ??= []).push(p);
      } else {
        uncategorized.push(p);
      }
    });

    const result = categories
      .filter((c) => byId[c.id]?.length)
      .map((c) => ({ id: c.id, name: c.name, products: byId[c.id] }));

    if (uncategorized.length) {
      result.push({
        id:       '_uncategorized',
        name:     categories.length ? 'Outros' : 'Cardápio',
        products: uncategorized,
      });
    }

    return result;
  }, [filtered, categories]);

  // ── Category nav interaction ───────────────────────────────────────────────
  const handleCategorySelect = useCallback((catId) => {
    setActiveCategoryId(catId);
    if (!catId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // Offset accounts for sticky header (h-16 = 64px) + CategoryNav (~48px) + small gap
    const el = sectionRefs.current[catId];
    if (el) {
      const offset = 64 + 48 + 12;
      const top    = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, []);

  // ── Intersection Observer: update active pill as user scrolls ─────────────
  const registerSection = useCallback((catId, el) => {
    if (!el) return;
    sectionRefs.current[catId] = el;
  }, []);

  const isSearching = search.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Search bar */}
      <div className="relative mb-4">
        <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <SearchIcon />
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar no cardápio…"
          aria-label="Buscar produto"
          className="w-full pl-9 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl
                     text-sm text-gray-700 placeholder-gray-400 shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent
                     transition"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label="Limpar busca"
            className="absolute inset-y-0 right-3 flex items-center text-gray-400
                       hover:text-gray-600 transition-colors"
          >
            <ClearIcon />
          </button>
        )}
      </div>

      {/* Category nav — hidden while searching */}
      {!isSearching && (
        <CategoryNav
          categories={categories}
          activeId={activeCategoryId}
          onSelect={handleCategorySelect}
        />
      )}

      {/* Product sections */}
      {grouped.length === 0 ? (
        isSearching ? <EmptySearch query={search} /> : <EmptyMenu />
      ) : (
        <div className={isSearching ? 'mt-2' : 'mt-6'}>
          {grouped.map((group, idx) => (
            <section
              key={group.id}
              ref={(el) => registerSection(group.id, el)}
              id={`cat-${group.id}`}
              className={idx > 0 ? 'mt-8' : ''}
              aria-labelledby={`cat-heading-${group.id}`}
            >
              {/* Section heading — hidden for flat lists with a single group */}
              {(grouped.length > 1 || !isSearching) && (
                <h2
                  id={`cat-heading-${group.id}`}
                  className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2"
                >
                  {group.name}
                  <span className="text-xs font-normal text-gray-400">
                    ({group.products.length})
                  </span>
                </h2>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {group.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </motion.div>
  );
}
