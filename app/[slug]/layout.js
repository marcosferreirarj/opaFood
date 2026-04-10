// Server Component — busca dados da loja com cache ISR (60 s).
// Resolve: slug → storeId → store document (2 leituras no Firestore).
// Após o cache esquentar, zero leituras por até 60 s independente do tráfego.
import { notFound }        from 'next/navigation';
import { getStoreBySlug }  from '@/lib/store-queries';
import { StoreProvider }   from '@/context/StoreContext';
import { CartProvider }    from '@/context/CartContext';
import StoreHeader         from '@/components/StoreHeader';
import CartDrawer          from '@/components/CartDrawer';
import CartBottomBar       from '@/components/CartBottomBar';

export async function generateMetadata({ params }) {
  const store = await getStoreBySlug(params.slug);
  if (!store) return { title: 'Loja não encontrada — OpaDelivery' };
  return {
    title:       `${store.name} — OpaDelivery`,
    description: store.description || `Cardápio de ${store.name}`,
  };
}

export default async function StoreLayout({ children, params }) {
  const store = await getStoreBySlug(params.slug);
  if (!store) notFound();

  return (
    // StoreProvider disponibiliza metadados da loja para toda a árvore de componentes.
    // CartProvider adiciona o estado do carrinho, consumindo o mesmo storeId/slug.
    <StoreProvider store={store}>
      <CartProvider storeId={store.id} storeSlug={params.slug} storeName={store.name} deliveryFee={store.deliveryFee ?? 0}>
        <div className="min-h-screen bg-gray-50">
          {/* StoreHeader usa useStoreContext() internamente — sem prop drilling */}
          <StoreHeader />

          {/* pb-32 reserva espaço para o CartBottomBar fixo no mobile */}
          <main className="max-w-4xl mx-auto px-4 pt-4 pb-32">
            {children}
          </main>

          <CartDrawer />
          <CartBottomBar />
        </div>
      </CartProvider>
    </StoreProvider>
  );
}
