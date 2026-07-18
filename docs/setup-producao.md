# Checklist de configuração (Pedro) — produção

Itens que **não são código**; precisam ser feitos no Vercel / Supabase / AbacatePay / DNS.

## 1. Webhook AbacatePay
1. Em Vercel → Project → Settings → Environment Variables, crie `ABACATEPAY_WEBHOOK_SECRET` (string aleatória forte).
2. No dashboard AbacatePay, registre a URL:
   `https://SEU_DOMINIO/api/webhooks/abacatepay?secret=VALOR_DO_SECRET`
3. Faça um PIX de teste e confira se o pedido vira `paid` e se os tickets aparecem.

## 2. E-mail (Resend)
1. Crie conta no [Resend](https://resend.com), verifique o domínio.
2. Em Vercel, configure:
   - `RESEND_API_KEY`
   - `EMAIL_FROM` (ex.: `BlockTicket <ingressos@seudominio.com.br>`)
3. No Supabase Auth → SMTP, use o mesmo provedor (ou Resend) para confirmação de conta.

## 3. Auth Supabase
1. Authentication → URL Configuration: Site URL = URL do admin em produção.
2. Redirect URLs: inclua `https://SEU_DOMINIO/admin/auth/callback`.
3. Ou desligue "Confirm email" temporariamente, ou configure SMTP (acima).
4. Ative **Leaked password protection**.
5. Antes do go-live: restrinja `/admin/signup` (gating) ou desative signup público.

## 4. Cron de holds
1. `vercel.json` já agenda `/api/cron/expire-holds` a cada 5 min.
2. Defina `CRON_SECRET` na Vercel (o Cron envia `Authorization: Bearer CRON_SECRET`).

## 5. Domínios
1. Em Site (painel do cliente), cadastre `ingressos.cliente.com.br`.
2. Na Vercel: Domains → Add → CNAME no DNS do cliente.

## 6. Migration 0015
Rode no Supabase SQL Editor (ou `supabase db push`):
`supabase/migrations/0015_operations_coupons_storage.sql`
— cancela pedido, check-in, cupons, bucket `product-images`.

## 7. Split (opcional)
1. Cadastre o recebedor do cliente no AbacatePay.
2. Cole o ID em Configurações → `psp_recipient_id`.
3. Opcional: `PLATFORM_FEE_BPS` (ex.: `500` = 5%) na Vercel.
