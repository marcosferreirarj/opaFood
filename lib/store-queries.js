// Queries do servidor com cache ISR (revalidate: 60 s).
// Cada chamada com o mesmo argumento reutiliza a resposta em cache,
// reduzindo leituras no Firestore ao mínimo.
import 'server-only';

import { unstable_cache } from 'next/cache';
import { adminDb }        from './firebase-admin';
import { isDevLoginEnabled, DEV_STORE, DEV_PRODUCTS } from './dev-auth';

// Converte Timestamps do Admin SDK para string ISO serializável via JSON.
function serialize(data) {
  if (!data || typeof data !== 'object') return data;
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => {
      if (v && typeof v.toDate === 'function') return [k, v.toDate().toISOString()];
      if (v && typeof v === 'object' && !Array.isArray(v)) return [k, serialize(v)];
      return [k, v];
    })
  );
}

// ─── slug → store ─────────────────────────────────────────────────────────────
// 2 leituras: slugs/{slug} + stores/{storeId}
// Cache de 60 s por slug.
export const getStoreBySlug = unstable_cache(
  async (slug) => {
    // Modo Dev: retorna a loja mock se o slug for 'loja-dev'
    if (isDevLoginEnabled && slug === 'loja-dev') {
      return { ...DEV_STORE };
    }

    try {
      const slugSnap = await adminDb.doc(`slugs/${slug}`).get();
      if (!slugSnap.exists) return null;

      const { storeId } = slugSnap.data();
      const storeSnap = await adminDb.doc(`stores/${storeId}`).get();
      if (!storeSnap.exists) return null;

      return { id: storeId, ...serialize(storeSnap.data()) };
    } catch (error) {
      console.error('Error fetching store by slug:', error);
      return null;
    }
  },
  ['store-by-slug'],
  { revalidate: 60 }
);

// ─── produtos da loja ─────────────────────────────────────────────────────────
// 1 query: products isAvailable == true, ordenados por order.
// Cache de 60 s por storeId.
export const getStoreProducts = unstable_cache(
  async (storeId) => {
    // Modo Dev: retorna produtos mock se o storeId for o da loja dev
    if (isDevLoginEnabled && storeId === DEV_STORE.id) {
      return [...DEV_PRODUCTS];
    }

    try {
      const snap = await adminDb
        .collection(`stores/${storeId}/products`)
        .where('isAvailable', '==', true)
        .orderBy('order', 'asc')
        .get();

      return snap.docs.map((doc) => ({ id: doc.id, ...serialize(doc.data()) }));
    } catch (error) {
      console.error('Error fetching store products:', error);
      return [];
    }
  },
  ['store-products'],
  { revalidate: 60 }
);
