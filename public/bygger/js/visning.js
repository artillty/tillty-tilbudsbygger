/* ==========================================================================
   VISNING PÅ TELEFON
   Under 1000 px står byggeren og tilbuddet under hinanden, og tilbuddet lå
   nederst under hele kataloget. Bjælken nederst skifter mellem de to i stedet.
   Hver visning husker, hvor langt nede man var, så man kommer tilbage til det
   produkt, man arbejdede med. På brede skærme gør den ingenting: dér står de
   to spalter side om side, og bjælken er skjult.
   ========================================================================== */

const visningRul = {byg:0, tilbud:0};
let visningNu = 'byg';

function visVisning(navn){
  if(navn===visningNu) { window.scrollTo(0,0); return; }
  visningRul[visningNu] = window.scrollY;
  visningNu = navn;
  document.body.classList.toggle('vis-tilbud', navn==='tilbud');
  document.querySelectorAll('.visning [data-visning]').forEach(b=>
    b.classList.toggle('active', b.dataset.visning===navn));
  window.scrollTo(0, visningRul[navn]);
}
