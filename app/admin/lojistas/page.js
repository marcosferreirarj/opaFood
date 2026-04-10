'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter }                         from 'next/navigation';
import { onAuthStateChanged, signOut }       from 'firebase/auth';
import { auth }                              from '@/lib/firebase';
import {
  checkAdminToken, getAllStores,
  createLojista,   updateStore,
} from '../actions';

// ─── Formatação ───────────────────────────────────────────────────────────────

const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const dataBR = (iso) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminLojistasPage() {
  const router = useRouter();
  const [user,        setUser]        = useState(null);
  const [stores,      setStores]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [editStore,   setEditStore]   = useState(null);

  const loadStores = useCallback(async (firebaseUser) => {
    const token = await firebaseUser.getIdToken();
    const data  = await getAllStores(token);
    setStores(data);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) { router.replace('/admin'); return; }

      const token  = await firebaseUser.getIdToken();
      const check  = await checkAdminToken(token);
      if (!check.ok) { await signOut(auth); router.replace('/admin'); return; }

      setUser(firebaseUser);
      await loadStores(firebaseUser);
      setLoading(false);
    });
    return unsub;
  }, [router, loadStores]);

  async function handleSignOut() {
    await signOut(auth);
    router.replace('/admin');
  }

  function handleCreated(store) {
    setStores((prev) => [store, ...prev]);
    setShowCreate(false);
  }

  function handleUpdated(storeId, data) {
    setStores((prev) => prev.map((s) => s.id === storeId ? { ...s, ...data } : s));
    setEditStore(null);
  }

  if (loading) return <FullPageSpinner />;

  const open   = stores.filter((s) => s.isOpen).length;
  const closed = stores.length - open;

  return (
    <div className="min-h-screen bg-gray-950">
      {/* ── Header ── */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black text-base">O</span>
            </div>
            <span className="font-black text-white text-lg">
              Opa<span className="text-brand-red">Admin</span>
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="Total"    value={stores.length} />
          <StatCard label="Abertas"  value={open}   color="text-green-400" />
          <StatCard label="Fechadas" value={closed} color="text-gray-500"  />
        </div>

        {/* ── Toolbar ── */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">Lojistas</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-brand-red text-white font-semibold px-4 py-2 rounded-xl
                       hover:bg-brand-red-dark transition-colors flex items-center gap-1.5 text-sm"
          >
            <span className="text-lg leading-none">+</span> Novo lojista
          </button>
        </div>

        {/* ── Lista ── */}
        {stores.length === 0 ? (
          <EmptyState onAdd={() => setShowCreate(true)} />
        ) : (
          <div className="space-y-3">
            {stores.map((store) => (
              <StoreCard key={store.id} store={store} onEdit={() => setEditStore(store)} />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal
          user={user}
          onClose={() => setShowCreate(false)}
          onSuccess={handleCreated}
        />
      )}

      {editStore && (
        <EditModal
          user={user}
          store={editStore}
          onClose={() => setEditStore(null)}
          onSuccess={handleUpdated}
        />
      )}
    </div>
  );
}

// ─── StoreCard ────────────────────────────────────────────────────────────────

function StoreCard({ store, onEdit }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5
                    flex flex-col sm:flex-row sm:items-center gap-4">
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-bold text-white truncate">{store.name}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
            store.isOpen
              ? 'bg-green-900/60 text-green-400'
              : 'bg-gray-800 text-gray-500'
          }`}>
            {store.isOpen ? 'Aberto' : 'Fechado'}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-gray-400">
          <span>
            opadelivery.com/
            <a
              href={`/${store.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-red hover:underline"
            >
              {store.slug}
            </a>
          </span>
          {store.phone && <span>{store.phone}</span>}
          <span>Entrega: {brl(store.deliveryFee)}</span>
          {store.minOrder > 0 && <span>Mín: {brl(store.minOrder)}</span>}
        </div>

        <p className="text-xs text-gray-600 mt-1">Criado em {dataBR(store.createdAt)}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0">
        <a
          href={`/dashboard`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs border border-gray-700 text-gray-400 px-3 py-1.5
                     rounded-lg hover:border-gray-500 hover:text-white transition-colors"
        >
          Dashboard ↗
        </a>
        <button
          onClick={onEdit}
          className="text-xs bg-gray-800 text-gray-300 px-3 py-1.5
                     rounded-lg hover:bg-gray-700 hover:text-white transition-colors"
        >
          Configurações
        </button>
      </div>
    </div>
  );
}

// ─── CreateModal ──────────────────────────────────────────────────────────────

function CreateModal({ user, onClose, onSuccess }) {
  const [form, setForm] = useState({
    storeName:   '',
    slug:        '',
    email:       '',
    password:    '',
    phone:       '',
    deliveryFee: '',
    minOrder:    '',
  });
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [created,   setCreated]   = useState(null); // guarda credenciais após criação

  function handleChange(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-gera slug a partir do nome enquanto usuário não editou o slug manualmente
      if (field === 'storeName' && !prev._slugEdited) {
        next.slug = slugify(value);
      }
      return next;
    });
  }

  function handleSlugChange(value) {
    setForm((prev) => ({ ...prev, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, ''), _slugEdited: true }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const token  = await user.getIdToken();
      const result = await createLojista(token, {
        email:       form.email,
        password:    form.password,
        storeName:   form.storeName,
        slug:        form.slug,
        phone:       form.phone,
        deliveryFee: form.deliveryFee,
        minOrder:    form.minOrder,
      });
      setCreated({ ...result, email: form.email, password: form.password });
      onSuccess(result);
    } catch (err) {
      setError(err.message || 'Erro ao criar lojista.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Backdrop onClose={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6
                      w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">

        {created ? (
          /* ── Tela de sucesso com credenciais ── */
          <div className="text-center">
            <div className="w-14 h-14 bg-green-900/40 rounded-full flex items-center justify-center
                            text-3xl mx-auto mb-4">
              ✓
            </div>
            <h2 className="font-bold text-xl text-white mb-1">Lojista criado!</h2>
            <p className="text-gray-400 text-sm mb-6">
              Compartilhe as credenciais abaixo com o lojista.
            </p>

            <div className="bg-gray-800 rounded-xl p-4 text-left space-y-3 mb-6">
              <CredRow label="Loja"     value={created.name} />
              <CredRow label="URL"      value={`opadelivery.com/${created.slug}`} />
              <CredRow label="E-mail"   value={created.email}    copyable />
              <CredRow label="Senha"    value={created.password} copyable />
            </div>

            <button
              onClick={onClose}
              className="w-full bg-brand-red text-white font-bold py-3 rounded-xl
                         hover:bg-brand-red-dark transition-colors"
            >
              Fechar
            </button>
          </div>
        ) : (
          /* ── Formulário de criação ── */
          <>
            <ModalHeader title="Novo lojista" onClose={onClose} />

            <form onSubmit={handleSubmit} className="space-y-4">
              <Section title="Dados da loja">
                <Field label="Nome da loja *">
                  <Input
                    value={form.storeName}
                    onChange={(v) => handleChange('storeName', v)}
                    placeholder="Ex: Burguer do Zé"
                    required
                  />
                </Field>

                <Field label="Slug (URL) *">
                  <div className="flex items-center border border-gray-700 rounded-xl overflow-hidden
                                  focus-within:ring-2 focus-within:ring-brand-red">
                    <span className="pl-3 text-gray-600 text-sm whitespace-nowrap">
                      opadelivery.com/
                    </span>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      required
                      placeholder="burguer-do-ze"
                      className="flex-1 bg-transparent px-2 py-3 text-sm text-white
                                 placeholder-gray-600 focus:outline-none"
                    />
                  </div>
                </Field>

                <Field label="Telefone">
                  <Input
                    value={form.phone}
                    onChange={(v) => handleChange('phone', v)}
                    placeholder="(11) 99999-0000"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Taxa de entrega (R$)">
                    <Input
                      value={form.deliveryFee}
                      onChange={(v) => handleChange('deliveryFee', v)}
                      placeholder="5,00"
                      inputMode="decimal"
                    />
                  </Field>
                  <Field label="Pedido mínimo (R$)">
                    <Input
                      value={form.minOrder}
                      onChange={(v) => handleChange('minOrder', v)}
                      placeholder="20,00"
                      inputMode="decimal"
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Acesso ao dashboard">
                <Field label="E-mail *">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(v) => handleChange('email', v)}
                    placeholder="lojista@email.com"
                    required
                  />
                </Field>

                <Field label="Senha *">
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(v) => handleChange('password', v)}
                    placeholder="mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                </Field>
              </Section>

              {error && <p className="text-brand-red text-sm">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 border border-gray-700 text-gray-400 font-semibold
                             py-3 rounded-xl hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-brand-red text-white font-bold py-3 rounded-xl
                             hover:bg-brand-red-dark transition-colors disabled:opacity-60"
                >
                  {saving ? 'Criando…' : 'Criar lojista'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </Backdrop>
  );
}

// ─── EditModal ────────────────────────────────────────────────────────────────

function EditModal({ user, store, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name:        store.name        || '',
    phone:       store.phone       || '',
    description: store.description || '',
    deliveryFee: store.deliveryFee != null ? String(store.deliveryFee) : '',
    minOrder:    store.minOrder    != null ? String(store.minOrder)    : '',
    isOpen:      store.isOpen      ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const data = {
        name:        form.name,
        phone:       form.phone,
        description: form.description,
        deliveryFee: parseFloat(form.deliveryFee.replace(',', '.')) || 0,
        minOrder:    parseFloat(form.minOrder.replace(',', '.'))    || 0,
        isOpen:      form.isOpen,
      };
      const token = await user.getIdToken();
      await updateStore(token, store.id, data);
      onSuccess(store.id, data);
    } catch (err) {
      setError(err.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Backdrop onClose={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6
                      w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <ModalHeader title={`Configurações — ${store.name}`} onClose={onClose} />

        {/* Slug (somente leitura) */}
        <div className="bg-gray-800 rounded-xl px-4 py-3 mb-4">
          <p className="text-xs text-gray-500 mb-0.5">URL da loja</p>
          <p className="text-sm text-gray-300">
            opadelivery.com/<span className="text-brand-red">{store.slug}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nome da loja *">
            <Input
              value={form.name}
              onChange={(v) => handleChange('name', v)}
              placeholder="Nome da loja"
              required
            />
          </Field>

          <Field label="Telefone">
            <Input
              value={form.phone}
              onChange={(v) => handleChange('phone', v)}
              placeholder="(11) 99999-0000"
            />
          </Field>

          <Field label="Descrição">
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={2}
              placeholder="Breve descrição da loja…"
              className={`${inputCls} resize-none`}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Taxa de entrega (R$)">
              <Input
                value={form.deliveryFee}
                onChange={(v) => handleChange('deliveryFee', v)}
                placeholder="5,00"
                inputMode="decimal"
              />
            </Field>
            <Field label="Pedido mínimo (R$)">
              <Input
                value={form.minOrder}
                onChange={(v) => handleChange('minOrder', v)}
                placeholder="20,00"
                inputMode="decimal"
              />
            </Field>
          </div>

          {/* Toggle isOpen */}
          <div className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">Status da loja</p>
              <p className="text-xs text-gray-500">Controla se a loja aparece como aberta</p>
            </div>
            <button
              type="button"
              onClick={() => handleChange('isOpen', !form.isOpen)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                form.isOpen ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow
                                transition-transform ${form.isOpen ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {error && <p className="text-brand-red text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-700 text-gray-400 font-semibold
                         py-3 rounded-xl hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-brand-red text-white font-bold py-3 rounded-xl
                         hover:bg-brand-red-dark transition-colors disabled:opacity-60"
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </Backdrop>
  );
}

// ─── Micro-componentes ────────────────────────────────────────────────────────

function StatCard({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
      <p className="text-5xl mb-4">🏪</p>
      <p className="text-gray-500 mb-6">Nenhum lojista cadastrado ainda.</p>
      <button
        onClick={onAdd}
        className="bg-brand-red text-white font-bold px-6 py-3 rounded-xl
                   hover:bg-brand-red-dark transition-colors"
      >
        Cadastrar primeiro lojista
      </button>
    </div>
  );
}

function Backdrop({ children, onClose }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto w-full flex justify-center">
          {children}
        </div>
      </div>
    </>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="font-bold text-lg text-white">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
        aria-label="Fechar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, type = 'text', placeholder, required, minLength, inputMode }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      minLength={minLength}
      inputMode={inputMode}
      className={inputCls}
    />
  );
}

function CredRow({ label, value, copyable }) {
  function copy() {
    navigator.clipboard.writeText(value).catch(() => {});
  }
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-500 w-14 flex-shrink-0">{label}</span>
      <span className="text-sm text-white font-mono flex-1 truncate">{value}</span>
      {copyable && (
        <button
          type="button"
          onClick={copy}
          className="text-xs text-gray-500 hover:text-white transition-colors flex-shrink-0"
        >
          Copiar
        </button>
      )}
    </div>
  );
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const inputCls =
  'w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white ' +
  'placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent';
