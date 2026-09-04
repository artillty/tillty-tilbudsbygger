import { db } from "./db";

/**
 * Tildeler næste tilbudsnummer for året: 2026-001, 2026-002, …
 *
 * Én atomar sætning, ingen transaktion — Neons HTTP-driver har ikke rigtige
 * transaktioner, og to sælgere der trykker Gem samtidig må aldrig kunne få
 * samme nummer. `on conflict do update ... returning` afgør det i databasen.
 */
export async function naesteNummer(aar: number): Promise<{ nr: string; seq: number }> {
  const rows = (await db()`
    insert into tilbud_taeller (aar, seq) values (${aar}, 1)
    on conflict (aar) do update set seq = tilbud_taeller.seq + 1
    returning seq
  `) as { seq: number }[];
  const seq = Number(rows[0].seq);
  return { nr: formatNummer(aar, seq), seq };
}

/** Tre cifre er nok til et års tilbud; flere cifre bruges hvis det sprænger. */
export function formatNummer(aar: number, seq: number): string {
  return `${aar}-${String(seq).padStart(3, "0")}`;
}
