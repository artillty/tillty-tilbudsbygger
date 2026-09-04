import { db } from "./db";

/**
 * Rækken starter ved 1001, ikke ved 1.
 *
 * Rent teknisk er 2026-001 lige så godt et nummer, men det fortæller kunden,
 * at de er det første tilbud, tillty nogensinde har sendt i år. Forskydningen
 * er kosmetisk og ændrer intet ved, at numre er fortløbende og entydige.
 *
 * `greatest()` i sætningen nedenfor løfter også en tæller, der allerede står
 * lavere — fx fordi der blev afprøvet et par tilbud, før forskydningen kom
 * til. Så slipper vi for at rette i databasen i hånden, og et nyt miljø
 * opfører sig som et gammelt.
 */
const START = 1000;

/**
 * Tildeler næste tilbudsnummer for året: 2026-1001, 2026-1002, …
 *
 * Én atomar sætning, ingen transaktion — Neons HTTP-driver har ikke rigtige
 * transaktioner, og to sælgere der trykker Gem samtidig må aldrig kunne få
 * samme nummer. `on conflict do update ... returning` afgør det i databasen.
 */
export async function naesteNummer(aar: number): Promise<{ nr: string; seq: number }> {
  const rows = (await db()`
    insert into tilbud_taeller (aar, seq) values (${aar}, ${START + 1})
    on conflict (aar) do update set seq = greatest(tilbud_taeller.seq + 1, ${START + 1})
    returning seq
  `) as { seq: number }[];
  const seq = Number(rows[0].seq);
  return { nr: formatNummer(aar, seq), seq };
}

export function formatNummer(aar: number, seq: number): string {
  return `${aar}-${String(seq).padStart(4, "0")}`;
}
