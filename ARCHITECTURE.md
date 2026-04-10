# OpaDelivery — Arquitetura e Estrutura do Projeto

## Visão Geral

SaaS de delivery multitenant. Cada loja possui seu próprio cardápio público acessível em `opadelivery.com/{slug}`. O lojista gerencia produtos e pedidos pelo painel em `/dashboard`. Clientes fazem pedidos sem criar conta (pedido anônimo) e acompanham o status em tempo real.

**Stack:** Next.js 14 (App Router, JavaScript) · Firebase Firestore · Firebase Auth · Firebase Storage · Tailwind CSS · Framer Motion · Vercel

---

## Estrutura de Pastas

```
opaFood/
│
├── app/                              # App Router do Next.js
│   ├── layout.js                     # Root layout (Inter font, html/body)
│   ├── page.js                       # Landing page (opadelivery.com/)
│   ├── globals.css                   # Estilos globais + Tailwind directives
│   │
│   ├── [slug]/                       # Rota dinâmica pública da loja
│   │   ├── layout.js                 # Server: resolve slug → store, injeta CartProvider
│   │   ├── page.js                   # Server: lista produtos com cache ISR
│   │   ├── checkout/
│   │   │   └── page.js               # Client: formulário de pedido → grava no Firestore
│   │   └── pedido/
│   │       └── [orderId]/
│   │           └── page.js           # Server: resolve storeId → monta OrderTracker
│   │
│   ├── dashboard/                    # Painel do lojista (protegido por Auth)
│   │   ├── page.js                   # Login (Firebase Auth email/senha)
│   │   ├── produtos/
│   │   │   └── page.js               # Listagem + adição de produtos com upload de imagem
│   │   └── pedidos/
│   │       └── page.js               # Lista ao vivo de pedidos com avanço de status
│   │
│   └── admin/                        # Painel do administrador OpaDelivery (Dev)
│       ├── page.js                   # Login Admin (Firebase Auth + verificação ADMIN_UID)
│       ├── actions.js                # Server Actions: checkAdminToken, getAllStores, createLojista, updateStore
│       └── lojistas/
│           └── page.js               # Dashboard: listagem, criação e edição de lojistas
│
├── components/                       # Client Components reutilizáveis
│   ├── StoreHeader.js                # Banner (scroll) + info bar sticky (top-0, h-16) + StoreStatusBadge
│   ├── StoreStatusBadge.js           # Badge Aberto/Fechado com onSnapshot em tempo real
│   ├── CategoryNav.js                # Pills de categoria sticky (top-16), scroll horizontal
│   ├── ProductCatalog.js             # Search bar + CategoryNav + produtos agrupados por categoria
│   ├── ProductCard.js                # Card de produto com controle de quantidade inline
│   ├── ProductGrid.js                # Grid legado (substituído por ProductCatalog no cardápio)
│   ├── CartBottomBar.js              # Barra fixa inferior (mobile, oculta no checkout)
│   ├── CartDrawer.js                 # Drawer: full-screen (mobile) / side-panel (desktop) com notas e validação
│   ├── OrderTracker.js               # Stepper de acompanhamento com onSnapshot
│   └── DashboardNav.js               # Navbar compartilhada do painel (tabs + sign out)
│
├── context/
│   └── CartContext.js                # Estado global do carrinho com persistência em localStorage
│
├── lib/
│   ├── firebase.js                   # Firebase Client SDK (browser)
│   ├── firebase-admin.js             # Firebase Admin SDK (server-only)
│   ├── dev-auth.js                   # Mocks de loja, produtos e categorias para modo dev
│   └── store-queries.js              # Queries com cache ISR 60s (slug→store, categorias, produtos)
│
├── firestore.rules                   # Security Rules do Firestore
├── .env.local.example                # Template de variáveis de ambiente
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## Banco de Dados — Firestore

### Estratégia de Multitenancy

**Subcoleções aninhadas por loja** (`stores/{storeId}/products`).

O caminho do documento é o isolamento. O Firestore garante que uma query em `stores/loja-a/products` nunca retorna dados de `stores/loja-b/products` — sem filtros adicionais, sem índices compostos e sem risco de vazamento por esquecimento de `.where()`.

### Modelo de Dados

```
firestore-root/
│
├── slugs/{slug}
│   └── storeId: string                    ← índice O(1): slug → storeId
│
├── stores/{storeId}
│   ├── name: string
│   ├── slug: string                       ← "burger-do-ze"
│   ├── ownerId: string                    ← uid do Firebase Auth (1 conta = 1 loja no MVP)
│   ├── logoUrl: string | null
│   ├── bannerUrl: string | null
│   ├── description: string
│   ├── phone: string
│   ├── address: object
│   ├── isOpen: boolean
│   ├── deliveryFee: number
│   ├── minOrder: number
│   └── createdAt: Timestamp
│   │
│   ├── products/{productId}
│   │   ├── name: string
│   │   ├── description: string
│   │   ├── price: number                  ← sempre em reais (float)
│   │   ├── imageUrl: string | null        ← URL do Firebase Storage
│   │   ├── categoryId: string | null
│   │   ├── isAvailable: boolean
│   │   ├── order: number                  ← Date.now() na criação (ordenação manual)
│   │   └── createdAt: Timestamp
│   │
│   ├── categories/{categoryId}
│   │   ├── name: string
│   │   └── order: number
│   │
│   └── orders/{orderId}
│       ├── customerName: string
│       ├── customerPhone: string
│       ├── deliveryAddress: {             ← objeto flat (sem subcoleção)
│       │     street, number,
│       │     neighborhood, complement
│       │   }
│       ├── items: OrderItem[]             ← snapshot: { id, name, price, quantity, imageUrl }
│       ├── subtotal: number
│       ├── deliveryFee: number
│       ├── total: number                  ← subtotal + deliveryFee
│       ├── status: string                 ← pending | confirmed | preparing | out_for_delivery | delivered | cancelled
│       ├── paymentMethod: string          ← "pix" | "card" | "cash"
│       ├── changeFor: number | undefined  ← troco (apenas quando paymentMethod = "cash")
│       ├── notes: string | undefined      ← observações do pedido (ex: "sem cebola") — omitido se vazio
│       ├── userId: null                   ← sempre null no MVP (pedido anônimo)
│       ├── createdAt: Timestamp
│       └── updatedAt: Timestamp
│
└── users/{userId}                         ← reservado para expansão futura
    ├── name: string
    ├── phone: string
    └── addresses: Address[]
```

> **Por que `items` é um snapshot e não referência ao produto?**
> Preço e nome podem mudar a qualquer momento. O pedido deve registrar o que o cliente efetivamente pagou, não o preço atual.

> **Por que a coleção `slugs/` existe separada?**
> Permite resolver `slug → storeId` em exatamente 1 leitura O(1). A alternativa — `.where('slug', '==', x)` em `stores/` — exigiria um índice composto e custaria mais no free tier.

> **Por que `imageUrl` é salvo tanto no produto quanto no snapshot do pedido?**
> O snapshot de `items` inclui `imageUrl` para que a página de acompanhamento possa exibir thumbnails mesmo que o produto seja deletado posteriormente.

---

## Security Rules

Arquivo: [`firestore.rules`](firestore.rules)

| Recurso | Leitura | Escrita |
|---|---|---|
| `slugs/{slug}` | Pública | Bloqueada (apenas Admin SDK) |
| `stores/{storeId}` | Pública | `create`: autenticado com `ownerId == uid` / `update/delete`: somente o owner |
| `stores/{storeId}/products` | Pública | Somente o owner da loja pai |
| `stores/{storeId}/categories` | Pública | Somente o owner da loja pai |
| `stores/{storeId}/orders` | **Pública** | `create`: público (pedido anônimo) / `update`: somente o owner / `delete`: bloqueado |
| `users/{userId}` | Próprio documento | Próprio documento |

**Por que `orders` tem leitura pública?**
O cliente precisa acompanhar seu pedido em `/[slug]/pedido/[orderId]` sem estar autenticado. O `orderId` gerado pelo Firestore tem 20 caracteres alfanuméricos aleatórios — a probabilidade de adivinhar um ID válido é desprezível na prática (similar a um token de sessão curto). Isso é um tradeoff consciente do MVP.

A função auxiliar `isStoreOwner(storeId)` faz 1 leitura extra no documento `stores/{storeId}` para verificar o `ownerId`. Isso ocorre apenas em operações de **escrita**, nunca em leituras públicas.

---

## Camada Firebase

### `lib/firebase.js` — Client SDK

Inicializado uma única vez via `getApps()`. Exporta `auth`, `db` e `storage` para uso em Client Components.

```
Browser → firebase.js → Firebase Auth / Firestore / Storage
```

### `lib/firebase-admin.js` — Admin SDK

Marcado com `import 'server-only'` — o Next.js lança erro de build se importado em um Client Component. Usa credenciais de conta de serviço via variáveis de ambiente privadas.

```
Next.js Server → firebase-admin.js → Firestore (autenticado como service account)
```

### `lib/store-queries.js` — Cache ISR

Usa `unstable_cache` do Next.js para cachear respostas do Firestore por 60 segundos por chave (slug ou storeId).

```
Requisição → unstable_cache → HIT: retorna cache (0 reads no Firestore)
                            → MISS: busca Firestore → salva cache por 60s
```

| Função exportada | Chave de cache | Firestore reads |
|---|---|---|
| `getStoreBySlug(slug)` | `['store-by-slug']` | 2 (slugs + stores) |
| `getStoreCategories(storeId)` | `['store-categories']` | 1 |
| `getStoreProducts(storeId)` | `['store-products']` | 1 |

**Impacto no custo:** Uma loja com 1.000 visitantes/hora gera ~3 leituras/minuto no Firestore (ao invés de 4.000+/hora), mantendo o projeto no free tier.

---

## Roteamento e Renderização

### Visão do cliente — fluxo completo

```
/burger-do-ze
    └── [slug]/layout.js  (Server Component)
            ├── getStoreBySlug()         → cache ISR (slugs + stores)
            ├── <CartProvider storeId storeName deliveryFee>
            ├── <StoreHeader>
            │       ├── Banner (não-sticky, rola para fora da tela)
            │       └── Info bar (sticky top-0 h-16)
            │               ├── Logo + nome da loja
            │               └── <StoreStatusBadge>  → onSnapshot stores/{storeId} (tempo real)
            ├── <CartDrawer>             → subtotal + total + CTA → /checkout
            └── <CartBottomBar>          → oculto em /checkout

    └── [slug]/page.js  (Server Component)
            ├── getStoreProducts()       → cache ISR
            ├── getStoreCategories()     → cache ISR
            └── <ProductCatalog products categories>  (Client Component)
                    ├── Search bar       → filtra por nome e descrição (client-side)
                    ├── <CategoryNav>    → pills sticky top-16; scroll suave até a seção
                    └── <section> por categoria
                            └── <ProductCard>
                                    └── useCart() → addItem / updateQuantity

    └── [slug]/checkout/page.js  (Client Component)
            ├── Formulário: nome, telefone, endereço, pagamento
            ├── addDoc → stores/{storeId}/orders
            ├── clearCart()
            └── router.push('/[slug]/pedido/[orderId]')

    └── [slug]/pedido/[orderId]/page.js  (Server Component)
            └── getStoreBySlug()         → cache ISR (resolve storeId)
                └── <OrderTracker storeId orderId>  (Client Component)
                        └── onSnapshot(doc stores/{storeId}/orders/{orderId})
                                └── Stepper visual (5 etapas) atualizado em tempo real
```

### Painel do lojista

```
/dashboard          → LoginPage
                          └── signInWithEmailAndPassword → redirect /dashboard/produtos

/dashboard/produtos → ProdutosPage
                          ├── Auth guard (onAuthStateChanged)
                          ├── query stores where ownerId == uid
                          ├── getDocs stores/{storeId}/products
                          └── <AddProductModal>
                                  ├── uploadBytes → Firebase Storage
                                  │     stores/{storeId}/products/{productId}
                                  ├── getDownloadURL → imageUrl
                                  └── setDoc stores/{storeId}/products/{productId}

/dashboard/pedidos  → PedidosPage
                          ├── Auth guard (onAuthStateChanged)
                          ├── query stores where ownerId == uid
                          └── onSnapshot(orders orderBy createdAt desc)
                                  └── <OrderCard>
                                          └── updateDoc → status + updatedAt
```

### Painel do administrador (OpaAdmin)

```
/admin              → AdminLoginPage
                          ├── onAuthStateChanged → getIdToken → checkAdminToken (Server Action)
                          │       └── verifica decoded.uid === ADMIN_UID (env)
                          ├── signInWithEmailAndPassword
                          └── redirect /admin/lojistas

/admin/lojistas     → AdminLojistasPage
                          ├── Auth guard (onAuthStateChanged + checkAdminToken)
                          ├── getAllStores (Server Action) → lista todas as lojas
                          ├── <CreateModal>
                          │       ├── Admin preenche: nome, slug, email, telefone, taxas
                          │       ├── createLojista (Server Action)
                          │       │       ├── generateTempPassword() → crypto.randomBytes(12)
                          │       │       ├── adminAuth.createUser({ email, password: tempPassword })
                          │       │       ├── adminAuth.generatePasswordResetLink(email)
                          │       │       ├── storeRef.set(storeData)
                          │       │       └── slugs/{slug}.set({ storeId })
                          │       ├── sendPasswordResetEmail(auth, email)  ← Client SDK
                          │       └── Tela de sucesso: confirma email enviado ao lojista
                          └── <EditModal>
                                  └── updateStore (Server Action) → atualiza campos permitidos
```

**Por que `setDoc` (com ID pré-gerado) e não `addDoc` no upload de imagem?**
O caminho do Storage usa o `productId` como nome do arquivo (`stores/{storeId}/products/{productId}`). Para saber o ID antes de escrever no Firestore, geramos o ref com `doc(collection(...))` — que cria o ID sem ainda salvar o documento — e depois usamos `setDoc` com esse mesmo ref.

---

## CartContext

Arquivo: [`context/CartContext.js`](context/CartContext.js)

Provedor instanciado no `[slug]/layout.js` (Server Component que renderiza um Client Component). Recebe as props `storeId`, `storeSlug`, `storeName` e `deliveryFee` diretamente do Server.

### Persistência em localStorage

O carrinho sobrevive a reloads de página. A chave de armazenamento é `opafood_cart_{storeId}`, isolando o carrinho por loja.

```
Mount  → localStorage.getItem(key) → JSON.parse → setItems / setNotes
Change → localStorage.setItem(key, JSON.stringify({ items, notes }))
Clear  → localStorage.removeItem(key)
```

Dois `useEffect` separados garantem o ciclo correto: o primeiro roda uma única vez na montagem (hydration), o segundo é disparado sempre que `items` ou `notes` mudam.

### API exposta via `useCart()`

| Valor | Tipo | Descrição |
|---|---|---|
| `items` | `OrderItem[]` | Itens no carrinho |
| `notes` | `string` | Observações do pedido (ex: "sem cebola") |
| `itemCount` | `number` | Soma de todas as quantidades |
| `subtotal` | `number` | Soma de `price * quantity` |
| `deliveryFee` | `number` | Taxa vinda do documento da loja |
| `total` | `number` | `subtotal + deliveryFee` |
| `isCartOpen` | `boolean` | Controla visibilidade do CartDrawer |
| `addItem` | `fn` | Adiciona ou incrementa produto; abre o drawer |
| `removeItem` | `fn` | Remove produto completamente |
| `updateQuantity` | `fn` | Atualiza quantidade; 0 remove o item |
| `setNotes` | `fn` | Atualiza as observações do pedido |
| `clearCart` | `fn` | Limpa itens + notas + entrada do localStorage |
| `storeId / storeSlug / storeName` | `string` | Contexto da loja ativa |

---

## Ciclo de vida de um pedido

```
Cliente monta carrinho (ProductCard → addItem)
        ↓
CartDrawer: exibe subtotal + taxa + total
        ├── Campo de observações do pedido (ex: "sem cebola") → persiste em localStorage
        └── CTA "Finalizar pedido" — validado: desabilitado se carrinho vazio
        ↓
/checkout: preenche Nome / Telefone / Endereço / Pagamento
        └── Resume do pedido exibe as observações (se preenchidas)
        ↓
addDoc → stores/{storeId}/orders  (status: "pending", notes: "…" se preenchido)
        ↓
clearCart() + redirect → /[slug]/pedido/{orderId}
        ↓
OrderTracker: onSnapshot ouve mudanças de status em tempo real
        ↓
Lojista em /dashboard/pedidos:
  pending → "Confirmar" → confirmed
  confirmed → "Iniciar preparo" → preparing
  preparing → "Saiu p/ entrega" → out_for_delivery
  out_for_delivery → "Marcar entregue" → delivered
  (pending | confirmed) → "Cancelar" → cancelled
        ↓
OrderTracker do cliente atualiza o stepper automaticamente via onSnapshot
```

---

## Upload de Imagens — Firebase Storage

Caminho no Storage: `stores/{storeId}/products/{productId}`

**Fluxo no `AddProductModal`:**
1. Usuário seleciona arquivo (validado: tipo imagem, máx. 5 MB)
2. Preview local via `URL.createObjectURL`
3. No submit: `doc(collection(...))` gera o `productId`
4. `uploadBytes(storageRef, file)` envia a imagem
5. `getDownloadURL(ref)` obtém a URL pública
6. `setDoc(productRef, { ...dados, imageUrl })` salva o produto

A URL gerada pelo Storage é adicionada ao campo `imageUrl` do produto e também copiada para o snapshot de cada `OrderItem` no momento do checkout.

---

## Design System

Definido em [`tailwind.config.js`](tailwind.config.js).

| Token | Valor | Uso |
|---|---|---|
| `brand-red` | `#EA1D2C` | Cor primária — botões, preços, stepper ativo |
| `brand-red-dark` | `#C41525` | Hover state |
| `brand-orange` | `#FF7A00` | Badge do carrinho, acentos |
| `brand-orange-light` | `#FFF3E0` | Fundo de placeholder de imagem |

**Mobile-first:** componentes projetados desde 320px (iPhone SE), expandem com `sm:` (≥ 640px), `md:` (≥ 768px) e `lg:` (≥ 1024px). `CartBottomBar` usa `md:hidden`. `CartDrawer` usa comportamento responsivo por Tailwind sem JavaScript de media query — veja seção abaixo. O grid de produtos usa `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` para escalar até desktops largos.

### Camadas sticky no cardápio

O cardápio usa dois elementos sticky empilhados para máxima usabilidade mobile:

```
┌─────────────────────────────────────┐  ← topo da viewport
│  Info bar  (sticky top-0, h-16)     │  StoreHeader — logo, nome, status, carrinho
├─────────────────────────────────────┤
│  CategoryNav (sticky top-16)        │  Pills de categoria — scroll horizontal
├─────────────────────────────────────┤
│  Conteúdo (rola normalmente)        │  Search bar + seções de produtos
│  ...                                │
└─────────────────────────────────────┘
```

O `top-16` (64 px) do `CategoryNav` coincide exatamente com `h-16` do info bar. Nenhum JavaScript mede altura em tempo de execução — o valor é fixo e definido em Tailwind.

### Animações — Framer Motion

Todas as animações usam `framer-motion`. Nenhuma animação é implementada via CSS `@keyframes` manual — isso garante consistência de timing e easing em toda a UI.

| Componente | Animação |
|---|---|
| `ProductCatalog` | Fade + slide-up na montagem (`opacity` 0→1, `y` 10→0) |
| `ProductCard` | Entrada staggerada por `motion.article`, `whileHover` sobe 3px, `AnimatePresence` troca entre botão "Adicionar" e stepper de quantidade, quantidade pisca ao mudar (`y` -6→0) |
| `CartDrawer` | `AnimatePresence` nos itens (entrada da direita, saída para esquerda), `layout` prop para reflow suave ao remover, `whileTap` nos botões de stepper |
| `CartBottomBar` | Spring slide-up na primeira adição ao carrinho (`stiffness: 380, damping: 32`), slide-down ao esvaziar ou entrar no checkout via `AnimatePresence` |
| `CheckoutPage` | Fade + slide-up na montagem, `whileTap` no botão de confirmação |

### CartDrawer — layout responsivo e animação

O drawer usa **dois comportamentos de transição** controlados exclusivamente por classes Tailwind, sem JavaScript de media query:

| Viewport | Layout | Fechado | Aberto |
|---|---|---|---|
| Mobile (< `md`) | `inset-0` — ocupa tela inteira | `translate-y-full` (oculto abaixo da viewport) | `translate-y-0` (sobe para tela cheia) |
| Desktop (`md+`) | `right-0 top-0 bottom-0 max-w-md` — painel lateral | `translate-x-full` (oculto à direita) | `translate-x-0` (desliza para dentro) |

```css
/* Exemplo de classes aplicadas ao painel (simplificado) */

/* posicionamento */
fixed inset-0
md:inset-y-0 md:left-auto md:right-0 md:w-full md:max-w-md

/* animação */
transition-transform duration-300 ease-in-out

/* fechado */
translate-y-full md:translate-y-0 md:translate-x-full

/* aberto */
translate-y-0 md:translate-x-0
```

A sobreposição (`backdrop`) tem transição de opacidade independente e captura clique para fechar. O botão "Finalizar pedido" permanece visível mesmo com carrinho vazio, mas fica `disabled` com texto alternativo — o `router.push` não é chamado se `items.length === 0`.

### Acessibilidade (Lighthouse)

| Prática | Implementação |
|---|---|
| Imagens de produto | `alt` descritivo, `sizes` para srcset correto, `loading="lazy"` |
| Banner da loja | `priority` (LCP candidate), `role="img"` com `aria-label` |
| Botões do carrinho | `aria-label` dinâmico com contagem de itens |
| Cards de produto | Elemento `<article>`, `aria-label` em todos os botões |
| Contador de quantidade | `aria-live="polite"` para leitores de tela |
| Navegação de categorias | `<nav aria-label>`, `aria-pressed` nos pills |
| Seções do cardápio | `<section aria-labelledby>` + `<h2 id>` correspondente |
| Focus rings | `focus-visible:ring-2 focus-visible:ring-brand-red` em todos os elementos interativos |

---

## OpaAdmin — Painel do Administrador

Área restrita para os desenvolvedores/operadores do OpaDelivery. Permite criar lojas e lojistas sem acesso ao Firebase Console.

### Autenticação Admin

O acesso é duplo-fator por design: Firebase Auth (credenciais válidas) **+** verificação de `ADMIN_UID` no Server Action `checkAdminToken`. Um usuário Firebase autenticado mas com UID diferente do `ADMIN_UID` é imediatamente deslogado e bloqueado — não existe rota que funcione sem passar por essa verificação.

```
Browser → signInWithEmailAndPassword → getIdToken
       → checkAdminToken (Server Action)
               → adminAuth.verifyIdToken(token)
               → decoded.uid !== ADMIN_UID → throw 'Não autorizado'
```

### Fluxo de Criação de Lojista

O admin preenche apenas: nome da loja, slug, e-mail, telefone e taxas. **Nenhuma senha é inserida manualmente.**

```
1. generateTempPassword()
       └── crypto.randomBytes(12).toString('base64url')  ← 16 chars, URL-safe, criptograficamente seguro

2. adminAuth.createUser({ email, password: tempPassword, displayName: storeName })
       └── cria conta no Firebase Auth

3. adminAuth.generatePasswordResetLink(email)            ← Admin SDK (server-only)
       └── gera link de redefinição (não-fatal se falhar)

4. Firestore: storeRef.set(storeData) + slugs/{slug}.set({ storeId })

5. sendPasswordResetEmail(auth, email)                   ← Client SDK (browser)
       └── dispara email via serviço nativo do Firebase Auth
       └── lojista clica no link e define sua própria senha
```

> **Por que `sendPasswordResetEmail` no cliente e `generatePasswordResetLink` no servidor?**
> O Admin SDK pode gerar o link mas não envia o email — ele não tem acesso ao serviço de email do Firebase Auth. O Client SDK, por sua vez, consegue disparar o email nativamente. A abordagem combina os dois: o servidor garante a criação segura e o cliente aproveita a infraestrutura de email do Firebase sem depender de serviço externo (SendGrid, SES etc.).

### Server Actions — `app/admin/actions.js`

Todas as actions verificam `ADMIN_UID` antes de executar qualquer operação. Executam exclusivamente no servidor (marcadas com `'use server'`).

| Action | Descrição |
|---|---|
| `checkAdminToken(idToken)` | Valida token e verifica `uid === ADMIN_UID`. Retorna `{ ok: bool }`. |
| `getAllStores(idToken)` | Lista todas as lojas em `stores/` ordenadas por `createdAt desc`. |
| `createLojista(idToken, formData)` | Cria usuário Firebase Auth + loja + índice de slug. Senha gerada internamente. |
| `updateStore(idToken, storeId, data)` | Atualiza campos permitidos de uma loja (allowlist explícita). |

---

## Variáveis de Ambiente

Copie `.env.local.example` para `.env.local` e preencha:

| Variável | Visibilidade | Origem |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Browser (público) | Firebase Console → Configurações → Seus apps |
| `FIREBASE_PROJECT_ID` | Servidor (privado) | Firebase Console → Conta de serviço |
| `FIREBASE_CLIENT_EMAIL` | Servidor (privado) | JSON da conta de serviço |
| `FIREBASE_PRIVATE_KEY` | Servidor (privado) | JSON da conta de serviço (aspas, `\n` literais) |
| `ADMIN_UID` | Servidor (privado) | UID do usuário admin no Firebase Auth |

> Na Vercel, cole a `FIREBASE_PRIVATE_KEY` com `\n` literais. O `firebase-admin.js` faz `.replace(/\\n/g, '\n')` automaticamente.

> O `ADMIN_UID` é o `uid` do usuário criado manualmente no Firebase Console que terá acesso ao `/admin`. Qualquer outro usuário autenticado é bloqueado pela `checkAdminToken`.

---

## Setup Inicial

```bash
# 1. Instalar dependências
npm install

# 2. Configurar ambiente
cp .env.local.example .env.local
# Preencher com os dados do Firebase Console

# 3. Publicar Security Rules
firebase deploy --only firestore:rules

# 4. Rodar em desenvolvimento
npm run dev
```

### Criando a primeira loja (via Firebase Console)

**1.** Em `stores/`, crie um documento com ID aleatório:
```json
{
  "name": "Burger do Zé",
  "slug": "burger-do-ze",
  "ownerId": "<uid do usuário criado no Firebase Auth>",
  "isOpen": true,
  "deliveryFee": 5.00,
  "description": "Os melhores burgers da cidade"
}
```

**2.** Em `slugs/`, crie um documento com ID `burger-do-ze`:
```json
{
  "storeId": "<id do documento criado acima>"
}
```

**3.** Acesse `localhost:3000/burger-do-ze` para ver o cardápio.

---

## Roadmap de Funcionalidades

| Sprint | Funcionalidade | Status |
|---|---|---|
| **Fundação** | Setup, Security Rules, Cardápio público, Carrinho UI, Painel de produtos | ✅ |
| **Sprint 2** | Checkout: coleta Nome/Telefone/Endereço → grava pedido em Firestore | ✅ |
| **Sprint 3** | Acompanhamento: `/[slug]/pedido/[orderId]` com `onSnapshot` em tempo real | ✅ |
| **Sprint 4** | Painel de pedidos: `/dashboard/pedidos` com lista ao vivo e avanço de status | ✅ |
| **Sprint 5** | Upload de imagens via Firebase Storage + preview no modal | ✅ |
| **Sprint 6** | OpaAdmin: painel de administrador com login seguro (ADMIN_UID), criação de lojistas com senha temporária e envio de email via Firebase Auth | ✅ |
| **Sprint 7** | Cardápio v2: categorias sticky, busca em tempo real, status da loja via `onSnapshot`, melhorias de acessibilidade (Lighthouse) | ✅ |
| **Sprint 8** | Carrinho v2: persistência em localStorage, observações do pedido, drawer responsivo (full-screen mobile / slide-over desktop) com transições CSS, validação de carrinho vazio | ✅ |
| **Sprint 9** | UI polish: Framer Motion (animações de página, itens do carrinho, troca de estado do ProductCard, CartBottomBar spring), responsividade 320px (iPhone SE), `lg:grid-cols-4` no grid de produtos | ✅ |
| **Sprint 10** | Configurações da loja: horário, taxa de entrega, área de cobertura | — |
| **Sprint 11** | Onboarding: fluxo de cadastro de nova loja pelo próprio lojista | — |
