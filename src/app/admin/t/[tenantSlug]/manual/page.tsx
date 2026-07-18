export const dynamic = "force-dynamic";

const SECTIONS = [
  {
    title: "1. Inventário",
    body: "Cadastre produtos, variantes (tipos de ingresso), tarifas por dia e regras de disponibilidade. Use exceções para feriados. Marque “exige horário” se houver sessões.",
  },
  {
    title: "2. Site / domínio",
    body: "Em Site, cadastre o hostname da loja (ex.: ingressos.seudominio.com.br) e aponte o DNS (CNAME) para a Vercel.",
  },
  {
    title: "3. Venda",
    body: "O cliente escolhe data (e horário), reserva (hold) e paga via PIX. Após confirmação, os ingressos são emitidos com QR.",
  },
  {
    title: "4. Operações",
    body: "Em Operações → Check-in, digite ou leia o código do QR. A Agenda do dia lista quem vem. No detalhe do pedido dá para reenviar e-mail ou cancelar.",
  },
  {
    title: "5. Cupons",
    body: "Em Comercial, crie cupons percentuais ou de valor fixo. O cliente informa o código no checkout (quando habilitado).",
  },
  {
    title: "6. Usuários",
    body: "Em Configurações, adicione membros por e-mail (owner/admin/staff). Quem ainda não tem conta precisa se cadastrar em /admin/signup.",
  },
];

export default function ManualPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Manual de uso</h2>
        <p className="text-sm text-slate-500">
          Guia rápido do painel BlockTicket.
        </p>
      </div>
      <ol className="space-y-4">
        {SECTIONS.map((s) => (
          <li
            key={s.title}
            className="rounded-lg border border-slate-200 bg-white p-5"
          >
            <h3 className="font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{s.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
