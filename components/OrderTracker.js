'use client';

// Client Component responsável pelo onSnapshot em tempo real no pedido.
// Recebe storeId e orderId do Server Component pai.
import { useState, useEffect } from 'react';
import { doc, onSnapshot }     from 'firebase/firestore';
import Link                    from 'next/link';
import { db }                  from '@/lib/firebase';

const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// ─── Configuração dos status ──────────────────────────────────────────────────

const STATUS_STEPS = [
  {
    key:         'pending',
    label:       'Pedido recebido',
    description: 'Aguardando confirmação da loja',
    icon:        '🛍️',
  },
  {
    key:         'confirmed',
    label:       'Pedido confirmado',
    description: 'A loja aceitou seu pedido',
    icon:        '✅',
  },
  {
    key:         'preparing',
    label:       'Em preparo',
    description: 'Seu pedido está sendo preparado',
    icon:        '👨‍🍳',
  },
  {
    key:         'out_for_delivery',
    label:       'Saiu para entrega',
    description: 'Já estamos a caminho!',
    icon:        '🛵',
  },
  {
    key:         'delivered',
    label:       'Entregue!',
    description: 'Bom apetite!',
    icon:        '🎉',
  },
];

const STATUS_ORDER = STATUS_STEPS.map((s) => s.key);

const PAYMENT_LABELS = {
  pix:  'PIX',
  card: 'Cartão',
  cash: 'Dinheiro',
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function OrderTracker({ storeId, orderId, slug }) {
  const [order,    setOrder]    = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const ref  = doc(db, 'stores', storeId, 'orders', orderId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) { setNotFound(true); return; }
        setOrder({ id: snap.id, ...snap.data() });
      },
      () => setNotFound(true)
    );
    return unsub;
  }, [storeId, orderId]);

  if (notFound) return <NotFoundState slug={slug} />;
  if (!order)   return <LoadingState />;
  if (order.status === 'cancelled') return <CancelledState order={order} slug={slug} />;

  const currentIndex = STATUS_ORDER.indexOf(order.status);

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-10">

      {/* Cabeçalho */}
      <div className="text-center pt-4">
        <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Pedido</p>
        <p className="font-mono text-gray-500 text-sm">#{orderId.slice(-8).toUpperCase()}</p>
        <h1 className="font-black text-2xl text-gray-800 mt-2">
          {STATUS_STEPS[currentIndex]?.icon}{' '}
          {STATUS_STEPS[currentIndex]?.label}
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {STATUS_STEPS[currentIndex]?.description}
        </p>
      </div>

      {/* Stepper */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="relative">
          {/* Linha de progresso */}
          <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-100" />
          <div
            className="absolute left-4 top-4 w-0.5 bg-brand-red transition-all duration-500"
            style={{
              height: currentIndex === 0
                ? 0
                : `${(currentIndex / (STATUS_STEPS.length - 1)) * 100}%`,
            }}
          />

          <div className="space-y-5">
            {STATUS_STEPS.map((step, i) => {
              const done    = i < currentIndex;
              const current = i === currentIndex;
              return (
                <div key={step.key} className="flex items-center gap-4 relative">
                  {/* Círculo */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center
                                flex-shrink-0 text-sm z-10 transition-all ${
                      done    ? 'bg-brand-red text-white' :
                      current ? 'bg-brand-red text-white ring-4 ring-red-100' :
                                'bg-gray-100 text-gray-300'
                    }`}
                  >
                    {done ? '✓' : step.icon}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${
                      current ? 'text-brand-red' :
                      done    ? 'text-gray-700' : 'text-gray-300'
                    }`}>
                      {step.label}
                    </p>
                    {current && (
                      <p className="text-xs text-gray-400 mt-0.5">{step.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Itens do pedido */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <h2 className="font-semibold text-gray-800">Itens</h2>
        {order.items?.map((item, i) => (
          <div key={i} className="flex justify-between text-sm text-gray-700">
            <span>{item.quantity}× {item.name}</span>
            <span>{brl(item.price * item.quantity)}</span>
          </div>
        ))}
        <div className="border-t pt-3 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span><span>{brl(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Taxa de entrega</span>
            <span>{order.deliveryFee === 0 ? 'Grátis' : brl(order.deliveryFee)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-800">
            <span>Total</span>
            <span className="text-brand-red">{brl(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Endereço + Pagamento */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Entrega em</h3>
          <p className="text-sm text-gray-700">
            {order.deliveryAddress?.street}, {order.deliveryAddress?.number}
            {order.deliveryAddress?.complement ? ` — ${order.deliveryAddress.complement}` : ''}
          </p>
          <p className="text-sm text-gray-500">{order.deliveryAddress?.neighborhood}</p>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Pagamento</h3>
          <p className="text-sm text-gray-700">
            {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
            {order.changeFor ? ` — troco para ${brl(order.changeFor)}` : ''}
          </p>
        </div>
      </div>

      <Link
        href={`/${slug}`}
        className="block text-center text-sm text-brand-red font-semibold hover:underline"
      >
        Fazer novo pedido
      </Link>
    </div>
  );
}

// ─── Estados auxiliares ───────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function NotFoundState({ slug }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-5xl mb-4">🔍</p>
      <p className="text-gray-400 mb-6">Pedido não encontrado.</p>
      <Link href={`/${slug}`} className="bg-brand-red text-white font-bold px-6 py-3 rounded-xl hover:bg-brand-red-dark transition-colors">
        Voltar ao cardápio
      </Link>
    </div>
  );
}

function CancelledState({ order, slug }) {
  return (
    <div className="max-w-lg mx-auto text-center py-16">
      <p className="text-5xl mb-4">❌</p>
      <h1 className="font-bold text-xl text-gray-800 mb-2">Pedido cancelado</h1>
      <p className="text-gray-400 text-sm mb-6">
        Pedido #{order.id.slice(-8).toUpperCase()} foi cancelado.
      </p>
      <Link href={`/${slug}`} className="bg-brand-red text-white font-bold px-6 py-3 rounded-xl hover:bg-brand-red-dark transition-colors">
        Fazer novo pedido
      </Link>
    </div>
  );
}
