// Server Component — resolve slug → storeId via cache (0 reads extras).
// Passa storeId para OrderTracker (Client Component) que faz o onSnapshot.
import { notFound }       from 'next/navigation';
import { getStoreBySlug } from '@/lib/store-queries';
import OrderTracker       from '@/components/OrderTracker';

export async function generateMetadata() {
  return { title: 'Acompanhe seu pedido — OpaDelivery' };
}

export default async function OrderTrackingPage({ params }) {
  const { slug, orderId } = params;

  const store = await getStoreBySlug(slug);
  if (!store) notFound();

  return <OrderTracker storeId={store.id} orderId={orderId} slug={slug} />;
}
