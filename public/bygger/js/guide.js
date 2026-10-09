/* ============================================================
   tillty Tilbudsbygger — Klargøringsguiden

   Et dokument for sig, bygget af det åbne tilbud: hvad kunden skal have klar
   på lokationen, før tillty kommer og sætter udstyr op. Guiden viser kun
   kravene til det udstyr, der står i tilbuddet — uden LAN-printer intet om
   netværkskabler, uden DS-licens intet om tv-skærme.

   Kravene er tilltys egne og står i dokumentet "Krav til kundens lokation ved
   opsætning af udstyr". Retter tillty dem dér, rettes de her — og rækken i
   js/sprog.js rettes med.

   Guiden har intet preview. Den pagineres og printes med de samme funktioner
   som tilbuddet (js/print.js), men har sit eget sidehoved og sin egen sidefod
   uden priser og garanti. Den gemmer ikke noget og tildeler intet nummer.
   ============================================================ */

/* Hvad en mulighed indeholder, set med installatørens øjne. Kundens eget og
   brugt udstyr tæller med: det skal også have strøm og net. Tilbehør under et
   produkt tæller kun, når produktet er der — som i tilbuddet. */
function guideUdstyr(o){
  const kort=[o.qty||{}, o.eget||{}, o.brugt||{}];
  const n=key=>kort.reduce((s,K)=>s+(K[key]||0),0);
  const prod=(...ids)=>ids.reduce((s,id)=>s+n(keyMain(id)),0);
  const tilb=aid=>n(keyExtra(aid))+CATALOG.reduce((s,p)=>
    s+(p.acc.indexOf(aid)>=0 && n(keyMain(p.id)) ? n(keyAcc(p.id,aid)) : 0),0);
  const sim=MODULES.find(m=>m.id==='sim');
  // Fotoet i oversigten er den variant, kunden rent faktisk får: 14"-tabletten
  // og ikke bare "en tablet".
  // Rækken bærer varenøglen, ikke billedet: PDF'en bruger sælgerens upload,
  // hvis der er en (pdfImg), kundens side kun tilltys egne fotos (FOTO).
  const foto=(...ids)=>ids.map(keyMain).find(k=>n(k))||'';
  return {
    foto:{kasse:foto('pos154','tab87','tab11','tab14'), sot:foto('sot'), kds:foto('kds185','kds22'),
          termstat:foto('termstat'), termmobil:foto('termmobil'), lan:foto('lan'), wifi:foto('wifi'),
          skuffe:keyExtra('drawer')},
    kasse:prod('pos154','tab87','tab11','tab14'),
    sot:prod('sot'),
    kds:prod('kds185','kds22'), kdsArm:tilb('vesa'),
    termstat:prod('termstat'), termmobil:prod('termmobil'),
    sim:sim ? modAntal(o,sim) : 0,
    lan:prod('lan'), wifi:prod('wifi'),
    skuffe:tilb('drawer'),
    ds:(o.qty||{})[KEY_DS]||0,
  };
}

/* Oversigten: én række pr. slags udstyr i tilbuddet, med strøm og netværk. */
function guideRaekker(u){
  const r=[];
  const paa=(antal,navn,stroem,net,foto)=>{ if(antal) r.push({antal,navn,stroem,net,foto}); };
  paa(u.kasse, t('Kasse (POS-skærm eller tablet)'), t('1 stik pr. kasse'), t('Wifi'), u.foto.kasse);
  paa(u.sot, t('Selvbetjeningsterminal'),
      t('1 stik pr. terminal. Den giver selv strøm til sin betalingsterminal'), t('Wifi'), u.foto.sot);
  paa(u.kds, t('Køkkenskærm (KDS)'), t('1 stik pr. skærm'), t('Wifi'), u.foto.kds);
  paa(u.termstat, t('Stationær betalingsterminal'),
      u.sot ? t('1 stik pr. terminal, undtagen dem på en selvbetjeningsterminal') : t('1 stik pr. terminal'),
      t('Wifi'), u.foto.termstat);
  paa(u.termmobil, t('Mobil betalingsterminal'), t('1 stik til opladeren'),
      u.sim ? t('Wifi eller simkort') : t('Wifi'), u.foto.termmobil);
  paa(u.lan, t('LAN-printer'), t('1 stik pr. printer'), t('Netværkskabel'), u.foto.lan);
  paa(u.wifi, t('WiFi-printer'), t('1 stik pr. printer'), t('Wifi'), u.foto.wifi);
  paa(u.skuffe, t('Pengeskuffe'), t('Intet stik. Får strøm gennem bonprinteren'), '–', u.foto.skuffe);
  paa(u.ds, t('Skærm til menu eller ordrenumre'), t('1 stik pr. skærm'), t('Wifi'));
  return r;
}

/* Det kunden skal gøre, trin for trin. Hvert trin er en overskrift og de
   sætninger, der passer til udstyret. */
function guideTrin(u){
  const s=[];
  const trin=(titel,...saetninger)=>s.push({titel, tekst:saetninger.filter(Boolean).join(' ')});
  trin(t('Beslut, hvor udstyret skal stå'),
    t('Placeringen afgør, hvor der skal være strøm og netværk.'),
    u.kasse && t('Kassen skal stå på en fast, plan bordplade med plads til printer og betalingsterminal ved siden af.'),
    (u.lan||u.wifi) && t('En printer i køkkenet står ved den station, der skal modtage bonen, helst væk fra direkte varme, damp og fedt.'));
  trin(t('Sørg for strøm til hver enhed'),
    t('Hver enhed i oversigten skal have sin egen stikkontakt eller plads i en stikdåse, dér hvor den skal stå.'),
    u.sot && t('Selvbetjeningsterminalen skal kun have ét strømstik. Den giver selv strøm til sin betalingsterminal.'),
    u.skuffe && t('Pengeskuffen får strøm gennem bonprinteren og skal ikke have eget stik.'));
  if(u.lan) trin(t('Træk netværkskabel til hver LAN-printer'),
    t('Kablet skal gå fra jeres router eller switch og ende med et stik ved printerens plads. Hvordan I fører kablerne, bestemmer I selv.'));
  trin(t('Tjek jeres wifi'),
    u.lan ? t('Alt andet end LAN-printeren kører trådløst.') : t('Alt udstyret kører trådløst.'),
    t('Wifi skal dække alle de steder, hvor udstyret skal bruges.'),
    u.termmobil && t('Det gælder også ved bordene, hvor den mobile betalingsterminal bruges.'),
    t('Er forbindelsen ustabil, anbefaler vi en bedre router. Vi fraråder 4G- og 5G-routere.'));
  if(u.skuffe) trin(t('Stil pengeskuffen tæt på bonprinteren'), t('Kablet mellem dem er 95 cm.'));
  // Med en skærmarm til hver køkkenskærm skal kunden kun sørge for en hylde;
  // uden arm sætter kunden selv et vægbeslag op.
  if(u.kds){
    if(u.kdsArm>=u.kds) trin(t('Gør plads til køkkenskærmens arm'),
      t('Skærmen leveres med en arm, som vi monterer på en hylde eller bordplade ved stationen. Sørg for, at hylden er sat op, inden vi kommer.'));
    else trin(t('Sæt et vægbeslag op til køkkenskærmen'),
      t('Sæt et vægbeslag op i øjenhøjde ved stationen, eller sørg for en hylde, som vi kan montere en skærmarm på.'));
  }
  if(u.ds) trin(t('Køb og ophæng skærme til menu og ordrenumre'),
    t('I køber selv tv og beslag og sætter dem op. Skærmen skal køre Android TV. Vi anbefaler Sharp, TCL eller lignende.'));
  trin(t('Find netværkets navn og adgangskode frem'),
    t('Sørg også for, at vi kan få adgang til routeren på dagen, eller at en person med adgang kan træffes. Vi sætter selv faste IP-adresser på udstyret.'));
  return s;
}

/* Tjeklisten følger trinene: samme betingelser, ét punkt pr. ting der skal
   være på plads. */
function guideTjek(u){
  const c=[];
  c.push(t('Internettet virker, og der er stabilt wifi på lokationen'));
  c.push(t('Netværkets navn og adgangskode er fundet frem'));
  c.push(t('Der er adgang til routeren, eller en kontaktperson med adgang kan træffes på dagen'));
  c.push(t('Det er besluttet, hvor udstyret skal stå'));
  c.push(t('Der er en stikkontakt eller plads i en stikdåse klar til hver enhed'));
  if(u.lan) c.push(t('Der er trukket netværkskabel fra router eller switch til hver LAN-printer'));
  c.push(t('Wifi dækker de steder, hvor udstyret skal bruges'));
  if(u.skuffe) c.push(t('Pengeskuffen kan stå højst 95 cm kabel fra bonprinteren'));
  if(u.kds) c.push(u.kdsArm>=u.kds
    ? t('Der er en hylde eller bordplade, som køkkenskærmens arm kan monteres på')
    : t('Der er sat et vægbeslag op til køkkenskærmen, eller der er en hylde, som tillty kan montere en skærmarm på'));
  if(u.ds) c.push(t('Skærme til menu og ordrenumre er købt og sat op (Android TV)'));
  c.push(t('En ansvarlig fra jer er til stede under installationen'));
  return c;
}

/* Én lokations del af guiden. Hvert trin og hvert tjekpunkt er sit eget
   element, så pagineringen kan skifte side imellem dem. Overskrifterne har
   data-hold, så de ikke står alene nederst på en side. */
function guideLokation(u){
  let b='<table class="pv kg-tabel"><thead><tr><th>'+t('Udstyr')+'</th><th class="num">'+t('Antal')
    +'</th><th>'+t('Strøm')+'</th><th>'+t('Netværk')+'</th></tr></thead><tbody>';
  guideRaekker(u).forEach(r=>{
    // tilltys egne produktfotos, som i tilbuddet. En række uden foto (skærme
    // kunden selv køber) får et tomt felt, så navnene står på linje.
    const src=r.foto ? pdfImg(r.foto) : '';
    const img=src ? '<img class="pv-img" src="'+src+'">' : '<span class="pv-img kg-tom"></span>';
    b+='<tr><td><div class="pv-prod">'+img+'<div>'+r.navn+'</div></div></td><td class="num">'+r.antal
      +'</td><td>'+r.stroem+'</td><td>'+r.net+'</td></tr>';
  });
  b+='</tbody></table>';
  b+='<div class="kg-h" data-hold="90">'+t('Det skal I gøre inden installationen')+'</div>';
  guideTrin(u).forEach((x,i)=>{
    b+='<div class="kg-trin"><span class="kg-n">'+(i+1)+'</span><div><div class="kg-t">'+x.titel+'</div>'
      +'<div class="kg-d">'+x.tekst+'</div></div></div>';
  });
  b+='<div class="kg-h" data-hold="70">'+t('Tjekliste')+'</div>';
  b+='<div class="kg-d">'+t('Kryds af, når hvert punkt er på plads, og send den udfyldte liste til os.')+'</div>';
  guideTjek(u).forEach(x=>{ b+='<div class="kg-tjek"><span class="kg-boks"></span><span>'+x+'</span></div>'; });
  return b;
}

/* Indledningen og afslutningen står både i PDF'en og på kundens side. */
function guideIntro(){
  return t('Når strøm, netværk og plads er klar på forhånd, kan vi sætte jeres udstyr op på ét besøg.')+' '
    +t('tillty trækker ikke kabler og sætter ikke beslag eller skærme op, så det skal I selv have gjort, inden vi kommer.');
}
// tillty aftaler først en dato, når tjeklisten er udfyldt, og et ekstra besøg
// på grund af en mangelfuld liste koster. Ordlyden er tilltys egen.
function guideSlut(){
  return t('Vi aftaler først en dato for opsætningen, når I har udfyldt tjeklisten og sendt den til os.')+' '
    +t('Kommer vi ud og opdager, at tjeklisten ikke er udfyldt korrekt, så opsætningen kræver et ekstra besøg, fakturerer vi det ekstra besøg.')+' '
    +t('Er I i tvivl om noget, så ring hellere til os end at gætte.');
}
function guideKunde(){
  const postby=[v('c_zip'),v('c_city')].filter(Boolean).join(' ');
  return [v('c_company'), [v('c_addr'),postby].filter(Boolean).join(', ')].filter(Boolean);
}

/* Hele guiden. `valg` er én mulighed pr. lokation: [{loc, o}]. */
function guideHtml(valg){
  const kunde=guideKunde();
  let b='<div class="qp-hej kg-titel">'+t('Klar til installation')+'</div>';
  if(kunde.length) b+='<div class="kg-kunde">'+kunde.map(esc).join(' · ')+'</div>';
  b+='<div class="qp-intro">'+guideIntro()+'</div>';
  valg.forEach((x,i)=>{
    if(valg.length>1) b+=lokTitel(x.loc,i+1);
    b+=guideLokation(guideUdstyr(x.o));
  });
  b+='<div class="kg-h" data-hold="60">'+t('Før vi aftaler en dato')+'</div>';
  b+='<div class="kg-d">'+guideSlut()+'</div>';
  return b;
}

/* ---------- sidehoved og sidefod ---------- */
function guideBand(first){
  const nr=esc(v('c_number'));
  const meta='<div class="qp-tt">'+t('KLARGØRING')+'</div>'+(nr ? t('Tilbud')+' '+nr : '');
  return '<div class="qp-band'+(first?'':' slim')+'"><div class="qp-logo">tillty</div>'
    +'<div class="qp-meta">'+meta+'</div></div>';
}
function guideFoot(pageNo,pageCount){
  return '<div class="qp-foot">'
    +'<div class="qf-left">'
      +'<div>'+SENDER.company+' · '+SENDER.addr+' · '+t('CVR')+' '+SENDER.cvr+'</div>'
      +'<div>'+SENDER.email+' · '+SENDER.phone+'</div>'
    +'</div>'
    +'<div class="qf-page">'+(pageNo?t('Side {n} af {total}',{n:pageNo,total:pageCount}):'')+'</div>'
    +'</div>';
}
function guideFilnavn(){
  const who=(v('c_company')||v('c_contact')||'kunde')
    .replace(/[^\p{L}\p{N}_ ]+/gu,'').trim().replace(/\s+/g,'-');
  return t('Klargøring')+'-'+(v('c_number')||idag())+'-'+who;
}

/* ---------- eksport ---------- */
function guideSider(valg){
  return buildPrintPages({html:guideHtml(valg), band:guideBand, foot:guideFoot});
}
/* Kartotekets knap "Klargøringsguide" kører byggeren i en usynlig ramme, så
   sælgeren bliver i kartoteket. Rammen får besked om, hvor langt vi er:
   'valg' (dialogen skal ses), 'print' (med filnavnet) og 'luk' (færdig). */
const I_RAMME = window.parent !== window;
function guideBesked(trin, filnavn){
  if(I_RAMME) window.parent.postMessage({tillty:'guide', trin, filnavn}, location.origin);
}
function udskrivGuide(valg){
  const html=guideHtml(valg);
  if(I_RAMME){
    guideBesked('print', guideFilnavn());
    window.addEventListener('afterprint', ()=>guideBesked('luk'), {once:true});
  }
  return udskrivSider(buildPrintPages({html, band:guideBand, foot:guideFoot}), guideFilnavn(),
    '<div class="quote-page">'+guideBand(true)+'<div class="qp-content">'+html+'</div></div>');
}

/* Knappen i sidehovedet. Mulighederne i et tilbud er alternativer, så guiden
   kan kun bygges af én pr. lokation. Har en lokation flere med indhold,
   vælger sælgeren den, kunden har bestilt. */
function exportGuide(){
  const lok=lokationerMedIndhold();
  if(!lok.length){ alert('Sæt antal på mindst ét produkt, før du laver klargøringsguiden.'); guideBesked('luk'); return; }
  if(lok.every(x=>x.ml.length===1)){ udskrivGuide(lok.map(x=>({loc:x.loc, o:x.ml[0].o}))); return; }
  visGuideValg(lok);
}

/* Dialogen er byggerens side og er altid dansk. Den fjernes igen, før der
   printes: @media print skjuler alt andet end #print-root, men en åben
   <dialog> ligger i browserens øverste lag. */
function visGuideValg(lok){
  const gammel=document.getElementById('guide_valg'); if(gammel) gammel.remove();
  const dlg=document.createElement('dialog');
  dlg.id='guide_valg'; dlg.className='guide-valg';
  let h='<form method="dialog"><h3>Hvilken mulighed har kunden bestilt?</h3>'
    +'<p>Klargøringsguiden bygges af én mulighed pr. lokation.</p>';
  lok.forEach((x,i)=>{
    if(x.ml.length<2) return;
    // Den anbefalede mulighed står valgt, ellers den første med indhold.
    const forvalg=Math.max(0, x.ml.findIndex(m=>m.o.anbefalet));
    h+='<label>'+(lok.length>1 ? esc(x.loc.name) : 'Mulighed')
      +'<select data-lok="'+i+'">'
      +x.ml.map((m,j)=>'<option value="'+j+'"'+(j===forvalg?' selected':'')+'>'+bogstav(j)+' · '+esc(m.o.navn)+'</option>').join('')
      +'</select></label>';
  });
  h+='<div class="gv-knapper"><button type="button" class="minibtn" data-luk>Annullér</button>'
    +'<button type="submit" class="btn-pdf">⬇ Lav guide</button></div></form>';
  dlg.innerHTML=h;
  document.body.appendChild(dlg);
  dlg.querySelector('[data-luk]').onclick=()=>{ dlg.remove(); guideBesked('luk'); };
  dlg.addEventListener('cancel',()=>{ dlg.remove(); guideBesked('luk'); });
  dlg.querySelector('form').onsubmit=e=>{
    e.preventDefault();
    const valg=lok.map((x,i)=>{
      const s=dlg.querySelector('select[data-lok="'+i+'"]');
      return {loc:x.loc, o:x.ml[s ? Number(s.value) : 0].o};
    });
    dlg.remove();
    udskrivGuide(valg);
  };
  guideBesked('valg');
  dlg.showModal();
}
