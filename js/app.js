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
  x.fillStyle='#198aff'; x.beginPath(); x.arc(S/2+14,S/2-26,7,0,7); x.fill();
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
   Én lokation = ét kort med antal pr. varenøgle. Antal 0 (eller manglende)
   betyder "ikke med i tilbuddet" — der er ingen separat "valgt"-tilstand.
   State er kilden til sandhed; DOM'en tegnes altid ud fra den.
   ========================================================================== */
const images = {};        // varenøgle -> dataURL. Delt på tværs af lokationer.
let LOCATIONS = [];       // [{id, name, qty:{nøgle:antal}}]
let activeIdx = 0;
let locSeq = 0;

function keyMain(id){return 'm_'+id}
function keyAcc(mainId,accId){return 'a_'+mainId+'_'+accId}
function keyExtra(accId){return 'x_'+accId}
function keyMod(id){return 's_'+id}
const KEY_DS='dslic';

function newLoc(name,qty){ locSeq++; return {id:'loc'+locSeq, name:name||('Lokation '+locSeq), qty:Object.assign({},qty||{})}; }
function L(){ return LOCATIONS[activeIdx]; }
function q(key){ return (L().qty[key])||0; }
function qOf(Q,key){ return Q[key]||0; }
function setQ(key,n){
  n=parseInt(n); if(isNaN(n)||n<0) n=0; if(n>999) n=999;
  if(n===0) delete L().qty[key]; else L().qty[key]=n;
}
function locHasContent(Q){ return Object.keys(Q).some(k=>Q[k]>0); }
function locItemCount(Q){ return Object.keys(Q).reduce((s,k)=>s+(Q[k]||0),0); }
function getImg(key,label){ return images[key] || ph(label); }

/* ---------- beløb ----------
   Hele kroner skrives "1.234,-" (dansk konvention, hvor ",-" står i stedet for
   ørerne). Beløb med ører skrives "97,50" — "97,5,-" er hverken korrekt eller
   pænt i et kundetilbud. */
const fmt = n => (Number.isInteger(n)
  ? n.toLocaleString('da-DK')
  : n.toLocaleString('da-DK',{minimumFractionDigits:2,maximumFractionDigits:2})) + ',-';

/* ---------- stepper ---------- */
function stepper(key){
  const n=q(key);
  return `<div class="qty${n?' on':''}" data-qwrap="${key}">
    <button type="button" class="qbtn" ${n?'':'disabled'} onclick="bump('${key}',-1)" aria-label="Færre">−</button>
    <input type="number" min="0" value="${n}" id="qty_${key}" data-qinput="${key}"
           oninput="typeQty('${key}',this.value)" aria-label="Antal">
    <button type="button" class="qbtn" onclick="bump('${key}',1)" aria-label="Flere">+</button>
  </div>`;
}
function bump(key,d){ setQ(key,q(key)+d); syncUI(); }
function typeQty(key,val){ setQ(key,val); syncUI(); }

/* ---------- lokations-faner ---------- */
function renderLocTabs(){
  const el=document.getElementById('loctabs'); el.innerHTML='';
  LOCATIONS.forEach((l,i)=>{
    const b=document.createElement('button');
    b.className='loctab'+(i===activeIdx?' active':'');
    const n=locItemCount(l.qty);
    b.innerHTML=esc(l.name)+(n?' <span class="cnt">'+n+'</span>':'');
    b.onclick=()=>switchLoc(i);
    el.appendChild(b);
  });
  const add=document.createElement('button');
  add.className='loctab loctab-add'; add.textContent='+ Lokation';
  add.onclick=addLoc; el.appendChild(add);
  document.getElementById('l_name').value=L().name;
}
function switchLoc(i){ activeIdx=i; renderAll(); }
function addLoc(){ LOCATIONS.push(newLoc()); activeIdx=LOCATIONS.length-1; renderAll(); }
function dupLoc(){
  const src=L();
  LOCATIONS.splice(activeIdx+1,0,newLoc(src.name+' (kopi)',src.qty));
  activeIdx=activeIdx+1; renderAll();
}
function delLoc(){
  if(LOCATIONS.length===1){ alert('Der skal være mindst én lokation.'); return; }
  if(locHasContent(L().qty) && !confirm('Slet "'+L().name+'" og alle dens valg?')) return;
  LOCATIONS.splice(activeIdx,1);
  if(activeIdx>=LOCATIONS.length) activeIdx=LOCATIONS.length-1;
  renderAll();
}
function renameLoc(val){ L().name=val; renderLocTabs(); update(); }

/* ---------- byg katalog-UI ---------- */
function renderCatalog(){
  const wrap=document.getElementById('catalog'); wrap.innerHTML='';
  CATALOG.forEach(p=>{
    const mk=keyMain(p.id);
    const g=document.createElement('div'); g.className='group'; g.dataset.rowkey=mk;
    g.innerHTML=`
      <div class="main">
        <div class="thumb-wrap">
          <img class="thumb" id="img_${mk}" src="${getImg(mk,p.name)}" onclick="pick('${mk}')">
          <div class="cam" onclick="pick('${mk}')">✎</div>
        </div>
        <div class="prod-info">
          <div class="prod-name">${esc(p.name)}</div>
          <div class="prod-desc">${esc(p.desc)}</div>
          ${p.acc.length?`<div class="acc-hint">· ${p.acc.length} tilbehør folder sig ud herunder</div>`:''}
        </div>
        <div class="prod-right">
          <div class="price">${fmt(p.price)}</div>
          <div class="ctrl-row">${stepper(mk)}</div>
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
                ${stepper(ak)}
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
        <img class="thumb" id="img_${xk}" src="${getImg(xk,a.name)}" onclick="pick('${xk}')">
        <div class="cam" onclick="pick('${xk}')">✎</div>
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
   tilvælges separat — ellers dobbeltfakturerer vi kunden. */
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
    if(wrapEl) wrapEl.querySelectorAll('button').forEach(b=>{ b.disabled = parentOn || (b.textContent==='−' && q(k)===0); });
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
  // steppere
  document.querySelectorAll('[data-qwrap]').forEach(w=>{
    const key=w.dataset.qwrap, n=q(key);
    w.classList.toggle('on', n>0);
    const inp=w.querySelector('input'); if(inp && inp.value!==String(n)) inp.value=n;
    const minus=w.querySelector('button'); if(minus) minus.disabled=(n===0);
  });
  // rækkemarkering
  document.querySelectorAll('[data-rowkey]').forEach(r=>{
    r.classList.toggle('on', q(r.dataset.rowkey)>0);
  });
  // tilbehørslister foldes ud når produktet har antal
  CATALOG.forEach(p=>{
    const list=document.getElementById('acc_'+p.id);
    if(list) list.classList.toggle('show', q(keyMain(p.id))>0);
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
  syncIncludedModules();
  renderLocTabs();
  refreshPanelSubs();
  update();
}
function renderAll(){ renderCatalog(); renderExtras(); renderSoftware(); syncUI(); }

/* små tællere i panel-headerne, så man kan se hvad der ligger i et foldet panel */
function refreshPanelSubs(){
  const Q=L().qty;
  const cnt=pref=>Object.keys(Q).filter(k=>k.indexOf(pref)===0).reduce((s,k)=>s+Q[k],0);
  const hw=CATALOG.reduce((s,p)=>s+qOf(Q,keyMain(p.id)),0);
  const accUnder=Object.keys(Q).filter(k=>k.indexOf('a_')===0).reduce((s,k)=>s+Q[k],0);
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
function computeLicensesFor(Q){
  const counts={};
  CATALOG.forEach(p=>{
    const lt=PRODUCT_LICENSE[p.id]; if(!lt) return;
    const n=qOf(Q,keyMain(p.id)); if(n) counts[lt]=(counts[lt]||0)+n;
  });
  const dsN=qOf(Q,KEY_DS); if(dsN) counts['ds']=(counts['ds']||0)+dsN;
  const out=[];
  Object.keys(LICENSE_TYPES).forEach(lt=>{
    const n=counts[lt]||0; if(!n) return;
    const t=LICENSE_TYPES[lt];
    out.push({name:t.name, qty:n, daily:t.daily, total:n*t.daily});
  });
  return out;
}

function collectFor(Q){
  const hw=[];
  CATALOG.forEach(p=>{
    const n=qOf(Q,keyMain(p.id)); if(!n) return;
    const accs=[];
    p.acc.forEach(aid=>{
      const an=qOf(Q,keyAcc(p.id,aid)); if(!an) return;
      const a=ACCESSORIES[aid];
      // Kun rigtige, uploadede billeder må med i kundedokumentet — aldrig pladsholdere.
      accs.push({name:a.name,desc:a.desc,qty:an,price:a.price,img:images[keyAcc(p.id,aid)]||''});
    });
    hw.push({name:p.name,desc:p.desc,qty:n,price:p.price,img:images[keyMain(p.id)]||'',accessories:accs});
  });

  const extras=[];
  ACC_IDS.forEach(aid=>{
    const n=qOf(Q,keyExtra(aid)); if(!n) return;
    const a=ACCESSORIES[aid];
    extras.push({name:a.name,desc:a.desc,qty:n,price:a.price,img:images[keyExtra(aid)]||''});
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

  const licenses=computeLicensesFor(Q);
  const oneOff = hw.reduce((s,p)=>s+p.qty*p.price+p.accessories.reduce((t,a)=>t+a.qty*a.price,0),0)
               + extras.reduce((s,a)=>s+a.qty*a.price,0);
  const licDaily = licenses.reduce((s,l)=>s+l.total,0);
  const modMonthly = modules.reduce((s,m)=>s+m.qty*m.price,0);
  const has = hw.length||extras.length||modules.length||licenses.length;
  return {hw,extras,modules,licenses,oneOff,licDaily,modMonthly,has};
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
function v(id){const e=document.getElementById(id);return e?e.value.trim():'';}
function esc(s){return String(s==null?'':s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
/* Licenser regnes altid om til månedspris med en fast måned på 30 dage. */
const LICENSE_DAYS = 30;
function licenseDays(){ return LICENSE_DAYS; }
function validUntil(){
  const d=v('c_date'); const days=parseInt(v('c_valid'))||30;
  if(!d) return '';
  const dt=new Date(d); dt.setDate(dt.getDate()+days);
  return dt.toLocaleDateString('da-DK');
}
function daDate(iso){ return iso? new Date(iso).toLocaleDateString('da-DK') : ''; }
function quoteFilename(){
  const nr=v('c_number')||new Date().toISOString().slice(0,10);
  const who=(v('c_company')||v('c_contact')||'kunde')
    .replace(/[^\wæøåÆØÅ ]+/g,'').trim().replace(/\s+/g,'-');
  return 'Tilbud-'+nr+'-'+who;
}
