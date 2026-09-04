/* ============================================================
   tillty Tilbudsbygger — Nulstil og opstart
   ============================================================ */

/* ---------- nulstil ---------- */
function resetAll(){
  if(!confirm('Nulstil alle valg og lokationer?')) return;
  Object.keys(images).forEach(k=>delete images[k]);
  locSeq=0; LOCATIONS=[newLoc()]; activeIdx=0;
  renderAll();
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded',()=>{
  fileInput=document.createElement('input'); fileInput.type='file'; fileInput.accept='image/*';
  fileInput.addEventListener('change',onFile); document.body.appendChild(fileInput);
  document.getElementById('c_date').value=new Date().toISOString().slice(0,10);
  // foldbare paneler
  document.querySelectorAll('.panel.fold>h2').forEach(h=>{
    h.addEventListener('click',()=>h.parentElement.classList.toggle('closed'));
  });
  LOCATIONS=[newLoc()]; activeIdx=0;
  renderAll();
});
