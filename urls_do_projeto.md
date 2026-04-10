# URLS do Projeto OpaDelivery

Este documento lista as principais URLs do sistema e suas respectivas funcionalidades, divididas por tipo de usuário.

## 👥 Visão do Cliente (Público)

Estas URLs são acessíveis por qualquer usuário que deseja realizar pedidos ou acompanhar o status dos mesmos.

| URL | Descrição |
| :--- | :--- |
| `/` | **Landing Page**: Página inicial institucional do OpaDelivery. |
| `/[slug]` | **Cardápio da Loja**: Página pública da loja (ex: `/burger-do-ze`) com lista de produtos e categorias. |
| `/[slug]/checkout` | **Finalização de Pedido**: Formulário para preenchimento de dados de entrega e pagamento. |
| `/[slug]/pedido/[orderId]` | **Acompanhamento**: Página de rastreio do pedido em tempo real para o cliente. |

---

## 👨‍🍳 Visão do Lojista (Painel Administrativo)

Acessível apenas por lojistas autenticados para gerenciar seu estabelecimento.

| URL | Descrição |
| :--- | :--- |
| `/dashboard` | **Login / Dashboard**: Página de autenticação e porta de entrada do lojista. |
| `/dashboard/produtos` | **Gestão de Produtos**: Listagem, adição, edição e exclusão de itens do cardápio. |
| `/dashboard/pedidos` | **Gestão de Pedidos**: Acompanhamento de pedidos recebidos e alteração de status em tempo real. |

---

## 🛡️ Visão do Administrador (OpaAdmin)

Área restrita para os administradores da plataforma OpaDelivery.

| URL | Descrição |
| :--- | :--- |
| `/admin` | **Login Admin**: Autenticação restrita para administradores globais. |
| `/admin/lojistas` | **Gestão de Lojistas**: Interface para criar novas lojas, gerenciar lojistas e configurar taxas. |

---

> [!NOTE]
> As URLs dinâmicas são identificadas por colchetes, como `[slug]` (nome da loja na URL) e `[orderId]` (identificador único do pedido).
