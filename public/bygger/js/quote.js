/* ============================================================
   tillty Tilbudsbygger — Tilbudsdokumentet
   ============================================================ */

/* ---------- render tilbudsdokument ---------- */
function tableHW(d){
  let b='',total=0;
  b+='<table class="pv"><thead><tr><th>Hardware</th><th class="num">Antal</th><th class="num">Stk. pris</th><th class="num">I alt</th></tr></thead><tbody>';
  d.hw.forEach(p=>{ const line=p.qty*p.price; total+=line;
    const pimg=p.img?`<img class="pv-img" src="${p.img}">`:'';
    // Kundens eget udstyr: ingen stykpris at vise, og linjen er 0.
    const mrk = p.eget ? '<span class="pv-mrk eget">Jeres eget</span>'
              : p.nyt ? '<span class="pv-mrk ny">Ny</span>' : '';
    const stk = p.eget ? '—' : fmt(p.price);
    // Fotoet står til venstre for navn og beskrivelse (.pv-prod), så rækken
    // ikke bliver højere end fotoet.
    b+=`<tr${p.eget?' class="eget"':''}><td><div class="pv-prod">${pimg}<div>${esc(p.name)}${mrk}<span class="pv-d">${esc(p.desc)}</span></div></div></td><td class="num">${p.qty}</td><td class="num">${stk}</td><td class="num">${fmt(line)}</td></tr>`;
    p.accessories.forEach(a=>{ const al=a.qty*a.price; total+=al;
      const aimg=a.img?`<img class="pv-img" style="width:26px;height:26px" src="${a.img}">`:'';
      // Kundens eget tilbehør: samme behandling som eget udstyr — mærket, dæmpet, 0.
      const amrk=a.eget?'<span class="pv-mrk eget">Jeres eget</span>':'';
      b+=`<tr class="acc${a.eget?' eget':''}"><td><div class="pv-prod"><span>↳</span>${aimg}<div>${esc(a.name)}${amrk}<span class="pv-d">${esc(a.desc)}</span></div></div></td><td class="num">${a.qty}</td><td class="num">${a.eget?'—':fmt(a.price)}</td><td class="num">${fmt(al)}</td></tr>`;
    });
  });
  b+='</tbody></table>';
  return b;
}
function tableExtras(d){
  let b='';
  b+='<table class="pv"><thead><tr><th>Ekstra tilbehør</th><th class="num">Antal</th><th class="num">Stk. pris</th><th class="num">I alt</th></tr></thead><tbody>';
  d.extras.forEach(a=>{ const line=a.qty*a.price;
    const aimg=a.img?`<img class="pv-img" src="${a.img}">`:'';
    b+=`<tr><td><div class="pv-prod">${aimg}<div>${esc(a.name)}<span class="pv-d">${esc(a.desc)}</span></div></div></td><td class="num">${a.qty}</td><td class="num">${fmt(a.price)}</td><td class="num">${fmt(line)}</td></tr>`;
  });
  b+='</tbody></table>';
  return b;
}
function tableLic(d,days){
  let b='';
  b+='<table class="pv"><thead><tr><th>Licens</th><th class="num">Antal</th><th class="num">Pris/dag</th><th class="num">I alt/dag</th><th class="num">Pr. md.</th></tr></thead><tbody>';
  d.licenses.forEach(l=>{
    b+=`<tr><td>${esc(l.name)}</td><td class="num">${l.qty}</td><td class="num">${fmt(l.daily)}</td><td class="num">${fmt(l.total)}</td><td class="num">${fmt(l.total*days)}</td></tr>`;});
  b+='</tbody></table>';
  return b;
}
function tableMod(d){
  let b='';
  b+='<table class="pv"><thead><tr><th>Modul</th><th class="num">Antal</th><th class="num">Pris/md.</th><th class="num">Md. i alt</th></tr></thead><tbody>';
  d.modules.forEach(s=>{ const line=s.qty*s.price;
    b+=`<tr><td>${esc(s.name)}<span class="pv-d">${esc(s.desc)}</span></td><td class="num">${s.qty}</td><td class="num">${fmt(s.price)}</td><td class="num">${fmt(line)}</td></tr>`;
    // Inkluderede moduler vises som gratis underlinjer — aldrig som en ekstra pris.
    (s.included||[]).forEach(inc=>{
      b+=`<tr class="acc"><td>↳ ${esc(inc.name)}<span class="pv-d">${esc(inc.desc)}</span></td><td class="num">${s.qty}</td><td class="num">Inkl.</td><td class="num">0,-</td></tr>`;
    });
  });
  b+='</tbody></table>';
  return b;
}

function locSections(d,days){
  let b='';
  /* Ingen overskrifter over tabellerne — navnet står i tabellens egen
     header-række (første kolonne). Forbeholdene står, hvor de hører hjemme:
     "ekskl. moms" i sidefoden og under prisoverblikket, afregningsformen i
     kolonnerne (Pris/dag, Pris/md.) og i noten under prisoverblikket. */
  if(d.hw.length)       b+=tableHW(d);
  if(d.extras.length)   b+=tableExtras(d);
  if(d.licenses.length) b+=tableLic(d,days);
  if(d.modules.length)  b+=tableMod(d);
  // Hver blok lukkes af sin egen opsummering — også når der kun er én.
  b+='<div class="loc-sub">';
  if(d.oneOff)     b+=`<div><span>Engangs</span><span>${fmt(d.oneOff)}</span></div>`;
  if(d.licDaily)   b+=`<div><span>Licenser / dag</span><span>${fmt(d.licDaily)}</span></div>`;
  if(d.modMonthly) b+=`<div><span>Moduler / md.</span><span>${fmt(d.modMonthly)}</span></div>`;
  if(d.licDaily||d.modMonthly)
    b+=`<div class="ls-strong"><span>Løbende / md.</span><span>${fmt(d.licDaily*days+d.modMonthly)}</span></div>`;
  b+='</div>';
  return b;
}

/* Én indrammet blok med accentbjælke. Specifikationen, hver lokation og hver
   mulighed er alle sådan en blok — så deler pagineringen dem ens og gentager
   bjælken med "(fortsat)" på næste side. */
function blok(headHtml,bodyHtml,klasse){
  return '<div class="loc-block'+(klasse?' '+klasse:'')+'">'
    +'<div class="loc-head">'+headHtml+'</div>'
    +'<div class="loc-body">'+bodyHtml+'</div>'
    +'</div>';
}

/* Én indrammet specifikationsblok. Samme opbygning uanset om bjælken siger
   "Specifikation" (én lokation) eller "① Lokation Aarhus C" (flere). */
function specBlock(headHtml,d,days,solo){
  return blok(headHtml, locSections(d,days), solo?'solo':'');
}

function sumOf(live){
  const sum={oneOff:0,licDaily:0,modMonthly:0};
  live.forEach(x=>{ sum.oneOff+=x.d.oneOff; sum.licDaily+=x.d.licDaily; sum.modMonthly+=x.d.modMonthly; });
  return sum;
}
const loebende=(sum,days)=>sum.licDaily*days+sum.modMonthly;

/* Samlet prisoverblik — dokumentets opsummering. Hurtig at scanne: én linje
   pr. lokation og en samlet række. Numrene matcher chippen på hver
   lokationsblok i specifikationen nedenfor.
   Ved én lokation vises kun den samlede række — en linje og en identisk
   totallinje ville bare se ud som en fejl. */
function overviewTable(live,days,sum){
  const cell=n=>n?fmt(n):'—';   // nul udelades — "0,-" i hver kolonne støjer bare
  const multi=live.length>1;
  let b='<table class="pv loc-overview"><thead><tr><th>Samlet prisoverblik</th>'
    +'<th class="num">Engangs</th><th class="num">Licens/dag</th>'
    +'<th class="num">Moduler/md.</th><th class="num">Løbende/md.</th></tr></thead><tbody>';
  if(multi){
    live.forEach((x,i)=>{
      const d=x.d;
      b+=`<tr><td><span class="lo-n">${i+1}</span>${esc(x.loc.name)}</td>`
        +`<td class="num">${cell(d.oneOff)}</td><td class="num">${cell(d.licDaily)}</td>`
        +`<td class="num">${cell(d.modMonthly)}</td><td class="num">${cell(loebende(d,days))}</td></tr>`;
    });
  }
  b+='</tbody><tfoot><tr><td>'+(multi?'I alt':'Samlet pris')+'</td>'
    +`<td class="num">${cell(sum.oneOff)}</td><td class="num">${cell(sum.licDaily)}</td>`
    +`<td class="num">${cell(sum.modMonthly)}</td><td class="num">${cell(loebende(sum,days))}</td>`
    +'</tr></tfoot></table>';
  return b;
}

/* Prisforbeholdene under prisoverblikket eller sammenligningen. `dagspris`
   nævnes kun, når der er én samlet licenspris — med flere muligheder har hver
   sin egen, og den står i mulighedens opsummering. */
function prisNoter(harLic,dagspris,harEget,days){
  let b='';
  if(harLic){
    // Har kunden eget udstyr med, skal det siges eksplicit at det også koster
    // licens. Ellers er regnestykket i licenstabellen ikke til at følge.
    const eget = harEget
      ? ' Bemærk at jeres eget udstyr også kræver licens — det tæller med i licenserne ovenfor.'
      : '';
    b+='<div class="qp-assump">Licenser afregnes <b>pr. dag i brug</b>'
      +(dagspris?' — '+fmt(dagspris)+' pr. dag':'')
      +'. Månedsprisen er regnet med en måned på '+days+' dage; I betaler kun for de dage, terminalen er slået til.'
      +eget+'</div>';
  }
  /* Indløsning står altid i tilbuddet. Er der skrevet en sats, står præcis
     det der — ikke omskrevet. Ellers står forbeholdet. Et tilbud må ikke være
     tavst om indløsning, bare fordi sælgeren sprang feltet over. */
  const indl=v('c_indloesning');
  b+='<div class="qp-assump"><b>Indløsning:</b> '
    +(indl ? esc(indl) : 'Aftales efter dialog.')+'</div>';
  return b;
}

function priceOverview(live,days,sum){
  return overviewTable(live,days,sum)
    + prisNoter(!!sum.licDaily, sum.licDaily, live.some(x=>x.d.harEget), days);
}

/* ==========================================================================
   FLERE MULIGHEDER
   Mulighederne hører til en lokation. For hver lokation stilles dens
   muligheder op side om side, og derefter følger deres specifikation. Har
   tilbuddet flere lokationer, står prisoverblikket øverst.
   ========================================================================== */
const TALORD = {2:'to', 3:'tre', 4:'fire'};

/* Lokationerne med indhold og, for hver, mulighederne med indhold: [{loc, ml:[{o, d}]}].
   De nummereres i den rækkefølge kunden ser dem, så en tom lokation eller
   mulighed ikke efterlader et hul. */
function lokationerMedIndhold(){
  return LOCS.map(l=>({loc:l, ml:l.muligheder.map(o=>({o, d:collectFor(o)})).filter(m=>m.d.has)}))
    .filter(x=>x.ml.length);
}

/* Tæl op for én mulighed. `fn` får mulighedens to antalskort: Q (det vi
   sælger) og E (kundens eget). */
function smlTael(m,fn){ return fn(m.o.qty||{}, m.o.eget||{}); }

/* En hardwarerække samler produkter der løser samme opgave, fx de fire
   kasseskærme. Cellen skelner kun mellem ny og jeres, når kunden har eget
   udstyr i rækken, og viser kun varianten (11", LAN …), når mulighederne
   bruger forskellige. Ellers er det bare støj. */
function smlProdukter(r,ml){
  const ids=Object.keys(r.produkter);
  const tal=ml.map(m=>ids.map(id=>({
      variant:r.produkter[id],
      nye:smlTael(m,Q=>qOf(Q,keyMain(id))),
      egne:smlTael(m,(Q,E)=>qOf(E,keyMain(id))),
    })).filter(t=>t.nye||t.egne));
  const alle=[].concat(...tal);
  if(!alle.length) return null;
  const visOrd=alle.some(t=>t.egne);
  const visVariant=new Set(alle.map(t=>t.variant)).size>1;
  return tal.map(ts=>smlCelle(ts,visOrd,visVariant));
}

function smlCelle(ts,visOrd,visVariant){
  if(!ts.length) return null;
  // Kundens eget først — "2 jeres + 1 ny", som man siger det.
  const dele=ts.filter(t=>t.egne).map(t=>({n:t.egne, ord:'jeres', variant:t.variant, eget:true}))
    .concat(ts.filter(t=>t.nye).map(t=>({n:t.nye, ord:t.nye===1?'ny':'nye', variant:t.variant})));
  // Deler alle dele samme variant, står den én gang til sidst.
  const faelles=visVariant && new Set(dele.map(d=>d.variant)).size===1 ? dele[0].variant : '';
  const html=dele.map((d,i)=>{
    const ord=visOrd?d.ord:'', variant=visVariant&&!faelles?d.variant:'';
    // Et ettal alene siger ingenting ved siden af et ord eller en variant:
    // "Ny WiFi", ikke "1 ny WiFi".
    const n=dele.length===1 && d.n===1 && (ord||variant||faelles) ? '' : String(d.n);
    let t=[n,ord,variant].filter(Boolean).join(' ');
    if(i===0) t=t.charAt(0).toUpperCase()+t.slice(1);
    return d.eget?'<span class="sml-eget">'+esc(t)+'</span>':esc(t);
  }).join(' + ');
  return (html+(faelles?' '+esc(faelles):'')).trim();
}

/* En tilbehørsrække tæller tilbehør lagt på et produkt og løst tilbehør op —
   nyt og kundens eget hver for sig, så cellen kan sige "2 jeres + 1 ny" som
   ved udstyret. Tilbehør har ingen varianter i sammenligningen. */
function smlTilbehoer(r,ml){
  const noegler=[];
  r.tilbehoer.forEach(aid=>{
    CATALOG.forEach(p=>{ if(p.acc.indexOf(aid)>=0) noegler.push(keyAcc(p.id,aid)); });
    noegler.push(keyExtra(aid));
  });
  const tal=ml.map(m=>{
    const nye=smlTael(m,Q=>noegler.reduce((s,k)=>s+qOf(Q,k),0));
    const egne=smlTael(m,(Q,E)=>noegler.reduce((s,k)=>s+qOf(E,k),0));
    return nye||egne ? [{variant:'',nye,egne}] : [];
  });
  const alle=[].concat(...tal);
  if(!alle.length) return null;
  return tal.map(ts=>smlCelle(ts, alle.some(t=>t.egne), false));
}

/* Software og licens bygges af modulerne og licenstyperne selv, så et nyt
   modul kommer med uden at skulle skrives ind her. */
function smlSoftware(ml){
  const ud=[];
  // Muligheden har modulet — også når det er inkluderet i et andet.
  const aktiv=(m,id)=>{
    const Q=m.o.qty||{}, p=INCLUDED_BY[id];
    return qOf(Q,keyMod(id))>0 || (!!p && qOf(Q,keyMod(p))>0);
  };
  const samme=(a,b)=>ml.every(m=>aktiv(m,a)===aktiv(m,b));
  MODULES.forEach(s=>{
    const paa=ml.map(m=>aktiv(m,s.id));
    if(!paa.some(Boolean)) return;
    // Følger et inkluderet modul sit forældremodul i alle muligheder, deler de
    // række: "Takeaway og QR bestilling".
    const p=INCLUDED_BY[s.id];
    if(p && samme(p,s.id)) return;
    const navne=[s.name].concat((s.includes||[]).filter(id=>samme(id,s.id))
      .map(id=>MODULES.find(x=>x.id===id).name));
    ud.push({navn:navne.join(' og '), celler:paa.map(on=>on?'✓':null)});
  });
  Object.keys(LICENSE_TYPES).forEach(lt=>{
    const antal=ml.map(m=>m.d.licenses.filter(l=>l.type===lt).reduce((t,l)=>t+l.qty,0));
    if(!antal.some(Boolean)) return;
    // Tæller kundens eget udstyr med, siger rækken det — ellers ser tallet for
    // højt ud i forhold til det der købes.
    const eget=ml.some(m=>smlTael(m,(Q,E)=>CATALOG.filter(p=>PRODUCT_LICENSE[p.id]===lt)
      .reduce((s,p)=>s+qOf(E,keyMain(p.id)),0))>0);
    ud.push({navn:LICENSE_TYPES[lt].name+(eget?' (inkl. jeres eget udstyr)':''),
             celler:antal.map(n=>n?String(n):null)});
  });
  return ud;
}

function sammenligning(ml,days){
  const anb=m=>m.o.anbefalet?' anb':'';
  const celle=n=>n?fmt(n):'—';
  const kat=navn=>'<tr class="sml-kat"><td colspan="'+(ml.length+1)+'">'+esc(navn)+'</td></tr>';
  // Cellerne er færdig HTML; navnet escapes her.
  const raekke=(navn,celler)=>'<tr><td>'+esc(navn)+'</td>'
    +celler.map((c,i)=>'<td class="num'+anb(ml[i])+(c?'':' sml-nej')+'">'+(c||'—')+'</td>').join('')+'</tr>';
  let b='<table class="pv sml"><thead><tr><th>Sammenlign muligheder</th>';
  ml.forEach((m,i)=>{
    // Den anbefalede kolonne bærer anbefalingen i stedet for sin underrubrik.
    const tag=m.o.anbefalet?'Vi anbefaler':m.o.tagline;
    b+='<th class="sml-opt'+anb(m)+'">'
      +'<span class="sml-navn"><span class="lo-n bogstav">'+bogstav(i)+'</span>'+esc(m.o.navn)+'</span>'
      +(tag?'<span class="sml-tag">'+esc(tag)+'</span>':'')+'</th>';
  });
  b+='</tr></thead><tbody>';
  // Rækker uden indhold i nogen mulighed udelades, og det gør tomme kategorier også.
  SAMMENLIGNING.forEach(k=>{
    const rows=k.raekker.map(r=>{
      const c=r.produkter?smlProdukter(r,ml):smlTilbehoer(r,ml);
      return c?raekke(r.navn,c):'';
    }).join('');
    if(rows) b+=kat(k.kategori)+rows;
  });
  const soft=smlSoftware(ml).map(r=>raekke(r.navn,r.celler)).join('');
  if(soft) b+=kat('Software og licens')+soft;
  b+='</tbody><tfoot>'
    +'<tr><td>Engangs</td>'+ml.map(m=>'<td class="num'+anb(m)+'">'+celle(m.d.oneOff)+'</td>').join('')+'</tr>'
    +'<tr><td>Løbende pr. måned</td>'+ml.map(m=>'<td class="num'+anb(m)+'">'+celle(loebende(m.d,days))+'</td>').join('')+'</tr>'
    +'</tfoot></table>';
  return b;
}

/* Bjælken bærer mulighedens bogstav, navn, underrubrik og anbefaling. Prisen
   står i blokkens opsummering og i sammenligningen — ikke i bjælken. */
function mulighedHead(m,bog){
  return '<span class="lh-n bogstav">'+bog+'</span><span class="lh-name">'+esc(m.o.navn)+'</span>'
    +(m.o.tagline?'<span class="lh-tag">'+esc(m.o.tagline)+'</span>':'')
    +(m.o.anbefalet?'<span class="lh-anb">Vi anbefaler</span>':'');
}

/* Én blok pr. mulighed: bjælke med bogstav og navn, og specifikationen.
   Muligheder har ingen egen beskrivelse — den er fravalgt. Blokkene følger
   efter hinanden uden sideskift; pagineringen flytter eller deler dem
   ligesom en lokationsblok. */
function mulighedsSpec(m,bog,days){
  return blok(mulighedHead(m,bog), locSections(m.d,days), 'opt-block');
}

/* Prisoverblikket, når en lokation har flere muligheder: lokationen som
   mellemrubrik og én linje pr. mulighed under den. Mulighederne er
   alternativer, så der er ingen samlet total — den afhænger af, hvad kunden
   vælger for hver lokation. */
function lokationsOverblik(lok,days){
  const cell=n=>n?fmt(n):'—';
  const tal=d=>`<td class="num">${cell(d.oneOff)}</td><td class="num">${cell(d.licDaily)}</td>`
    +`<td class="num">${cell(d.modMonthly)}</td><td class="num">${cell(loebende(d,days))}</td>`;
  let b='<table class="pv loc-overview"><thead><tr><th>Samlet prisoverblik</th>'
    +'<th class="num">Engangs</th><th class="num">Licens/dag</th>'
    +'<th class="num">Moduler/md.</th><th class="num">Løbende/md.</th></tr></thead><tbody>';
  lok.forEach((x,i)=>{
    const navn=`<span class="lo-n">${i+1}</span>${esc(x.loc.name)}`;
    if(x.ml.length===1){ b+=`<tr><td>${navn}</td>${tal(x.ml[0].d)}</tr>`; return; }
    b+=`<tr class="lo-lok"><td colspan="5">${navn}</td></tr>`;
    x.ml.forEach((m,j)=>{
      b+=`<tr class="lo-opt"><td><span class="lo-n bogstav">${bogstav(j)}</span>${esc(m.o.navn)}`
        +(m.o.anbefalet?'<span class="lo-anb">Anbefalet</span>':'')+`</td>${tal(m.d)}</tr>`;
    });
  });
  return b+'</tbody></table>'
    +'<div class="qp-assump">Der er ingen samlet pris, fordi den afhænger af, hvilken mulighed I vælger for hver lokation.</div>';
}

/* Lokationens overskrift over dens sammenligning og blokke. Den blå bjælke er
   forbeholdt blokkene, så lokationen ikke ligner endnu en mulighed. */
function lokTitel(loc,nr){
  return '<div class="lok-titel"><span class="lo-n">'+nr+'</span>'+esc(loc.name)+'</div>';
}

function update(){
  const el=document.getElementById('preview');
  const days=licenseDays();
  refreshLicensePanel(collectFor(M()));
  /* Dokumentet bygges af alle lokationer og muligheder med indhold — ikke kun
     det man har fremme. Har ingen lokation mere end én mulighed med indhold,
     er der intet at sammenligne, og det er et almindeligt tilbud. */
  const lok=lokationerMedIndhold();
  if(!lok.length){ el.innerHTML='<div class="empty">Sæt antal på et produkt for at bygge tilbuddet…</div>'; return; }
  const sml=lok.some(x=>x.ml.length>1);
  const multi=lok.length>1;
  const live=lok.map(x=>({loc:x.loc, d:x.ml[0].d}));

  let b='';
  /* Parterne — afsender og modtager. Uden denne blok er dokumentet ikke et tilbud. */
  const send=[SENDER.company,SENDER.addr,'CVR '+SENDER.cvr,SENDER.email,SENDER.phone].filter(Boolean);
  const custCvr=v('c_cvr');
  // Postnr. og by står på samme linje under vejnavnet, som på et brev.
  const postby=[v('c_zip'),v('c_city')].filter(Boolean).join(' ');
  const cust=[v('c_company'),v('c_contact'),v('c_addr'),postby,
              custCvr?('CVR '+custCvr):'',v('c_email'),v('c_phone')].filter(Boolean);
  b+='<div class="qp-parties">'
    +'<div class="qp-col"><div class="qp-lbl">Fra</div>'+send.map(esc).join('<br>')+'</div>'
    +'<div class="qp-col"><div class="qp-lbl">Til</div>'
      +(cust.length?cust.map(esc).join('<br>'):'<span class="qp-missing">Udfyld kundeoplysninger i venstre panel</span>')
    +'</div></div>';

  const kunde=v('c_contact')||v('c_company')||'der';
  b+='<div class="qp-hej">Hej '+esc(kunde)+',</div>';

  const intro=v('c_intro');
  const onlyExtras = live.every(x=>!x.d.hw.length && !x.d.licenses.length && !x.d.modules.length && x.d.extras.length);
  const defaultIntro = sml && multi
    ? 'Tak for en god dialog. Herunder finder I vores tilbud pr. lokation, med de muligheder vi har talt om for hver af dem stillet op side om side.'
    : sml
    ? 'Tak for en god dialog. Herunder finder I '+(TALORD[lok[0].ml.length]||lok[0].ml.length)+' måder at gribe det an på, stillet op side om side, med specifikationen af hver mulighed nedenfor.'
    : onlyExtras
    ? 'Tak for en god dialog. Herunder finder I vores tilbud på det tilbehør, I mangler til jeres nuværende tillty-opsætning.'
    : multi
      ? 'Tak for en god dialog. Herunder finder I vores tilbud på en tillty-løsning tilpasset jer — sat op pr. lokation, så I kan se både den enkelte forretning og den samlede investering.'
      : 'Tak for en god dialog. Herunder finder I vores tilbud på en tillty-løsning tilpasset jer, med det udstyr og de licenser vi har talt om.';
  b+='<div class="qp-intro">'+(intro?esc(intro):defaultIntro)+'</div>';
  // Beskrivelsen sættes ind efter specifikationen, lige inden hilsen — se nedenfor.
  const note=v('c_note');

  // Kontaktoplysningerne står nu i sidefoden på hver side — kun underskriften
  // hører til i selve brevteksten.
  const seller=v('c_seller');
  const greet='<div class="qp-greet">Hilsen '+(seller?esc(seller)+' og tillty teamet':'tillty teamet')+'</div>';

  const harEget=lok.some(x=>x.ml.some(m=>m.d.harEget));
  const harLic=lok.some(x=>x.ml.some(m=>m.d.licDaily));
  if(sml && multi){
    /* Flere lokationer med muligheder: prisoverblikket øverst, og derefter
       hver lokation for sig — dens sammenligning og mulighedernes blokke. */
    b+=lokationsOverblik(lok,days);
    b+=prisNoter(harLic, null, harEget, days);
    lok.forEach((x,i)=>{
      b+=lokTitel(x.loc,i+1);
      if(x.ml.length>1){
        b+=sammenligning(x.ml,days);
        x.ml.forEach((m,j)=>{ b+=mulighedsSpec(m,bogstav(j),days); });
      } else {
        b+=specBlock('<span class="lh-name">Specifikation</span>', x.ml[0].d, days, true);
      }
    });
    if(note) b+='<div class="qp-note">'+esc(note)+'</div>';
    b+=greet;
  } else if(sml){
    /* Én lokation med muligheder: sammenligning og forbehold først, så
       mulighedernes blokke efter hinanden, og afslutning og hilsen til sidst. */
    b+=sammenligning(lok[0].ml,days);
    b+=prisNoter(harLic, null, harEget, days);
    lok[0].ml.forEach((m,i)=>{ b+=mulighedsSpec(m,bogstav(i),days); });
    if(note) b+='<div class="qp-note">'+esc(note)+'</div>';
    b+=greet;
  } else {
    /* Ens opbygning uanset antal lokationer: overblik først, derefter
       specifikationen i indrammede blokke, og til sidst hilsen. */
    b+=priceOverview(live,days,sumOf(live));
    if(multi){
      live.forEach((x,i)=>{
        b+=specBlock(
          '<span class="lh-n">'+(i+1)+'</span><span class="lh-name">'+esc(x.loc.name)+'</span>',
          x.d, days);
      });
    } else {
      b+=specBlock('<span class="lh-name">Specifikation</span>', live[0].d, days, true);
    }
    if(note) b+='<div class="qp-note">'+esc(note)+'</div>';
    b+=greet;
  }

  el.innerHTML=
    '<div class="quote-page" id="quote-doc">'+
      bandHtml(true)+
      '<div class="qp-content" id="quote-body">'+b+'</div>'+
      footHtml('', '')+
    '</div>';
}

/* ---------- sidehoved og sidefod (gentages på hver side) ---------- */
function bandHtml(first){
  let meta='<div class="qp-tt">TILBUD</div>';
  if(first){
    meta+='Nr. '+(esc(v('c_number'))||'—')
      +'<br>Sendt: '+(daDate(v('c_date'))||'—')
      +'<br>Gælder til: '+(validUntil()||'—');
  } else {
    meta+='Nr. '+(esc(v('c_number'))||'—');
  }
  return '<div class="qp-band'+(first?'':' slim')+'"><div class="qp-logo">tillty</div>'
    +'<div class="qp-meta">'+meta+'</div></div>';
}
function footHtml(pageNo,pageCount){
  return '<div class="qp-foot">'
    +'<div class="qf-left">'
      +'<div>'+SENDER.company+' · '+SENDER.addr+' · CVR '+SENDER.cvr+'</div>'
      +'<div>'+SENDER.email+' · '+SENDER.phone+' · Alle priser er ekskl. moms medmindre andet er angivet.</div>'
    +'</div>'
    +'<div class="qf-page">'+(pageNo?('Side '+pageNo+' af '+pageCount):'')+'</div>'
    +'</div>';
}
