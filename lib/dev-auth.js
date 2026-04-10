import { onAuthStateChanged } from 'firebase/auth';

const DEV_STORAGE_KEY = 'opaFood_dev_user';

// ─── Dados mock ────────────────────────────────────────────────────────────────

export const DEV_STORE = {
  id:          'dev-store-001',
  name:        'Loja de Teste Dev',
  slug:        'loja-dev',
  ownerId:     'dev-user-001',
  deliveryFee: 5,
};

export const DEV_CATEGORIES = [
  { id: 'dev-cat-1', name: 'Lanches',  order: 1 },
  { id: 'dev-cat-2', name: 'Bebidas',  order: 2 },
  { id: 'dev-cat-3', name: 'Sobremesas', order: 3 },
];

export const DEV_PRODUCTS = [
  { id: 'dev-prod-1', name: 'X-Burguer',       description: 'Pão brioche, carne 180g, queijo, alface e tomate',      price: 25.9,  isAvailable: true,  imageUrl: null, categoryId: 'dev-cat-1', order: 1 },
  { id: 'dev-prod-2', name: 'Frango Crispy',    description: 'Frango empanado crocante com salada e molho especial',  price: 22.5,  isAvailable: true,  imageUrl: null, categoryId: 'dev-cat-1', order: 2 },
  { id: 'dev-prod-4', name: 'X-Bacon Duplo',    description: 'Dois blends de 150g, bacon artesanal e cheddar',        price: 38.9,  isAvailable: true,  imageUrl: null, categoryId: 'dev-cat-1', order: 3 },
  { id: 'dev-prod-3', name: 'Coca-Cola 350ml',  description: 'Gelada',                                                price: 6.0,   isAvailable: true,  imageUrl: null, categoryId: 'dev-cat-2', order: 4 },
  { id: 'dev-prod-5', name: 'Suco de Laranja',  description: 'Natural, 400ml',                                        price: 9.9,   isAvailable: true,  imageUrl: null, categoryId: 'dev-cat-2', order: 5 },
  { id: 'dev-prod-6', name: 'Milkshake',        description: 'Chocolate, baunilha ou morango — 400ml',                price: 14.9,  isAvailable: true,  imageUrl: null, categoryId: 'dev-cat-3', order: 6 },
];

function fakeTimestamp(offsetMs = 0) {
  return { toDate: () => new Date(Date.now() - offsetMs) };
}

export const DEV_ORDERS_INITIAL = [
  {
    id:              'dev-order-aabbcc',
    status:          'pending',
    customerName:    'João Silva',
    customerPhone:   '(11) 99999-0001',
    deliveryAddress: { street: 'Rua das Flores', number: '123', complement: 'Apto 4', neighborhood: 'Centro' },
    items:           [{ name: 'X-Burguer', quantity: 2 }, { name: 'Coca-Cola 350ml', quantity: 1 }],
    paymentMethod:   'pix',
    total:           57.8,
    createdAt:       fakeTimestamp(0),
  },
  {
    id:              'dev-order-ddeeff',
    status:          'preparing',
    customerName:    'Maria Oliveira',
    customerPhone:   '(11) 98888-0002',
    deliveryAddress: { street: 'Av. Paulista', number: '1000', complement: '', neighborhood: 'Bela Vista' },
    items:           [{ name: 'Frango Crispy', quantity: 1 }],
    paymentMethod:   'cash',
    changeFor:       50,
    total:           27.5,
    createdAt:       fakeTimestamp(10 * 60 * 1000),
  },
  {
    id:              'dev-order-gghhii',
    status:          'delivered',
    customerName:    'Carlos Santos',
    customerPhone:   '(11) 97777-0003',
    deliveryAddress: { street: 'Rua Augusta', number: '500', complement: '', neighborhood: 'Consolação' },
    items:           [{ name: 'X-Burguer', quantity: 1 }, { name: 'Frango Crispy', quantity: 1 }, { name: 'Coca-Cola 350ml', quantity: 2 }],
    paymentMethod:   'card',
    total:           60.3,
    createdAt:       fakeTimestamp(60 * 60 * 1000),
  },
];

export const isDevLoginEnabled = process.env.NEXT_PUBLIC_DEV_LOGIN === 'true';

export function getDevUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DEV_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setDevUser() {
  const uid  = process.env.NEXT_PUBLIC_DEV_UID || 'dev-user-001';
  const user = { uid, email: 'dev@opadelivery.local' };
  localStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(user));
  return user;
}

export function clearDevUser() {
  localStorage.removeItem(DEV_STORAGE_KEY);
}

/**
 * Drop-in para onAuthStateChanged.
 * Quando o modo dev está ativo e há um dev user em localStorage,
 * dispara o callback imediatamente e retorna um unsubscribe vazio.
 * Caso contrário, delega para o Firebase normalmente.
 */
export function onAuthStateChangedOrDev(auth, callback) {
  if (isDevLoginEnabled) {
    const devUser = getDevUser();
    if (devUser) {
      callback(devUser);
      return () => {};
    }
  }
  return onAuthStateChanged(auth, callback);
}
