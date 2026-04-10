# OpaDelivery — Arquitetura e Estrutura do Projeto

## Visão Geral

SaaS de delivery multitenant. Cada loja possui seu próprio cardápio público acessível em `opadelivery.com/{slug}`. O lojista gerencia produtos e pedidos pelo painel em `/dashboard`. Clientes fazem pedidos sem criar conta (pedido anônimo) e acompanham o status em tempo real.

**Stack:** Next.js 14 (App Router, JavaScript) · Firebase Firestore · Firebase Auth · Firebase Storage · Tailwind CSS · Vercel

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
│   └── dashboard/                    # Painel do lojista (protegido por Auth)
│       ├── page.js                   # Login (Firebase Auth email/senha)
│       ├── produtos/
│       │   └── page.js               # Listagem + adição de produtos com upload de imagem
│       └── pedidos/
│           └── page.js               # Lista ao vivo de pedidos com avanço de status
│
├── components/                       # Client Components reutilizáveis
│   ├── StoreHeader.js                # Header com banner, logo, badge do carrinho
│   ├── ProductCard.js                # Card de produto com controle de quantidade inline
│   ├── ProductGrid.js                # Grid responsivo de ProductCards
│   ├── CartBottomBar.js              # Barra fixa inferior (mobile, oculta no checkout)
│   ├── CartDrawer.js                 # Drawer lateral com resumo e CTA para checkout
│   ├── OrderTracker.js               # Stepper de acompanhamento com onSnapshot
│   └── DashboardNav.js               # Navbar compartilhada do painel (tabs + sign out)
│
├── context/
│   └── CartContext.js                # Estado global do carrinho (items, subtotal, total, deliveryFee)
│
├── lib/
│   ├── firebase.js                   # Firebase Client SDK (browser)
│   ├── firebase-admin.js             # Firebase Admin SDK (server-only)
│   └── store-queries.js              # Queries com cache ISR 60s (slug→store, produtos)
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

**Impacto no custo:** Uma loja com 1.000 visitantes/hora gera ~1 leitura/minuto no Firestore (ao invés de 2.000+/hora), mantendo o projeto no free tier.

---

## Roteamento e Renderização

### Visão do cliente — fluxo completo

```
/burger-do-ze
    └── [slug]/layout.js  (Server Component)
            ├── getStoreBySlug()         → cache ISR (slugs + stores)
            ├── <CartProvider storeId storeName deliveryFee>
            ├── <StoreHeader>            → badge do carrinho, abre CartDrawer
            ├── <CartDrawer>             → subtotal + total + CTA → /checkout
            └── <CartBottomBar>          → oculto em /checkout

    └── [slug]/page.js  (Server Component)
            └── getStoreProducts()       → cache ISR
                └── <ProductGrid>
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

**Por que `setDoc` (com ID pré-gerado) e não `addDoc` no upload de imagem?**
O caminho do Storage usa o `productId` como nome do arquivo (`stores/{storeId}/products/{productId}`). Para saber o ID antes de escrever no Firestore, geramos o ref com `doc(collection(...))` — que cria o ID sem ainda salvar o documento — e depois usamos `setDoc` com esse mesmo ref.

---

## CartContext

Arquivo: [`context/CartContext.js`](context/CartContext.js)

Provedor instanciado no `[slug]/layout.js` (Server Component que renderiza um Client Component). Recebe as props `storeId`, `storeSlug`, `storeName` e `deliveryFee` diretamente do Server.

| Valor exposto | Tipo | Descrição |
|---|---|---|
| `items` | `OrderItem[]` | Itens no carrinho |
| `itemCount` | `number` | Soma de todas as quantidades |
| `subtotal` | `number` | Soma de `price * quantity` |
| `deliveryFee` | `number` | Taxa vinda do documento da loja |
| `total` | `number` | `subtotal + deliveryFee` |
| `isCartOpen` | `boolean` | Controla visibilidade do CartDrawer |
| `addItem` | `fn` | Adiciona ou incrementa produto |
| `removeItem` | `fn` | Remove produto completamente |
| `updateQuantity` | `fn` | Atualiza quantidade; 0 remove |
| `clearCart` | `fn` | Limpa o carrinho (pós-pedido) |
| `storeId / storeSlug / storeName` | `string` | Contexto da loja ativa |

---

## Ciclo de vida de um pedido

```
Cliente monta carrinho (ProductCard → addItem)
        ↓
CartDrawer: exibe subtotal + taxa + total → CTA "Finalizar pedido"
        ↓
/checkout: preenche Nome / Telefone / Endereço / Pagamento
        ↓
addDoc → stores/{storeId}/orders  (status: "pending")
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

**Mobile-first:** componentes projetados para 375px, expandem com `md:` e `lg:`. `CartBottomBar` usa `md:hidden`. `CartDrawer` ocupa tela inteira no mobile e é painel lateral fixo no desktop (`max-w-md`).

---

## Variáveis de Ambiente

Copie `.env.local.example` para `.env.local` e preencha:

| Variável | Visibilidade | Origem |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Browser (público) | Firebase Console → Configurações → Seus apps |
| `FIREBASE_PROJECT_ID` | Servidor (privado) | Firebase Console → Conta de serviço |
| `FIREBASE_CLIENT_EMAIL` | Servidor (privado) | JSON da conta de serviço |
| `FIREBASE_PRIVATE_KEY` | Servidor (privado) | JSON da conta de serviço (aspas, `\n` literais) |

> Na Vercel, cole a `FIREBASE_PRIVATE_KEY` com `\n` literais. O `firebase-admin.js` faz `.replace(/\\n/g, '\n')` automaticamente.

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
| **Sprint 6** | Categorias de produtos com filtragem no cardápio | — |
| **Sprint 7** | Configurações da loja: horário, taxa de entrega, área de cobertura | — |
| **Sprint 8** | Onboarding: fluxo de cadastro de nova loja pelo próprio lojista | — |
