'use client';

import { useState, useEffect } from 'react';
import Image                from 'next/image';
import { useRouter }           from 'next/navigation';
import { onAuthStateChangedOrDev, isDevLoginEnabled, DEV_STORE, DEV_PRODUCTS } from '@/lib/dev-auth';
import {
  collection, query, where,
  getDocs, doc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import DashboardNav           from '@/components/DashboardNav';

const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProdutosPage() {
  const router = useRouter();
  const [store,       setStore]       = useState(null);
  const [products,    setProducts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChangedOrDev(auth, async (user) => {
      if (!user) { router.replace('/dashboard'); return; }

      if (isDevLoginEnabled) {
        setStore(DEV_STORE);
        setProducts(DEV_PRODUCTS);
        setLoading(false);
        return;
      }

      const q    = query(collection(db, 'stores'), where('ownerId', '==', user.uid));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const d = snap.docs[0];
        const storeData = { id: d.id, ...d.data() };
        setStore(storeData);

        const prodSnap = await getDocs(collection(db, `stores/${d.id}/products`));
        setProducts(prodSnap.docs.map((p) => ({ id: p.id, ...p.data() })));
      }
      setLoading(false);
    });
    return unsub;
  }, [router]);

  function handleNewProduct(product) {
    setProducts((prev) => [product, ...prev]);
    setIsModalOpen(false);
  }

  if (loading) return <FullPageSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav storeName={store?.name} storeSlug={store?.slug} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800">Produtos</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-red text-white font-semibold px-4 py-2 rounded-xl
                       hover:bg-brand-red-dark transition-colors flex items-center gap-1.5 text-sm"
          >
            <span className="text-lg leading-none">+</span> Adicionar produto
          </button>
        </div>

        {products.length === 0 ? (
          <EmptyState onAdd={() => setIsModalOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {products.map((p) => (
              <ProductRow key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <AddProductModal
          storeId={store?.id}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleNewProduct}
        />
      )}
    </div>
  );
}

// ─── ProductRow ───────────────────────────────────────────────────────────────

function ProductRow({ product }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
    <div className="relative w-14 h-14 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
      {product.imageUrl ? (
        <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
      ) : (
        <div className="w-full h-full bg-brand-orange-light flex items-center justify-center text-2xl">
          🍽️
        </div>
      )}
    </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm truncate">{product.name}</p>
        {product.description && (
          <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{product.description}</p>
        )}
        <p className="text-brand-red font-bold text-sm mt-1">{brl(product.price)}</p>
      </div>

      <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
        product.isAvailable
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-400'
      }`}>
        {product.isAvailable ? 'Ativo' : 'Inativo'}
      </span>
    </div>
  );
}

// ─── AddProductModal ──────────────────────────────────────────────────────────

function AddProductModal({ storeId, onClose, onSuccess }) {
  const [name,         setName]         = useState('');
  const [description,  setDescription]  = useState('');
  const [price,        setPrice]        = useState('');
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [uploadStep,   setUploadStep]   = useState(''); // feedback de progresso
  const [error,        setError]        = useState('');

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Imagem muito grande. Máximo permitido: 5 MB.');
      return;
    }
    setError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!storeId) return;

    const parsedPrice = parseFloat(price.replace(',', '.'));
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError('Preço inválido.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Pré-gera o ID do produto para usar no caminho do Storage
      const productRef = doc(collection(db, `stores/${storeId}/products`));
      const productId  = productRef.id;

      let imageUrl = null;

      // 1. Upload da imagem (se houver)
      if (imageFile) {
        setUploadStep('Enviando imagem…');
        const imgRef = storageRef(storage, `stores/${storeId}/products/${productId}`);
        await uploadBytes(imgRef, imageFile);
        imageUrl = await getDownloadURL(imgRef);
      }

      // 2. Salva o documento com setDoc (usa o ID pré-gerado)
      setUploadStep('Salvando produto…');
      const productData = {
        name:        name.trim(),
        description: description.trim(),
        price:       parsedPrice,
        isAvailable: true,
        order:       Date.now(),
        imageUrl,
        createdAt:   isDevLoginEnabled ? new Date() : serverTimestamp(),
      };

      if (!isDevLoginEnabled) {
        await setDoc(productRef, productData);
      }

      onSuccess({ id: productId, ...productData, imageUrl });
    } catch {
      setError('Erro ao salvar produto. Tente novamente.');
    } finally {
      setSaving(false);
      setUploadStep('');
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl z-50
                      p-6 shadow-2xl max-w-md mx-auto max-h-[90vh] overflow-y-auto">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg text-gray-800">Novo produto</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Imagem */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Foto do produto
            </label>

            {imagePreview ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden group">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  fill
                  unoptimized
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100
                             transition-opacity flex items-center justify-center
                             text-white font-semibold text-sm"
                >
                  Remover foto
                </button>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center justify-center
                                w-full h-32 border-2 border-dashed border-gray-200 rounded-xl
                                hover:border-brand-red hover:text-brand-red transition-colors
                                text-gray-400 text-sm gap-2">
                <span className="text-3xl">📷</span>
                <span>Clique para adicionar foto</span>
                <span className="text-xs text-gray-300">JPG, PNG, WebP · máx. 5 MB</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="sr-only"
                />
              </label>
            )}
          </div>

          {/* Nome */}
          <Field label="Nome *">
            <input
              type="text" value={name} required
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: X-Burguer"
              className={inputCls}
            />
          </Field>

          {/* Descrição */}
          <Field label="Descrição">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Descreva o produto brevemente…"
              className={`${inputCls} resize-none`}
            />
          </Field>

          {/* Preço */}
          <Field label="Preço (R$) *">
            <input
              type="text" inputMode="decimal" value={price} required
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Ex: 25,90"
              className={inputCls}
            />
          </Field>

          {error && <p className="text-brand-red text-sm">{error}</p>}

          {/* Botões */}
          <div className="flex gap-3 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 font-semibold
                         py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 bg-brand-red text-white font-bold py-3 rounded-xl
                         hover:bg-brand-red-dark transition-colors disabled:opacity-60"
            >
              {saving ? (uploadStep || 'Salvando…') : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Micro-componentes ────────────────────────────────────────────────────────

function EmptyState({ onAdd }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
      <p className="text-5xl mb-4">🍽️</p>
      <p className="text-gray-400 mb-6">Você ainda não tem produtos cadastrados.</p>
      <button
        onClick={onAdd}
        className="bg-brand-red text-white font-bold px-6 py-3 rounded-xl
                   hover:bg-brand-red-dark transition-colors"
      >
        Cadastrar primeiro produto
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
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

const inputCls =
  'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent';
