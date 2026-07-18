# Blockticket — Relatório do que falta fazer

Estado atualizado em 18/07/2026 (implementação em lote). Legenda: ✅ pronto · 🟡 parcial · 🔴 não iniciado / depende de config.

---

## 1. Panorama

| Área | Estado |
|---|---|
| Schema + RLS multi-tenant | ✅ |
| Loja (vitrine, produto, hold, PIX, confirmação + QR) | ✅ |
| Carrinho multi-produto | ✅ |
| Sessões/horários na loja | ✅ |
| Busca + imagens na vitrine | ✅ |
| Webhook AbacatePay (código) | ✅ |
| E-mail de ingressos (código Resend) | ✅ (falta API key) |
| Cron `expire_holds` | ✅ (falta `CRON_SECRET` + deploy) |
| Painel: Inventário completo (edit/imagens/exceções/sessões) | ✅ |
| Painel: Operações (pedidos, detalhe, check-in, agenda) | ✅ |
| Comercial (cupons) | ✅ (migration 0015) |
| Relatórios / Financeiro / Link / Manual / Suporte | ✅ |
| Sidebar mobile | ✅ |

---

## 2. Ainda depende do Pedro (config)

Ver checklist detalhado em [`docs/setup-producao.md`](./setup-producao.md).

- 🔴 Webhook secret + URL no AbacatePay
- 🔴 `RESEND_API_KEY` + SMTP Auth
- 🔴 Auth Site URL / Confirm email / leaked passwords
- 🔴 Domínios DNS
- 🔴 Rodar migration `0015`
- 🔴 `CRON_SECRET` na Vercel

---

## 3. Ainda em aberto (código / produto)

- 🔴 Parcerias / afiliados completos
- 🔴 PDV / campanhas / canais (além de cupons)
- 🔴 Cartão de crédito / boleto (checkout hospedado AbacatePay)
- 🔴 Aplicar cupom no checkout da loja (UI + RPC no pedido)
- 🔴 Split: validar payload real da API AbacatePay (código envia `splits`)
- 🔴 Onboarding Vercel API + billing plataforma
- 🔴 Tipos gerados Supabase, Zod em todos forms, testes, Sentry
- 🔴 Catraca / app portaria / i18n / tema por cliente
