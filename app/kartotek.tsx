"use client";

import { useEffect, useMemo, useState } from "react";

type Tilbud = {
  nr: string;
  created: string;
  updated: string;
  status: "kladde" | "sendt";
  firma: string | null;
  kontakt: string | null;
  saelger: string | null;
  engangs: string | number;
  lic_dag: string | number;
  mod_md: string | number;
  /** "pay" for et PAY-tilbud; null eller "udstyr" for et udstyrstilbud. */
  type: string | null;
};

type Type = "udstyr" | "pay";
type TypeFilter = "alle" | Type;
type StatusFilter = "alle" | "kladde" | "sendt";

/** Samme måned på 30 dage som byggeren bruger — se CLAUDE.md. */
const LICENSDAGE = 30;

/** Husets format: alle beløb ender på ",-", også dem med ører. */
function fmt(n: number) {
  const s = Number.isInteger(n)
    ? n.toLocaleString("da-DK")
    : n.toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return s + ",-";
}

function dato(iso: string) {
  return new Date(iso).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Tilbud fra før PAY fandtes har ingen type — de er udstyrstilbud. */
const typeAf = (t: Tilbud): Type => (t.type === "pay" ? "pay" : "udstyr");

const TYPENAVN: Record<Type, string> = { udstyr: "Udstyr og software", pay: "tillty PAY" };

export default function Kartotek() {
  const [tilbud, setTilbud] = useState<Tilbud[] | null>(null);
  const [fejl, setFejl] = useState("");
  const [soeg, setSoeg] = useState("");
  const [type, setType] = useState<TypeFilter>("alle");
  const [status, setStatus] = useState<StatusFilter>("alle");

  async function hent() {
    try {
      const r = await fetch("/api/tilbud");
      if (!r.ok) throw new Error();
      const d = await r.json();
      setTilbud(d.tilbud ?? []);
    } catch {
      setFejl("Kunne ikke hente kartoteket.");
      setTilbud([]);
    }
  }

  useEffect(() => {
    hent();
  }, []);

  async function slet(nr: string, firma: string | null) {
    if (!confirm(`Slet tilbud ${nr}${firma ? ` til ${firma}` : ""}?\n\nNummeret genbruges ikke.`))
      return;
    const r = await fetch(`/api/tilbud/${nr}`, { method: "DELETE" });
    if (r.ok) hent();
    else alert("Kunne ikke slette tilbuddet.");
  }

  // Søgning og status filtrerer først; typen deler derefter resultatet op i
  // sine egne afsnit, så tællerne på typeknapperne passer til det man søger.
  const soegt = useMemo(() => {
    if (!tilbud) return [];
    const q = soeg.trim().toLowerCase();
    return tilbud.filter(
      (t) =>
        (status === "alle" || t.status === status) &&
        (!q || [t.nr, t.firma, t.kontakt, t.saelger].some((f) => (f ?? "").toLowerCase().includes(q)))
    );
  }, [tilbud, soeg, status]);

  const antal = (ty: TypeFilter) => soegt.filter((t) => ty === "alle" || typeAf(t) === ty).length;
  const afsnit: Type[] = type === "alle" ? ["udstyr", "pay"] : [type];
  const vist = soegt.filter((t) => type === "alle" || typeAf(t) === type);

  return (
    <>
      <header className="top">
        <div>
          <div className="brand">tillty</div>
          <div className="sub">Tilbudskartotek · find et tidligere tilbud frem</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn btn-ghost"
            onClick={async () => {
              await fetch("/api/auth", { method: "DELETE" });
              location.href = "/login";
            }}
          >
            Log ud
          </button>
          <a className="btn" href="/bygger/index.html">
            + Nyt tilbud
          </a>
        </div>
      </header>

      <div className="wrap">
        <div className="panel">
          <h2>
            Tilbud
            <span className="cnt">
              {tilbud === null ? "henter…" : `${vist.length} af ${tilbud.length}`}
            </span>
          </h2>

          <input
            className="soeg"
            placeholder="Søg på tilbudsnr., firma, kontaktperson eller sælger…"
            value={soeg}
            onChange={(e) => setSoeg(e.target.value)}
          />

          {/* Typen deler listen op; status snævrer den ind. Begge er knapper,
              så man kan se hvor man står, og tælleren viser hvad der gemmer sig. */}
          <div className="filtre">
            <div className="pills" role="group" aria-label="Tilbudstype">
              {(["alle", "udstyr", "pay"] as TypeFilter[]).map((ty) => (
                <button
                  key={ty}
                  type="button"
                  className={`pill${type === ty ? " active" : ""}`}
                  onClick={() => setType(ty)}
                >
                  {ty === "alle" ? "Alle" : TYPENAVN[ty]}
                  <span className="cnt">{antal(ty)}</span>
                </button>
              ))}
            </div>
            <div className="pills" role="group" aria-label="Status">
              {(["alle", "kladde", "sendt"] as StatusFilter[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`pill${status === st ? " active" : ""}`}
                  onClick={() => setStatus(st)}
                >
                  {st === "alle" ? "Alle" : st === "kladde" ? "Kladder" : "Sendte"}
                </button>
              ))}
            </div>
          </div>

          {fejl && <div className="tom">{fejl}</div>}

          {!fejl && tilbud !== null && tilbud.length === 0 && (
            <div className="tom">
              Der er ingen tilbud endnu. Tryk “+ Nyt tilbud” for at bygge det første.
            </div>
          )}

          {!fejl && tilbud !== null && tilbud.length > 0 && vist.length === 0 && (
            <div className="tom">
              {soeg.trim() ? `Ingen tilbud matcher “${soeg}”.` : "Ingen tilbud her."}
            </div>
          )}

          {afsnit.map((ty) => {
            const rows = vist.filter((t) => typeAf(t) === ty);
            // Et tomt afsnit vises kun, når man har valgt netop den type — så
            // "Alle" ikke fylder med tomme overskrifter.
            if (!rows.length) return null;
            return (
              <section key={ty} className="grp" data-type={ty}>
                {type === "alle" && (
                  <h3>
                    {TYPENAVN[ty]}
                    <span className="cnt">{rows.length}</span>
                  </h3>
                )}
                {ty === "udstyr" ? <UdstyrTabel rows={rows} slet={slet} /> : <PayTabel rows={rows} slet={slet} />}
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}

/** Et tryk hvor som helst på rækken åbner tilbuddet. Knapperne i sidste
 *  kolonne stopper selv trykket, og markerer man tekst for at kopiere den,
 *  sker der intet. Cmd/Ctrl-klik åbner i en ny fane. */
function aabn(e: React.MouseEvent, nr: string) {
  if ((e.target as HTMLElement).closest("a,button")) return;
  if (window.getSelection()?.toString()) return;
  const url = `/bygger/index.html?nr=${nr}`;
  if (e.metaKey || e.ctrlKey) window.open(url, "_blank");
  else location.href = url;
}

type TabelProps = { rows: Tilbud[]; slet: (nr: string, firma: string | null) => void };

/** Kolonner fælles for begge tabeller: nummer, kunde, sælger og status. */
function KundeCeller({ t }: { t: Tilbud }) {
  return (
    <>
      <td className="nr">{t.nr}</td>
      <td>
        {/* Hele rækken åbner tilbuddet (se `aabn`); linket her er vejen ind
            med tastaturet. */}
        <a className="firma" href={`/bygger/index.html?nr=${t.nr}`}>
          {t.firma || <span className="svag">uden navn</span>}
        </a>
        {t.kontakt && <div className="svag">{t.kontakt}</div>}
      </td>
      <td>{t.saelger || <span className="svag">—</span>}</td>
      <td>
        <span className={`status ${t.status}`}>{t.status}</span>
      </td>
    </>
  );
}

/** Henter klargøringsguiden uden at forlade kartoteket. Guiden bygges af
 *  byggeren (js/guide.js), så den køres i en usynlig ramme, som selv åbner
 *  browserens "Gem som PDF". Rammen vises kun, hvis sælgeren skal vælge mellem
 *  flere muligheder. Byggeren melder 'valg', 'print' og 'luk' tilbage. */
function hentGuide(nr: string) {
  document.getElementById("guide_ramme")?.remove();
  const ramme = document.createElement("iframe");
  ramme.id = "guide_ramme";
  ramme.className = "guide-ramme";
  ramme.title = "Klargøringsguide";
  const titel = document.title;
  const besked = (e: MessageEvent) => {
    if (e.origin !== location.origin || e.source !== ramme.contentWindow || e.data?.tillty !== "guide") return;
    if (e.data.trin === "valg") ramme.classList.add("synlig");
    if (e.data.trin === "print") {
      ramme.classList.remove("synlig");
      // Browseren foreslår sidens titel som filnavn i "Gem som PDF".
      if (typeof e.data.filnavn === "string") document.title = e.data.filnavn;
    }
    if (e.data.trin === "luk") {
      window.removeEventListener("message", besked);
      document.title = titel;
      ramme.remove();
    }
  };
  window.addEventListener("message", besked);
  ramme.src = `/bygger/index.html?nr=${encodeURIComponent(nr)}&guide=1`;
  document.body.appendChild(ramme);
}

/** `guide`: udstyrstilbud har en klargøringsguide (krav til kundens lokation),
 *  også som kladde. Den bygges af det gemte tilbud, hver gang der trykkes, så
 *  den altid følger tilbuddet. Knappen henter PDF'en uden at forlade
 *  kartoteket (`hentGuide`). */
function Knapper({ t, slet, guide }: { t: Tilbud; slet: TabelProps["slet"]; guide?: boolean }) {
  return (
    <td style={{ whiteSpace: "nowrap", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
      {guide && (
        <>
          <button className="rowbtn" onClick={() => hentGuide(t.nr)}>
            ⬇ Klargøringsguide
          </button>{" "}
        </>
      )}
      <button className="rowbtn fare" onClick={() => slet(t.nr, t.firma)}>
        Slet
      </button>
    </td>
  );
}

/** Udstyrstilbud: engangspris og det løbende (licenser pr. måned + moduler). */
function UdstyrTabel({ rows, slet }: TabelProps) {
  return (
    <table className="kart">
      <thead>
        <tr>
          <th>Nr.</th>
          <th>Kunde</th>
          <th>Sælger</th>
          <th>Status</th>
          <th className="num">Hardware og tilbehør</th>
          <th className="num">Løbende/md.</th>
          <th>Opdateret</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {rows.map((t) => {
          const loebende = Number(t.lic_dag) * LICENSDAGE + Number(t.mod_md);
          return (
            <tr key={t.nr} className="aaben" onClick={(e) => aabn(e, t.nr)}>
              <KundeCeller t={t} />
              <td className="num">{Number(t.engangs) ? fmt(Number(t.engangs)) : "—"}</td>
              <td className="num">{loebende ? fmt(loebende) : "—"}</td>
              <td className="svag">{dato(t.updated)}</td>
              <Knapper t={t} slet={slet} guide />
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** PAY-tilbud: ingen engangspris; byggeren gemmer netto betalingsomkostningen
 *  pr. måned i mod_md, og det er det tal, der er værd at scanne på. */
function PayTabel({ rows, slet }: TabelProps) {
  return (
    <table className="kart">
      <thead>
        <tr>
          <th>Nr.</th>
          <th>Kunde</th>
          <th>Sælger</th>
          <th>Status</th>
          <th className="num">Netto betaling/md.</th>
          <th>Opdateret</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {rows.map((t) => {
          const netto = Number(t.mod_md);
          return (
            <tr key={t.nr} className="aaben" onClick={(e) => aabn(e, t.nr)}>
              <KundeCeller t={t} />
              <td className="num">{netto ? fmt(netto) : "—"}</td>
              <td className="svag">{dato(t.updated)}</td>
              <Knapper t={t} slet={slet} />
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
