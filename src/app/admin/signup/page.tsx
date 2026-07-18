"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function traduzErro(msg: string): string {
  if (/already registered/i.test(msg))
    return "Este e-mail já tem conta. Faça login.";
  if (/password/i.test(msg) && /at least|6/i.test(msg))
    return "A senha precisa ter ao menos 6 caracteres.";
  return msg;
}

export default function AdminSignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(traduzErro(error.message));
      return;
    }
    // Sessão criada na hora = confirmação de e-mail desativada no Supabase.
    if (data.session) {
      router.push("/admin");
      router.refresh();
      return;
    }
    setInfo(
      "Conta criada! Confirme pelo link enviado ao seu e-mail para poder entrar."
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">Criar conta</h1>
      <p className="mt-1 text-sm text-slate-500">
        O acesso depende de o e-mail já estar autorizado (admin da plataforma ou
        de um cliente).
      </p>

      {info ? (
        <p className="mt-6 rounded-md bg-green-50 p-4 text-sm text-green-800">
          {info}
        </p>
      ) : (
        <form onSubmit={handleSignup} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              E-mail
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Senha
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder="mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
          >
            {loading ? "Criando…" : "Criar conta"}
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-sm text-slate-500">
        Já tem conta?{" "}
        <Link href="/admin/login" className="text-blue-600 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
