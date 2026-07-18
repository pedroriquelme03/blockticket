export const dynamic = "force-dynamic";

export default function SuportePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Suporte</h2>
        <p className="text-sm text-slate-500">
          Canal de atendimento da FozDev para clientes BlockTicket.
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4 text-sm">
        <p>
          <span className="font-medium">E-mail:</span>{" "}
          <a
            href="mailto:suporte@fozdev.com.br"
            className="text-blue-600 hover:underline"
          >
            suporte@fozdev.com.br
          </a>
        </p>
        <p>
          <span className="font-medium">WhatsApp:</span>{" "}
          <a
            href="https://wa.me/5545999999999"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            (45) 99999-9999
          </a>{" "}
          <span className="text-slate-400">(atualize o número real)</span>
        </p>
        <p className="text-slate-500">
          Horário: segunda a sexta, 9h–18h (horário de Brasília). Inclua o nome
          do estabelecimento e prints do erro quando possível.
        </p>
      </div>
    </div>
  );
}
