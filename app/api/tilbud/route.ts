import { NextResponse } from "next/server";
import { db, ensureTables, type TilbudData } from "@/lib/db";
import { naesteNummer } from "@/lib/nummer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Kartotekets liste. Uden `data` — den kan være stor og bruges ikke i listen. */
export async function GET() {
  try {
    await ensureTables();
    const tilbud = await db()`
      select nr, created, updated, status, firma, kontakt, saelger,
             engangs, lic_dag, mod_md
      from tilbud
      order by updated desc
    `;
    return NextResponse.json({ tilbud });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Kunne ikke hente kartoteket" }, { status: 500 });
  }
}

type GemBody = {
  nr?: string | null;
  status?: "kladde" | "sendt";
  data: TilbudData;
  totaler?: { engangs?: number; licDag?: number; modMd?: number };
};

/**
 * Gemmer et tilbud. Uden `nr` tildeles et nyt — det er her nummeret opstår,
 * både når sælgeren trykker Gem og når byggeren gemmer automatisk før eksport.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GemBody;
    if (!body?.data || !Array.isArray(body.data.lokationer)) {
      return NextResponse.json({ error: "Ugyldigt tilbud" }, { status: 400 });
    }
    await ensureTables();

    const f = body.data.felter ?? {};
    const t = body.totaler ?? {};
    const status = body.status === "sendt" ? "sendt" : "kladde";
    const json = JSON.stringify(body.data);
    const engangs = Number(t.engangs ?? 0);
    const licDag = Number(t.licDag ?? 0);
    const modMd = Number(t.modMd ?? 0);

    if (body.nr) {
      const rows = (await db()`
        update tilbud set
          updated = now(), status = ${status},
          firma = ${f.c_company ?? null}, kontakt = ${f.c_contact ?? null},
          saelger = ${f.c_seller ?? null},
          engangs = ${engangs}, lic_dag = ${licDag}, mod_md = ${modMd},
          data = ${json}::jsonb
        where nr = ${body.nr}
        returning nr
      `) as { nr: string }[];
      if (!rows.length) {
        return NextResponse.json({ error: "Tilbuddet findes ikke" }, { status: 404 });
      }
      return NextResponse.json({ nr: rows[0].nr, nyt: false });
    }

    const aar = new Date().getFullYear();
    const { nr, seq } = await naesteNummer(aar);
    await db()`
      insert into tilbud (nr, aar, seq, status, firma, kontakt, saelger,
                          engangs, lic_dag, mod_md, data)
      values (${nr}, ${aar}, ${seq}, ${status},
              ${f.c_company ?? null}, ${f.c_contact ?? null}, ${f.c_seller ?? null},
              ${engangs}, ${licDag}, ${modMd}, ${json}::jsonb)
    `;
    return NextResponse.json({ nr, nyt: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Kunne ikke gemme tilbuddet" }, { status: 500 });
  }
}
