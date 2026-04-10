// Server Component — busca produtos com cache ISR (60 s).
import { notFound }          from 'next/navigation';
import { getStoreBySlug }    from '@/lib/store-queries';
import { getStoreProducts }  from '@/lib/store-queries';
import ProductGrid           from '@/components/ProductGrid';

export default async function StorePage({ params }) {
  // getStoreBySlug já está em cache após o layout executar — zero reads extras.
  const store = await getStoreBySlug(params.slug);
  if (!store) notFound();

  const products = await getStoreProducts(store.id);

  return <ProductGrid products={products} storeName={store.name} />;
}
