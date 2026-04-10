'use client';

import { useState }   from 'react';
import { useRouter }  from 'next/navigation';
import Link           from 'next/link';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db }         from '@/lib/firebase';
import { useCart }    from '@/context/CartContext';

const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const PAYMENT_METHODS = [
  { id: 'pix',  label: 'PIX',     icon: '⚡' },
  { id: 'card', label: 'Cartão',  icon: '💳' },
  { id: 'cash', label: 'Dinheiro', icon: '💵' },
];

export default function CheckoutPage({ params }) {
  const router = useRouter();
  const { items, subtotal, total, deliveryFee, clearCart, storeId, storeSlug } = useCart();

  const [form, setForm] = useState({
    customerName:  '',
    customerPhone: '',
    street:        '',
    number:        '',
    neighborhood:  '',
    complement:    '',
    paymentMethod: 'pix',
    changeFor:     '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Redireciona se o carrinho estiver vazio (ex: reload pós-pedido)
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-5xl mb-4">🛍️</p>
        <p className="text-gray-400 mb-6">Sua sacola está vazia.</p>
        <Link
          href={`/${params.slug}`}
          className="bg-brand-red text-white font-bold px-6 py-3 rounded-xl
                     hover:bg-brand-red-dark transition-colors"
        >
          Voltar ao cardápio
        </Link>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const orderPayload = {
        customerName:    form.customerName.trim(),
        customerPhone:   form.customerPhone.trim(),
        deliveryAddress: {
          street:       form.street.trim(),
          number:       form.number.trim(),
          neighborhood: form.neighborhood.trim(),
          complement:   form.complement.trim(),
        },
        // Snapshot dos itens — preserva nome e preço no momento do pedido
        items: items.map(({ id, name, price, quantity, imageUrl }) => ({
          id, name, price, quantity, imageUrl: imageUrl ?? null,
        })),
        subtotal,
        deliveryFee,
        total,
        paymentMethod: form.paymentMethod,
        ...(form.paymentMethod === 'cash' && form.changeFor
          ? { changeFor: parseFloat(form.changeFor.replace(',', '.')) }
          : {}),
        status:    'pending',
        userId:    null,         // pedido anônimo no MVP
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const ref = await addDoc(collection(db, `stores/${storeId}/orders`), orderPayload);
      clearCart();
      router.push(`/${storeSlug}/pedido/${ref.id}`);
    } catch {
      setError('Erro ao realizar pedido. Tente novamente.');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Voltar */}
      <Link
        href={`/${params.slug}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        ← Voltar ao cardápio
      </Link>

      <h1 className="text-xl font-bold text-gray-800">Finalizar pedido</h1>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Seus dados ─────────────────────────────────── */}
        <Card title="Seus dados">
          <Field label="Nome completo *">
            <input
              type="text" value={form.customerName} required
              onChange={(e) => set('customerName', e.target.value)}
              placeholder="João Silva"
              className={inputCls}
            />
          </Field>
          <Field label="WhatsApp / Telefone *">
            <input
              type="tel" value={form.customerPhone} required
              onChange={(e) => set('customerPhone', e.target.value)}
              placeholder="(11) 99999-9999"
              className={inputCls}
            />
          </Field>
        </Card>

        {/* ── Endereço ───────────────────────────────────── */}
        <Card title="Endereço de entrega">
          <Field label="Rua *">
            <input
              type="text" value={form.street} required
              onChange={(e) => set('street', e.target.value)}
              placeholder="Rua das Flores"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-2">
              <Field label="Número *">
                <input
                  type="text" value={form.number} required
                  onChange={(e) => set('number', e.target.value)}
                  placeholder="123"
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="col-span-3">
              <Field label="Bairro *">
                <input
                  type="text" value={form.neighborhood} required
                  onChange={(e) => set('neighborhood', e.target.value)}
                  placeholder="Centro"
                  className={inputCls}
                />
              </Field>
            </div>
          </div>
          <Field label="Complemento">
            <input
              type="text" value={form.complement}
              onChange={(e) => set('complement', e.target.value)}
              placeholder="Apto 42, Bloco B…"
              className={inputCls}
            />
          </Field>
        </Card>

        {/* ── Pagamento ──────────────────────────────────── */}
        <Card title="Forma de pagamento">
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map(({ id, label, icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => set('paymentMethod', id)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-sm
                            font-semibold transition-colors ${
                              form.paymentMethod === id
                                ? 'border-brand-red bg-red-50 text-brand-red'
                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
              >
                <span className="text-xl">{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {form.paymentMethod === 'cash' && (
            <Field label="Troco para (opcional)">
              <input
                type="text" inputMode="decimal" value={form.changeFor}
                onChange={(e) => set('changeFor', e.target.value)}
                placeholder="Ex: 50,00"
                className={inputCls}
              />
            </Field>
          )}
        </Card>

        {/* ── Resumo ─────────────────────────────────────── */}
        <Card title="Resumo do pedido">
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm text-gray-700">
                <span>{item.quantity}× {item.name}</span>
                <span>{brl(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t mt-3 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span><span>{brl(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Taxa de entrega</span>
              <span>{deliveryFee === 0 ? 'Grátis' : brl(deliveryFee)}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-gray-800 pt-1">
              <span>Total</span>
              <span className="text-brand-red">{brl(total)}</span>
            </div>
          </div>
        </Card>

        {error && <p className="text-brand-red text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-brand-red text-white font-bold py-4 rounded-2xl
                     hover:bg-brand-red-dark transition-colors disabled:opacity-60
                     text-base active:scale-[0.98]"
        >
          {saving ? 'Enviando pedido…' : `Confirmar pedido · ${brl(total)}`}
        </button>
      </form>
    </div>
  );
}

// ─── Micro-componentes ────────────────────────────────────────────────────────

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <h2 className="font-semibold text-gray-800">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent';
