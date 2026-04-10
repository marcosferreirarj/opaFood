'use client';

import { useState, useEffect } from 'react';
import { useRouter }           from 'next/navigation';
import { onAuthStateChangedOrDev, isDevLoginEnabled, DEV_STORE, DEV_ORDERS_INITIAL } from '@/lib/dev-auth';
import {
  collection, query, where,
  getDocs, doc, updateDoc,
  onSnapshot, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { auth, db }    from '@/lib/firebase';
import DashboardNav    from '@/components/DashboardNav';

const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// ─── Configuração de status ───────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:          { label: 'Recebido',    color: 'bg-yellow-100 text-yellow-700',  next: 'confirmed',        nextLabel: 'Confirmar' },
  confirmed:        { label: 'Confirmado',  color: 'bg-blue-100 text-blue-700',      next: 'preparing',        nextLabel: 'Iniciar preparo' },
  preparing:        { label: 'Em preparo',  color: 'bg-orange-100 text-orange-700',  next: 'out_for_delivery', nextLabel: 'Saiu p/ entrega' },
  out_for_delivery: { label: 'Em entrega',  color: 'bg-purple-100 text-purple-700',  next: 'delivered',        nextLabel: 'Marcar entregue' },
  delivered:        { label: 'Entregue',    color: 'bg-green-100 text-green-700',    next: null,               nextLabel: null },
  cancelled:        { label: 'Cancelado',   color: 'bg-gray-100 text-gray-400',      next: null,               nextLabel: null },
};

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'out_for_delivery'];

// ─── Filtros ──────────────────────────────────────────────────────────────────

const FILTERS = [
  { id: 'active',    label: 'Ativos' },
  { id: 'all',       label: 'Todos' },
  { id: 'delivered', label: 'Entregues' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PedidosPage() {
  const router  = useRouter();
  const [store,  setStore]  = useState(null);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubOrders = null;

    const unsubAuth = onAuthStateChangedOrDev(auth, async (user) => {
      if (!user) { router.replace('/dashboard'); return; }

      if (isDevLoginEnabled) {
        setStore(DEV_STORE);
        setOrders(DEV_ORDERS_INITIAL);
        setLoading(false);
        return;
      }

      // Busca loja do owner
      const storeSnap = await getDocs(
        query(collection(db, 'stores'), where('ownerId', '==', user.uid))
      );
      if (storeSnap.empty) { setLoading(false); return; }

      const storeDoc  = storeSnap.docs[0];
      const storeData = { id: storeDoc.id, ...storeDoc.data() };
      setStore(storeData);

      // onSnapshot em tempo real — todos os pedidos, ordenados pelo mais recente
      const ordersRef = collection(db, 'stores', storeData.id, 'orders');
      unsubOrders = onSnapshot(
        query(ordersRef, orderBy('createdAt', 'desc')),
        (snap) => {
          setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setLoading(false);
        },
        () => setLoading(false)
      );
    });

    return () => {
      unsubAuth();
      unsubOrders?.();
    };
  }, [router]);

  async function advanceStatus(orderId, nextStatus) {
    if (!store) return;
    if (isDevLoginEnabled) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
      return;
    }
    await updateDoc(doc(db, 'stores', store.id, 'orders', orderId), {
      status:    nextStatus,
      updatedAt: serverTimestamp(),
    });
  }

  async function cancelOrder(orderId) {
    if (!store) return;
    if (isDevLoginEnabled) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'cancelled' } : o))
      );
      return;
    }
    await updateDoc(doc(db, 'stores', store.id, 'orders', orderId), {
      status:    'cancelled',
      updatedAt: serverTimestamp(),
    });
  }

  // Filtragem local (dados já estão em memória via onSnapshot)
  const filtered = orders.filter((o) => {
    if (filter === 'active')    return ACTIVE_STATUSES.includes(o.status);
    if (filter === 'delivered') return o.status === 'delivered';
    return true;
  });

  const activeCount = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;

  if (loading) return <FullPageSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav storeName={store?.name} storeSlug={store?.slug} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Cabeçalho + filtros */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800">
            Pedidos
            {activeCount > 0 && (
              <span className="ml-2 bg-brand-red text-white text-xs font-bold
                               rounded-full px-2 py-0.5">
                {activeCount}
              </span>
            )}
          </h1>
        </div>

        {/* Tabs de filtro */}
        <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap
                          transition-colors flex-shrink-0 ${
                filter === id
                  ? 'bg-brand-red text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {label}
              {id === 'active' && activeCount > 0 && (
                <span className="ml-1 opacity-80">({activeCount})</span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyOrders filter={filter} />
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAdvance={advanceStatus}
                onCancel={cancelOrder}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── OrderCard ────────────────────────────────────────────────────────────────

function OrderCard({ order, onAdvance, onCancel }) {
  const config  = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const [busy, setBusy] = useState(false);

  async function handleAdvance() {
    setBusy(true);
    await onAdvance(order.id, config.next);
    setBusy(false);
  }

  async function handleCancel() {
    setBusy(true);
    await onCancel(order.id);
    setBusy(false);
  }

  const createdAt = order.createdAt?.toDate?.() ?? null;
  const timeLabel = createdAt
    ? createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      {/* Linha 1: número + status + hora */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-gray-400">
            #{order.id.slice(-6).toUpperCase()}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.color}`}>
            {config.label}
          </span>
        </div>
        <span className="text-xs text-gray-400">{timeLabel}</span>
      </div>

      {/* Linha 2: nome + telefone */}
      <div>
        <p className="font-semibold text-gray-800 text-sm">{order.customerName}</p>
        <p className="text-xs text-gray-400">{order.customerPhone}</p>
      </div>

      {/* Endereço */}
      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
        📍 {order.deliveryAddress?.street}, {order.deliveryAddress?.number}
        {order.deliveryAddress?.complement ? ` — ${order.deliveryAddress.complement}` : ''},{' '}
        {order.deliveryAddress?.neighborhood}
      </p>

      {/* Itens resumidos */}
      <div className="text-xs text-gray-600 space-y-0.5">
        {order.items?.slice(0, 3).map((item, i) => (
          <p key={i}>{item.quantity}× {item.name}</p>
        ))}
        {(order.items?.length ?? 0) > 3 && (
          <p className="text-gray-400">+{order.items.length - 3} item(s)…</p>
        )}
      </div>

      {/* Total + pagamento */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500 text-xs">
          {order.paymentMethod === 'pix'  && '⚡ PIX'}
          {order.paymentMethod === 'card' && '💳 Cartão'}
          {order.paymentMethod === 'cash' && `💵 Dinheiro${order.changeFor ? ` (troco p/ ${brl(order.changeFor)})` : ''}`}
        </span>
        <span className="font-bold text-brand-red">{brl(order.total)}</span>
      </div>

      {/* Ações */}
      {config.next && (
        <div className="flex gap-2 pt-1">
          {/* Cancelar — apenas para pending e confirmed */}
          {(order.status === 'pending' || order.status === 'confirmed') && (
            <button
              onClick={handleCancel}
              disabled={busy}
              className="flex-none px-3 py-2 border border-gray-200 text-gray-500 text-xs
                         font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={handleAdvance}
            disabled={busy}
            className="flex-1 bg-brand-red text-white text-sm font-bold py-2.5 rounded-xl
                       hover:bg-brand-red-dark disabled:opacity-50 transition-colors"
          >
            {busy ? '…' : config.nextLabel}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Auxiliares ───────────────────────────────────────────────────────────────

function EmptyOrders({ filter }) {
  const messages = {
    active:    { icon: '🎉', text: 'Nenhum pedido ativo no momento.' },
    delivered: { icon: '📦', text: 'Nenhum pedido entregue ainda.' },
    all:       { icon: '📋', text: 'Nenhum pedido registrado.' },
  };
  const { icon, text } = messages[filter] ?? messages.all;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
      <p className="text-4xl mb-3">{icon}</p>
      <p className="text-gray-400">{text}</p>
    </div>
  );
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
