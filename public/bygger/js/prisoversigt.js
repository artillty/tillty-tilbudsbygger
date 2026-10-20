/* ============================================================
   tillty Tilbudsbygger — Prisoversigten

   Et dokument for sig, bygget af det åbne tilbud: kun priserne, så sælgeren
   kan sende dem i en mail for sig. Ingen parter og intet brev. Opbygningen er tilbuddets: prisoverblik eller sammenligning
   øverst, så en blok pr. lokation eller mulighed med dens linjer og
   opsummering. Alle lokationer og muligheder med indhold kommer med.
   Tabellerne er tilbuddets egne, med fotos og beskrivelser (tilltys ønske).

   Licens kan slås fra pr. oversigt. Så er licenstabellerne, licenskolonnen
   og licensrækkerne i sammenligningen væk, og "Løbende / md." er kun
   modulerne — ellers summer tallene ikke.

   Den kræver kun kundens navn og e-mail (PO_KRAV), så sælgeren kan sende
   priser tidligt, før CVR og adresse er på plads. Brugt udstyr uden pris
   stopper den stadig, ligesom tilbuddet.

   Tilbuddet gemmes, før der printes, så kunden står i kartoteket. Statussen
   røres ikke: en kladde forbliver en kladde, og et sendt tilbud bliver ikke
   til en kladde, fordi der er sendt en prisoversigt bagefter.
   Prisoversigten gemmes ikke selv; den bygges forfra ved hvert tryk.
   ============================================================ */

const PO_KRAV = ['c_company', 'c_email'];

/* Uden licens: samme opsætning, men licenserne regnes ikke med. */
function poData(d,medLic){
  return medLic ? d : Object.assign({}, d, {licenses:[], licDaily:0});
}

function prisoversigtHtml(medLic){
  const days=licenseDays();
  const lok=lokationerMedIndhold().map(x=>({loc:x.loc, ml:x.ml.map(m=>({o:m.o, d:poData(m.d,medLic)}))}));
  const sml=lok.some(x=>x.ml.length>1);
  const multi=lok.length>1;
  const harEget=lok.some(x=>x.ml.some(m=>m.d.harEget));
  const harLic=lok.some(x=>x.ml.some(m=>m.d.licDaily));

  const kunde=guideKunde();
  let b='<div class="qp-hej kg-titel">'+t('Prisoversigt')+'</div>';
  if(kunde.length) b+='<div class="kg-kunde">'+kunde.map(esc).join(' · ')+'</div>';

  if(sml && multi){
    b+=lokationsOverblik(lok,days,medLic);
    b+=prisNoter(harLic, null, harEget, days);
    lok.forEach((x,i)=>{
      b+=lokTitel(x.loc,i+1);
      if(x.ml.length>1){
        b+=sammenligning(x.ml,days);
        x.ml.forEach((m,j)=>{ b+=mulighedsSpec(m,bogstav(j),days); });
      } else {
        b+=specBlock('<span class="lh-name">'+t('Specifikation')+'</span>', x.ml[0].d, days, true);
      }
    });
  } else if(sml){
    b+=sammenligning(lok[0].ml,days);
    b+=prisNoter(harLic, null, harEget, days);
    lok[0].ml.forEach((m,i)=>{ b+=mulighedsSpec(m,bogstav(i),days); });
  } else {
    const live=lok.map(x=>({loc:x.loc, d:x.ml[0].d}));
    const sum=sumOf(live);
    b+=overviewTable(live,days,sum,medLic);
    b+=prisNoter(!!sum.licDaily, sum.licDaily, harEget, days);
    if(multi){
      live.forEach((x,i)=>{
        b+=specBlock('<span class="lh-n">'+(i+1)+'</span><span class="lh-name">'+esc(locNavn(x.loc))+'</span>', x.d, days);
      });
    } else {
      b+=specBlock('<span class="lh-name">'+t('Specifikation')+'</span>', live[0].d, days, true);
    }
  }
  return b;
}

/* ---------- sidehoved ----------
   Sidefoden er tilbuddets (footHtml): priserne er ekskl. moms, og garantien
   gælder også her. */
function poBand(first){
  let meta='<div class="qp-tt">'+t('PRISOVERSIGT')+'</div>'+t('Nr.')+' '+(esc(v('c_number'))||'–');
  if(first) meta+='<br>'+t('Dato:')+' '+(dokDato(v('c_date'))||'–');
  return '<div class="qp-band'+(first?'':' slim')+'"><div class="qp-logo">tillty</div>'
    +'<div class="qp-meta">'+meta+'</div></div>';
}
function poFilnavn(){
  const who=(v('c_company')||v('c_contact')||'kunde')
    .replace(/[^\p{L}\p{N}_ ]+/gu,'').trim().replace(/\s+/g,'-');
  return t('Prisoversigt')+'-'+(v('c_number')||idag())+'-'+who;
}

/* ---------- eksport ---------- */
function prisoversigtSider(medLic){
  return buildPrintPages({html:prisoversigtHtml(medLic), band:poBand, foot:footHtml});
}
async function udskrivPrisoversigt(medLic){
  // Gem først, så kunden står i kartoteket — og nummeret står i oversigten.
  if(window.HAR_API && typeof gemTilbud==='function'){
    try{ await gemTilbud(aktivStatus); }
    catch(e){
      if(!confirm('Tilbuddet kunne ikke gemmes i kartoteket.\n\nLav prisoversigten alligevel?')) return;
    }
  }
  const html=prisoversigtHtml(medLic);
  await udskrivSider(buildPrintPages({html, band:poBand, foot:footHtml}), poFilnavn(),
    '<div class="quote-page">'+poBand(true)+'<div class="qp-content">'+html+'</div></div>');
}

/* Knappen i sidehovedet. Har tilbuddet licenser, spørger dialogen, om de skal
   med. Uden licenser er der intet at vælge, og oversigten laves med det samme. */
function exportPrisoversigt(){
  const lok=lokationerMedIndhold();
  if(!lok.length){ alert('Sæt antal på mindst ét produkt, før du laver prisoversigten.'); return; }
  if(!kravOpfyldt(PO_KRAV)) return;
  if(!lok.some(x=>x.ml.some(m=>m.d.licDaily))){ udskrivPrisoversigt(false); return; }
  visPrisValg();
}

/* Dialogen er byggerens side og er altid dansk. Den fjernes, før der printes
   (se visGuideValg i js/guide.js). */
function visPrisValg(){
  const gammel=document.getElementById('pris_valg'); if(gammel) gammel.remove();
  const dlg=document.createElement('dialog');
  dlg.id='pris_valg'; dlg.className='guide-valg';
  dlg.innerHTML='<form method="dialog"><h3>Prisoversigt</h3>'
    +'<p>Priserne uden brev. Alle lokationer og muligheder kommer med.</p>'
    +'<label class="pay-toggle"><input type="checkbox" name="lic" checked><span>Licens med i oversigten</span></label>'
    +'<div class="gv-knapper"><button type="button" class="minibtn" data-luk>Annullér</button>'
    +'<button type="submit" class="btn-pdf">⬇ Lav prisoversigt</button></div></form>';
  document.body.appendChild(dlg);
  dlg.querySelector('[data-luk]').onclick=()=>dlg.remove();
  dlg.addEventListener('cancel',()=>dlg.remove());
  dlg.querySelector('form').onsubmit=e=>{
    e.preventDefault();
    const medLic=dlg.querySelector('input[name="lic"]').checked;
    dlg.remove();
    udskrivPrisoversigt(medLic);
  };
  dlg.showModal();
}
