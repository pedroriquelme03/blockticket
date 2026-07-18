import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantAccess } from "@/lib/auth";
import {
  updateEstabelecimentoAction,
  updatePagamentoAction,
  addMemberAction,
  updateMemberRoleAction,
  removeMemberAction,
} from "./actions";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  owner: "Dono (acesso total)",
  admin: "Administrador",
  staff: "Operador",
};

const MEMBER_MSG: Record<string, { text: string; ok: boolean }> = {
  added: { text: "Membro adicionado.", ok: true },
  already_member: { text: "Esse usuário já é membro.", ok: false },
  user_not_found: {
    text: "Nenhuma conta com esse e-mail. Peça para a pessoa criar a conta em /admin/signup primeiro.",
    ok: false,
  },
  forbidden: { text: "Você não tem permissão para adicionar membros.", ok: false },
  error: { text: "Erro ao adicionar membro.", ok: false },
};

export default async function ConfiguracoesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ membro?: string }>;
}) {
  const { tenantSlug } = await params;
  const { membro } = await searchParams;
  const { tenant, isPlatform, role } = await getTenantAccess(tenantSlug);
  if (!tenant) notFound();

  const canManage = isPlatform || role === "owner" || role === "admin";
  const supabase = await createClient();

  const [{ data: full }, { data: members }] = await Promise.all([
    supabase
      .from("tenants")
      .select("legal_name, document, psp_recipient_id")
      .eq("id", tenant.id)
      .maybeSingle(),
    supabase.rpc("list_tenant_members", { p_tenant: tenant.id }),
  ]);

  const hidden = (
    <>
      <input type="hidden" name="tenant_id" value={tenant.id} />
      <input type="hidden" name="tenant_slug" value={tenantSlug} />
    </>
  );
  const msg = membro ? MEMBER_MSG[membro] : null;

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center gap-2">
        <span className="text-2xl">⚙️</span>
        <h2 className="text-xl font-bold">Configurações</h2>
      </div>

      {/* --- Estabelecimento --- */}
      <section>
        <h3 className="mb-2 font-semibold">Dados do estabelecimento</h3>
        <form
          action={updateEstabelecimentoAction}
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-5"
        >
          {hidden}
          <div>
            <label className="block text-sm font-medium text-slate-700">Nome</label>
            <input
              name="name"
              required
              defaultValue={tenant.name}
              disabled={!canManage}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Razão social
            </label>
            <input
              name="legal_name"
              defaultValue={full?.legal_name ?? ""}
              disabled={!canManage}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">CNPJ</label>
            <input
              name="document"
              defaultValue={full?.document ?? ""}
              disabled={!canManage}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
            />
          </div>
          {canManage && (
            <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              Salvar
            </button>
          )}
        </form>
      </section>

      {/* --- Usuários --- */}
      <section>
        <h3 className="mb-2 font-semibold">Usuários e acesso</h3>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">E-mail</th>
                <th className="px-4 py-2 font-medium">Papel</th>
                {canManage && <th className="px-4 py-2"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(members ?? []).length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-center text-slate-400">
                    Nenhum membro.
                  </td>
                </tr>
              ) : (
                (members ?? []).map(
                  (m: {
                    membership_id: string;
                    email: string;
                    role: string;
                  }) => (
                    <tr key={m.membership_id}>
                      <td className="px-4 py-2">{m.email}</td>
                      <td className="px-4 py-2">
                        {canManage ? (
                          <form
                            action={updateMemberRoleAction}
                            className="flex items-center gap-2"
                          >
                            <input type="hidden" name="tenant_slug" value={tenantSlug} />
                            <input
                              type="hidden"
                              name="membership_id"
                              value={m.membership_id}
                            />
                            <select
                              name="role"
                              defaultValue={m.role}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                            >
                              <option value="owner">Dono</option>
                              <option value="admin">Administrador</option>
                              <option value="staff">Operador</option>
                            </select>
                            <button className="text-xs text-blue-600 hover:underline">
                              Salvar
                            </button>
                          </form>
                        ) : (
                          (ROLE_LABEL[m.role] ?? m.role)
                        )}
                      </td>
                      {canManage && (
                        <td className="px-4 py-2 text-right">
                          <form action={removeMemberAction}>
                            <input type="hidden" name="tenant_slug" value={tenantSlug} />
                            <input
                              type="hidden"
                              name="membership_id"
                              value={m.membership_id}
                            />
                            <button className="text-xs text-red-600 hover:underline">
                              Remover
                            </button>
                          </form>
                        </td>
                      )}
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        {canManage && (
          <>
            {msg && (
              <p
                className={`mt-3 rounded-md p-3 text-sm ${
                  msg.ok
                    ? "bg-green-50 text-green-800"
                    : "bg-amber-50 text-amber-800"
                }`}
              >
                {msg.text}
              </p>
            )}
            <form
              action={addMemberAction}
              className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"
            >
              {hidden}
              <div className="flex-1">
                <label className="block text-xs text-slate-500">E-mail</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="pessoa@cliente.com"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500">Papel</label>
                <select
                  name="role"
                  defaultValue="staff"
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="staff">Operador</option>
                  <option value="admin">Administrador</option>
                  <option value="owner">Dono</option>
                </select>
              </div>
              <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                Adicionar
              </button>
            </form>
            <p className="mt-1 text-xs text-slate-400">
              A pessoa precisa já ter conta (criada em /admin/signup) para ser
              adicionada.
            </p>
          </>
        )}
      </section>

      {/* --- Pagamento --- */}
      {canManage && (
        <section>
          <h3 className="mb-2 font-semibold">Pagamento</h3>
          <form
            action={updatePagamentoAction}
            className="space-y-3 rounded-lg border border-slate-200 bg-white p-5"
          >
            {hidden}
            <div>
              <label className="block text-sm font-medium text-slate-700">
                ID do recebedor no PSP (split)
              </label>
              <input
                name="psp_recipient_id"
                defaultValue={full?.psp_recipient_id ?? ""}
                placeholder="ex.: recipient do AbacatePay"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
              <p className="mt-1 text-xs text-slate-500">
                Usado para repassar o valor da venda a este cliente (split). A
                integração do split entra na seção Financeiro.
              </p>
            </div>
            <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              Salvar
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
