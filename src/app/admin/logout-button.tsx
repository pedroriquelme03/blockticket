"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
    >
      Sair
    </button>
  );
}
