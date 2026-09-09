/* ============================================================
   tillty Tilbudsbygger — Kartotek: gem, hent og nummertildeling

   Byggeren skal blive ved med at virke som en ren fil-app. Åbnes den direkte
   fra disken (file://), findes der ingen server at gemme på — så slår vi
   kartoteksdelen fra, og alt andet opfører sig præcis som før. Det er også
   det, der holder tests/smoke.js kørende uden en kørende Next-server.
   ============================================================ */

const HAR_API = location.protocol === 'http:' || location.protocol === 'https:';
window.HAR_API = HAR_API;

let aktivtNr = null;          // tilbuddets nummer, når det først er tildelt
const synkedeBilleder = {};   // varenøgle -> dataURL, som allerede ligger på serveren

/* ---------- totaler til kartotekslisten ---------- */
/* Totalerne i kartotekslisten. Har tilbuddet flere muligheder, kan de ikke
   lægges sammen — kunden vælger én. Vi viser den anbefalede, ellers den
   første, så listen har ét tal at sortere og scanne på. */
function samlTotaler(){
  const o = OPTIONS.find(x=>x.anbefalet) || OPTIONS[0];
  const s = {engangs:0, licDag:0, modMd:0};
  o.lokationer.forEach(l=>{
    const d = collectFor(l);
    s.engangs += d.oneOff; s.licDag += d.licDaily; s.modMd += d.modMonthly;
  });
  return s;
}

function saetStatus(tekst, fejl){
  const e = document.getElementById('gem_status');
  if(e){ e.textContent = tekst; e.className = 'gem-status' + (fejl ? ' fejl' : ''); }
}

/* ---------- gem ----------
   Uden nummer tildeler serveren et. Det er her tilbudsnumre opstår — både når
   sælgeren trykker Gem, og når eksporten gemmer automatisk først. */
async function gemTilbud(status){
  if(!HAR_API) return null;
  const felter = {};
  QUOTE_FIELDS.forEach(id=>{ const e=document.getElementById(id); if(e) felter[id]=e.value; });

  saetStatus('Gemmer…');
  const r = await fetch('/api/tilbud', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      nr: aktivtNr,
      status: status || 'kladde',
      data: {
        felter,
        form: FORM,
        muligheder: OPTIONS.map(o=>({
          id:o.id, navn:o.navn, tagline:o.tagline, anbefalet:o.anbefalet, intro:o.intro,
          lokationer: o.lokationer.map(l=>({id:l.id, name:l.name, qty:l.qty, eget:l.eget})),
        })),
      },
      totaler: samlTotaler(),
    }),
  });
  if(!r.ok){
    saetStatus('Kunne ikke gemme', true);
    throw new Error('gem fejlede: ' + r.status);
  }
  const d = await r.json();
  aktivtNr = d.nr;

  const felt = document.getElementById('c_number');
  if(felt){ felt.value = d.nr; felt.readOnly = true; }
  history.replaceState(null, '', '/bygger/index.html?nr=' + d.nr);
  await gemBilleder();
  update();
  saetStatus('Gemt som ' + d.nr);
  return d.nr;
}

/* Nulstil binder til kartoteket: efter en nulstilling er vi i gang med et NYT
   tilbud, ikke en rettelse af det forrige. Uden det her ville næste Gem sende
   det gamle nummer med og overskrive kundens tidligere tilbud. */
function slipTilbud(){
  aktivtNr = null;
  const felt = document.getElementById('c_number');
  if(felt) felt.value = '';
  if(HAR_API){
    history.replaceState(null, '', '/bygger/index.html');
    saetStatus('Nyt tilbud — nummer tildeles når du gemmer');
  }
}

/* ---------- hent ---------- */
async function hentTilbud(nr){
  const r = await fetch('/api/tilbud/' + encodeURIComponent(nr));
  if(!r.ok){ saetStatus('Tilbud ' + nr + ' findes ikke', true); return; }
  const { tilbud } = await r.json();
  const d = tilbud.data || {};

  Object.entries(d.felter || {}).forEach(([id,val])=>{
    const e = document.getElementById(id); if(e) e.value = val;
  });
  laesOpsaetning(d);
  activeIdx = 0;
  optIdx = 0;
  aktivtNr = tilbud.nr;

  const felt = document.getElementById('c_number');
  if(felt){ felt.value = tilbud.nr; felt.readOnly = true; }
  renderAll();
  saetStatus('Åbnet ' + tilbud.nr);
}

/* Læser opsætningen fra et gemt tilbud.
   Tilbud gemt før muligheder fandtes har `lokationer` i roden og ingen `form`
   — de læses som ét tilbud med én mulighed, så gamle tilbud åbner uændret. */
function laesOpsaetning(d){
  FORM = Object.assign({muligheder:false, lokationer:false}, d.form || {});
  const raa = d.muligheder && d.muligheder.length
    ? d.muligheder
    : [{navn:'', tagline:'', anbefalet:false, intro:'', lokationer: d.lokationer || []}];

  OPTIONS = raa.map((o,i)=>({
    id: o.id || ('opt'+(i+1)),
    navn: o.navn || ('Mulighed '+(i+1)),
    tagline: o.tagline || '',
    anbefalet: !!o.anbefalet,
    intro: o.intro || '',
    lokationer: (o.lokationer||[]).map(l=>({
      id:l.id, name:l.name,
      qty:Object.assign({}, l.qty),
      eget:Object.assign({}, l.eget),   // mangler i tilbud gemt før genbrug fandtes
    })),
  }));
  OPTIONS.forEach(o=>{ if(!o.lokationer.length) o.lokationer=[newLoc()]; });
  if(!OPTIONS.length) OPTIONS=[newOpt()];

  // Nye id'er må ikke kollidere med dem der allerede er i brug.
  const tal = (v,p)=>parseInt(String(v||'').replace(p,'')) || 0;
  optSeq = OPTIONS.reduce((m,o)=>Math.max(m, tal(o.id,'opt')), 0);
  locSeq = OPTIONS.reduce((m,o)=>o.lokationer.reduce((n,l)=>Math.max(n, tal(l.id,'loc')), m), 0);
}

/* ---------- produktbilleder ----------
   Billederne hører til produkterne, ikke til det enkelte tilbud, så de ligger
   i ét delt katalog. Kun dem der er nye eller ændrede sendes op. */
async function hentBilleder(){
  try{
    const r = await fetch('/api/billeder'); if(!r.ok) return;
    const { billeder } = await r.json();
    Object.entries(billeder || {}).forEach(([k,v])=>{ images[k]=v; synkedeBilleder[k]=v; });
  }catch{ /* uden billeder er byggeren stadig brugbar */ }
}
async function gemBilleder(){
  const nye = {};
  Object.keys(images).forEach(k=>{ if(synkedeBilleder[k] !== images[k]) nye[k] = images[k]; });
  if(!Object.keys(nye).length) return;
  const r = await fetch('/api/billeder', {
    method:'PUT', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ billeder: nye }),
  });
  if(r.ok) Object.assign(synkedeBilleder, nye);
}

/* ---------- opstart ----------
   Kører efter init.js, fordi scriptet ligger sidst i index.html og
   DOMContentLoaded-lyttere fyrer i den rækkefølge de blev registreret. */
document.addEventListener('DOMContentLoaded', async ()=>{
  if(!HAR_API){
    saetStatus('Åbnet som fil — kartoteket er slået fra');
    return;
  }
  document.querySelectorAll('[data-kraever-api]').forEach(e=>{ e.style.display=''; });
  const felt = document.getElementById('c_number');
  // Nummeret tildeles af serveren; det er hele pointen med kartoteket, at det
  // ikke kan tastes frit.
  if(felt){ felt.readOnly = true; felt.placeholder = 'tildeles ved gem'; }

  await hentBilleder();
  const nr = new URLSearchParams(location.search).get('nr');
  if(nr){ skjulOpstart(); await hentTilbud(nr); }
  else { renderAll(); visOpstart(); saetStatus('Nyt tilbud — nummer tildeles når du gemmer'); }
});
