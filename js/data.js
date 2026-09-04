/* ============================================================
   tillty Tilbudsbygger — PRISER OG KATALOG

   >>> DET ER DENNE FIL DU RETTER, NÅR PRISER ÆNDRER SIG. <<<
   Ingen priser må stå andre steder i koden.
   ============================================================ */

/* ---------- katalog ---------- */
const CATALOG = [
  {id:'sot', name:'Selvbetjeningsterminal (SOT)', desc:'Til hurtig og effektiv ordreafgivelse (inkl. vægbeslag).', price:13995,
   acc:['floor','term_holder','mount']},
  {id:'pos154', name:'15.4" POS Kasseskærm', desc:'Stationær skærm til kassesystemet.', price:4995,
   acc:['desktop','multi','vesa','mount','drawer']},
  {id:'tab87', name:'8.7" POS Tablet', desc:'Både stationær og mobil skærm til kassesystemet.', price:2495,
   acc:['tsfixed','tsstand','desktop','multi','mount','hand']},
  {id:'tab11', name:'11" POS Tablet', desc:'Både stationær og mobil skærm til kassesystemet.', price:2995,
   acc:['tsfixed','tsstand','desktop','multi','mount','hand']},
  {id:'tab14', name:'14" POS Tablet', desc:'Både stationær og mobil skærm til kassesystemet.', price:4495,
   acc:['tsfixed','tsstand','desktop','multi','mount','hand']},
  {id:'kds185', name:'18.5" KDS – Køkkenskærm', desc:'Digital skærm til ordrevisning i køkkenet.', price:5995,
   acc:['vesa','mount']},
  {id:'kds22', name:'22" KDS – Køkkenskærm', desc:'Digital skærm til ordrevisning i køkkenet.', price:6995,
   acc:['vesa','mount']},
  {id:'termstat', name:'Stationær Betalingsterminal', desc:'Fast betalingsterminal – anbefales på SOT og kasse.', price:1995,
   acc:['term_holder']},
  {id:'termmobil', name:'Mobil Betalingsterminal', desc:'Håndholdt betalingsterminal for mobilbetaling.', price:2495,
   acc:['cradle']},
  {id:'lan', name:'LAN Printer', desc:'Bon- og kvitteringsprinter (kasse og køkken).', price:1495, acc:[]},
  {id:'wifi', name:'WiFi Printer', desc:'Bon- og kvitteringsprinter (kasse og køkken).', price:1795, acc:[]},
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
  pos:{name:'POS & SOT licens', daily:15,  desc:'Pr. aktiv terminal · pr. dag i brug.'},
  kds:{name:'KDS licens',       daily:7.5, desc:'Pr. aktiv terminal · pr. dag i brug.'},
  ds: {name:'DS licens',        daily:7.5, desc:'Pr. aktiv skærm · pr. dag i brug.'},
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
  {id:'takeaway',name:'Takeaway',      desc:'Online takeaway-modul. Pr. forretning / md.', price:495, includes:['qr']},
  {id:'qr',      name:'QR bestilling', desc:'Bestilling via QR-koder. Inkluderet i Takeaway.', price:495},
  {id:'bi',      name:'BI',            desc:'Business Intelligence. Pr. md.', price:300},
];
/* Opslag: modul-id -> id på det modul der inkluderer det (undgår dobbeltfakturering). */
const INCLUDED_BY = {};
MODULES.forEach(m=>(m.includes||[]).forEach(inc=>{INCLUDED_BY[inc]=m.id;}));
