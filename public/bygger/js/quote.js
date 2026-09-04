/* ============================================================
   tillty Tilbudsbygger — Tilbudsdokumentet
   ============================================================ */

/* ---------- render tilbudsdokument ---------- */
function tableHW(d){
  let b='',total=0;
  b+='<table class="pv"><thead><tr><th>Hardware</th><th class="num">Antal</th><th class="num">Stk. pris</th><th class="num">I alt</th></tr></thead><tbody>';
  d.hw.forEach(p=>{ const line=p.qty*p.price; total+=line;
    const pimg=p.img?`<img class="pv-img" src="${p.img}">`:'';
    b+=`<tr><td>${pimg}${esc(p.name)}<span class="pv-d">${esc(p.desc)}</span></td><td class="num">${p.qty}</td><td class="num">${fmt(p.price)}</td><td class="num">${fmt(line)}</td></tr>`;
    p.accessories.forEach(a=>{ const al=a.qty*a.price; total+=al;
      const aimg=a.img?`<img class="pv-img" style="width:26px;height:26px" src="${a.img}">`:'';
      b+=`<tr class="acc"><td>↳ ${aimg}${esc(a.name)}<span class="pv-d">${esc(a.desc)}</span></td><td class="num">${a.qty}</td><td class="num">${fmt(a.price)}</td><td class="num">${fmt(al)}</td></tr>`;
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
    b+=`<tr><td>${aimg}${esc(a.name)}<span class="pv-d">${esc(a.desc)}</span></td><td class="num">${a.qty}</td><td class="num">${fmt(a.price)}</td><td class="num">${fmt(line)}</td></tr>`;
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

/* Én indrammet specifikationsblok. Samme opbygning uanset om bjælken siger
   "Specifikation" (én lokation) eller "① Lokation Aarhus C" (flere). */
function specBlock(headHtml,d,days,solo){
  return '<div class="loc-block'+(solo?' solo':'')+'">'
    +'<div class="loc-head">'+headHtml+'</div>'
    +'<div class="loc-body">'+locSections(d,days)+'</div>'
    +'</div>';
}

/* Samlet prisoverblik — dokumentets opsummering. Hurtig at scanne: én linje
   pr. lokation og en samlet række. Numrene matcher chippen på hver
   lokationsblok i specifikationen nedenfor.
   Ved én lokation vises kun den samlede række — en linje og en identisk
   totallinje ville bare se ud som en fejl. */
function priceOverview(live,days,sum){
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
        +`<td class="num">${cell(d.modMonthly)}</td><td class="num">${cell(d.licDaily*days+d.modMonthly)}</td></tr>`;
    });
  }
  b+='</tbody><tfoot><tr><td>'+(multi?'I alt':'Samlet pris')+'</td>'
    +`<td class="num">${cell(sum.oneOff)}</td><td class="num">${cell(sum.licDaily)}</td>`
    +`<td class="num">${cell(sum.modMonthly)}</td><td class="num">${cell(sum.licDaily*days+sum.modMonthly)}</td>`
    +'</tr></tfoot></table>';
  if(sum.licDaily)
    b+='<div class="qp-assump">Licenser afregnes <b>pr. dag i brug</b> — '+fmt(sum.licDaily)
      +' pr. dag. Månedsprisen er regnet med en måned på '+days+' dage; I betaler kun for de dage, terminalerne rent faktisk er i brug.</div>';
  /* Indløsning står altid i tilbuddet — enten den aftalte sats, eller
     forbeholdet. Et tilbud må ikke være tavst om, hvad korttransaktionerne
     koster, bare fordi sælgeren ikke nåede at udfylde feltet. */
  const indl=v('c_indloesning');
  b+='<div class="qp-assump"><b>Indløsning</b> '+(indl
    ? 'er aftalt til '+esc(indl)+'.'
    : 'aftales særskilt og beregnes efter IC++.')+'</div>';
  return b;
}

function update(){
  const el=document.getElementById('preview');
  const days=licenseDays();
  const per=LOCATIONS.map(l=>({loc:l,d:collectFor(l.qty)}));
  refreshLicensePanel(per[activeIdx].d);
  const live=per.filter(x=>x.d.has);

  if(!live.length){ el.innerHTML='<div class="empty">Sæt antal på et produkt for at bygge tilbuddet…</div>'; return; }
  const multi=live.length>1;

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
  const defaultIntro = onlyExtras
    ? 'Tak for en god dialog. Herunder finder I vores tilbud på det tilbehør, I mangler til jeres nuværende tillty-opsætning.'
    : multi
      ? 'Tak for en god dialog. Herunder finder I vores tilbud på en tillty-løsning tilpasset jer — sat op pr. lokation, så I kan se både den enkelte forretning og den samlede investering.'
      : 'Tak for en god dialog. Herunder finder I vores tilbud på en tillty-løsning tilpasset jer, med det udstyr og de licenser vi har talt om.';
  b+='<div class="qp-intro">'+(intro?esc(intro):defaultIntro)+'</div>';
  // Beskrivelsen sættes ind efter specifikationen, lige inden hilsen — se nedenfor.
  const note=v('c_note');

  const sum={oneOff:0,licDaily:0,modMonthly:0};
  live.forEach(x=>{ sum.oneOff+=x.d.oneOff; sum.licDaily+=x.d.licDaily; sum.modMonthly+=x.d.modMonthly; });

  // Kontaktoplysningerne står nu i sidefoden på hver side — kun underskriften
  // hører til i selve brevteksten.
  const seller=v('c_seller');
  const greet='<div class="qp-greet">Hilsen '+(seller?esc(seller)+' og tillty teamet':'tillty teamet')+'</div>';

  /* Ens opbygning uanset antal lokationer: overblik først, derefter
     specifikationen i indrammede blokke, og til sidst hilsen. */
  b+=priceOverview(live,days,sum);
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
