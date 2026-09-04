/* ============================================================
   tillty Tilbudsbygger — Nulstil og opstart
   ============================================================ */

/* Felter der hører til tilbuddet — ikke til produktvalget. Nulstilles sammen
   med resten, så næste kunde ikke arver den forriges navn og tilbudsnummer. */
const QUOTE_FIELDS = ['c_company','c_cvr','c_contact','c_email','c_phone',
                      'c_addr','c_zip','c_city','c_number','c_date','c_valid',
                      'c_seller','c_indloesning','c_intro','c_note'];

/* Tomt udgangspunkt: dagens dato og 30 dages gyldighed er defaults, ikke data. */
function applyDefaults(){
  document.getElementById('c_date').value=new Date().toISOString().slice(0,10);
  document.getElementById('c_valid').value=30;
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
