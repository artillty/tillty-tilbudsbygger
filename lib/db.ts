import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

function url() {
  const u =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    "";
  if (!u) throw new Error("Ingen database-URL fundet (sæt DATABASE_URL)");
  return u;
}

let client: NeonQueryFunction<false, false> | null = null;

/** Laves først når en route rent faktisk kalder den — ikke ved build. */
export function db() {
  if (!client) client = neon(url());
  return client;
}

let ready: Promise<void> | null = null;

/**
 * Opretter tabellerne første gang der kaldes. Kører kun én gang pr. instans.
 *
 * Produktbillederne ligger for sig og ikke i tilbuddets jsonb: byggeren deler
 * allerede uploadede billeder på tværs af lokationer, fordi det er de samme
 * produkter. Lå de i hver tilbudsrække, ville hvert eneste tilbud slæbe de
 * samme par megabyte base64 med sig.
 */
export function ensureTables() {
  if (!ready) {
    ready = (async () => {
      await db()`
        create table if not exists tilbud (
          nr       text primary key,
          aar      int  not null,
          seq      int  not null,
          created  timestamptz not null default now(),
          updated  timestamptz not null default now(),
          status   text not null default 'kladde',
          firma    text,
          kontakt  text,
          saelger  text,
          engangs  numeric not null default 0,
          lic_dag  numeric not null default 0,
          mod_md   numeric not null default 0,
          data     jsonb not null
        )
      `;
      await db()`create index if not exists tilbud_updated_idx on tilbud (updated desc)`;
      await db()`
        create table if not exists tilbud_taeller (
          aar int primary key,
          seq int not null
        )
      `;
      await db()`
        create table if not exists produktbilleder (
          noegle  text primary key,
          data    text not null,
          updated timestamptz not null default now()
        )
      `;
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

/** Opsætningen pr. varenøgle: `qty` er nyt udstyr, `eget` det kunden allerede har,
 *  `brugt` er brugt udstyr vi sælger, og `brugtPris` er den stykpris sælgeren har sat på det. */
type Opsaetning = {
  qty?: Record<string, number>;
  eget?: Record<string, number>;
  brugt?: Record<string, number>;
  brugtPris?: Record<string, number>;
};
type MulighedInfo = { id: string; navn: string; tagline: string; anbefalet: boolean };

/** Det byggeren sender op og får tilbage. */
export type TilbudData = {
  felter: Record<string, string>;
  form?: { muligheder: boolean; lokationer: boolean };
  /** Et tilbud er en liste af lokationer, der hver har sine muligheder.
   *  Tilbud fra før muligheder fandtes har opsætningen direkte på lokationen. */
  lokationer?: (Opsaetning & { id: string; name: string; muligheder?: (MulighedInfo & Opsaetning)[] })[];
  /** Kun i den korte mellemform (sep. 2026), hvor mulighederne lå øverst. */
  muligheder?: (MulighedInfo & { lokationer: (Opsaetning & { id: string; name: string })[] })[];
};

export type TilbudRow = {
  nr: string;
  created: string;
  updated: string;
  status: "kladde" | "sendt";
  firma: string | null;
  kontakt: string | null;
  saelger: string | null;
  engangs: number;
  lic_dag: number;
  mod_md: number;
};
