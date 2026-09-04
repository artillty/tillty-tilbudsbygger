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

/** Det byggeren sender op og får tilbage. `qty` er lokationens antal pr. varenøgle. */
export type TilbudData = {
  felter: Record<string, string>;
  lokationer: { id: string; name: string; qty: Record<string, number> }[];
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
