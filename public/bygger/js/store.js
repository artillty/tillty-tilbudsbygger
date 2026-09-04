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
function samlTotaler(){
  const s = {engangs:0, licDag:0, modMd:0};
  LOCATIONS.forEach(l=>{
    const d = collectFor(l.qty);
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
      data: { felter, lokationer: LOCATIONS.map(l=>({id:l.id, name:l.name, qty:l.qty})) },
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
  LOCATIONS = (d.lokationer || []).map(l=>({id:l.id, name:l.name, qty:Object.assign({}, l.qty)}));
  if(!LOCATIONS.length) LOCATIONS = [newLoc()];
  // Nye lokationer må ikke få et id, der allerede er i brug.
  locSeq = LOCATIONS.reduce((m,l)=>Math.max(m, parseInt(String(l.id).replace('loc','')) || 0), 0);
  activeIdx = 0;
  aktivtNr = tilbud.nr;

  const felt = document.getElementById('c_number');
  if(felt){ felt.value = tilbud.nr; felt.readOnly = true; }
  renderAll();
  saetStatus('Åbnet ' + tilbud.nr);
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
  if(nr) await hentTilbud(nr);
  else { renderAll(); saetStatus('Nyt tilbud — nummer tildeles når du gemmer'); }
});
