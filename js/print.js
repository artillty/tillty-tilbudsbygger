/* ============================================================
   tillty Tilbudsbygger — Paginering og PDF-eksport
   ============================================================ */

/* ==========================================================================
   PAGINERING
   Chrome kan hverken sætte sidetal via CSS (@page-margin-bokse understøttes
   ikke) eller gentage et sidehoved uden at det lægger sig oven på indholdet.
   Derfor deler vi selv dokumentet op i A4-sider: vi måler indholdet i en
   skjult beholder med præcis sidebredde og flytter det over i færdige sider,
   hver med eget sidehoved, sidefod og "Side x af y".
   ========================================================================== */
const MM = 96/25.4;                 // px pr. mm ved 96 dpi
const PAGE_H_PX  = 297*MM;
const PAGE_PAD_X = 14;              // mm — samme som .qp-content i print
const CONTENT_W_PX = (210 - 2*PAGE_PAD_X)*MM;

function outerH(el){
  const cs=getComputedStyle(el);
  return el.getBoundingClientRect().height
       + parseFloat(cs.marginTop||0) + parseFloat(cs.marginBottom||0);
}

function buildPrintPages(){
  const body=document.getElementById('quote-body');
  if(!body) return null;

  // Skjult målebeholder i nøjagtig sidebredde.
  const host=document.createElement('div');
  host.className='pg-measure';
  host.style.width=CONTENT_W_PX+'px';
  host.innerHTML=body.innerHTML;
  document.body.appendChild(host);

  // Mål sidehoved/-fod ved at bygge én prøveside.
  const probe=document.createElement('div');
  probe.className='pg-measure';
  probe.style.width=(210*MM)+'px';
  probe.innerHTML=bandHtml(true)+bandHtml(false)+footHtml(1,1);
  document.body.appendChild(probe);
  const bandFirstH=probe.children[0].getBoundingClientRect().height;
  const bandRestH =probe.children[1].getBoundingClientRect().height;
  const footH     =probe.children[2].getBoundingClientRect().height;
  probe.remove();

  const TOP_GAP = 5*MM;      // .pg-body padding-top
  const BOTTOM_GAP = 10*MM;  // luft ned til sidefoden
  const SAFETY = 26;         // px buffer: rammer, borders og afrundinger i rækkehøjder
  const avail = first => PAGE_H_PX - (first?bandFirstH:bandRestH) - footH - TOP_GAP - BOTTOM_GAP - SAFETY;

  const pages=[];                    // hver side = array af DOM-noder
  let cur=[], used=0, pageIdx=0;
  const room = () => avail(pageIdx===0) - used;
  function newPage(){ if(cur.length){pages.push(cur);} cur=[]; used=0; pageIdx++; }
  function put(node,h){ cur.push(node); used+=h; }

  /* Klon en tabel med thead, men uden rækker. */
  function tableShell(t){
    const c=t.cloneNode(false);
    const th=t.querySelector('thead'); if(th) c.appendChild(th.cloneNode(true));
    c.appendChild(document.createElement('tbody'));
    return c;
  }

  /* Del en tabel række for række; thead gentages på hver del.
     Tabellen åbnes først når en række rent faktisk kan være der — ellers
     ender vi med en tom overskriftsrække nederst på en side. */
  function placeTable(t){
    const thead=t.querySelector('thead');
    const baseH=(thead?thead.getBoundingClientRect().height:0)
               +parseFloat(getComputedStyle(t).marginTop||0);
    const rows=[...t.querySelectorAll('tbody > tr')];
    const foot=t.querySelector('tfoot');
    let shell=null;
    const openTable=()=>{ shell=tableShell(t); cur.push(shell); used+=baseH; };
    rows.forEach(r=>{
      const rh=r.getBoundingClientRect().height;
      if(!shell){ if(baseH+rh>room()) newPage(); openTable(); }
      else if(rh>room()){ newPage(); openTable(); }
      shell.querySelector('tbody').appendChild(r.cloneNode(true)); used+=rh;
    });
    if(foot){
      const fh=foot.getBoundingClientRect().height;
      if(!shell){ if(baseH+fh>room()) newPage(); openTable(); }
      else if(fh>room()){ newPage(); openTable(); }
      shell.appendChild(foot.cloneNode(true)); used+=fh;
    }
  }

  /* En specifikationsblok: prøv hel, ellers del den og gentag bjælken. */
  function placeBlock(blk){
    const h=outerH(blk);
    if(h<=room()){ put(blk.cloneNode(true),h); return; }
    // Del blokken hvis den er større end en hel side, hvis den er den eneste,
    // eller hvis der stadig er en meningsfuld portion plads tilbage på siden.
    // Ellers flyttes den hel — en blok der starter 3 cm før sidefoden hjælper ingen.
    const canSplitHere = room() > avail(false)*0.35;
    if(h>avail(false)-20 || blk.classList.contains('solo') || canSplitHere){
      const head=blk.querySelector('.loc-head');
      const kids=[...blk.querySelector('.loc-body').children];
      let shell=null;
      // VIGTIGT: mål altid på originalen i host — kloner er løsrevet fra DOM'en
      // og rapporterer højden 0, hvilket får indholdet til at løbe ud over sidefoden.
      const headH=head.getBoundingClientRect().height;
      const openShell=(cont)=>{
        shell=document.createElement('div');
        shell.className=blk.className+' split';
        const hd=head.cloneNode(true);
        if(cont){ const n=document.createElement('span'); n.className='lh-cont'; n.textContent='(fortsat)'; hd.appendChild(n); }
        const bd=document.createElement('div'); bd.className='loc-body';
        shell.appendChild(hd); shell.appendChild(bd);
        cur.push(shell);
        used += 18 + headH + 13;   // blokkens margin-top + bjælke + .loc-body bundpadding
      };
      if(head.getBoundingClientRect().height+60 > room()) newPage();
      openShell(false);
      kids.forEach(k=>{
        const kh=outerH(k);
        if(kh<=room()){ shell.querySelector('.loc-body').appendChild(k.cloneNode(true)); used+=kh; return; }
        if(k.tagName==='TABLE'){
          // Tabellen deles over sider inde i blokken. Højden på thead og på
          // tabellens topmargen tages fra originalen, ikke fra klonen.
          const thead=k.querySelector('thead');
          const baseH=(thead?thead.getBoundingClientRect().height:0)
                     +parseFloat(getComputedStyle(k).marginTop||0);
          const target=()=>shell.querySelector('.loc-body');
          const rows=[...k.querySelectorAll('tbody > tr')];
          let t=null;
          // Åbn først tabellen når der er plads til både overskrift og en række.
          const openTable=()=>{ t=tableShell(k); target().appendChild(t); used+=baseH; };
          rows.forEach(r=>{
            const rh=r.getBoundingClientRect().height;
            if(!t){ if(baseH+rh>room()){ newPage(); openShell(true); } openTable(); }
            else if(rh>room()){ newPage(); openShell(true); openTable(); }
            t.querySelector('tbody').appendChild(r.cloneNode(true)); used+=rh;
          });
          const tf=k.querySelector('tfoot');
          if(tf){
            const fh=tf.getBoundingClientRect().height;
            if(!t){ if(baseH+fh>room()){ newPage(); openShell(true); } openTable(); }
            else if(fh>room()){ newPage(); openShell(true); openTable(); }
            t.appendChild(tf.cloneNode(true)); used+=fh;
          }
        } else {
          newPage(); openShell(true);
          shell.querySelector('.loc-body').appendChild(k.cloneNode(true)); used+=kh;
        }
      });
      return;
    }
    newPage();
    put(blk.cloneNode(true),h);
  }

  [...host.children].forEach(node=>{
    const h=outerH(node);
    if(node.classList.contains('loc-block')){ placeBlock(node); return; }
    if(node.tagName==='TABLE'){
      if(h<=room()) put(node.cloneNode(true),h); else placeTable(node);
      return;
    }
    if(h>room()) newPage();
    put(node.cloneNode(true),h);
  });
  if(cur.length) pages.push(cur);
  host.remove();

  const total=pages.length||1;
  return pages.map((nodes,i)=>{
    const pg=document.createElement('div');
    pg.className='pg';
    pg.innerHTML=bandHtml(i===0);
    const bodyEl=document.createElement('div');
    bodyEl.className='pg-body';
    nodes.forEach(n=>bodyEl.appendChild(n));
    pg.appendChild(bodyEl);
    pg.insertAdjacentHTML('beforeend', footHtml(i+1,total));
    return pg;
  });
}

/* ---------- PDF-eksport: browserens print-til-PDF (ægte vektor-HTML→PDF) ---------- */
function exportPDF(){
  const node=document.getElementById('quote-doc');
  if(!node){ alert('Sæt antal på mindst ét produkt før du eksporterer.'); return; }

  // Simpel validering — et tilbud uden kunde eller nummer skal ikke ud af huset.
  const missing=[];
  if(!v('c_company') && !v('c_contact')) missing.push('kunde/kontaktperson');
  if(!v('c_number')) missing.push('tilbudsnr.');
  if(!v('c_date'))   missing.push('dato');
  if(!v('c_seller')) missing.push('sælger');
  if(missing.length && !confirm('Følgende mangler: '+missing.join(', ')+'\n\nEksportér alligevel?')) return;

  const root=document.getElementById('print-root');
  root.innerHTML='';
  const pages=buildPrintPages();
  if(pages && pages.length) pages.forEach(p=>root.appendChild(p));
  else root.innerHTML=node.outerHTML;   // nødplan hvis pagineringen fejler

  // Browseren foreslår document.title som filnavn i "Gem som PDF".
  const prevTitle=document.title;
  document.title=quoteFilename();

  let cleaned=false;
  const mq=window.matchMedia?window.matchMedia('print'):null;
  const onMq=e=>{ if(!e.matches) done(); };
  function done(){
    if(cleaned) return; cleaned=true;
    root.innerHTML='';
    document.title=prevTitle;
    window.removeEventListener('afterprint',done);
    if(mq && mq.removeListener) mq.removeListener(onMq);
  }
  window.addEventListener('afterprint',done);
  if(mq && mq.addListener) mq.addListener(onMq);
  // BEMÆRK: ingen kort timeout her. En tidligere 1,5s-fallback tømte #print-root
  // mens printdialogen stadig var åben og gav tomme/halve PDF'er.
  setTimeout(done,120000);
  window.print();
}
