/* ============================================================
   tillty Tilbudsbygger — Nulstil og opstart
   ============================================================ */

/* Felter der hører til tilbuddet — ikke til produktvalget. Nulstilles sammen
   med resten, så næste kunde ikke arver den forriges navn og tilbudsnummer. */
/* c_rolle er kontaktpersonens rolle. Den gemmes til den kommende CRM-kobling,
   men står ingen steder i tilbuddet. */
const QUOTE_FIELDS = ['c_company','c_cvr','c_contact','c_rolle','c_email','c_phone',
                      'c_addr','c_zip','c_city','c_number','c_date',
                      'c_seller','c_indloesning','c_indloesning_online','c_sprog','c_intro','c_note'];

/* Standardteksten i afslutningen. Den står i feltet fra start,
   så sælgeren kan rette i den — ikke som en usynlig fallback i dokumentet.
   Slettes den, står der ingenting; det er et bevidst valg fra sælgeren. */
const STANDARD_NOTE =
`Som vi nævnte på mødet, er vi altid åbne for at genbruge det udstyr, der er muligt at genbruge. Vores systemer er Android- og iOS-baserede, og vi understøtter alle enheder der kører begge styresystemer. Vi kan ikke stille garanti på optimal drift, hvis vi genbruger udstyr - men vi har i mange tilfælde sat kunder op med udstyr fra tidligere, hvor det har fungeret helt fint.

Opsamling
Jeg håber, at dette forslag matcher dine forventninger og strategiske mål for fremtiden. Jeg står naturligvis til rådighed for at gennemgå tilbuddet og besvare eventuelle spørgsmål, du måtte have.`;

/* Tomt udgangspunkt: dagens dato og standardteksten er defaults, ikke
   kundedata. Gyldigheden er ikke et felt — et tilbud gælder altid 30 dage. */
function applyDefaults(){
  document.getElementById('c_date').value=new Date().toISOString().slice(0,10);
  document.getElementById('c_sprog').value='da';
  sidsteSprog='da';
  document.getElementById('c_note').value=STANDARD_NOTE;
}

/* ---------- sprog i tilbuddet ----------
   Skifter sproget, og står afslutningen stadig som standardteksten på det
   forrige sprog, skiftes den med. Har sælgeren rettet i den, røres den ikke —
   så er det sælgerens egen tekst. Det samme gælder et gemt tilbud, der åbnes:
   feltet sættes, men teksten er den gemte. */
let sidsteSprog='da';
function byggSprogvalg(){
  const e=document.getElementById('c_sprog'); if(!e) return;
  e.innerHTML=SPROG_RAEKKEFOELGE.map(l=>'<option value="'+l+'">'+SPROG[l].flag+' '+esc(SPROG[l].navn)+'</option>').join('');
}
function skiftSprog(){
  const nyt=sprog(), note=document.getElementById('c_note');
  if(note && note.value.trim()===standardNote(sidsteSprog).trim()) note.value=standardNote(nyt);
  sidsteSprog=nyt;
  visNoteUddrag();
  update();
}

/* ---------- afslutningen ----------
   Står foldet sammen til ét felt med starten af teksten, så den lange
   standardtekst ikke fylder halvdelen af kundepanelet. Mærkatet viser, om
   det stadig er standardteksten på tilbuddets sprog. */
function redigerNote(aaben){
  document.getElementById('note_lukket').hidden=aaben;
  document.getElementById('note_aaben').hidden=!aaben;
  if(aaben) document.getElementById('c_note').focus();
  else visNoteUddrag();
}
function visNoteUddrag(){
  const e=document.getElementById('note_uddrag'); if(!e) return;
  const tekst=v('c_note').replace(/\s+/g,' ');
  e.textContent = tekst || 'Ingen afslutning';
  e.classList.toggle('tom', !tekst);
  document.getElementById('note_std').hidden = !tekst || v('c_note')!==standardNote(sprog()).trim();
}

/* Tomt udgangspunkt for selve opsætningen — én lokation med én mulighed.
   Formen (FORM) røres ikke her; den vælges i opstartslaget. */
function nulstilOpsaetning(){
  locSeq=0; optSeq=0;
  LOCS=[newLoc()]; activeIdx=0; optIdx=0;
}

/* ---------- nulstil ---------- */
function resetAll(){
  // Knappen hedder "+ Nyt tilbud", som i kartoteket. Med server ligger et gemt
  // tilbud stadig i kartoteket; uden server er der intet kartotek at nævne.
  const gemt = window.HAR_API ? ' Er det gemt, ligger det stadig i kartoteket.' : '';
  if(!confirm('Start et nyt tilbud?\n\nDet nuværende ryddes — kundeoplysninger, lokationer, muligheder og valg.'+gemt)) return;
  QUOTE_FIELDS.forEach(id=>{ const e=document.getElementById(id); if(e){ e.value=''; e.classList.remove('mangler'); } });
  applyDefaults();
  Object.keys(images).forEach(k=>delete images[k]);
  nulstilOpsaetning();
  // Slip det gemte tilbud, ellers ville næste Gem overskrive det forrige
  // tilbud i stedet for at oprette et nyt.
  if(typeof slipTilbud==='function') slipTilbud();
  redigerNote(false);
  visOpstart();
  renderAll();
}

/* ---------- opstartslaget ---------- */
function visOpstart(){
  const e=document.getElementById('opstart'); if(!e) return;
  document.getElementById('f_muligheder').checked=FORM.muligheder;
  document.getElementById('f_lokationer').checked=FORM.lokationer;
  opdaterStartknap();
  e.style.display='flex';
}
/* Knappen siger, hvad man får: uden lokationer og muligheder er det et
   simpelt tilbud. Er én af dem slået til, står der "Kom i gang". */
function opdaterStartknap(){
  const k=document.querySelector('#opstart .opstart-start'); if(!k) return;
  const valgt=document.getElementById('f_muligheder').checked
           || document.getElementById('f_lokationer').checked;
  k.textContent = valgt ? 'Kom i gang' : 'Simpelt tilbud';
}
function skjulOpstart(){
  const e=document.getElementById('opstart'); if(e) e.style.display='none';
}
function startTilbud(){
  FORM.muligheder=document.getElementById('f_muligheder').checked;
  FORM.lokationer=document.getElementById('f_lokationer').checked;
  // Man starter med én lokation og én mulighed og tilføjer selv flere, som
  // med lokationer. Ingen foruddefinerede muligheder.
  activeIdx=0; optIdx=0;
  skjulOpstart();
  renderAll();
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded',()=>{
  fileInput=document.createElement('input'); fileInput.type='file'; fileInput.accept='image/*';
  fileInput.addEventListener('change',onFile); document.body.appendChild(fileInput);
  byggSprogvalg();
  applyDefaults();
  // Den røde markering af et manglende felt forsvinder, så snart der skrives i det.
  document.querySelectorAll('[data-krav]').forEach(e=>
    e.addEventListener('input',()=>e.classList.remove('mangler')));
  // foldbare paneler
  document.querySelectorAll('.panel.fold>h2').forEach(h=>{
    h.addEventListener('click',()=>h.parentElement.classList.toggle('closed'));
  });
  nulstilOpsaetning();
  renderAll();
  // Uden server er der intet gemt tilbud at åbne, så formen vælges med det
  // samme. Med server afgør store.js det: nyt tilbud -> opstart, ?nr= -> spring over.
  if(location.protocol==='file:') visOpstart();
});
