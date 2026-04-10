'use client';

import { createContext, useContext } from 'react';

const StoreContext = createContext(null);

/**
 * StoreProvider — disponibiliza os metadados da loja atual para toda a árvore
 * de componentes renderizados dentro de /[slug].
 *
 * Isolamento multi-tenant: cada requisição ao layout de [slug] cria seu próprio
 * Provider com os dados exclusivos daquela loja (resolvida via slug → storeId).
 * Nenhum dado de outra loja vaza para este contexto.
 *
 * Instanciado no Server Component layout.js, que passa os dados já buscados
 * do Firestore (cache ISR 60 s) como prop — zero leituras extras no cliente.
 *
 * @param {Object}  store     - Documento completo da loja
 * @param {string}  store.id          - Firestore document ID (storeId)
 * @param {string}  store.name        - Nome comercial da loja
 * @param {string}  store.slug        - store_hash: identificador único na URL (ex: "burger-do-ze")
 * @param {boolean} store.isOpen      - Status de abertura em tempo real
 * @param {number}  store.deliveryFee - Taxa de entrega em reais
 * @param {number}  store.minOrder    - Pedido mínimo em reais
 * @param {string|null} store.logoUrl   - URL do logo no Firebase Storage
 * @param {string|null} store.bannerUrl - URL do banner no Firebase Storage
 * @param {string}  store.description - Descrição da loja
 * @param {string}  store.phone       - Telefone de contato
 * @param {string}  [store.cnpj]      - CNPJ da loja (opcional, base para geração do slug)
 */
export function StoreProvider({ children, store }) {
  return (
    <StoreContext.Provider value={store}>
      {children}
    </StoreContext.Provider>
  );
}

/**
 * useStoreContext — retorna os metadados da loja atual do contexto de URL.
 *
 * O store_hash (slug) é resolvido pelo Server Component layout.js via
 * getStoreBySlug(), que faz a leitura slugs/{slug} → stores/{storeId} no
 * Firestore. Este hook expõe o resultado para qualquer Client Component filho
 * sem necessidade de prop drilling.
 *
 * Deve ser chamado apenas dentro de componentes renderizados na rota /[slug].
 *
 * @returns {{ id: string, name: string, slug: string, isOpen: boolean,
 *             deliveryFee: number, minOrder: number, logoUrl: string|null,
 *             bannerUrl: string|null, description: string, phone: string,
 *             cnpj?: string }}
 *
 * @throws {Error} Se chamado fora de <StoreProvider>
 *
 * @example
 * // Em qualquer Client Component dentro de /[slug]:
 * const { id, name, isOpen, deliveryFee } = useStoreContext();
 */
export function useStoreContext() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error(
      'useStoreContext deve ser chamado dentro de <StoreProvider>. ' +
      'Verifique se o componente está na árvore de /[slug].'
    );
  }
  return ctx;
}
