import { NextResponse } from "next/server";
import { db, ensureTables } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Delt katalog over produktbilleder, nøglet på varenøglen (m_sot, a_sot_floor…).
 * Billederne hører til produkterne, ikke til det enkelte tilbud, så de uploades
 * én gang og bruges af alle tilbud.
 */
export async function GET() {
  try {
    await ensureTables();
    const rows = (await db()`select noegle, data from produktbilleder`) as
      { noegle: string; data: string }[];
    const billeder: Record<string, string> = {};
    rows.forEach((r) => (billeder[r.noegle] = r.data));
    return NextResponse.json({ billeder });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Kunne ikke hente billeder" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { billeder } = (await req.json()) as { billeder: Record<string, string> };
    if (!billeder || typeof billeder !== "object") {
      return NextResponse.json({ error: "Ingen billeder" }, { status: 400 });
    }
    await ensureTables();
    for (const [noegle, data] of Object.entries(billeder)) {
      if (typeof data !== "string" || !data.startsWith("data:image/")) continue;
      await db()`
        insert into produktbilleder (noegle, data) values (${noegle}, ${data})
        on conflict (noegle) do update set data = excluded.data, updated = now()
      `;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Kunne ikke gemme billeder" }, { status: 500 });
  }
}
