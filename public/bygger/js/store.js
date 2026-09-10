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
/* Totalerne i kartotekslisten. Mulighederne i en lokation er alternativer og
   kan ikke lægges sammen — kunden vælger én. For hver lokation tæller den
   anbefalede, ellers den første, så listen har ét tal at sortere og scanne på. */
function samlTotaler(){
  const s = {engangs:0, licDag:0, modMd:0};
  LOCS.forEach(l=>{
    const o = l.muligheder.find(x=>x.anbefalet) || l.muligheder[0];
    const d = collectFor(o);
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
        lokationer: LOCS.map(l=>({
          id:l.id, name:l.name,
          muligheder: l.muligheder.map(o=>({
            id:o.id, navn:o.navn, tagline:o.tagline, anbefalet:o.anbefalet,
            qty:o.qty, eget:o.eget,
          })),
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

/* Læser opsætningen fra et gemt tilbud. Tre formater:
   - nu: `lokationer`, der hver har `muligheder` med opsætningen.
   - fra før muligheder fandtes: `lokationer` med `qty` direkte på lokationen
     og ingen `form` — hver lokation får én mulighed, så gamle tilbud åbner uændret.
   - den korte mellemform (sep. 2026) med `muligheder` øverst og lokationer
     under: vendes om, så lokation nr. i samler mulighedernes lokation nr. i.
   Id'erne er kun interne og laves forfra. */
function laesOpsaetning(d){
  FORM = Object.assign({muligheder:false, lokationer:false}, d.form || {});
  let raa;
  if(Array.isArray(d.muligheder) && d.muligheder.length){
    const n = Math.max(1, ...d.muligheder.map(o=>(o.lokationer||[]).length));
    raa = Array.from({length:n}, (_,i)=>{
      const med = d.muligheder.filter(o=>(o.lokationer||[])[i]);
      return {name: med.length ? med[0].lokationer[i].name : '',
        muligheder: med.map(o=>Object.assign({}, o, {qty:o.lokationer[i].qty, eget:o.lokationer[i].eget}))};
    });
  } else {
    raa = (d.lokationer||[]).map(l=>({name:l.name,
      muligheder: Array.isArray(l.muligheder) ? l.muligheder : [{qty:l.qty, eget:l.eget}]}));
  }
  locSeq = 0; optSeq = 0;
  LOCS = raa.map(l=>{
    const loc = newLoc(l.name);
    const ms = (l.muligheder||[]).map((o,j)=>Object.assign(newOpt(j+1,o), {anbefalet:!!o.anbefalet}));
    if(ms.length) loc.muligheder = ms;
    return loc;
  });
  if(!LOCS.length) LOCS=[newLoc()];
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
