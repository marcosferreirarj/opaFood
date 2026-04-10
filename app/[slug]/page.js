// Server Component — busca produtos e categorias com cache ISR (60 s).
import { notFound }             from 'next/navigation';
import { getStoreBySlug,
         getStoreProducts,
         getStoreCategories }   from '@/lib/store-queries';
import ProductCatalog           from '@/components/ProductCatalog';

export default async function StorePage({ params }) {
  // getStoreBySlug já está em cache após o layout executar — zero reads extras.
  const store = await getStoreBySlug(params.slug);
  if (!store) notFound();

  const [products, categories] = await Promise.all([
    getStoreProducts(store.id),
    getStoreCategories(store.id),
  ]);

  return <ProductCatalog products={products} categories={categories} />;
}
