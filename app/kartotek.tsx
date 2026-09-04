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
};

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

export default function Kartotek() {
  const [tilbud, setTilbud] = useState<Tilbud[] | null>(null);
  const [fejl, setFejl] = useState("");
  const [soeg, setSoeg] = useState("");

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

  const vist = useMemo(() => {
    if (!tilbud) return [];
    const q = soeg.trim().toLowerCase();
    if (!q) return tilbud;
    return tilbud.filter((t) =>
      [t.nr, t.firma, t.kontakt, t.saelger].some((f) => (f ?? "").toLowerCase().includes(q))
    );
  }, [tilbud, soeg]);

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

          {fejl && <div className="tom">{fejl}</div>}

          {!fejl && tilbud !== null && tilbud.length === 0 && (
            <div className="tom">
              Der er ingen tilbud endnu. Tryk “+ Nyt tilbud” for at bygge det første.
            </div>
          )}

          {!fejl && tilbud !== null && tilbud.length > 0 && vist.length === 0 && (
            <div className="tom">Ingen tilbud matcher “{soeg}”.</div>
          )}

          {vist.length > 0 && (
            <table className="kart">
              <thead>
                <tr>
                  <th>Nr.</th>
                  <th>Kunde</th>
                  <th>Sælger</th>
                  <th>Status</th>
                  <th className="num">Engangs</th>
                  <th className="num">Løbende/md.</th>
                  <th>Opdateret</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {vist.map((t) => {
                  const loebende = Number(t.lic_dag) * LICENSDAGE + Number(t.mod_md);
                  return (
                    <tr key={t.nr}>
                      <td className="nr">{t.nr}</td>
                      <td>
                        <div className="firma">{t.firma || <span className="svag">uden navn</span>}</div>
                        {t.kontakt && <div className="svag">{t.kontakt}</div>}
                      </td>
                      <td>{t.saelger || <span className="svag">—</span>}</td>
                      <td>
                        <span className={`status ${t.status}`}>{t.status}</span>
                      </td>
                      <td className="num">{Number(t.engangs) ? fmt(Number(t.engangs)) : "—"}</td>
                      <td className="num">{loebende ? fmt(loebende) : "—"}</td>
                      <td className="svag">{dato(t.updated)}</td>
                      <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                        <a className="rowbtn" href={`/bygger/index.html?nr=${t.nr}`}>
                          Åbn
                        </a>{" "}
                        <button className="rowbtn fare" onClick={() => slet(t.nr, t.firma)}>
                          Slet
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
