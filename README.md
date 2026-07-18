# Blockticket

Motor de reservas + checkout + gestão para parques e atrações turísticas.
Multi-tenant, construído sobre Supabase + Next.js. Projeto interno da FozDev,
validado primeiro com a Aquamania.

## Stack

- **Banco/Auth/Storage:** Supabase (Postgres + RLS) — projeto `qqkpepixtqmiaqwqmbjq`
- **Loja + Painel:** Next.js 16 (App Router) + React 19 + Tailwind v4 (Vercel)
- **Pagamentos:** PSP com split (Pagar.me ou AbacatePay) — sem gateway próprio

## Status

- [x] **Passo 1 — Schema do banco** (`supabase/migrations`, `docs/schema.md`)
- [x] **Passo 2 — Estrutura Next.js** (loja / admin / camada de serviços)
- [x] **Passo 3 — Fluxo mínimo:** listar → checar disponibilidade → reservar → pagar (PIX/AbacatePay) → confirmar
- [x] **Painel admin 2 níveis:** plataforma (FozDev vê/cria/acessa todos os clientes) + cliente (produtos, variantes, tarifas por dia, disponibilidade, pedidos)
- [ ] Split de pagamento, afiliados, integração com catraca

## Níveis de acesso

- **Platform admin (FozDev):** e-mails em `platform_admin_emails`. Acessa todos os
  tenants em `/admin` e entra no painel de cada um.
- **Cliente (tenant):** owner/admin/staff via `memberships`. Gerencia só o próprio
  tenant em `/admin/t/[tenantId]`. RLS garante o isolamento.

## Rodar localmente

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Configure `.env.local` (já vem com URL + anon key). **Preencha a
   `SUPABASE_SERVICE_ROLE_KEY`** (Supabase > Project Settings > API) para
   habilitar a confirmação de pagamento.
3. Suba o servidor:
   ```bash
   npm run dev
   ```
   - Loja: http://localhost:3000
   - Admin: http://localhost:3000/admin (login por magic link)

## Estrutura

```
src/
├── app/
│   ├── (store)/                 # loja pública
│   │   ├── page.tsx             # lista de produtos
│   │   ├── produto/[slug]/      # detalhe + reserva (booking-form)
│   │   ├── checkout/[orderId]/  # pagamento (simulado)
│   │   └── pedido/[orderId]/    # confirmação + ingressos
│   ├── admin/                   # painel administrativo
│   │   ├── login/               # magic link
│   │   ├── auth/callback/       # troca code por sessão
│   │   └── page.tsx             # dashboard (produtos, pedidos)
│   └── api/
│       ├── checkout/            # cria pedido + hold (RPC)
│       └── payments/confirm/    # SIMULA webhook do PSP
├── lib/
│   ├── services/                # camada de serviços (futura API pública)
│   │   ├── tenant.ts  catalog.ts  availability.ts  orders.ts
│   ├── supabase/                # clients: client / server / admin
│   ├── config.ts  format.ts  types.ts
└── proxy.ts                     # refresh de sessão (rotas /admin)
```

## Banco

Migrations em `supabase/migrations/` (ordem numérica), seed da Aquamania em
`supabase/seed.sql`. Todas as tabelas têm RLS. Escritas sensíveis (reserva,
pagamento, tickets) passam por funções `SECURITY DEFINER` / `service_role`.

Veja `docs/schema.md` para o ERD e as decisões de modelagem.

## Login admin (bootstrap)

O e-mail `pedroriquelmefoz@gmail.com` está configurado como owner de bootstrap
da Aquamania (`tenants.settings.bootstrap_admin_email`). No primeiro login por
magic link, o trigger `handle_new_user` cria o profile e concede o papel owner
automaticamente.
