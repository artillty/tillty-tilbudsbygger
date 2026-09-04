/* ============================================================
   tillty Tilbudsbygger — Nulstil og opstart
   ============================================================ */

/* Felter der hører til tilbuddet — ikke til produktvalget. Nulstilles sammen
   med resten, så næste kunde ikke arver den forriges navn og tilbudsnummer. */
const QUOTE_FIELDS = ['c_company','c_cvr','c_contact','c_email','c_phone',
                      'c_addr','c_zip','c_city','c_number','c_date','c_valid',
                      'c_seller','c_indloesning','c_intro','c_note'];

/* Standardteksten i den uddybende beskrivelse. Den står i feltet fra start,
   så sælgeren kan rette i den — ikke som en usynlig fallback i dokumentet.
   Slettes den, står der ingenting; det er et bevidst valg fra sælgeren. */
const STANDARD_NOTE =
`Som vi nævnte på mødet, er vi altid åbne for at genbruge det udstyr, der er muligt at genbruge. Vores systemer er Android- og iOS-baserede, og vi understøtter alle enheder der kører begge styresystemer. Vi kan ikke stille garanti på optimal drift, hvis vi genbruger udstyr - men vi har i mange tilfælde sat kunder op med udstyr fra tidligere, hvor det har fungeret helt fint.

Opsamling
Jeg håber, at dette forslag matcher dine forventninger og strategiske mål for fremtiden. Jeg står naturligvis til rådighed for at gennemgå tilbuddet og besvare eventuelle spørgsmål, du måtte have.`;

/* Tomt udgangspunkt: dagens dato, 30 dages gyldighed og standardteksten er
   defaults, ikke kundedata. */
function applyDefaults(){
  document.getElementById('c_date').value=new Date().toISOString().slice(0,10);
  document.getElementById('c_valid').value=30;
  document.getElementById('c_note').value=STANDARD_NOTE;
}

/* ---------- nulstil ---------- */
function resetAll(){
  if(!confirm('Nulstil hele tilbuddet — kundeoplysninger, lokationer og valg?')) return;
  QUOTE_FIELDS.forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
  applyDefaults();
  Object.keys(images).forEach(k=>delete images[k]);
  locSeq=0; LOCATIONS=[newLoc()]; activeIdx=0;
  // Slip det gemte tilbud, ellers ville næste Gem overskrive det forrige
  // tilbud i stedet for at oprette et nyt.
  if(typeof slipTilbud==='function') slipTilbud();
  renderAll();
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded',()=>{
  fileInput=document.createElement('input'); fileInput.type='file'; fileInput.accept='image/*';
  fileInput.addEventListener('change',onFile); document.body.appendChild(fileInput);
  applyDefaults();
  // foldbare paneler
  document.querySelectorAll('.panel.fold>h2').forEach(h=>{
    h.addEventListener('click',()=>h.parentElement.classList.toggle('closed'));
  });
  LOCATIONS=[newLoc()]; activeIdx=0;
  renderAll();
});
