import { db } from "./db";

/**
 * Tilbudsnumre må ikke kunne afkodes.
 *
 * Et nummer som 2026-001 fortæller kunden, at de er årets første tilbud, og
 * en serie der tæller 1001, 1002, 1003 lader to kunder regne ud, hvor mange
 * tilbud der lå imellem dem. Derfor to greb:
 *
 *   1. Året starter på et skævt, tilfældigt tal — ikke på et rundt.
 *   2. Hvert nyt nummer springer 2-9 frem, ikke 1.
 *
 * Numrene er stadig strengt voksende, og dermed både entydige og sorterbare;
 * det er kun afstanden mellem dem, der ikke længere siger noget.
 */
const MIN_START = 1200;
const MAX_START = 1900;

function tilfaeldigStart(): number {
  return MIN_START + Math.floor(Math.random() * (MAX_START - MIN_START + 1));
}

/**
 * Tildeler næste tilbudsnummer for året: fx 2026-1473, 2026-1479, 2026-1486.
 *
 * Én atomar sætning, ingen transaktion — Neons HTTP-driver har ikke rigtige
 * transaktioner, og to sælgere der trykker Gem samtidig må aldrig kunne få
 * samme nummer. `on conflict do update ... returning` afgør det i databasen,
 * og springet regnes med databasens egen random(), så det også er atomart.
 *
 * En tæller under startområdet — fx fra et miljø med gamle prøvetilbud fra
 * dengang serien startede ved 1 — løftes ÉN gang op på et skævt starttal.
 * To fælder, der begge er prøvet af:
 *   - Et fast gulv ville få enhver lav tæller til at lande på præcis det tal,
 *     og så er nummeret lige så gennemskueligt som før.
 *   - `greatest(seq + spring, nyt tilfældigt tal)` trækker et nyt gulv ved hvert
 *     kald og giver spring langt over 9, indtil tælleren er over MAX_START.
 * Derfor et eksplicit `case`: løft først, dernæst rene spring på 2-9.
 */
export async function naesteNummer(aar: number): Promise<{ nr: string; seq: number }> {
  const start = tilfaeldigStart();
  const rows = (await db()`
    insert into tilbud_taeller (aar, seq) values (${aar}, ${start})
    on conflict (aar) do update
      set seq = case
        when tilbud_taeller.seq < ${MIN_START} then ${start}
        else tilbud_taeller.seq + 2 + floor(random() * 8)::int
      end
    returning seq
  `) as { seq: number }[];
  const seq = Number(rows[0].seq);
  return { nr: formatNummer(aar, seq), seq };
}

export function formatNummer(aar: number, seq: number): string {
  return `${aar}-${String(seq).padStart(4, "0")}`;
}
