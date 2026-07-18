import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET/POST /api/cron/expire-holds — libera holds expirados.
// Protegido por CRON_SECRET (Vercel Cron envia Authorization: Bearer …).
export async function GET(request: Request) {
  return run(request);
}
export async function POST(request: Request) {
  return run(request);
}

async function run(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("expire_holds");
    if (error) throw error;
    return NextResponse.json({ expired: data ?? 0 });
  } catch (e) {
    console.error("[cron expire-holds]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 }
    );
  }
}
