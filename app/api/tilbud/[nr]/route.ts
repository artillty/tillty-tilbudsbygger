import { NextResponse } from "next/server";
import { db, ensureTables } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ nr: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { nr } = await params;
    await ensureTables();
    const rows = (await db()`
      select nr, created, updated, status, data from tilbud where nr = ${nr}
    `) as { nr: string; created: string; updated: string; status: string; data: unknown }[];
    if (!rows.length) {
      return NextResponse.json({ error: "Tilbuddet findes ikke" }, { status: 404 });
    }
    return NextResponse.json({ tilbud: rows[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Kunne ikke hente tilbuddet" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { nr } = await params;
    await ensureTables();
    // Nummeret genbruges ikke. Tælleren rulles bevidst ikke tilbage — et slettet
    // tilbud kan være sendt til en kunde, og to tilbud må aldrig dele nummer.
    await db()`delete from tilbud where nr = ${nr}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Kunne ikke slette tilbuddet" }, { status: 500 });
  }
}
