'use client';

import { useEffect, useRef } from 'react';

/**
 * Sticky horizontal category pills.
 *
 * Sticks at top-16 (64 px) so it sits immediately below the StoreHeader info
 * bar, which is also sticky at top-0 with h-16.
 *
 * Uses -mx-4 to break out of the parent's px-4 padding so the white
 * background spans the full container width.
 */
export default function CategoryNav({ categories, activeId, onSelect }) {
  const listRef = useRef(null);

  // Keep active pill scrolled into view inside the overflow-x container
  useEffect(() => {
    if (!listRef.current) return;
    const selector = activeId ? `[data-id="${activeId}"]` : '[data-id="all"]';
    const btn = listRef.current.querySelector(selector);
    btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeId]);

  if (!categories.length) return null;

  const pillBase =
    'flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-1';
  const pillActive  = 'bg-brand-red text-white shadow-sm';
  const pillInactive = 'bg-gray-100 text-gray-600 hover:bg-gray-200';

  return (
    <nav
      className="sticky top-16 z-30 bg-white border-b border-gray-100 shadow-sm -mx-4"
      aria-label="Categorias do cardápio"
    >
      <div
        ref={listRef}
        className="flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide"
        role="list"
      >
        <button
          role="listitem"
          data-id="all"
          onClick={() => onSelect(null)}
          className={`${pillBase} ${!activeId ? pillActive : pillInactive}`}
          aria-pressed={!activeId}
        >
          Todos
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            role="listitem"
            data-id={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`${pillBase} ${activeId === cat.id ? pillActive : pillInactive}`}
            aria-pressed={activeId === cat.id}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </nav>
  );
}
