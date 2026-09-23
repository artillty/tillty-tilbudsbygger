/* ============================================================
   tillty Tilbudsbygger — tillty PAY (IC++)

   Et PAY-tilbud er sin egen tilbudstype (FORM.type==='pay') og har intet med
   udstyrstilbuddet at gøre: ingen hardware, licenser, muligheder eller
   lokationer. Sælgeren skruer på de gule felter fra tilltys prisudregner
   (regnearket "tillty - Prisudregner", fanen PAY): margin, omsætning, gns.
   transaktionsbeløb, kortfordeling og surcharge. Satserne bag — interchange,
   scheme fee, fast scheme-gebyr og EUR-kurs — står i js/data.js og kan ikke
   ændres her, men kunden ser dem i tilbuddet: det er pointen med IC++.

   Formlerne er regnearkets, én til én:
     effektiv rate         = interchange + scheme fee + margin
     omk. pr. transaktion  = gns. beløb × effektiv rate + fast gebyr (EUR) × kurs
     omk. pr. måned        = transaktioner pr. md. × andel × omk. pr. transaktion
     surcharge-effekt      = min(andel × omsætning × sats, korttypens omk. pr. md.)
   Procenter ligger i state som brøker (0,006 = 0,60 %), som i regnearket;
   felterne viser og tager imod procent. Et tomt felt er null, ikke 0 — en
   manglende omsætning må ikke blive til et tilbud på 0 kr.
   tillty har ingen fast fee pr. transaktion og får det ikke; derfor intet felt.
   ============================================================ */

/* ---------- state ---------- */
function payStandard(){
  const andele={}, surcharge={};
  PAY_KORT.forEach(k=>{ andele[k.id]=k.andel; if(k.surcharge!==null) surcharge[k.id]=k.surcharge; });
  // Surcharge er slået fra, til sælgeren slår den til. Satserne står klar imens.
  return {margin:PAY_MARGIN, omsaetning:null, gnsBeloeb:null, andele, surcharge, surchargeTil:false};
}
/* Et gemt tilbud flettes med standarden, så et felt der er kommet til siden,
   ikke mangler. Kun kendte korttyper tages med, og kun tal. */
function payLaes(gemt){
  const s=payStandard(), g=gemt||{};
  const tal=x=>typeof x==='number' && isFinite(x) ? x : null;
  ['margin','omsaetning','gnsBeloeb'].forEach(k=>{ if(k in g) s[k]=tal(g[k]); });
  Object.keys(s.andele).forEach(id=>{ if(g.andele && id in g.andele) s.andele[id]=tal(g.andele[id]); });
  Object.keys(s.surcharge).forEach(id=>{ if(g.surcharge && id in g.surcharge) s.surcharge[id]=tal(g.surcharge[id]); });
  s.surchargeTil = g.surchargeTil===true;
  return s;
}
let PAY = payStandard();

/* ---------- regnemotoren ---------- */
function payBeregn(p){
  const oms=p.omsaetning, gns=p.gnsBeloeb, margin=p.margin;
  const tx = oms && gns ? oms/gns : 0;
  const kort = PAY_KORT.map(k=>{
    const andel=p.andele[k.id]||0;
    const rate=k.interchange+k.scheme+(margin||0);
    const fastKr=k.fastEur*PAY_KURS_EUR;
    const perTx=(gns||0)*rate+fastKr;
    const perMd=tx*andel*perTx;
    // Surcharge regnes kun, når den er slået til og må lægges på korttypen.
    let sur=null;
    if(k.surcharge!==null && p.surchargeTil){
      const sats=p.surcharge[k.id]||0;
      const grundlag=andel*(oms||0);
      const tillaeg=grundlag*sats;
      // Surcharge kan højst udligne korttypens egen omkostning — aldrig blive en indtægt.
      sur={sats, grundlag, tillaeg, netto:Math.min(tillaeg,perMd)};
    }
    return {id:k.id, name:k.name, desc:k.desc, andel, interchange:k.interchange, scheme:k.scheme,
            margin:margin||0, rate, fastKr, perTx, perMd, tx:tx*andel, sur};
  });
  const foer=kort.reduce((s,k)=>s+k.perMd,0);
  const surcharge=kort.reduce((s,k)=>s+(k.sur?k.sur.netto:0),0);
  const netto=foer-surcharge;
  const andelSum=kort.reduce((s,k)=>s+k.andel,0);
  const harSurcharge=kort.some(k=>k.sur && k.sur.sats>0);
  // Det der mangler, før tilbuddet kan sendes. Navnene bruges i eksportstoppet.
  const mangler=[];
  if(!oms) mangler.push('Månedlig kortomsætning');
  if(!gns) mangler.push('Gns. transaktionsbeløb');
  if(margin===null) mangler.push('Margin (IC++ %)');
  if(Math.abs(andelSum-1)>0.0005) mangler.push('Kortfordeling (summen skal være 100 %)');
  // Store beløb vises i hele kroner (det er et estimat). Linjerne fordeles, så
  // de summer til den afrundede total, og netto er før minus surcharge i kroner.
  const perMdKr=fordelKr(kort.map(k=>k.perMd));
  const medSur=kort.filter(k=>k.sur);
  const surKr=fordelKr(medSur.map(k=>k.sur.netto));
  kort.forEach((k,i)=>{ k.perMdKr=perMdKr[i]; });
  medSur.forEach((k,i)=>{ k.sur.nettoKr=surKr[i]; k.sur.grundlagKr=Math.round(k.sur.grundlag); k.sur.tillaegKr=Math.round(k.sur.tillaeg); });
  const foerKr=Math.round(foer), surchargeKr=Math.round(surcharge);
  return {tx, kort, foer, surcharge, netto, foerKr, surchargeKr, nettoKr: foerKr-surchargeKr,
          effektivRate: oms?netto/oms:0, gnsPerTx: tx?netto/tx:0, andelSum, harSurcharge, mangler};
}
/* Afrunder til hele kroner, så summen af linjerne er den afrundede sum
   (største rest får kronen). Ellers kan en kolonne give 1 kr. mere end totalen. */
function fordelKr(vals){
  const hele=vals.map(Math.floor);
  let rest=Math.round(vals.reduce((a,b)=>a+b,0))-hele.reduce((a,b)=>a+b,0);
  vals.map((x,i)=>[x-Math.floor(x),i]).sort((a,b)=>b[0]-a[0]).forEach(([,i])=>{ if(rest>0){ hele[i]++; rest--; } });
  return hele;
}

/* ---------- tal ind og ud af felterne ----------
   Felterne tager imod dansk skrivemåde: "833.333", "0,6", "2,5 %". */
function payBeloeb(s){
  const n=parseFloat(String(s==null?'':s).replace(/\s|kr|\./g,'').replace(',','.'));
  return isNaN(n)||n<0 ? null : n;
}
/* 0,6 -> 0,006. Afrundet til fire decimaler af procenten, så 0,6 ikke ender som 0,0060000000000001. */
function payPct(s){
  const n=parseFloat(String(s==null?'':s).replace(/\s|%/g,'').replace(',','.'));
  return isNaN(n)||n<0 ? null : Math.round(n*10000)/1e6;
}
const pctTal    = x => x===null||x===undefined ? '' : String(+(x*100).toFixed(4)).replace('.',',');
const beloebTal = x => x===null||x===undefined ? '' : x.toLocaleString('da-DK',{maximumFractionDigits:2});
/* I tilbuddet skrives tal dansk på alle sprog, som beløbene: "0,60 %". */
function pct(x,dec){ dec=dec===undefined?2:dec; return (x*100).toLocaleString('da-DK',{minimumFractionDigits:dec,maximumFractionDigits:dec})+' %'; }
/* Andele og surcharge-satser: "60 %", "12,5 %", "2,5 %". */
const pctFri = x => (x*100).toLocaleString('da-DK',{maximumFractionDigits:1})+' %';
const heltal = x => Math.round(x).toLocaleString('da-DK');

/* ---------- felterne skriver i state ----------
   Et felt der er markeret som manglende, slipper markeringen, når der skrives i det. */
function setPayBeloeb(felt,el){ PAY[felt]=payBeloeb(el.value); el.classList.remove('mangler'); payVis(); updateSoon(); }
function setPayMargin(el){ PAY.margin=payPct(el.value); el.classList.remove('mangler'); payVis(); updateSoon(); }
function setPayAndel(id,el){ PAY.andele[id]=payPct(el.value); payVis(); updateSoon(); }
function setPaySurcharge(id,el){ PAY.surcharge[id]=payPct(el.value); payVis(); updateSoon(); }
/* Kontakten er et klik, så tilbuddet opdateres med det samme. */
function setPaySurchargeTil(on){ PAY.surchargeTil=!!on; payVis(); update(); }

/* ---------- panelet ----------
   renderPay() tegner felterne ud fra state. payVis() holder de udregnede tal
   ved lige uden at røre felterne — ellers flytter markøren, mens sælgeren taster. */
function renderPay(){
  const wrap=document.getElementById('pay_andele'); if(!wrap) return;
  const felt=(id,val,oninput,aria)=>`<label class="pay-felt"><input id="${id}" inputmode="decimal" value="${val}" oninput="${oninput}" aria-label="${aria}"><span>%</span></label>`;
  wrap.innerHTML=PAY_KORT.map(k=>`<div class="pay-row">
      <div class="pay-info"><div class="prod-name">${esc(k.name)}</div><div class="prod-desc">${esc(k.desc)}</div></div>
      ${felt('pay_andel_'+k.id, pctTal(PAY.andele[k.id]), "setPayAndel('"+k.id+"',this)", 'Andel, '+esc(k.name))}
    </div>`).join('');
  document.getElementById('pay_surcharge').innerHTML=PAY_KORT.filter(k=>k.surcharge!==null).map(k=>`<div class="pay-row">
      <div class="pay-info"><div class="prod-name">${esc(k.name)}</div><div class="prod-desc">Tillæg kunden opkræver af betaleren.</div></div>
      ${felt('pay_surcharge_'+k.id, pctTal(PAY.surcharge[k.id]), "setPaySurcharge('"+k.id+"',this)", 'Surcharge, '+esc(k.name))}
    </div>`).join('');
  const til=document.getElementById('pay_surcharge_til'); if(til) til.checked=!!PAY.surchargeTil;
  const saet=(id,val)=>{ const e=document.getElementById(id); if(e){ e.value=val; e.classList.remove('mangler'); } };
  saet('pay_omsaetning', beloebTal(PAY.omsaetning));
  saet('pay_gns', beloebTal(PAY.gnsBeloeb));
  saet('pay_margin', pctTal(PAY.margin));
  payVis();
}
function payVis(){
  const r=payBeregn(PAY);
  // Satserne står kun fremme, når surcharge er slået til.
  const rows=document.getElementById('pay_surcharge'); if(rows) rows.hidden=!PAY.surchargeTil;
  const tx=document.getElementById('pay_tx'); if(tx) tx.value = r.tx ? heltal(r.tx) : '';
  const sum=document.getElementById('pay_andel_sum');
  if(sum){
    const ok=Math.abs(r.andelSum-1)<=0.0005;
    sum.textContent = ok ? pct(r.andelSum,0) : '⚠ '+pctFri(r.andelSum)+', skal være 100 %';
    sum.classList.toggle('fejl',!ok);
  }
  const res=document.getElementById('pay_resultat');
  if(res){
    res.innerHTML = r.mangler.length
      ? '<div class="pay-tom">Udfyld '+esc(r.mangler.join(', ').toLowerCase())+' for at se resultatet.</div>'
      : `<div><span>Omkostning før surcharge</span><span>${fmt(r.foerKr)} / md.</span></div>`
        +(r.harSurcharge?`<div><span>Surcharge, opkræves af betaleren</span><span>−${fmt(r.surchargeKr)} / md.</span></div>`:'')
        +`<div class="ls-strong"><span>Netto betalingsomkostning</span><span>${fmt(r.nettoKr)} / md.</span></div>`
        +`<div><span>Effektiv rate af omsætningen</span><span>${pct(r.effektivRate)}</span></div>`;
  }
  const sub=document.getElementById('pay_sub');
  if(sub) sub.textContent = 'IC++ '+pct(PAY.margin||0)+(r.mangler.length ? '' : ' · '+fmt(r.nettoKr)+' / md.');
}
/* Eksportstoppet (print.js) markerer de tomme felter med rødt, som kundefelterne. */
function payMarkerMangler(){
  const r=payBeregn(PAY);
  const mrk=(id,tom)=>{ const e=document.getElementById(id); if(e) e.classList.toggle('mangler',tom); };
  mrk('pay_omsaetning', !PAY.omsaetning);
  mrk('pay_gns', !PAY.gnsBeloeb);
  mrk('pay_margin', PAY.margin===null);
  const foerste=['pay_omsaetning','pay_gns','pay_margin'].map(id=>document.getElementById(id)).find(e=>e && e.classList.contains('mangler'));
  if(foerste) foerste.focus();
  return r.mangler;
}

/* ---------- tilbudsdokumentet ----------
   Samme ramme som udstyrstilbuddet: parter, Hej, indledning … afslutning og
   hilsen. Imellem står regnearkets afsnit som nummererede blokke med blå
   bjælke: pris og de tre dele af IC++, kundens tal, kortfordeling, surcharge
   (kun når den er slået til) og resultatet. Kunden ser interchange og scheme fee hver for sig:
   det er hele pointen med IC++. */
function payTilbud(){
  const r=payBeregn(PAY);
  const klar=!r.mangler.length;
  const beloeb=x=>klar?fmt(x):'–';
  const tal=x=>klar?heltal(x):'–';
  const raekke=(...celler)=>'<tr>'+celler.map((c,i)=>'<td'+(i?' class="num"':'')+'>'+c+'</td>').join('')+'</tr>';

  let b=parterOgHej();
  const intro=v('c_intro');
  b+='<div class="qp-intro">'+(intro?esc(intro):t('Tak for en god dialog. Herunder finder I vores tilbud på tillty PAY: én gennemsigtig pris pr. korttype, regnet ud fra jeres egne tal.'))+'</div>';
  // Sælgerens side: siger hvad der mangler, i stedet for at vise et tilbud på 0 kr.
  if(!klar) b+='<div class="qp-missing pay-mangler">Udfyld i panelet tillty PAY: '+esc(r.mangler.join(', '))+'</div>';

  // Først prisen og forklaringen, fritstående uden nummer. Hver sektion er ét
  // element, så pagineringen flytter overskrift og indhold samlet.
  b+='<div class="pay-pris"><div class="pay-pris-lbl">'+t('Jeres pris')+'</div>'
    +'<div class="pay-pris-tal">IC++ '+pct(PAY.margin||0)+'</div>'
    // Regnearkets "Dit resultat" i kort form; hele udregningen står i sidste blok.
    +'<div class="pay-noegletal">'
    +'<div class="pay-nt pay-nt-hoved"><div class="pay-nt-lbl">'+t('Netto betalingsomkostning pr. måned')+'</div><div class="pay-nt-tal">'+beloeb(r.nettoKr)+'</div></div>'
    +'<div class="pay-nt"><div class="pay-nt-lbl">'+t('Effektiv rate (% af omsætning)')+'</div><div class="pay-nt-tal">'+(klar?pct(r.effektivRate):'–')+'</div></div>'
    +'<div class="pay-nt"><div class="pay-nt-lbl">'+t('Gns. omkostning pr. transaktion')+'</div><div class="pay-nt-tal">'+beloeb(r.gnsPerTx)+'</div></div>'
    +'</div>'
    +(r.harSurcharge&&klar ? '<div class="pay-nt-note">'+t('{foer} før surcharge, {sur} i surcharge opkrævet af betaleren.',{foer:fmt(r.foerKr), sur:'−'+fmt(r.surchargeKr)})+'</div>' : '')
    +'<div class="pay-nt-note">'+t('Alle beløb er i danske kroner (DKK).')+'</div>'
    +'</div>';

  const kortSats=(id,felt)=>{ const k=PAY_KORT.find(x=>x.id===id); return pct(k[felt],felt==='interchange'?1:2); };
  const del=(navn,hvem,tekst,punkter)=>'<div class="pay-del"><div class="pay-del-navn">'+navn+'</div><div class="pay-del-hvem">'+hvem+'</div>'
    +'<div class="pay-del-tekst">'+tekst+'</div><ul class="pay-del-pkt">'+punkter.map(x=>'<li>'+x+'</li>').join('')+'</ul></div>';
  b+='<div class="pay-sek"><div class="pay-sek-titel">'+t('Hvad er IC++?')+'</div>'
    +'<div class="pay-ic-intro">'+t('IC++ (Interchange++) er den mest gennemsigtige prismodel for kortbetalinger. I stedet for ét samlet gebyr (fx 0,99 % "blended") er prisen delt i tre dele, så I kan se præcist, hvor pengene går hen. Det giver jer bedre kontrol over omkostningerne og en fair pris ud fra jeres faktiske kortmix.')+'</div>'
    +'<div class="pay-dele">'
    +del(t('Interchange'),t('Kortudstedende bank'),t('Gebyr som kortholders bank beholder for at udstede kortet og håndtere risikoen.'),
      [t('EU debit: {sats} (loft)',{sats:kortSats('debit','interchange')}), t('EU credit: {sats} (loft)',{sats:kortSats('credit','interchange')}), t('Firmakort og kort uden for EØS: typisk 1,2–1,8 %')])
    +'<div class="pay-plus">+</div>'
    +del(t('Scheme fee'),t('Visa og Mastercard'),t('Gebyr til kortnetværket for brug af infrastrukturen: clearing, afregning og autorisation.'),
      [t('EU-kort ved disken: typisk {sats}',{sats:kortSats('debit','scheme')}), t('Plus små faste gebyrer pr. transaktion')])
    +'<div class="pay-plus">+</div>'
    +del(t('Acquirer markup'),t('Worldline (inkl. tillty)'),t('Margin som dækker indløsning, gateway, support og tilltys tjeneste.'),
      [t('Fast procent pr. transaktion: {sats}',{sats:pct(PAY.margin||0)}), t('Samme sats på alle korttyper')])
    +'</div>'
    +'<div class="pay-lig">=</div>'
    +'<div class="pay-summen">'+t('Summen er den samlede transaktionspris, I betaler. Fuldt gennemsigtigt.')+'</div></div>';

  // Ikonerne er inline-SVG: ingen eksterne filer i dokumentet.
  const ikon=d=>'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+d+'</svg>';
  const IKON_OEJE=ikon('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>');
  const IKON_VAEGT=ikon('<path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0L5 7zM19 7l-3 7a3 3 0 0 0 6 0l-3-7z"/>');
  const IKON_GRAF=ikon('<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>');
  const hvorfor=(ik,navn,tekst)=>'<div class="pay-hvorfor-k"><div class="pay-ikon">'+ik+'</div><div class="pay-hvorfor-n">'+navn+'</div><div class="pay-hvorfor-t">'+tekst+'</div></div>';
  b+='<div class="pay-sek"><div class="pay-sek-titel">'+t('Hvorfor IC++?')+'</div><div class="pay-hvorfor">'
    +hvorfor(IKON_OEJE,t('Gennemsigtighed'),t('I ser præcist, hvad hvert gebyr dækker. Ingen skjulte marginer.'))
    +hvorfor(IKON_VAEGT,t('Fair pris'),t('I betaler kun den faktiske omkostning plus markup. Billige kort som EU debit koster mindre end dyre kort som firmakort og udenlandske kort.'))
    +hvorfor(IKON_GRAF,t('Kontrol'),t('Når I kender jeres kortmix, kan I forudsige jeres betalingsomkostninger præcist og planlægge derefter.'))
    +'</div></div>';

  // Herfra selve tilbuddet: nummererede blokke med blå bjælke, som regnearkets fane.
  let nr=0;
  const afsnit=(titel,indhold)=>blok('<span class="lh-n">'+(++nr)+'</span><span class="lh-name">'+titel+'</span>',indhold,'pay-blok');

  // Kundens egne tal.
  b+=afsnit(t('Jeres tal'),
    '<table class="pv pay-tal"><thead><tr><th>'+t('Omsætning')+'</th><th class="num"></th></tr></thead><tbody>'
    +raekke(t('Månedlig kortomsætning'), PAY.omsaetning?fmt(Math.round(PAY.omsaetning)):'–')
    +raekke(t('Gns. transaktionsbeløb'), PAY.gnsBeloeb?fmt(PAY.gnsBeloeb):'–')
    +raekke(t('Transaktioner pr. måned'), r.tx?heltal(r.tx):'–')
    +'</tbody></table>');

  // Regnearkets kortfordeling, kolonne for kolonne.
  let kf='<table class="pv pay-omk"><thead><tr><th>'+t('Korttype')+'</th><th class="num">'+t('Andel')+'</th><th class="num">'+t('Effektiv rate')+'</th><th class="num">'+t('Pr. transaktion')+'</th><th class="num">'+t('Pr. md.')+'</th></tr></thead><tbody>';
  r.kort.forEach(k=>{ kf+=raekke(esc(t(k.name)), pctFri(k.andel), pct(k.rate), beloeb(k.perTx), beloeb(k.perMdKr)); });
  kf+='</tbody><tfoot>'+raekke(t('I alt'), pctFri(r.andelSum), '', klar&&r.tx?fmt(r.foer/r.tx):'–', beloeb(r.foerKr))+'</tfoot></table>';
  b+=afsnit(t('Kortfordeling'),kf);

  // Surcharge, kun når en sats er slået til.
  if(r.harSurcharge){
    let s='<table class="pv pay-sur"><thead><tr><th>'+t('Korttype')+'</th><th class="num">'+t('Sats')+'</th><th class="num">'+t('Grundlag pr. md.')+'</th><th class="num">'+t('Tillæg pr. md.')+'</th><th class="num">'+t('Netto-effekt pr. md.')+'</th></tr></thead><tbody>';
    r.kort.filter(k=>k.sur && k.sur.sats>0).forEach(k=>{
      s+=raekke(esc(t(k.name)), pctFri(k.sur.sats), beloeb(k.sur.grundlagKr), beloeb(k.sur.tillaegKr), beloeb(k.sur.nettoKr));
    });
    s+='</tbody><tfoot><tr><td colspan="4">'+t('Samlet surcharge-effekt')+'</td><td class="num">'+beloeb(r.surchargeKr)+'</td></tr></tfoot></table>';
    s+='<div class="qp-assump">'+t('Surcharge er et tillæg, I selv opkræver af betaleren på firmakort og internationale kort. Det må ikke lægges på EU-forbrugerkort, og netto-effekten kan højst udligne korttypens egen omkostning.')+'</div>';
    b+=afsnit(t('Surcharge'),s);
  }

  // Sidst resultatet, regnearkets "Dit resultat".
  // Samme tabel som før, med alle regnearkets rækker: netto som totallinje,
  // effektiv rate og gns. pr. transaktion under den.
  let res='<table class="pv loc-overview pay-res"><thead><tr><th>'+t('Betalingsomkostning')+'</th><th class="num"></th></tr></thead><tbody>'
    +raekke(t('Omkostning før surcharge'), beloeb(r.foerKr))
    +(r.harSurcharge ? raekke(t('Surcharge, opkræves af betaleren'), klar?'−'+fmt(r.surchargeKr):'–') : '')
    +'</tbody><tfoot>'+raekke(t('Netto betalingsomkostning pr. måned'), beloeb(r.nettoKr))
    +raekke(t('Effektiv rate (% af omsætning)'), klar?pct(r.effektivRate):'–')
    +raekke(t('Gns. omkostning pr. transaktion'), beloeb(r.gnsPerTx))
    +'</tfoot></table>';
  res+='<div class="qp-assump">'+t('Beregningen bygger på den omsætning, det transaktionsbeløb og den kortfordeling, I har oplyst. Den faktiske omkostning følger jeres faktiske kortmix og afregnes pr. transaktion. Interchange og scheme fee er kortnetværkenes vejledende satser for Danmark ({kilde}) og kan ændre sig.',{kilde:esc(PAY_KILDE)})+'</div>';
  b+=afsnit(t('Jeres resultat'),res);

  const note=v('c_note');
  if(note) b+='<div class="qp-note">'+esc(note)+'</div>';
  b+=hilsen();
  return dokumentRamme(b);
}
