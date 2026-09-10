/* ============================================================
   tillty Tilbudsbygger — State og byggerens UI
   ============================================================ */

/* ---------- placeholder image generator (kun til byggeren, aldrig til PDF'en) ---------- */
const _phCache={};
function ph(label){
  if(_phCache[label]) return _phCache[label];
  const S=160, c=document.createElement('canvas'); c.width=S; c.height=S;
  const x=c.getContext('2d');
  x.fillStyle='#eef2f7'; x.fillRect(0,0,S,S);
  x.strokeStyle='#c7d0dc'; x.lineWidth=3; x.strokeRect(1.5,1.5,S-3,S-3);
  x.fillStyle='#198aff'; x.globalAlpha=.15; x.fillRect(S/2-34,S/2-40,68,52); x.globalAlpha=1;
  x.fillStyle='#198aff'; x.beginPath(); x.arc(S/2+14,S/2-26,7,0,Math.PI*2); x.fill();
  x.fillStyle='#142251'; x.font='600 13px Arial'; x.textAlign='center';
  const words=(label||'').split(' '); let line='',lines=[];
  words.forEach(w=>{ if((line+w).length>16){lines.push(line.trim());line=w+' ';} else line+=w+' '; });
  if(line.trim())lines.push(line.trim());
  lines=lines.slice(0,3);
  lines.forEach((l,i)=>x.fillText(l,S/2,S/2+34+i*16));
  const url=c.toDataURL('image/png'); _phCache[label]=url; return url;
}

/* ==========================================================================
   STATE
   Én mulighed = ét kort med antal pr. varenøgle. Antal 0 (eller manglende)
   betyder "ikke med i tilbuddet" — der er ingen separat "valgt"-tilstand.
   State er kilden til sandhed; DOM'en tegnes altid ud fra den.
   ========================================================================== */
const images = {};        // varenøgle -> dataURL. Delt på tværs af lokationer.

/* Tilbuddets form vælges når det oprettes, og styrer kun HVAD der vises.
   Modellen er den samme uanset: et tilbud er en liste af lokationer, der hver
   har sine muligheder. Lokationen er øverst — det er forretningen, kunden
   skal vælge en løsning til. Et almindeligt tilbud er 1×1 og renderer som før. */
let FORM = { muligheder:false, lokationer:false };

let LOCS = [];            // [{id, name, muligheder:[{id, navn, tagline, anbefalet, qty, eget}]}]
let activeIdx = 0;        // aktiv lokation
let optIdx = 0;           // aktiv mulighed inden for den aktive lokation
let locSeq = 0;
let optSeq = 0;

/* En mulighed bærer selve opsætningen: `qty` er det vi sælger, `eget` er det
   kunden allerede har. Eget udstyr koster 0, men tæller med i licenserne — det
   er stadig terminaler, der kører på systemet.
   Nye muligheder navngives "Mulighed A", "Mulighed B" …, og der er ingen
   foruddefinerede. `kilde` gives kun med, når der kopieres. */
/* Muligheder har bogstaver, lokationer tal. Med tal på begge dele blev
   "1 Genbrug" og "1 Aarhus C" blandet sammen i tilbuddet. */
const bogstav = i => String.fromCharCode(65+i);
function newOpt(nr,kilde){
  optSeq++;
  const k = kilde || {};
  return {
    id:'opt'+optSeq,
    navn: k.navn || ('Mulighed '+bogstav(nr-1)),
    tagline: k.tagline || '',
    anbefalet: false,
    qty: Object.assign({}, k.qty||{}),
    eget: Object.assign({}, k.eget||{}),
  };
}

function keyMain(id){return 'm_'+id}
function keyAcc(mainId,accId){return 'a_'+mainId+'_'+accId}
function keyExtra(accId){return 'x_'+accId}
function keyMod(id){return 's_'+id}
const KEY_DS='dslic';

/* En ny lokation starter tom med én mulighed. `muligheder` gives kun med ved
   "Kopiér lokation", hvor hele lokationen — alle dens muligheder — følger med. */
function newLoc(name,muligheder){
  locSeq++;
  const ms = (muligheder||[]).map((o,i)=>Object.assign(newOpt(i+1,o),{anbefalet:!!o.anbefalet}));
  return {id:'loc'+locSeq, name:name||('Lokation '+locSeq),
          muligheder: ms.length ? ms : [newOpt(1)]};
}
function L(){ return LOCS[activeIdx]; }
function M(){ return L().muligheder[optIdx]; }
function q(key){ return (M().qty[key])||0; }
function qEget(key){ return (M().eget[key])||0; }
function qOf(Q,key){ return Q[key]||0; }
function reneAntal(n){ n=parseInt(n); if(isNaN(n)||n<0) n=0; return n>999?999:n; }
function setQ(key,n){
  n=reneAntal(n);
  if(n===0) delete M().qty[key]; else M().qty[key]=n;
}
function setEget(key,n){
  n=reneAntal(n);
  if(n===0) delete M().eget[key]; else M().eget[key]=n;
}
function antalIKort(K){ return Object.keys(K||{}).reduce((s,k)=>s+(K[k]||0),0); }
function optItemCount(o){ return antalIKort(o.qty)+antalIKort(o.eget); }
function locItemCount(l){ return l.muligheder.reduce((s,o)=>s+optItemCount(o),0); }
function locHasContent(l){ return locItemCount(l)>0; }
/* Sælgerens egen upload vinder; ellers tilltys officielle foto; ellers en
   grå pladsholder, der fungerer som upload-knap. */
function getImg(key,label){ return images[key] || FOTO[key] || ph(label); }
/* Det billede der må ud til kunden. Pladsholdere er bevidst ikke med. */
function pdfImg(key){ return images[key] || FOTO[key] || ''; }

/* ---------- beløb ----------
   ALLE beløb ender på ",-" — også dem med ører, altså "1.234,-" og "97,50,-".
   Det følger tilltys egen prisliste og er husets stil. Typografisk er det
   diskutabelt (",-" står normalt i stedet for ørerne), men lav det ikke om
   uden at spørge: testen håndhæver det, og kunden genkender formatet. */
const fmt = n => (Number.isInteger(n)
  ? n.toLocaleString('da-DK')
  : n.toLocaleString('da-DK',{minimumFractionDigits:2,maximumFractionDigits:2})) + ',-';

/* ---------- stepper ----------
   `kort` er 'ny' (det vi sælger) eller 'eget' (det kunden allerede har).
   De to har hver sit antal på samme varenøgle, så et produkt kan optræde
   som fx "1 ny + 2 jeres" — præcis den situation genbrugstilbud handler om. */
function stepper(key,kort){
  const eget = kort==='eget';
  const n = eget ? qEget(key) : q(key);
  const pre = eget ? 'eget_' : '';
  return `<div class="qty${n?' on':''}${eget?' qty-eget':''}" data-qwrap="${pre}${key}">
    <button type="button" class="qbtn" ${n?'':'disabled'} onclick="bump('${key}',-1,'${kort||'ny'}')" aria-label="Færre">−</button>
    <input type="number" min="0" value="${n}" id="qty_${pre}${key}" data-qinput="${pre}${key}"
           oninput="typeQty('${key}',this.value,'${kort||'ny'}')" aria-label="Antal">
    <button type="button" class="qbtn" onclick="bump('${key}',1,'${kort||'ny'}')" aria-label="Flere">+</button>
  </div>`;
}
function laesKort(key,kort){ return kort==='eget' ? qEget(key) : q(key); }
function skrivKort(key,n,kort){ if(kort==='eget') setEget(key,n); else setQ(key,n); }
function bump(key,d,kort){ skrivKort(key, laesKort(key,kort)+d, kort); syncUI(); }
function typeQty(key,val,kort){ skrivKort(key,val,kort); syncUI(); }

/* ---------- lokations-faner ---------- */
function renderLocTabs(){
  const panel=document.getElementById('panel_lokationer');
  if(panel) panel.style.display = FORM.lokationer ? '' : 'none';
  if(!FORM.lokationer) return;
  const el=document.getElementById('loctabs'); el.innerHTML='';
  LOCS.forEach((l,i)=>{
    const b=document.createElement('button');
    b.className='loctab'+(i===activeIdx?' active':'');
    const n=locItemCount(l);
    b.innerHTML=esc(l.name)+(n?' <span class="cnt">'+n+'</span>':'');
    b.onclick=()=>switchLoc(i);
    el.appendChild(b);
  });
  const add=document.createElement('button');
  add.className='loctab loctab-add'; add.textContent='+ Lokation';
  add.onclick=addLoc; el.appendChild(add);
  document.getElementById('l_name').value=L().name;
}
/* Skifter man lokation, bliver man på samme mulighedsnummer, hvis lokationen
   har det — så kan man hurtigt se "Mulighed 2" i Aarhus og i Risskov. */
function switchLoc(i){ activeIdx=i; optIdx=Math.min(optIdx, L().muligheder.length-1); renderAll(); }
/* En ny lokation starter helt tom. Kun "Kopiér lokation" tager muligheder med. */
function addLoc(){ LOCS.push(newLoc()); activeIdx=LOCS.length-1; optIdx=0; renderAll(); }
function dupLoc(){
  const src=L();
  LOCS.splice(activeIdx+1,0,newLoc(src.name+' (kopi)',src.muligheder));
  activeIdx=activeIdx+1; renderAll();
}
function delLoc(){
  if(LOCS.length===1){ alert('Der skal være mindst én lokation.'); return; }
  if(locHasContent(L()) && !confirm('Slet "'+L().name+'" og alle dens muligheder?')) return;
  LOCS.splice(activeIdx,1);
  if(activeIdx>=LOCS.length) activeIdx=LOCS.length-1;
  optIdx=Math.min(optIdx, L().muligheder.length-1);
  renderAll();
}
function renameLoc(val){ L().name=val; renderLocTabs(); renderOptTabs(); updateSoon(); }

/* ---------- muligheds-faner ----------
   Mulighederne hører til den aktive lokation og fungerer som lokationsfanerne:
   man starter med én og tilføjer selv flere. Man bliver stående i lokationen.
   Tælleren på fanen viser, hvilke muligheder der er tomme. */
function renderOptTabs(){
  const panel=document.getElementById('panel_muligheder');
  if(panel) panel.style.display = FORM.muligheder ? '' : 'none';
  if(!FORM.muligheder) return;
  const sub=document.getElementById('opt_sub');
  if(sub) sub.textContent = FORM.lokationer ? L().name : '';
  const el=document.getElementById('opttabs'); el.innerHTML='';
  const ms=L().muligheder;
  ms.forEach((o,i)=>{
    const b=document.createElement('button');
    b.className='loctab'+(i===optIdx?' active':'')+(o.anbefalet?' anbefalet':'');
    const n=optItemCount(o);
    b.innerHTML='<span class="opt-n bogstav">'+bogstav(i)+'</span>'+esc(o.navn)
      +(n?' <span class="cnt">'+n+'</span>':'');
    b.onclick=()=>switchOpt(i);
    el.appendChild(b);
  });
  if(ms.length<4){
    const add=document.createElement('button');
    add.className='loctab loctab-add'; add.textContent='+ Mulighed';
    add.onclick=addOpt; el.appendChild(add);
    // Kopiér står lige ved siden af "+": det er den hurtige vej til næste
    // mulighed — samme opsætning, én ting lavet om.
    const kopi=document.createElement('button');
    kopi.className='loctab loctab-add loctab-kopi'; kopi.textContent='⧉ Kopiér mulighed';
    kopi.title='Ny mulighed med samme opsætning som "'+M().navn+'"';
    kopi.onclick=dupOpt; el.appendChild(kopi);
  }
  const o=M();
  document.getElementById('o_navn').value=o.navn;
  document.getElementById('o_tagline').value=o.tagline;
  document.getElementById('o_anbefalet').checked=!!o.anbefalet;
}
function switchOpt(i){ optIdx=i; renderAll(); }
/* En ny mulighed starter tom, som en ny lokation. */
function addOpt(){
  const ms=L().muligheder; if(ms.length>=4) return;
  ms.push(newOpt(ms.length+1)); optIdx=ms.length-1; renderAll();
}
function dupOpt(){
  const ms=L().muligheder; if(ms.length>=4) return;
  const src=M();
  // Hele opsætningen kopieres med — det er som regel derfor man laver en
  // ekstra mulighed: samme grundopsætning med én ting lavet om. Kopien lægges
  // sidst, så de andre muligheder beholder deres nummer.
  ms.push(newOpt(ms.length+1,{navn:src.navn+' (kopi)', tagline:src.tagline,
                              qty:src.qty, eget:src.eget}));
  optIdx=ms.length-1; renderAll();
}
function delOpt(){
  const ms=L().muligheder;
  if(ms.length===1){ alert('Der skal være mindst én mulighed.'); return; }
  if(optItemCount(M()) && !confirm('Slet muligheden "'+M().navn+'" og alle dens valg?')) return;
  ms.splice(optIdx,1);
  if(optIdx>=ms.length) optIdx=ms.length-1;
  renderAll();
}
function renameOpt(val){ M().navn=val; renderOptTabs(); updateSoon(); }
function setTagline(val){ M().tagline=val; updateSoon(); }
/* Kun én mulighed pr. lokation kan anbefales — to anbefalinger er ingen anbefaling. */
function setAnbefalet(on){
  L().muligheder.forEach(o=>o.anbefalet=false);
  M().anbefalet=!!on;
  renderOptTabs(); updateSoon();
}

/* ---------- byg katalog-UI ---------- */
function renderCatalog(){
  const wrap=document.getElementById('catalog'); wrap.innerHTML='';
  CATALOG.forEach(p=>{
    const mk=keyMain(p.id);
    const g=document.createElement('div'); g.className='group'; g.dataset.rowkey=mk;
    g.innerHTML=`
      <div class="main">
        <div class="thumb-wrap">
          <img class="thumb" id="img_${mk}" src="${getImg(mk,p.name)}" onclick="pick('${mk}')"
               title="Klik for at uploade dit eget billede">
        </div>
        <div class="prod-info">
          <div class="prod-name">${esc(p.name)}</div>
          <div class="prod-desc">${esc(p.desc)}</div>
          ${p.acc.length?`<div class="acc-hint">· ${p.acc.length} tilbehør folder sig ud herunder</div>`:''}
        </div>
        <div class="prod-right">
          <div class="price">${fmt(p.price)}</div>
          <div class="ctrl-row"><span class="qty-mrk">Nye</span>${stepper(mk,'ny')}</div>
          <div class="ctrl-row" title="Udstyr kunden allerede har. Koster 0, men tæller med i licenserne.">
            <span class="qty-mrk mrk-eget">Jeres</span>${stepper(mk,'eget')}
          </div>
        </div>
      </div>
      <div class="acc-list" id="acc_${p.id}">
        ${p.acc.map(aid=>{
          const a=ACCESSORIES[aid], ak=keyAcc(p.id,aid);
          return `<div class="acc-item" data-rowkey="${ak}">
            <div class="thumb-wrap"><img class="thumb" id="img_${ak}" src="${getImg(ak,a.name)}" onclick="pick('${ak}')"></div>
            <div class="acc-info">
              <div class="acc-badge">Tilbehør</div>
              <div class="acc-name">${esc(a.name)}</div>
              <div class="acc-desc">${esc(a.desc)}</div>
            </div>
            <div class="acc-right">
              <div class="price" style="font-size:13px">${fmt(a.price)}</div>
              <div class="ctrl-row">
                <button type="button" class="matchbtn" data-match="${ak}" data-main="${mk}"
                        onclick="matchQty('${ak}','${mk}')" style="display:none"></button>
                <span class="qty-mrk">Nye</span>${stepper(ak,'ny')}
              </div>
              <div class="ctrl-row" title="Tilbehør kunden allerede har. Koster 0.">
                <span class="qty-mrk mrk-eget">Jeres</span>${stepper(ak,'eget')}
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
    wrap.appendChild(g);
  });
}

/* Sæt tilbehørets antal lig produktets — fx én hand strap pr. tablet. */
function matchQty(accKey,mainKey){ setQ(accKey,q(mainKey)); syncUI(); }

/* ---------- løst tilbehør (tilkøb til eksisterende opsætning) ---------- */
function renderExtras(){
  const wrap=document.getElementById('extras'); wrap.innerHTML='';
  ACC_IDS.forEach(aid=>{
    const a=ACCESSORIES[aid], xk=keyExtra(aid);
    const g=document.createElement('div'); g.className='group'; g.dataset.rowkey=xk;
    g.innerHTML=`<div class="main">
      <div class="thumb-wrap">
        <img class="thumb" id="img_${xk}" src="${getImg(xk,a.name)}" onclick="pick('${xk}')"
             title="Klik for at uploade dit eget billede">
      </div>
      <div class="prod-info">
        <div class="prod-name">${esc(a.name)}</div>
        <div class="prod-desc">${esc(a.desc)}</div>
        <div class="acc-hint dup-hint" id="dup_${xk}" style="display:none"></div>
      </div>
      <div class="prod-right">
        <div class="price">${fmt(a.price)}</div>
        <div class="ctrl-row">${stepper(xk)}</div>
      </div>
    </div>`;
    wrap.appendChild(g);
  });
}

/* ---------- licenser & moduler ---------- */
function renderSoftware(){
  const wrap=document.getElementById('software'); wrap.innerHTML='';

  const lic=document.createElement('div'); lic.id='lic_auto'; lic.style.marginBottom='14px';
  wrap.appendChild(lic);

  const ds=document.createElement('div');
  ds.innerHTML='<div class="sect-title">DS-licens (digital menu-skærm · pr. dag)</div>'
   +'<div class="group" data-rowkey="'+KEY_DS+'"><div class="main">'
   +'<div class="prod-info"><div class="prod-name">tilltyDS licens</div>'
   +'<div class="prod-desc">Digital Signage / menu-skærm. Pr. aktiv skærm · pr. dag.</div></div>'
   +'<div class="prod-right"><div class="price">'+fmt(LICENSE_TYPES.ds.daily)+' / dag</div>'
   +'<div class="ctrl-row">'+stepper(KEY_DS)+'</div></div>'
   +'</div></div>';
  wrap.appendChild(ds);

  const h=document.createElement('div'); h.className='sect-title'; h.textContent='Moduler (pr. måned)'; wrap.appendChild(h);
  MODULES.forEach(s=>{
    const k=keyMod(s.id);
    const g=document.createElement('div'); g.className='group'; g.dataset.rowkey=k; g.id='grp_'+k;
    g.innerHTML=`<div class="main">
      <div class="prod-info">
        <div class="prod-name">${esc(s.name)}</div>
        <div class="prod-desc">${esc(s.desc)}</div>
        <div class="acc-hint incl-hint" id="inc_${k}" style="display:none"></div>
      </div>
      <div class="prod-right">
        <div class="price">${fmt(s.price)} / md.</div>
        <div class="ctrl-row">${stepper(k)}</div>
      </div>
    </div>`;
    wrap.appendChild(g);
  });
}

/* Et modul der er inkluderet i et andet (fx QR i Takeaway) må ikke kunne
   tilvælges separat — ellers dobbeltfakturerer vi kunden.

   Kaldes FØRST i syncUI(), fordi funktionen retter i state (tvinger antallet
   til 0). Kørte den til sidst, ville steppernes felter allerede være tegnet ud
   fra det gamle antal, og feltet ville vise fx 5 mens tilbuddet regnede med 0. */
function syncIncludedModules(){
  MODULES.forEach(s=>{
    const parentId=INCLUDED_BY[s.id]; if(!parentId) return;
    const k=keyMod(s.id), pk=keyMod(parentId);
    const parentOn=q(pk)>0;
    if(parentOn && q(k)>0) setQ(k,0);
    const grp=document.getElementById('grp_'+k);
    const hint=document.getElementById('inc_'+k);
    const wrapEl=document.querySelector('[data-qwrap="'+k+'"]');
    if(grp) grp.style.opacity=parentOn?'.6':'1';
    if(wrapEl){
      // Feltet låses sammen med knapperne — ellers kan der tastes et antal ind,
      // som state straks nulstiller igen.
      const inp=wrapEl.querySelector('input');
      if(inp) inp.disabled=parentOn;
      wrapEl.querySelectorAll('button').forEach(b=>{ b.disabled = parentOn || (b.textContent==='−' && q(k)===0); });
    }
    if(hint){
      const parent=MODULES.find(m=>m.id===parentId);
      hint.style.display=parentOn?'block':'none';
      hint.textContent=parentOn?'✓ Inkluderet i '+parent.name+' — faktureres ikke separat.':'';
    }
  });
}

/* Er samme tilbehør både købt løst og lagt på et nyt produkt? Så advarer vi. */
function accAlsoUnderProduct(aid){
  return CATALOG.some(p=>p.acc.indexOf(aid)>=0 && q(keyMain(p.id))>0 && q(keyAcc(p.id,aid))>0);
}

/* ---------- tegn DOM ud fra state ---------- */
function syncUI(){
  // Ryd op i state før noget tegnes — se kommentaren over syncIncludedModules().
  syncIncludedModules();
  // steppere
  document.querySelectorAll('[data-qwrap]').forEach(w=>{
    const raa=w.dataset.qwrap, eget=raa.indexOf('eget_')===0;
    const key=eget?raa.slice(5):raa;
    const n=eget?qEget(key):q(key);
    w.classList.toggle('on', n>0);
    const inp=w.querySelector('input'); if(inp && inp.value!==String(n)) inp.value=n;
    const minus=w.querySelector('button'); if(minus) minus.disabled=(n===0);
  });
  // rækkemarkering
  document.querySelectorAll('[data-rowkey]').forEach(r=>{
    const k=r.dataset.rowkey;
    r.classList.toggle('on', q(k)>0 || qEget(k)>0);
  });
  // tilbehørslister foldes ud når produktet har antal
  CATALOG.forEach(p=>{
    const list=document.getElementById('acc_'+p.id);
    // Foldes også ud ved eget udstyr: kunden kan sagtens mangle en holder til
    // en tablet, de allerede ejer.
    if(list) list.classList.toggle('show', q(keyMain(p.id))>0 || qEget(keyMain(p.id))>0);
    // "= N"-knappen vises kun når den gør en forskel
    p.acc.forEach(aid=>{
      const ak=keyAcc(p.id,aid), mk=keyMain(p.id);
      const btn=document.querySelector('[data-match="'+ak+'"]');
      if(!btn) return;
      const mq=q(mk), aq=q(ak);
      const show = mq>1 && aq!==mq;
      btn.style.display=show?'inline-block':'none';
      btn.textContent='= '+mq;
      btn.title='Sæt antal til '+mq+' — samme som produktet';
    });
  });
  // advarsel om dobbeltkøb af løst tilbehør
  ACC_IDS.forEach(aid=>{
    const xk=keyExtra(aid), hint=document.getElementById('dup_'+xk);
    if(!hint) return;
    const dup=q(xk)>0 && accAlsoUnderProduct(aid);
    hint.style.display=dup?'block':'none';
    hint.textContent=dup?'⚠ Også lagt på et nyt produkt ovenfor — tjek at antallet er rigtigt.':'';
  });
  renderOptTabs();
  renderLocTabs();
  refreshPanelSubs();
  update();
}
function renderAll(){ renderCatalog(); renderExtras(); renderSoftware(); syncUI(); }

/* små tællere i panel-headerne, så man kan se hvad der ligger i et foldet panel */
function refreshPanelSubs(){
  const Q=M().qty, E=M().eget;
  const cnt=pref=>Object.keys(Q).filter(k=>k.indexOf(pref)===0).reduce((s,k)=>s+Q[k],0);
  const hw=CATALOG.reduce((s,p)=>s+qOf(Q,keyMain(p.id))+qOf(E,keyMain(p.id)),0);
  const accUnder=[Q,E].reduce((t,K)=>t+Object.keys(K).filter(k=>k.indexOf('a_')===0).reduce((s,k)=>s+K[k],0),0);
  const ex=cnt('x_');
  const sw=MODULES.reduce((s,m)=>s+qOf(Q,keyMod(m.id)),0)+qOf(Q,KEY_DS);
  const set=(id,txt)=>{const e=document.getElementById(id); if(e) e.textContent=txt;};
  set('hw_sub', hw||accUnder ? (hw+' produkter · '+accUnder+' tilbehør') : 'ingen valgt');
  set('ex_sub', ex ? (ex+' stk. valgt') : 'ingen valgt');
  set('sw_sub', sw ? (sw+' valgt') : 'ingen valgt');
}

/* ---------- billed-upload ---------- */
let pendingKey=null, fileInput;
function pick(key){ pendingKey=key; fileInput.click(); }
function onFile(e){
  const f=e.target.files[0]; if(!f||!pendingKey) return;
  const r=new FileReader();
  r.onload=()=>{ images[pendingKey]=r.result;
    const el=document.getElementById('img_'+pendingKey); if(el) el.src=r.result;
    syncUI(); };
  r.readAsDataURL(f); e.target.value='';
}

/* ---------- opsamling pr. lokation ---------- */
/* Licenser regnes af BÅDE det vi sælger og kundens eget udstyr. En tablet
   kunden allerede ejer, kører stadig på systemet og kræver stadig licens —
   den er bare gratis at anskaffe. Det er et af de steder, et tilbud let
   kommer til at love for lidt. */
function computeLicensesFor(Q,E){
  E = E || {};
  const counts={};
  CATALOG.forEach(p=>{
    const lt=PRODUCT_LICENSE[p.id]; if(!lt) return;
    const n=qOf(Q,keyMain(p.id)) + qOf(E,keyMain(p.id));
    if(n) counts[lt]=(counts[lt]||0)+n;
  });
  const dsN=qOf(Q,KEY_DS); if(dsN) counts['ds']=(counts['ds']||0)+dsN;
  const out=[];
  Object.keys(LICENSE_TYPES).forEach(lt=>{
    const n=counts[lt]||0; if(!n) return;
    const t=LICENSE_TYPES[lt];
    out.push({type:lt, name:t.name, qty:n, daily:t.daily, total:n*t.daily});
  });
  return out;
}

/* Tager én opsætning — en mulighed med `qty` (det vi sælger) og `eget`. */
function collectFor(opsaet){
  const Q = opsaet.qty || {}, E = opsaet.eget || {};
  const hw=[];
  // Kundens eget udstyr samles for sig og lægges nederst i tabellen. Blandet
  // ind mellem de nye linjer bliver det svært at se, hvad der rent faktisk
  // købes — og det er det tal, kunden leder efter.
  const egetHw=[];
  CATALOG.forEach(p=>{
    const n=qOf(Q,keyMain(p.id)), e=qOf(E,keyMain(p.id));
    // Kundens eget tilbehør koster 0 ligesom eget udstyr, men udløser ingen licens.
    const egneAcc=[];
    p.acc.forEach(aid=>{
      const en=qOf(E,keyAcc(p.id,aid)); if(!en) return;
      const a=ACCESSORIES[aid];
      egneAcc.push({name:a.name,desc:a.desc,qty:en,price:0,img:pdfImg(keyAcc(p.id,aid)),eget:true});
    });
    if(n){
      const accs=[];
      p.acc.forEach(aid=>{
        const an=qOf(Q,keyAcc(p.id,aid)); if(!an) return;
        const a=ACCESSORIES[aid];
        // Kun rigtige, uploadede billeder må med i kundedokumentet — aldrig pladsholdere.
        accs.push({name:a.name,desc:a.desc,qty:an,price:a.price,img:pdfImg(keyAcc(p.id,aid))});
      });
      // "NY" kun når samme produkt også står som kundens eget — ellers er der
      // ingen tvivl at rydde af vejen, og mærkatet er bare støj.
      hw.push({name:p.name,desc:p.desc,qty:n,price:p.price,img:pdfImg(keyMain(p.id)),
               accessories:accs, nyt:e>0});
    }
    if(e){
      // Kundens eget udstyr: står i specifikationen, så kunden kan se at vi har
      // regnet med det — men uden pris. Kundens eget tilbehør står under det.
      egetHw.push({name:p.name,desc:'Jeres nuværende udstyr — vi sætter det op i systemet.',
                   qty:e, price:0, img:pdfImg(keyMain(p.id)), accessories:egneAcc, eget:true});
    } else if(n){
      // Eget tilbehør til et nyt produkt (fx en ny tablet på kundens egen base)
      // står også nederst — alt det kunden selv har, skal stå samlet.
      egneAcc.forEach(a=>egetHw.push({name:a.name,desc:a.desc,qty:a.qty,price:0,img:a.img,
                                     accessories:[],eget:true}));
    }
  });
  egetHw.forEach(x=>hw.push(x));

  const extras=[];
  ACC_IDS.forEach(aid=>{
    const n=qOf(Q,keyExtra(aid)); if(!n) return;
    const a=ACCESSORIES[aid];
    extras.push({name:a.name,desc:a.desc,qty:n,price:a.price,img:pdfImg(keyExtra(aid))});
  });

  const modules=[];
  MODULES.forEach(s=>{
    const parentId=INCLUDED_BY[s.id];
    if(parentId && qOf(Q,keyMod(parentId))>0) return; // vises som gratis underlinje
    const n=qOf(Q,keyMod(s.id)); if(!n) return;
    const inc=(s.includes||[]).map(id=>MODULES.find(m=>m.id===id)).filter(Boolean)
              .map(m=>({name:m.name,desc:m.desc}));
    modules.push({name:s.name,desc:s.desc,qty:n,price:s.price,included:inc});
  });

  const licenses=computeLicensesFor(Q,E);
  // Kundens eget udstyr har prisen 0 og trækker derfor ingenting med i totalen.
  const oneOff = hw.reduce((s,p)=>s+p.qty*p.price+p.accessories.reduce((t,a)=>t+a.qty*a.price,0),0)
               + extras.reduce((s,a)=>s+a.qty*a.price,0);
  const licDaily = licenses.reduce((s,l)=>s+l.total,0);
  const modMonthly = modules.reduce((s,m)=>s+m.qty*m.price,0);
  const has = hw.length||extras.length||modules.length||licenses.length;
  // Kun eget udstyr der udløser licens — det er dét, licensforbeholdet handler om.
  // Eget tilbehør alene skal ikke få tilbuddet til at tale om licens.
  const harEget = CATALOG.some(p=>PRODUCT_LICENSE[p.id] && qOf(E,keyMain(p.id))>0);
  return {hw,extras,modules,licenses,oneOff,licDaily,modMonthly,has,harEget};
}

/* live licens-visning for den aktive lokation */
function refreshLicensePanel(data){
  const el=document.getElementById('lic_auto'); if(!el) return;
  const d=licenseDays();
  if(!data.licenses.length){
    el.innerHTML='<div class="sect-title">Licenser (automatisk · pr. dag)</div>'
      +'<div style="font-size:12px;color:var(--muted);padding:6px 0">Sæt antal på en terminal ovenfor for at beregne licens.</div>';
    return;
  }
  let h='<div class="sect-title">Licenser (automatisk · pr. dag)</div>';
  data.licenses.forEach(l=>{
    h+=`<div class="group"><div class="main">
      <div class="prod-info"><div class="prod-name">${esc(l.name)}</div>
        <div class="prod-desc">${l.qty} stk. × ${fmt(l.daily)}/dag</div>
        <div class="acc-hint">= ${fmt(l.total*d)} / md.</div></div>
      <div class="prod-right"><div class="price">${fmt(l.total)} / dag</div></div>
    </div></div>`;
  });
  el.innerHTML=h;
}

/* ---------- hjælpere ---------- */
/* update() bygger hele preview'et forfra, inkl. de uploadede billeders
   data-URL'er. Ved klik (steppere, faner) er det fint — der sker ét kald.
   Ved tastning i tekstfelterne er det ét kald pr. anslag, og med en håndfuld
   produktfotos i tilbuddet bliver det tungt. Tekstfelterne kalder derfor
   updateSoon(); alt andet kalder update() direkte og er stadig synkront. */
let _updateTimer=null;
function updateSoon(){
  clearTimeout(_updateTimer);
  _updateTimer=setTimeout(()=>{ _updateTimer=null; update(); },90);
}
function v(id){const e=document.getElementById(id);return e?e.value.trim():'';}
function esc(s){return String(s==null?'':s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
/* Licenser regnes altid om til månedspris med en fast måned på 30 dage. */
const LICENSE_DAYS = 30;
function licenseDays(){ return LICENSE_DAYS; }
/* new Date("2026-09-04") tolkes som UTC-midnat og kan derfor vise dagen før,
   når browseren står vest for UTC. Vi bygger datoen af komponenterne i stedet. */
function parseISODate(iso){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso||''); if(!m) return null;
  return new Date(+m[1], +m[2]-1, +m[3]);
}
/* Postnummer -> by. Tabellen ligger lokalt (js/postnumre.js), så feltet også
   udfyldes hos en kunde uden net. Sælgeren kan rette bynavnet bagefter; det
   bliver først overskrevet igen, hvis postnummeret ændres. */
function postnrIndtastet(val){
  const nr=String(val||'').replace(/\D/g,'').slice(0,4);
  const zip=document.getElementById('c_zip');
  const by=document.getElementById('c_city');
  if(zip && zip.value!==nr) zip.value=nr;
  // Kendes postnummeret ikke, ryddes byen, og sælgeren skriver den selv.
  // Felterne står tomme uden pladsholdertekst.
  if(by && nr.length===4) by.value = POSTNUMRE[nr] || '';
  updateSoon();
}

function validUntil(){
  const dt=parseISODate(v('c_date')); if(!dt) return '';
  const days=parseInt(v('c_valid'))||30;
  dt.setDate(dt.getDate()+days);
  return dt.toLocaleDateString('da-DK');
}
function daDate(iso){ const dt=parseISODate(iso); return dt?dt.toLocaleDateString('da-DK'):''; }
function quoteFilename(){
  const nr=v('c_number')||new Date().toISOString().slice(0,10);
  const who=(v('c_company')||v('c_contact')||'kunde')
    .replace(/[^\wæøåÆØÅ ]+/g,'').trim().replace(/\s+/g,'-');
  return 'Tilbud-'+nr+'-'+who;
}
