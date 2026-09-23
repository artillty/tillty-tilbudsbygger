/* ============================================================
   tillty Tilbudsbygger — PRISER OG KATALOG

   >>> DET ER DENNE FIL DU RETTER, NÅR PRISER ÆNDRER SIG. <<<
   Ingen priser må stå andre steder i koden.
   ============================================================ */

/* ---------- katalog ---------- */
const CATALOG = [
  {id:'sot', name:'Selvbetjeningsterminal', desc:'Til hurtig og effektiv ordreafgivelse (inkl. vægbeslag).', price:13995,
   acc:['floor','term_holder']},
  {id:'pos154', name:'15.4" POS Kasseskærm', desc:'Stationær skærm til kassesystemet.', price:4995,
   acc:['drawer']},
  {id:'tab87', name:'8.7" POS Tablet', desc:'Både stationær og mobil skærm til kassesystemet.', price:2495,
   acc:['tsfixed','tsstand','desktop','multi','mount','hand','drawer']},
  {id:'tab11', name:'11" POS Tablet', desc:'Både stationær og mobil skærm til kassesystemet.', price:2995,
   acc:['tsfixed','tsstand','desktop','multi','mount','hand','drawer']},
  {id:'tab14', name:'14" POS Tablet', desc:'Både stationær og mobil skærm til kassesystemet.', price:4495,
   acc:['tsfixed','tsstand','desktop','multi','mount','hand','drawer']},
  {id:'kds185', name:'18.5" KDS – Køkkenskærm', desc:'Digital skærm til ordrevisning i køkkenet.', price:5995,
   acc:['vesa']},
  {id:'kds22', name:'22" KDS – Køkkenskærm', desc:'Digital skærm til ordrevisning i køkkenet.', price:6995,
   acc:['vesa']},
  {id:'termstat', name:'Stationær Betalingsterminal', desc:'Fast betalingsterminal – anbefales på SOT og kasse.', price:1995,
   acc:[]},
  {id:'termmobil', name:'Mobil Betalingsterminal', desc:'Håndholdt betalingsterminal for mobilbetaling.', price:2495,
   acc:['cradle']},
  {id:'lan', name:'LAN Printer', desc:'Bon- og kvitteringsprinter (kasse og køkken).', price:1495, acc:[]},
  {id:'wifi', name:'WiFi Printer', desc:'Bon- og kvitteringsprinter (kasse og køkken).', price:1795, acc:[]},
];

/* Samme produkt i flere størrelser står som ét kort i byggeren med en
   størrelsesvælger. Det er kun visning: hver størrelse er stadig sit eget
   produkt ovenfor med egen pris, varenøgle og licens, så beregning, tilbud,
   sammenligning og gemte tilbud er uændrede — og en kunde kan godt få flere
   størrelser i samme tilbud. Nøglen er produkt-id, værdien teksten på knappen.
   Kun rigtige størrelser: LAN- og WiFi-printeren er to forskellige printere og
   har hver sit kort.
   Kortet tager navnet herfra og beskrivelsen fra den første størrelse. */
const STOERRELSER = [
  {id:'tablet', navn:'POS Tablet', varianter:{tab87:'8.7"', tab11:'11"', tab14:'14"'}},
  {id:'kds',    navn:'KDS – Køkkenskærm', varianter:{kds185:'18.5"', kds22:'22"'}},
];

const ACCESSORIES = {
  floor:      {name:'Floor stand',                 desc:'Gulvstander, der giver et professionelt look.', price:2495},
  term_holder:{name:'Holder til betalingsterminal (Beslag)', desc:'Beslag til montering af betalingsterminal på SOT.', price:495},
  mount:      {name:'Mount Adapter',               desc:'Beslag til fastgørelse af skærmen på andre baser og mounts.', price:495},
  desktop:    {name:'Desktop Base',                desc:'Enkel holder til fast placering på disken.', price:995},
  multi:      {name:'Multi-Function Base',         desc:'Multi-funktionel holder til fast placering på disken.', price:1195},
  vesa:       {name:'Vesa Arm',                    desc:'Fleksibel skærmarm til bordmontering.', price:995},
  tsfixed:    {name:'Table-Side Fixed Stand',      desc:'Stativ, der spændes fast på kanten af bordet eller disken.', price:795},
  tsstand:    {name:'Table-Side Stand',            desc:'Holder i lav højde.', price:695},
  hand:       {name:'Hand Strap',                  desc:'Sikkert greb, når skærmen bruges håndholdt.', price:195},
  drawer:     {name:'Pengeskuffe',                 desc:'Pengeskuffe til kontanter.', price:995},
  cradle:     {name:'Cradle til Mobil Betalingsterminal', desc:'Ladestander til den håndholdte terminal.', price:495},
};
const ACC_IDS = Object.keys(ACCESSORIES)
  .sort((a,b)=>ACCESSORIES[a].name.localeCompare(ACCESSORIES[b].name,'da'));

/* Licenstyper – dagspris pr. aktiv terminal/skærm. Beregnes automatisk. */
const LICENSE_TYPES = {
  pos:{name:'POS & SOT licens', daily:15},
  kds:{name:'KDS licens',       daily:7.5},
  ds: {name:'DS licens',        daily:7.5},
};

/* Faste afsenderoplysninger (tillty). */
const SENDER = {
  company:'tillty',
  cvr:'DK32826563',
  addr:'Åboulevarden 69, 8000 Aarhus C',
  email:'sales@tillty.com',
  phone:'+45 81 10 01 30',
};

/* Hvilken licens hvert hardware-produkt kræver (dem uden bruger ingen licens).
   BEMÆRK: Stationær betalingsterminal (termstat) er bevidst udeladt — den tager
   kun imod betalinger og har intet særligt datatræk, så der er ingen licens på den.
   Den mobile terminal (termmobil) har POS ombord og udløser derfor licens. */
const PRODUCT_LICENSE = {
  sot:'pos', pos154:'pos', tab87:'pos', tab11:'pos', tab14:'pos',
  termmobil:'pos',
  kds185:'kds', kds22:'kds',
};

/* Moduler – vælges manuelt, faktureres pr. måned. */
const MODULES = [
  {id:'takeaway',name:'Takeaway',      desc:'Online takeaway-modul. Pr. forretning / md.', price:495, includes:['qr'], online:true},
  {id:'qr',      name:'QR bestilling', desc:'Bestilling via QR-koder. Inkluderet i Takeaway.', price:495, online:true},
  {id:'bi',      name:'BI',            desc:'Business Intelligence. Pr. md.', price:299},
];
/* Opslag: modul-id -> id på det modul der inkluderer det (undgår dobbeltfakturering). */
const INCLUDED_BY = {};
MODULES.forEach(m=>(m.includes||[]).forEach(inc=>{INCLUDED_BY[inc]=m.id;}));

/* ---------- sammenligning af muligheder ----------
   Forsiden i et tilbud med flere muligheder stiller dem op side om side.
   Produkter der løser samme opgave, deler række — fx er alle fire kasseskærme
   "Bemandede kassepladser". Teksten ved hvert produkt er varianten, der skiller
   dem ad, og den vises kun når mulighederne bruger forskellige.

   ALLE produkter i CATALOG skal stå her — ellers er de usynlige på forsiden
   (testen fanger det). Tilbehør er valgfrit: kun det der gør en forskel for
   kunden, har en række. Montering som gulvstander og VESA-arm står kun i
   specifikationen. Software og licens bygges automatisk af MODULES og
   LICENSE_TYPES. Rækker uden indhold i nogen mulighed udelades. */
const SAMMENLIGNING = [
  {kategori:'Kasse og bestilling', raekker:[
    {navn:'Selvbetjeningsterminal',            produkter:{sot:''}},
    {navn:'Bemandede kassepladser',            produkter:{pos154:'15.4"', tab87:'8.7"', tab11:'11"', tab14:'14"'}},
    {navn:'Holder eller base til kassetablet', tilbehoer:['desktop','multi','tsfixed','tsstand']},
    {navn:'Pengeskuffe',                       tilbehoer:['drawer']},
  ]},
  {kategori:'Køkken', raekker:[
    {navn:'Køkkenskærm (KDS)',                 produkter:{kds185:'18.5"', kds22:'22"'}},
    {navn:'Bonprinter',                        produkter:{lan:'LAN', wifi:'WiFi'}},
  ]},
  {kategori:'Betaling', raekker:[
    {navn:'Stationær betalingsterminal',       produkter:{termstat:''}},
    {navn:'Mobil betalingsterminal',           produkter:{termmobil:''}},
  ]},
];

/* ---------- officielle produktfotos ----------
   tilltys egne billeder, som følger med værktøjet. De vises i byggeren i
   stedet for de grå pladsholdere OG kommer med i kundens PDF — modsat
   pladsholderne, som aldrig må ud af huset.

   Sælgeren kan stadig uploade sit eget billede oveni; en upload vinder altid
   over det officielle foto. Flere produkter deler samme foto med vilje —
   tabletterne ligner hinanden, og de to KDS-størrelser gør også. */
const PRODUKTFOTO = {
  sot:'sot', pos154:'pos154',
  tab87:'tablet', tab11:'tablet', tab14:'tablet',
  kds185:'kds', kds22:'kds',
  termstat:'termstat', termmobil:'termmobil',
  lan:'printer', wifi:'wifi',
};
/* Alt tilbehør har nu et foto. Mangler et nyt tilbehør sit billede, viser
   byggeren en grå pladsholder, som aldrig kommer med i kundens PDF. */
const TILBEHOERFOTO = {
  floor:'floor', term_holder:'term_holder', mount:'mount', desktop:'desktop',
  multi:'multi', vesa:'vesa', tsfixed:'tsfixed', tsstand:'tsstand',
  hand:'hand', drawer:'drawer', cradle:'cradle',
};

/* Slå fotos op på hele varenøglen, så resten af koden slipper for at parse
   nøgler. Bygges her, hvor både katalog og fotoliste er kendt. */
const FOTO = {};
CATALOG.forEach(p=>{
  if(PRODUKTFOTO[p.id]) FOTO['m_'+p.id] = 'produktbilleder/'+PRODUKTFOTO[p.id]+'.png';
  p.acc.forEach(aid=>{
    if(TILBEHOERFOTO[aid]) FOTO['a_'+p.id+'_'+aid] = 'produktbilleder/'+TILBEHOERFOTO[aid]+'.png';
  });
});
ACC_IDS.forEach(aid=>{
  if(TILBEHOERFOTO[aid]) FOTO['x_'+aid] = 'produktbilleder/'+TILBEHOERFOTO[aid]+'.png';
});

/* ---------- tillty PAY: satserne bag IC++ ----------
   Interchange og scheme fee pr. korttype samt et fast scheme-gebyr pr.
   transaktion i EUR. Kilde: Worldline, Indicative Card Scheme Fee Rates,
   Denmark (april 2026) — fanen "Antagelser" i tilltys prisudregner.
   Tallene kan ikke ændres i byggeren, men kunden ser dem i tilbuddet: hele
   pointen med IC++ er, at de tre dele står hver for sig.
   tillty har ingen fast fee pr. transaktion og får det ikke — derfor intet felt.
   `andel` og `surcharge` er sælgerens udgangspunkt og rettes pr. kunde.
   `surcharge:null` betyder, at der ikke må lægges surcharge på korttypen
   (EU-forbrugerkort). */
const PAY_KILDE = 'Worldline, Indicative Card Scheme Fee Rates, Denmark, april 2026';
const PAY_KURS_EUR = 7.46;
const PAY_MARGIN = 0.006;   // tilltys margin (IC++ %), sælgerens udgangspunkt
const PAY_KORT = [
  {id:'debit',      name:'EU forbruger debit',  desc:'Dankort, Visa Debit og andre debetkort udstedt i EU.',
   interchange:0.002, scheme:0.0007, fastEur:0.015, andel:0.60, surcharge:null},
  {id:'credit',     name:'EU forbruger credit', desc:'Kreditkort fra Visa og Mastercard udstedt i EU.',
   interchange:0.003, scheme:0.0007, fastEur:0.015, andel:0.25, surcharge:null},
  {id:'commercial', name:'Firmakort',           desc:'Firma- og erhvervskort. Ikke omfattet af EU-loftet.',
   interchange:0.015, scheme:0.0015, fastEur:0.02,  andel:0.08, surcharge:0.025},
  {id:'noneea',     name:'Internationale kort', desc:'Kort udstedt uden for EEA, fx USA, UK og Asien.',
   interchange:0.012, scheme:0.0085, fastEur:0.02,  andel:0.07, surcharge:0.025},
];
