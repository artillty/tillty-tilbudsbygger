/* Regressionstest for tillty Tilbudsbygger.
   Kører scenarierne i headless Chromium og fejler med exit-kode 1.

   Kontroltallene nedenfor er HÅNDREGNEDE ud fra js/data.js.
   Ændrer du priser, skal de rettes med — ellers tester vi ingenting. */

const path = require('path');
const { chromium } = require('playwright');

const URL = 'file://' + path.resolve(__dirname, '..', 'public', 'bygger', 'index.html');
const fails = [];
const ok = [];

function check(name, cond, detail) {
  (cond ? ok : fails).push(name + (detail ? ` — ${detail}` : ''));
  console.log(`${cond ? '  ok  ' : ' FEJL '} ${name}${detail ? ' — ' + detail : ''}`);
}

/* form: { muligheder, lokationer } — hvad tilbuddet skal indeholde.
   Standarden er et almindeligt tilbud: én mulighed, én lokation. */
async function newPage(browser, form = {}) {
  const p = await browser.newPage({ viewport: { width: 1500, height: 1300 } });
  p.on('pageerror', e => check('ingen JS-fejl', false, e.message));
  p.on('dialog', d => d.accept());
  // Værktøjet skal virke uden net. Alt hvad der ikke er en lokal fil, er en fejl.
  p.external = [];
  p.on('request', r => { if (!/^(file:|data:|blob:)/.test(r.url())) p.external.push(r.url()); });
  // ... og alt lokalt skal rent faktisk kunne findes. En forkert relativ sti i
  // et stilark giver en tavs 404, og så printer vi i systemfonte uden at opdage det.
  p.mangler = [];
  p.on('requestfailed', r => p.mangler.push(r.url().split('/').pop()));
  p.on('response', r => { if (r.status() >= 400) p.mangler.push(r.url().split('/').pop()); });
  await p.goto(URL);
  await p.waitForTimeout(400);
  // Nye tilbud starter med formvalget. Scenarierne herunder tester det
  // almindelige tilbud — én mulighed, én lokation — så vi tager standarden.
  if (await p.isVisible('#opstart')) {
    if (form.muligheder) await p.check('#f_muligheder');
    if (form.lokationer) await p.check('#f_lokationer');
    await p.click('#opstart .opstart-start');
    await p.waitForTimeout(250);
  }
  return p;
}

/* Et produkt i flere størrelser (tablets) viser kun én størrelse ad gangen.
   Vælg den rigtige, før der klikkes — som sælgeren gør. `k` er en varenøgle
   som 'm_tab11', 'eget_m_tab11', 'brugt_m_tab11' eller 'a_tab11_hand'. */
const str = async (p, k) => {
  const m = /^(?:eget_|brugt_)?[ma]_([^_]+)/.exec(k);
  const knap = m && await p.$(`[data-strknap="${m[1]}"]:not(.active)`);
  if (knap) { await knap.click(); await p.waitForTimeout(20); }
};

/* Afslutningen er foldet sammen; fold den ud før der skrives i den. */
const skrivNote = async (p, tekst) => {
  if (!(await p.isVisible('#c_note'))) { await p.click('#note_rediger'); await p.waitForTimeout(60); }
  await p.fill('#c_note', tekst);
};

/* Skriver et antal direkte i feltet. Er tælleren foldet sammen, foldes den ud først. */
const saetAntal = async (p, k, n) => {
  await str(p, k);
  const chip = await p.$(`[data-chip="${k}"]:not([hidden])`);
  if (chip) { await chip.click(); await p.waitForTimeout(35); }
  await p.fill(`#qty_${k}`, String(n)); await p.waitForTimeout(40);
};

/* "Kundens egne" og "Brugte" er foldet sammen til en knap, til de har antal.
   Knappen sætter selv antallet til 1, så der klikkes én gang mindre på +. */
const plus = async (p, k, n = 1) => {
  await str(p, k);
  const chip = await p.$(`[data-chip="${k}"]:not([hidden])`);
  if (chip) { await chip.click(); await p.waitForTimeout(35); n--; }
  for (let i = 0; i < n; i++) {
    await p.click(`[data-qwrap="${k}"] button:last-child`);
    await p.waitForTimeout(35);
  }
};

/* Bygger siderne og returnerer sidetal + eventuelt overflow ned i sidefoden. */
async function paginate(p) {
  return p.evaluate(() => {
    const pages = buildPrintPages();
    const root = document.getElementById('print-root');
    root.innerHTML = '';
    pages.forEach(x => root.appendChild(x));
    root.style.display = 'block';           // ellers er alle rects 0
    const bad = [];
    document.querySelectorAll('#print-root .pg').forEach((pg, i) => {
      const foot = pg.querySelector('.qp-foot').getBoundingClientRect().top;
      const bot = pg.querySelector('.pg-body').getBoundingClientRect().bottom;
      if (bot > foot + 1) bad.push(`side ${i + 1}: ${Math.round(bot - foot)}px`);
    });
    root.style.display = '';
    return {
      n: pages.length,
      feet: pages.map(x => x.querySelector('.qf-page').textContent),
      bands: pages.map(x => x.querySelector('.qp-logo').textContent),
      contact: pages.every(x => /sales@tillty\.com/.test(x.querySelector('.qp-foot').textContent)),
      hilsenSidst: !!pages[pages.length - 1].querySelector('.qp-greet'),
      bad,
    };
  });
}

const kr = s => parseFloat(String(s).replace(/\./g, '').replace(/,-$/, '').replace(',', '.'));

/* Standardteksten hentes fra appen selv, så testen ikke skal holdes i sync
   med ordlyden i hånden — kun med at den ER der. */
let STANDARD_START = null;

(async () => {
  const browser = await chromium.launch();
  {
    const p = await newPage(browser);
    STANDARD_START = await p.evaluate(() => STANDARD_NOTE);
    await p.close();
  }

  /* ---------- 1: én lokation ---------- */
  console.log('\n# Én lokation');
  {
    const p = await newPage(browser);
    await p.fill('#c_company', 'Café Mikkeller ApS');
    await p.fill('#c_contact', 'Mette Sørensen');
    await p.fill('#c_seller', 'Rask');

    await plus(p, 'm_sot', 2);
    await p.click('[data-match="a_sot_floor"]');          // sæt = 2
    await p.waitForTimeout(60);
    await plus(p, 'a_sot_term_holder', 1);
    await p.click('[data-match="a_sot_term_holder"]');
    await p.waitForTimeout(60);
    await plus(p, 'm_tab11', 4);
    await plus(p, 'a_tab11_hand', 1);
    await p.click('[data-match="a_tab11_hand"]');          // sæt = 4
    await p.waitForTimeout(60);
    await plus(p, 'm_kds185', 1);
    await plus(p, 'm_termstat', 1);
    await plus(p, 's_takeaway', 1);
    await plus(p, 's_bi', 1);
    await p.waitForTimeout(300);

    // håndregnet
    const HW  = 2*13995 + 2*2495 + 2*495 + 4*2995 + 4*195 + 5995 + 1995; // 54.720
    const LIC = 6*15 + 7.5;                                              // 97,50 (termstat: ingen licens)
    const MOD = 495 + 299;                                               // 794 (QR inkluderet i Takeaway)
    const REC = LIC*30 + MOD;                                            // 3.719

    const row = await p.$$eval('#quote-doc table.loc-overview tfoot td',
      td => td.map(t => t.textContent.trim()));
    check('engangs stemmer', kr(row[1]) === HW, `${row[1]} vs ${HW}`);
    check('licens/dag stemmer', kr(row[2]) === LIC, `${row[2]} vs ${LIC}`);
    check('moduler/md stemmer', kr(row[3]) === MOD, `${row[3]} vs ${MOD}`);
    check('løbende/md stemmer', kr(row[4]) === REC, `${row[4]} vs ${REC}`);

    // 6 = 2 SOT + 4 tablets. Den stationære terminal tæller bevidst ikke med.
    const posQty = await p.$$eval('#quote-doc table.pv tbody tr', rows => {
      const r = rows.find(x => /POS & SOT licens/.test(x.cells[0].textContent));
      return r ? r.cells[1].textContent.trim() : null;
    });
    check('stationær terminal udløser ingen licens', posQty === '6',
      `POS-licenser: ${posQty === null ? 'ingen licensrække fundet' : posQty} (forventet 6)`);

    // Postnummeret slår byen op lokalt — feltet må også virke uden net.
    await p.fill('#c_zip', '8000');
    await p.waitForTimeout(250);
    check('postnummer udfylder byen', (await p.inputValue('#c_city')) === 'Aarhus C',
      await p.inputValue('#c_city'));
    await p.fill('#c_zip', '9999');
    await p.waitForTimeout(250);
    check('ukendt postnummer rydder byen', (await p.inputValue('#c_city')) === '');
    await p.fill('#c_zip', '2100');
    await p.waitForTimeout(250);
    check('nyt postnummer opdaterer byen', (await p.inputValue('#c_city')) === 'København Ø',
      await p.inputValue('#c_city'));
    check('postnr. og by står i tilbuddet',
      await p.$eval('#quote-doc .qp-parties', e => /2100 København Ø/.test(e.textContent)));
    // Sælgeren står i Fra-boksen under tillty, som kontaktpersonen hos kunden.
    check('sælgeren står i Fra-boksen', await p.$eval('#quote-doc .qp-parties .qp-col:first-child',
      e => e.innerHTML.split('<br>').slice(0, 2).join('|').endsWith('tillty|Rask')));
    // Vej, postnr. og by på én linje, som afsenderens adresse.
    await p.fill('#c_addr', 'Vesterbrogade 1'); await p.waitForTimeout(250);
    check('adressen står på én linje', await p.$eval('#quote-doc .qp-parties .qp-col:last-child',
      e => e.innerHTML.split('<br>').includes('Vesterbrogade 1, 2100 København Ø')));
    await p.fill('#c_zip', ''); await p.fill('#c_city', ''); await p.waitForTimeout(250);
    check('uden postnr. og by står vejen alene', await p.$eval('#quote-doc .qp-parties .qp-col:last-child',
      e => e.innerHTML.split('<br>').includes('Vesterbrogade 1')));
    await p.fill('#c_addr', ''); await p.fill('#c_zip', '2100'); await p.waitForTimeout(250);

    check('tilbudsnr. kan ikke tastes i', await p.getAttribute('#c_number', 'readonly') !== null);
    // Tilbuddet gælder altid 30 dage — det er ikke et felt, man kan stille på.
    check('gyldigheden er ikke et felt', !(await p.$('#c_valid')));
    check('gælder til er 30 dage efter sendt', await p.evaluate(() => {
      const d = parseISODate(document.getElementById('c_date').value);
      d.setDate(d.getDate() + 30);
      return document.querySelector('#quote-doc .qp-meta').textContent.includes('Gælder til: ' + d.toLocaleDateString('da-DK'));
    }));
    // Alle felter har et feltnavn — også de to tekstfelter.
    check('indledning og afslutning har feltnavne', await p.evaluate(() =>
      /^Indledning/.test(document.getElementById('c_intro').closest('label')?.textContent.trim() || '')
      && /^Afslutning/.test(document.getElementById('c_note').closest('.note-felt')?.textContent.trim() || '')));

    // Afslutningen står foldet sammen: starten af teksten og en redigeringsknap.
    check('afslutningen er foldet sammen', !(await p.isVisible('#c_note')) && (await p.isVisible('#note_rediger'))
      && /^Som vi nævnte på mødet/.test(await p.textContent('#note_uddrag')) && (await p.isVisible('#note_std')));
    check('det foldede felt fylder ikke mere end et almindeligt felt', await p.evaluate(() =>
      document.getElementById('note_lukket').getBoundingClientRect().height
        <= document.getElementById('c_company').getBoundingClientRect().height + 4));
    await p.click('#note_rediger'); await p.waitForTimeout(80);
    check('rediger folder tekstfeltet ud', (await p.isVisible('#c_note')) && !(await p.isVisible('#note_lukket')));
    await skrivNote(p, 'Vi glæder os til samarbejdet.');
    await p.click('#note_faerdig'); await p.waitForTimeout(150);
    check('færdig folder det sammen med den nye tekst',
      !(await p.isVisible('#c_note')) && (await p.textContent('#note_uddrag')) === 'Vi glæder os til samarbejdet.'
      && !(await p.isVisible('#note_std')));
    check('den rettede afslutning står i tilbuddet',
      await p.$eval('#quote-doc .qp-note', (e) => e.textContent === 'Vi glæder os til samarbejdet.'));
    await p.click('#note_rediger'); await p.waitForTimeout(80);
    await p.fill('#c_note', STANDARD_START);
    await p.click('#note_faerdig'); await p.waitForTimeout(150);

    // Standardteksten står i feltet fra start og går med i tilbuddet.
    check('standardteksten er forudfyldt', (await p.inputValue('#c_note')) === STANDARD_START);
    check('standardteksten står i tilbuddet',
      await p.$eval('#quote-doc', e => /altid åbne for at genbruge det udstyr/.test(e.textContent)
        && /Opsamling/.test(e.textContent)));
    check('linjeskift bevares i tilbuddet',
      await p.$eval('#quote-doc .qp-note', e => getComputedStyle(e).whiteSpace === 'pre-wrap'));

    // Ordlyden om licenser er salgsargumentet og skal stå ordret.
    check('licensforbeholdet taler om dage terminalen er slået til',
      await p.$eval('#quote-doc', e => /I betaler kun for de dage, terminalen er slået til\./.test(
        e.textContent.replace(/\s+/g, ' '))));

    // Indløsning står altid i tilbuddet. Uden en sats står forbeholdet der.
    // Tilbuddet her har Takeaway, så online betaling har sin egen linje.
    check('tomt indløsningsfelt giver "Aftales efter dialog"',
      await p.$eval('#quote-doc', e => /Indløsning, fysisk betaling: Aftales efter dialog\. ?Indløsning, online betaling: Aftales efter dialog\./.test(
        e.textContent.replace(/\s+/g, ' '))));

    check('QR låst når Takeaway er valgt',
      await p.isDisabled('[data-qwrap="s_qr"] button:last-child'));
    // Feltet skal låses sammen med knapperne — ellers kan der tastes et antal
    // ind, som state nulstiller igen, uden at skærmen følger med.
    check('QR-antalsfeltet er også låst', await p.isDisabled('#qty_s_qr'));
    check('QR-antallet står på 0', (await p.inputValue('#qty_s_qr')) === '0');
    check('QR med i tilbuddet til 0,-',
      await p.$eval('#quote-doc', e => /QR bestilling/.test(e.textContent) && /Inkl\./.test(e.textContent)));

    check('kun én spec-blok', (await p.$$('#quote-doc .loc-block')).length === 1);
    // Officielle produktfotos SKAL med i kundens PDF; de grå canvas-pladsholdere
    // må aldrig. Vi tjekker mod pladsholder-cachen i stedet for at tælle billeder.
    const billeder = await p.evaluate(() => {
      const alle = [...document.querySelectorAll('#quote-doc img')];
      const ph = Object.values(_phCache);
      return { ialt: alle.length, pladsholdere: alle.filter(i => ph.includes(i.src)).length };
    });
    check('ingen pladsholderbilleder i dokumentet', billeder.pladsholdere === 0,
      `${billeder.pladsholdere} af ${billeder.ialt}`);
    check('produktfotos er med i dokumentet', billeder.ialt > 0, `${billeder.ialt} billeder`);

    const nums = await p.$$eval('#quote-doc td.num', els =>
      els.map(e => e.textContent.trim()).filter(t => /\d/.test(t) && !/^\d+$/.test(t)));
    check('alle beløb har ",-"', nums.every(t => /,-$/.test(t) || t === 'Inkl.'),
      nums.filter(t => !/,-$/.test(t) && t !== 'Inkl.').join(', ') || 'ingen afvigelser');

    // De to spalter skal rulle hver for sig. Ellers flytter et kig ned i
    // tilbuddet også katalogets liste, og sælgeren mister sin plads.
    const rul = await p.evaluate(async () => {
      const [venstre, hoejre] = document.querySelectorAll('.layout > div');
      const kanRulle = (e) => e.scrollHeight - e.clientHeight > 40;
      if (!kanRulle(venstre) || !kanRulle(hoejre)) return { nok: false };
      const vent = () => new Promise((r) => setTimeout(r, 120));

      // Udgangspunktet er ikke nødvendigvis 0 — klikkene ovenfor har allerede
      // rullet venstre spalte for at få knapperne i syne.
      const start = { v: venstre.scrollTop, h: hoejre.scrollTop };

      hoejre.scrollTop = start.h + 300; await vent();
      const efterHoejre = { v: venstre.scrollTop, h: hoejre.scrollTop };
      venstre.scrollTop = start.v + 400; await vent();
      const efterVenstre = { v: venstre.scrollTop, h: hoejre.scrollTop };
      return {
        nok: true,
        hoejreRullede: efterHoejre.h > start.h + 250,
        venstreStodStille: efterHoejre.v === start.v,
        venstreRullede: efterVenstre.v > start.v + 350,
        hoejreStodStille: efterVenstre.h === efterHoejre.h,
        sidenSelvStodStille: (document.scrollingElement || document.documentElement).scrollTop === 0,
      };
    });
    check('begge spalter er høje nok til at teste rulning', rul.nok);
    check('højre spalte ruller uden at flytte venstre',
      rul.hoejreRullede && rul.venstreStodStille, JSON.stringify(rul));
    check('venstre spalte ruller uden at flytte højre',
      rul.venstreRullede && rul.hoejreStodStille, JSON.stringify(rul));
    check('siden selv ruller ikke', rul.sidenSelvStodStille);

    const pg = await paginate(p);
    check('sidetal på alle sider', pg.feet.every((f, i) => f === `Side ${i + 1} af ${pg.n}`), pg.feet.join(' / '));
    check('tillty-bånd på alle sider', pg.bands.every(b => b === 'tillty'));
    check('kontakt i sidefod på alle sider', pg.contact);
    check('intet indhold i sidefoden', pg.bad.length === 0, pg.bad.join('; '));
    check('ingen eksterne requests', p.external.length === 0, p.external.join(', ') || 'kun lokale filer');
    check('ingen filer mangler', p.mangler.length === 0, p.mangler.join(', ') || 'alt fundet');
    // Ikonet skal også findes når byggeren åbnes som løs fil — deraf den
    // relative sti. En forkert sti her giver ingen fejl, bare et blankt faneblad.
    const ikoner = await p.$$eval('link[rel*="icon"]', els => els.map(e => e.getAttribute('href')));
    check('faviconet er sat', ikoner.length >= 2, ikoner.join(', ') || 'ingen');
    // Fontene skal være indlæst, ikke bare refereret.
    // Vægten skal med: browseren henter kun de vægte siden faktisk bruger, og
    // document.fonts.check() spørger som standard efter 400. JetBrains Mono
    // bruges kun i 700 (.price, .qty input), så et check uden vægt melder
    // falsk negativ, hvis der ikke tilfældigvis står et tal i vægt 400 på siden.
    const fonte = await p.evaluate(() => ([
      ['Nunito', 700], ['Open Sans', 400], ['JetBrains Mono', 700], ['Fugaz One', 400],
    ]).filter(([f, w]) => !document.fonts.check(`${w} 12px "${f}"`, 'Tilbud 1234')).map(([f]) => f));
    check('brandfontene er indlæst', fonte.length === 0, fonte.join(', ') || 'alle fire');
    // Fugaz One er forbeholdt ordet "tillty" — ingen overskrifter i logoets skrift.
    const fugaz = await p.evaluate(() => [...document.querySelectorAll('body *')]
      .filter((e) => /Fugaz/.test(getComputedStyle(e).fontFamily.split(',')[0]))
      .filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
      .map((e) => e.textContent.trim()).filter((t) => t !== 'tillty'));
    check('kun "tillty" står i Fugaz One', fugaz.length === 0, fugaz.join(', ') || 'kun logoet');
    await p.close();
  }

  /* ---------- 2: tre lokationer ---------- */
  console.log('\n# Tre lokationer');
  {
    const p = await newPage(browser, { lokationer: true });
    await p.fill('#c_company', 'Kaffe & Co Holding ApS');
    await p.fill('#c_contact', 'Sofie Dahl');
    await p.fill('#c_seller', 'Rask');
    await p.fill('#l_name', 'Aarhus C');

    await plus(p, 'm_tab11', 4);
    await plus(p, 'a_tab11_hand', 1);
    await p.click('[data-match="a_tab11_hand"]');
    await p.waitForTimeout(60);
    await plus(p, 'm_kds185', 1);
    await plus(p, 's_takeaway', 1);

    await p.click('#loctabs .loctab-kopi');   // kopiér
    await p.waitForTimeout(250);
    await p.fill('#l_name', 'Risskov');
    check('kopi arvede antal', (await p.inputValue('#qty_m_tab11')) === '4');
    await str(p, 'm_tab11');
    for (let i = 0; i < 2; i++) { await p.click('[data-qwrap="m_tab11"] button:first-child'); await p.waitForTimeout(40); }

    await p.click('#loctabs .loctab:nth-child(1)');          // tilbage til lokation 1
    await p.waitForTimeout(250);
    check('state overlever fane-skift', (await p.inputValue('#qty_m_tab11')) === '4');

    await p.click('#loctabs .loctab-add');
    await p.waitForTimeout(250);
    await p.fill('#l_name', 'Food truck');
    check('ny lokation starter tom', (await p.inputValue('#qty_m_tab11')) === '0');
    if (await p.$('.panel.fold.closed > h2')) { await p.click('.panel.fold.closed > h2'); await p.waitForTimeout(120); }
    await plus(p, 'x_hand', 2);
    await plus(p, 'x_cradle', 1);
    await p.waitForTimeout(300);

    const L1 = 4*2995 + 4*195 + 5995;
    const L2 = 2*2995 + 4*195 + 5995;
    const L3 = 2*195 + 495;
    const foot = await p.$$eval('#quote-doc table.loc-overview tfoot td', td => td.map(t => t.textContent.trim()));
    check('samlet engangs stemmer', kr(foot[1]) === L1 + L2 + L3, `${foot[1]} vs ${L1 + L2 + L3}`);
    check('samlet licens/dag stemmer', kr(foot[2]) === (4*15 + 7.5) + (2*15 + 7.5), foot[2]);
    check('samlet moduler/md stemmer', kr(foot[3]) === 495 * 2, foot[3]);

    check('tre lokationsblokke', (await p.$$('#quote-doc .loc-block')).length === 3);
    const bar = await p.$eval('#quote-doc .loc-head', e => e.innerText.replace(/\s+/g, ' ').trim());
    check('bjælken viser kun nummer og navn', bar === '1 Aarhus C', JSON.stringify(bar));
    check('ingen lang tankestreg i tilbuddet', await p.$eval('#quote-doc', e =>
      !e.innerText.includes('—') && /tilpasset jer\. Den er sat op pr\. lokation/.test(e.innerText)));

    const pg = await paginate(p);
    check('sidetal på alle sider', pg.feet.every((f, i) => f === `Side ${i + 1} af ${pg.n}`), pg.feet.join(' / '));
    check('intet indhold i sidefoden', pg.bad.length === 0, pg.bad.join('; '));
    await p.close();
  }

  /* ---------- 3: beskrivelse efter specifikationen ---------- */
  console.log('\n# Beskrivelse');
  {
    const p = await newPage(browser);
    await p.fill('#c_company', 'Bageriet Bro ApS');
    await p.fill('#c_seller', 'Rask');
    await skrivNote(p, 'Installation og oplæring er inkluderet i prisen.');
    await p.fill('#c_indloesning', '0,45 %');
    await plus(p, 'm_sot', 1);
    await p.waitForTimeout(300);

    const doktekst = await p.$eval('#quote-doc', e => e.textContent.replace(/\s+/g, ' '));
    check('satsen står ordret i tilbuddet', /Indløsning: 0,45 %/.test(doktekst));

    // Online betaling har sin egen sats. Linjen står kun i tilbuddet, når det
    // har Takeaway eller QR bestilling, eller når der er skrevet en sats.
    {
      const dok = async () => { await p.waitForTimeout(300);
        return p.$eval('#quote-doc', e => e.textContent.replace(/\s+/g, ' ')); };
      check('uden online står der ingen linje om online betaling', !/online betaling/.test(doktekst));
      await p.fill('#c_indloesning_online', '1,25 %');
      let d = await dok();
      check('en skrevet online-sats kommer med, også uden online i tilbuddet',
        /Indløsning, fysisk betaling: 0,45 %/.test(d) && /Indløsning, online betaling: 1,25 %/.test(d));
      check('med to linjer står den korte "Indløsning:" der ikke', !/Indløsning: /.test(d));
      await p.fill('#c_indloesning_online', '');
      await plus(p, 's_qr', 1);
      d = await dok();
      check('online i tilbuddet uden sats giver "Aftales efter dialog."',
        /Indløsning, fysisk betaling: 0,45 %/.test(d) && /Indløsning, online betaling: Aftales efter dialog\./.test(d));
      await p.click('[data-qwrap="s_qr"] button:first-child');
      await plus(p, 's_takeaway', 1);
      check('Takeaway tæller også som online', /Indløsning, online betaling:/.test(await dok()));
      await p.click('[data-qwrap="s_takeaway"] button:first-child');
      d = await dok();
      check('uden online er linjen væk igen', !/online betaling/.test(d) && /Indløsning: 0,45 %/.test(d));
      check('BI er ikke online', await p.evaluate(() => MODULES.filter(m => m.online).map(m => m.id).join() === 'takeaway,qr'));
      check('begge indløsningsfelter nulstilles med tilbuddet', await p.evaluate(() =>
        QUOTE_FIELDS.includes('c_indloesning') && QUOTE_FIELDS.includes('c_indloesning_online')));
    }
    check('forbeholdet er væk når satsen er skrevet',
      !/Aftales efter dialog/.test(doktekst));

    const order = await p.$$eval('#quote-doc .qp-content > *',
      els => els.map(e => e.className.split(' ')[0] || e.tagName.toLowerCase()));
    const note = order.indexOf('qp-note');
    check('beskrivelse efter specifikationen', note > order.lastIndexOf('loc-block'), order.join(' → '));
    check('beskrivelse inden hilsen', note < order.indexOf('qp-greet'));
    check('standardteksten kan redigeres væk',
      await p.$eval('#quote-doc', e => !/altid åbne for at genbruge/.test(e.textContent)
        && /Installation og oplæring/.test(e.textContent)));

    const pg = await paginate(p);
    check('intet indhold i sidefoden', pg.bad.length === 0, pg.bad.join('; '));
    await p.close();
  }

  /* ---------- 4: nulstil rydder også kunden ---------- */
  console.log('\n# Nulstil');
  {
    // Med lokationer til, så nulstillingen også kan tjekkes på dem.
    const p = await newPage(browser, { lokationer: true });
    await p.fill('#c_company', 'Skal Væk ApS');
    await skrivNote(p, 'Gammel note');
    await p.fill('#l_name', 'Gammel lokation');
    await plus(p, 'm_sot', 2);
    await p.waitForTimeout(200);

    check('knappen hedder "+ Nyt tilbud" som i kartoteket',
      (await p.textContent('button[onclick="resetAll()"]')).trim() === '+ Nyt tilbud');
    await p.click('button[onclick="resetAll()"]');   // confirm accepteres i newPage
    await p.waitForTimeout(300);

    check('kundeoplysninger ryddet',
      (await p.inputValue('#c_company')) === '' && (await p.inputValue('#c_number')) === '');
    // Standardteksten er en default, ikke kundedata — den skal komme igen.
    check('standardteksten er tilbage i beskrivelsen',
      (await p.inputValue('#c_note')) === STANDARD_START,
      (await p.inputValue('#c_note')).slice(0, 40) + '…');
    check('produktvalg ryddet', (await p.inputValue('#qty_m_sot')) === '0');
    // Nulstil sender én tilbage til formvalget, så opsætningen skal bekræftes igen.
    check('formvalget vises igen efter nulstil', await p.isVisible('#opstart'));
    // Knappen siger "Simpelt tilbud" uden valg og "Kom i gang", når ét er slået til.
    const knap = () => p.$eval('#opstart .opstart-start', (e) => e.textContent.trim());
    await p.uncheck('#f_lokationer'); await p.uncheck('#f_muligheder');
    check('startknappen siger "Simpelt tilbud" uden valg', (await knap()) === 'Simpelt tilbud', await knap());
    await p.check('#f_lokationer');
    check('startknappen siger "Kom i gang", når et valg er slået til', (await knap()) === 'Kom i gang', await knap());
    await p.click('#opstart .opstart-start');
    await p.waitForTimeout(300);
    check('lokationen er tilbage til én tom',
      (await p.$$('#loctabs .loctab:not(.loctab-add)')).length === 1);
    // Datoen er en default, ikke kundedata — den skal stå igen bagefter.
    check('dato sat til i dag',
      (await p.inputValue('#c_date')) === new Date().toISOString().slice(0, 10));
    await p.close();
  }

  /* ---------- 5: formvalget ved oprettelse ---------- */
  console.log('\n# Form: muligheder og lokationer');
  {
    // Standarden: hverken muligheder eller lokationer.
    const p = await newPage(browser);
    check('mulighedspanelet er skjult som standard', !(await p.isVisible('#panel_muligheder')));
    check('lokationspanelet er skjult som standard', !(await p.isVisible('#panel_lokationer')));
    check('opstartslaget er væk efter valget', !(await p.isVisible('#opstart')));
    // Laget skal være synligt fra første tegning. Et display:none i HTML'en får
    // byggeren til at blinke frem, før scriptet viser laget.
    const html = require('fs').readFileSync(path.resolve(__dirname, '..', 'public', 'bygger', 'index.html'), 'utf8');
    check('formvalget er synligt fra første tegning', !/id="opstart"[^>]*display:\s*none/.test(html));
    await p.close();
  }
  {
    const p = await newPage(browser, { muligheder: true });
    check('mulighedspanelet vises', await p.isVisible('#panel_muligheder'));
    check('lokationspanelet er stadig skjult', !(await p.isVisible('#panel_lokationer')));
    // Man starter med én og tilføjer selv flere — som med lokationer.
    check('der oprettes kun én mulighed fra start',
      (await p.$$eval('#opttabs .loctab:not(.loctab-add)', (e) => e.length)) === 1);
    check('første mulighed hedder Mulighed A', (await p.inputValue('#o_navn')) === 'Mulighed A');

    // Valgene skal høre til hver sin mulighed.
    await p.click('[data-qwrap="m_sot"] button:last-child');
    await p.waitForTimeout(120);
    await p.click('#opttabs .loctab-add');
    await p.waitForTimeout(250);
    check('en ny mulighed starter tom', (await p.inputValue('#qty_m_sot')) === '0');
    check('den nye mulighed hedder Mulighed B', (await p.inputValue('#o_navn')) === 'Mulighed B');
    await str(p, 'm_tab11');
    await p.click('[data-qwrap="m_tab11"] button:last-child');
    await p.waitForTimeout(120);
    await p.click('#opttabs .loctab:nth-child(1)');
    await p.waitForTimeout(250);
    check('mulighed 1 har sit eget valg i behold', (await p.inputValue('#qty_m_sot')) === '1');
    check('mulighed 1 har ikke mulighed 2s valg', (await p.inputValue('#qty_m_tab11')) === '0');

    // Kun én anbefaling ad gangen — to anbefalinger er ingen anbefaling.
    await p.check('#o_anbefalet');
    await p.waitForTimeout(150);
    await p.click('#opttabs .loctab:nth-child(2)');
    await p.waitForTimeout(250);
    await p.check('#o_anbefalet');
    await p.waitForTimeout(150);
    check('kun én mulighed kan være anbefalet',
      (await p.$$eval('#opttabs .loctab.anbefalet', (e) => e.length)) === 1);

    // Kopiér tager hele opsætningen med og lægges sidst.
    await p.click('#opttabs .loctab-kopi');
    await p.waitForTimeout(300);
    check('kopi arvede opsætningen', (await p.inputValue('#qty_m_tab11')) === '1');
    check('kopien er en ny mulighed',
      (await p.$$eval('#opttabs .loctab:not(.loctab-add)', (e) => e.length)) === 3);
    check('kopien lægges sidst', /^C/.test(await p.$eval('#opttabs .loctab.active', (e) => e.textContent)));
    await p.close();
  }
  {
    const p = await newPage(browser, { muligheder: true, lokationer: true });
    check('begge paneler vises når begge er valgt',
      (await p.isVisible('#panel_muligheder')) && (await p.isVisible('#panel_lokationer')));
    check('lokationerne står over mulighederne', await p.evaluate(() => {
      const l = document.getElementById('panel_lokationer'), m = document.getElementById('panel_muligheder');
      return !!(l.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING);
    }));
    const antalMuligheder = () => p.$$eval('#opttabs .loctab:not(.loctab-add)', (e) => e.length);

    // Mulighederne hører til lokationen, og man bliver stående i den.
    await p.fill('#l_name', 'Aarhus C');
    await p.click('[data-qwrap="m_sot"] button:last-child'); await p.waitForTimeout(120);
    await p.click('#opttabs .loctab-add'); await p.waitForTimeout(250);
    await str(p, 'm_tab11');
    await p.click('[data-qwrap="m_tab11"] button:last-child'); await p.waitForTimeout(120);
    check('lokationen har to muligheder', (await antalMuligheder()) === 2);
    check('man bliver stående i lokationen, når man laver muligheder',
      (await p.inputValue('#l_name')) === 'Aarhus C');

    // En ny lokation starter helt tom.
    await p.click('#loctabs .loctab-add'); await p.waitForTimeout(250);
    check('en ny lokation starter med én tom mulighed',
      (await antalMuligheder()) === 1 && (await p.inputValue('#qty_m_sot')) === '0');

    // Kopiér lokation tager mulighederne med.
    await p.click('#loctabs .loctab:nth-child(1)'); await p.waitForTimeout(250);
    await p.click('#loctabs .loctab-kopi'); await p.waitForTimeout(300);
    check('kopiér lokation tager mulighederne med', (await antalMuligheder()) === 2);
    check('kopien af lokationen lægges sidst',
      /^3/.test(await p.$eval('#loctabs .loctab.active', (e) => e.textContent)));

    // Lokationer og muligheder betjenes ens: "+" og "Kopiér" i fanerækken,
    // navnefelt og "Slet" under den, og nummer eller bogstav på fanen.
    check('lokationer og muligheder har de samme knapper', await p.evaluate(() => {
      const ens = (faner, panel) => !!(document.querySelector(`${faner} .loctab-add:not(.loctab-kopi)`)
        && document.querySelector(`${faner} .loctab-kopi`)
        && document.querySelector(`${panel} .minibtn.danger`)
        && document.querySelector(`${faner} .loctab:not(.loctab-add) .tab-n`));
      return ens('#loctabs', '#panel_lokationer') && ens('#opttabs', '#panel_muligheder');
    }));
    await p.click('#opttabs .loctab:nth-child(2)'); await p.waitForTimeout(250);
    check('... med deres opsætning', (await p.inputValue('#qty_m_tab11')) === '1');
    await p.close();
  }

  /* ---------- 6: kundens eget udstyr ---------- */
  console.log('\n# Jeres eget udstyr');
  {
    const p = await newPage(browser);
    await p.fill('#c_company', 'Restaurant Havnen ApS');
    await p.fill('#c_seller', 'Rask');

    // Genbrugsscenariet fra buddet: SOT + betalingsterminal + KDS er nyt,
    // to 11" tablets og LAN-printeren har kunden i forvejen.
    await plus(p, 'm_sot', 1);
    await plus(p, 'm_termstat', 1);
    await plus(p, 'm_kds185', 1);
    await plus(p, 'eget_m_tab11', 2);
    await plus(p, 'eget_m_lan', 1);
    await p.waitForTimeout(400);

    // Kun det nye koster noget.
    const HW = 13995 + 1995 + 5995;
    const row = await p.$$eval('#quote-doc table.loc-overview tfoot td',
      (td) => td.map((t) => t.textContent.trim()));
    check('eget udstyr koster ingenting', kr(row[1]) === HW, `${row[1]} vs ${HW}`);

    // ... men tæller med i licenserne: 1 SOT + 2 egne tablets = 3 POS.
    // Den stationære betalingsterminal udløser stadig ingen licens.
    const posQty = await p.$$eval('#quote-doc table.pv tbody tr', (rows) => {
      const r = rows.find((x) => /POS & SOT licens/.test(x.cells[0].textContent));
      return r ? r.cells[1].textContent.trim() : null;
    });
    check('eget udstyr tæller med i licenserne', posQty === '3',
      `POS-licenser: ${posQty} (forventet 3 = 1 SOT + 2 egne tablets)`);
    const LIC = 3 * 15 + 7.5;   // 3 POS + 1 KDS
    check('licens/dag stemmer med eget udstyr', kr(row[2]) === LIC, `${row[2]} vs ${LIC}`);

    // Specifikationen skal vise det, så kunden kan se vi har regnet med det.
    const dok = await p.$eval('#quote-doc', (e) => e.textContent.replace(/\s+/g, ' '));
    check('eget udstyr står i specifikationen', /Jeres eget/.test(dok));
    // Byggeren er sælgerens side: "Kundens egne". Tilbuddet er kundens: "Jeres eget".
    check('byggeren siger "Kundens egne", tilbuddet "Jeres eget"', await p.evaluate(() => {
      const mrk = [...document.querySelectorAll('.layout > div:first-child .qty-mrk.mrk-eget')];
      return mrk.length > 0 && mrk.every((m) => m.textContent.trim() === 'Kundens egne')
        && !/Kundens egne/.test(document.getElementById('quote-doc').textContent);
    }));
    check('eget udstyr står til 0', await p.$eval('#quote-doc', (e) => {
      const r = [...e.querySelectorAll('tr.eget')];
      return r.length === 2 && r.every((x) => /^0,-$/.test(x.cells[3].textContent.trim()));
    }));
    // Det man køber skal stå samlet — eget udstyr hører nederst i tabellen.
    check('eget udstyr står nederst i hardwaretabellen', await p.$eval('#quote-doc', (e) => {
      // Tabellens navn står i første kolonne af header-rækken — se CLAUDE.md.
      const t = [...e.querySelectorAll('table.pv')]
        .find((x) => /^Hardware$/.test(x.querySelector('thead th')?.textContent.trim() || ''));
      if (!t) return false;
      const r = [...t.querySelectorAll('tbody tr')];
      const foerste = r.findIndex((x) => x.classList.contains('eget'));
      return foerste > 0 && r.slice(foerste).every((x) => x.classList.contains('eget'));
    }));
    check('licensforbeholdet nævner eget udstyr',
      /jeres eget udstyr også kræver licens/.test(dok));

    // Samme produkt både nyt og eget — så skal det nye mærkes "Ny".
    await plus(p, 'm_tab11', 1);
    await p.waitForTimeout(400);
    const mrk = await p.$$eval('#quote-doc .pv-mrk', (e) => e.map((x) => x.textContent.trim()));
    check('nyt eksemplar mærkes "Ny" når kunden også har eget',
      mrk.filter((m) => m === 'Ny').length === 1, mrk.join(', '));
    const posQty2 = await p.$$eval('#quote-doc table.pv tbody tr', (rows) => {
      const r = rows.find((x) => /POS & SOT licens/.test(x.cells[0].textContent));
      return r ? r.cells[1].textContent.trim() : null;
    });
    check('den ekstra tablet tæller også med', posQty2 === '4', posQty2);

    // Kundens eget tilbehør: gratis, udløser ingen licens, og står under det egne udstyr.
    await plus(p, 'eget_a_tab11_desktop', 2);
    await p.waitForTimeout(400);
    const row2 = await p.$$eval('#quote-doc table.loc-overview tfoot td',
      (td) => td.map((t) => t.textContent.trim()));
    check('eget tilbehør koster ingenting', kr(row2[1]) === HW + 2995, `${row2[1]} vs ${HW + 2995}`);
    check('eget tilbehør udløser ingen licens', kr(row2[2]) === 4 * 15 + 7.5, row2[2]);
    check('eget tilbehør står under det egne udstyr', await p.$eval('#quote-doc', (e) => {
      const r = [...e.querySelectorAll('tr.eget')].map((x) => x.cells[0].textContent.replace(/\s+/g, ' ').trim());
      const i = r.findIndex((t) => /^11" POS Tablet/.test(t));
      return i > -1 && /Desktop Base/.test(r[i + 1] || '') && /Jeres eget/.test(r[i + 1] || '');
    }));

    // Pengeskuffe kan vælges til alle kasseskærme og tablets.
    check('pengeskuffe kan vælges til alle tablets', await p.evaluate(() =>
      ['pos154', 'tab87', 'tab11', 'tab14'].every((id) => !!document.querySelector(`[data-qwrap="a_${id}_drawer"]`))));

    // Kundens eget løse tilbehør: 0,- og nederst i tilbehørstabellen.
    if (await p.$('.panel.fold.closed > h2')) { await p.click('.panel.fold.closed > h2'); await p.waitForTimeout(150); }
    await plus(p, 'x_hand', 1);
    await plus(p, 'eget_x_drawer', 1);
    await p.waitForTimeout(400);
    const row3 = await p.$$eval('#quote-doc table.loc-overview tfoot td',
      (td) => td.map((t) => t.textContent.trim()));
    check('eget løst tilbehør koster ingenting', kr(row3[1]) === HW + 2995 + 195, `${row3[1]} vs ${HW + 2995 + 195}`);
    check('eget løst tilbehør står nederst i tilbehørstabellen', await p.$eval('#quote-doc', (e) => {
      const t = [...e.querySelectorAll('table.pv')]
        .find((x) => /^Ekstra tilbehør$/.test(x.querySelector('thead th')?.textContent.trim() || ''));
      if (!t) return false;
      const r = [...t.querySelectorAll('tbody tr')];
      return r.length === 2 && !r[0].classList.contains('eget') && r[1].classList.contains('eget')
        && /Pengeskuffe/.test(r[1].textContent) && /^0,-$/.test(r[1].cells[3].textContent.trim());
    }));

    const pg = await paginate(p);
    check('intet indhold i sidefoden', pg.bad.length === 0, pg.bad.join('; '));
    await p.close();
  }

  /* ---------- 7: muligheder i dokumentet ---------- */
  console.log('\n# Muligheder i dokumentet');
  {
    const p = await newPage(browser, { muligheder: true });
    await p.fill('#c_company', 'Restaurant Havnen ApS');
    await p.fill('#c_contact', 'Line Mikkelsen');
    await p.fill('#c_seller', 'Rask');
    const saet = (k, n) => saetAntal(p, k, n);

    // Buddets tre muligheder. Fælles for dem alle: SOT med gulvstander og
    // terminalbeslag, stationær terminal og Takeaway.
    const faelles = async () => {
      await saet('m_sot', 1); await saet('a_sot_floor', 1); await saet('a_sot_term_holder', 1);
      await saet('m_termstat', 1);
      await saet('s_takeaway', 1);
    };
    // 1 Genbrug: kunden beholder to 11" tablets og LAN-printeren.
    await p.fill('#o_navn', 'Genbrug');
    await faelles();
    await saet('m_kds185', 1); await saet('a_kds185_vesa', 1);
    await saet('eget_m_tab11', 2); await saet('eget_m_lan', 1);

    // 2 Opgradering: som Genbrug plus én ny tablet med base. Anbefalet.
    await p.click('#opttabs .loctab-add'); await p.waitForTimeout(250);
    await p.fill('#o_navn', 'Opgradering');
    await faelles();
    await saet('m_kds185', 1); await saet('a_kds185_vesa', 1);
    await saet('eget_m_tab11', 2); await saet('eget_m_lan', 1);
    await saet('m_tab11', 1); await saet('a_tab11_desktop', 1);
    await p.check('#o_anbefalet');

    // 3 Alt nyt.
    await p.click('#opttabs .loctab-add'); await p.waitForTimeout(250);
    await p.fill('#o_navn', 'Alt nyt');
    await faelles();
    await saet('m_tab14', 3); await saet('a_tab14_multi', 3);
    await saet('m_kds22', 1); await saet('a_kds22_vesa', 1);
    await saet('m_termmobil', 1); await saet('a_termmobil_cradle', 1);
    await saet('m_wifi', 1); await saet('s_bi', 1);
    await p.waitForTimeout(400);

    check('sammenligningen står i dokumentet', !!(await p.$('#quote-doc table.sml')));
    const kol = await p.$$eval('#quote-doc table.sml th.sml-opt', (th) => th.map((t) => t.textContent));
    check('én kolonne pr. mulighed', kol.length === 3, kol.join(' | '));

    // Kontroltallene er buddets egne — og håndregnet ud fra js/data.js:
    // 1: 13995+2495+495+1995+5995+995 = 25.970; (3×15+7,5)×30+495 = 2.070
    // 2: 25.970+2995+995 = 29.960;               (4×15+7,5)×30+495 = 2.520
    // 3: 48.825;                                  (5×15+7,5)×30+495+299 = 3.269
    const fod = await p.$$eval('#quote-doc table.sml tfoot tr',
      (rows) => rows.map((r) => [...r.cells].slice(1).map((c) => c.textContent.trim())));
    check('engangs pr. mulighed stemmer med buddet', fod[0].map(kr).join() === '25970,29960,48825', fod[0].join(' / '));
    check('løbende pr. måned stemmer med buddet', fod[1].map(kr).join() === '2070,2520,3269', fod[1].join(' / '));

    const anb = await p.$$eval('#quote-doc table.sml th.anb', (th) => th.map((t) => t.textContent));
    check('den anbefalede kolonne er fremhævet',
      anb.length === 1 && /Opgradering/.test(anb[0]) && /Vi anbefaler/.test(anb[0]), anb.join(' | '));

    // Rækkerne bygges af SAMMENLIGNING i js/data.js. Kontrolværdierne er buddets forside.
    const kat = await p.$$eval('#quote-doc table.sml tr.sml-kat', (r) => r.map((x) => x.textContent.trim()));
    check('kategorierne står i buddets rækkefølge',
      kat.join() === 'Kasse og bestilling,Køkken,Betaling,Software og licens', kat.join(' / '));
    const sml = await p.$$eval('#quote-doc table.sml tbody tr:not(.sml-kat)', (rows) => Object.fromEntries(
      rows.map((r) => [r.cells[0].textContent.trim(), [...r.cells].slice(1).map((c) => c.textContent.trim())])));
    const raekke = (navn, forventet) => check(`rækken ${navn}`,
      (sml[navn] || []).join(' | ') === forventet.join(' | '), (sml[navn] || ['mangler']).join(' | '));
    raekke('Selvbetjeningsterminal', ['1', '1', '1']);
    // Eget udstyr i rækken giver ny/jeres; forskellige størrelser giver størrelsen.
    raekke('Bemandede kassepladser', ['2 jeres 11"', '2 jeres + 1 ny 11"', '3 nye 14"']);
    raekke('Holder eller base til kassetablet', ['–', '1', '3']);
    // Ingen eget udstyr i rækken: kun størrelsen, og et ettal alene udelades.
    raekke('Køkkenskærm (KDS)', ['18.5"', '18.5"', '22"']);
    raekke('Bonprinter', ['Jeres LAN', 'Jeres LAN', 'Ny WiFi']);
    raekke('Stationær betalingsterminal', ['1', '1', '1']);
    raekke('Mobil betalingsterminal', ['–', '–', '1']);
    // QR følger Takeaway i alle tre, så de deler række.
    raekke('Takeaway og QR bestilling', ['✓', '✓', '✓']);
    raekke('BI', ['–', '–', '✓']);
    raekke('POS & SOT licens (inkl. jeres eget udstyr)', ['3', '4', '5']);
    raekke('KDS licens', ['1', '1', '1']);
    check('rækker uden indhold udelades', !('Pengeskuffe' in sml), Object.keys(sml).join(', '));
    // Et produkt uden række ville være usynligt på forsiden.
    const udenRaekke = await p.evaluate(() => CATALOG.map((x) => x.id)
      .filter((id) => !SAMMENLIGNING.some((k) => k.raekker.some((r) => r.produkter && id in r.produkter))));
    check('alle produkter har en række i sammenligningen', udenRaekke.length === 0, udenRaekke.join(', ') || 'alle');

    const pos = await p.$$eval('#quote-doc .opt-block', (blks) => blks.map((b) => {
      const r = [...b.querySelectorAll('tbody tr')].find((x) => /POS & SOT licens/.test(x.cells[0].textContent));
      return r ? r.cells[1].textContent.trim() : null;
    }));
    check('én blok pr. mulighed', pos.length === 3, `${pos.length} blokke`);
    check('eget udstyr tæller med i hver muligheds licenser', pos.join() === '3,4,5', pos.join(' / '));
    // Prisen står i opsummeringen og sammenligningen — ikke i bjælken.
    check('mulighedens bjælke viser ikke prisen',
      await p.$eval('#quote-doc .opt-block .loc-head', (e) => !/,-/.test(e.textContent)));
    check('mulighedens opsummering viser prisen',
      await p.$eval('#quote-doc .opt-block .loc-sub', (e) => /25\.970,-/.test(e.textContent) && /2\.070,-/.test(e.textContent)));
    // Muligheder har ingen egen beskrivelse — hverken i byggeren eller i tilbuddet.
    check('muligheder har ingen beskrivelse',
      !(await p.$('#o_intro')) && !(await p.$('#quote-doc .opt-tekst')));

    const dok = await p.$eval('#quote-doc', (e) => e.textContent.replace(/\s+/g, ' '));
    check('ingen "Sådan siger I ja"-boks', !/Sådan siger I ja/i.test(dok));
    check('licensforbeholdet står på forsiden', /I betaler kun for de dage, terminalen er slået til\./.test(dok));
    check('indløsning står på forsiden', /Indløsning, fysisk betaling: Aftales efter dialog\./.test(dok)
      && /Indløsning, online betaling: Aftales efter dialog\./.test(dok));

    const order = await p.$$eval('#quote-doc .qp-content > *',
      (els) => els.map((e) => e.className.split(' ')[0] || e.tagName.toLowerCase()));
    check('sammenligningen står før mulighederne',
      order.indexOf('pv') > -1 && order.indexOf('pv') < order.indexOf('loc-block'), order.join(' → '));
    // Ingen tvungne sideskift — specifikationerne følger efter hinanden.
    const navne = await p.$$eval('#quote-doc .opt-block .lh-name', (e) => e.map((x) => x.textContent));
    check('mulighederne følger efter hinanden uden sideskift',
      !order.includes('pg-break') && navne.join() === 'Genbrug,Opgradering,Alt nyt', navne.join(' / '));
    // Afslutning og hilsen står til sidst i hele tilbuddet, som i et almindeligt tilbud.
    check('afslutning og hilsen står til sidst i tilbuddet',
      order.slice(-2).join() === 'qp-note,qp-greet' && order.indexOf('qp-note') > order.lastIndexOf('loc-block'),
      order.join(' → '));

    const pg = await paginate(p);
    check('sidetal på alle sider', pg.feet.every((f, i) => f === `Side ${i + 1} af ${pg.n}`), pg.feet.join(' / '));
    check('hilsen står på sidste side', pg.hilsenSidst);
    check('intet indhold i sidefoden', pg.bad.length === 0, pg.bad.join('; '));
    await p.close();
  }
  {
    // Kun én mulighed med indhold: intet at sammenligne, så det er et almindeligt tilbud.
    const p = await newPage(browser, { muligheder: true });
    await p.fill(`#qty_m_sot`, '1');
    await p.waitForTimeout(300);
    check('én mulighed med indhold giver ingen sammenligning', !(await p.$('#quote-doc table.sml')));
    check('... men et almindeligt prisoverblik', !!(await p.$('#quote-doc table.loc-overview')));
    await p.close();
  }

  /* ---------- 8: flere lokationer med muligheder ---------- */
  console.log('\n# Lokationer med muligheder');
  {
    const p = await newPage(browser, { muligheder: true, lokationer: true });
    await p.fill('#c_company', 'Kaffe & Co ApS');
    await p.fill('#c_seller', 'Rask');
    const saet = (k, n) => saetAntal(p, k, n);

    // Aarhus C: Genbrug (SOT + 2 egne tablets) og Alt nyt (SOT + 2 nye 14").
    await p.fill('#l_name', 'Aarhus C');
    await p.fill('#o_navn', 'Genbrug');
    await saet('m_sot', 1); await saet('eget_m_tab11', 2);
    await p.click('#opttabs .loctab-add'); await p.waitForTimeout(250);
    await p.fill('#o_navn', 'Alt nyt');
    await saet('m_sot', 1); await saet('m_tab14', 2);
    // Risskov: kun én opsætning.
    await p.click('#loctabs .loctab-add'); await p.waitForTimeout(250);
    await p.fill('#l_name', 'Risskov');
    await saet('m_tab11', 1);
    await p.waitForTimeout(400);

    // Prisoverblikket øverst: hver mulighed under sin lokation.
    // Aarhus/Genbrug 13.995 (3 POS), Aarhus/Alt nyt 13.995+2×4.495 = 22.985, Risskov 2.995.
    check('prisoverblikket står øverst',
      await p.$eval('#quote-doc .qp-content > table', (t) => t.classList.contains('loc-overview')));
    const overblik = await p.$$eval('#quote-doc table.loc-overview tbody tr',
      (rows) => rows.map((r) => [...r.cells].map((c) => c.textContent.replace(/\s+/g, ' ').trim()).join(' | ')));
    check('prisoverblikket viser mulighederne under deres lokation',
      overblik.length === 4 && /Aarhus C/.test(overblik[0]) && /Genbrug \| 13\.995,-/.test(overblik[1])
        && /Alt nyt \| 22\.985,-/.test(overblik[2]) && /Risskov \| 2\.995,-/.test(overblik[3]),
      overblik.join(' // '));
    check('ingen samlet total, når en lokation har muligheder',
      !(await p.$('#quote-doc table.loc-overview tfoot')));

    const order = await p.$$eval('#quote-doc .qp-content > *',
      (els) => els.map((e) => e.className.split(' ')[0] || e.tagName.toLowerCase()));
    const titler = await p.$$eval('#quote-doc .lok-titel', (e) => e.map((x) => x.textContent.trim()));
    check('hver lokation har sin overskrift', titler.join() === '1Aarhus C,2Risskov', titler.join(' / '));
    // Under Aarhus C: sammenligningen og så de to muligheders blokke.
    const aarhus = order.slice(order.indexOf('lok-titel'), order.lastIndexOf('lok-titel'));
    check('lokationen får sin sammenligning og én blok pr. mulighed',
      aarhus.join() === 'lok-titel,pv,loc-block,loc-block', aarhus.join(' → '));
    check('sammenligningen gælder kun lokationens muligheder',
      (await p.$$eval('#quote-doc table.sml th.sml-opt', (th) => th.map((t) => t.textContent))).join() === 'AGenbrug,BAlt nyt');
    // Muligheder har bogstaver, lokationer tal — ellers blandes "1 Genbrug" og "1 Aarhus C" sammen.
    check('muligheder har bogstaver, ikke tal', await p.$eval('#quote-doc', (e) =>
      [...e.querySelectorAll('.lo-n.bogstav, .lh-n.bogstav')].every((x) => /^[A-D]$/.test(x.textContent))
      && [...e.querySelectorAll('.lok-titel .lo-n')].every((x) => /^\d+$/.test(x.textContent))));
    const risskov = order.slice(order.lastIndexOf('lok-titel'));
    check('en lokation med én opsætning får en almindelig specifikation',
      risskov.slice(0, 2).join() === 'lok-titel,loc-block' && !risskov.includes('pv'), risskov.join(' → '));
    check('afslutning og hilsen står til sidst', order.slice(-2).join() === 'qp-note,qp-greet', order.join(' → '));

    const pg = await paginate(p);
    check('sidetal på alle sider', pg.feet.every((f, i) => f === `Side ${i + 1} af ${pg.n}`), pg.feet.join(' / '));
    check('intet indhold i sidefoden', pg.bad.length === 0, pg.bad.join('; '));
    await p.close();
  }

  /* ---------- 9: størrelsesvælger ---------- */
  console.log('\n# Størrelsesvælger');
  {
    const p = await newPage(browser, { muligheder: true });
    // Knapperne på det kort, der indeholder produktet.
    const knapper = (pid) => p.$eval(`#catalog [data-strknap="${pid}"]`, (b) =>
      [...b.closest('.group').querySelectorAll('.str-knap')].map((x) => x.textContent).join());
    check('de tre tablets står i ét kort', (await knapper('tab87')) === '8.7",11",14"');
    check('de to KDS-skærme står i ét kort', (await knapper('kds185')) === '18.5",22"');
    // LAN og WiFi er to forskellige printere, ikke to størrelser.
    check('printerne har hver sit kort', !(await p.$('#catalog [data-strknap="lan"], #catalog [data-strknap="wifi"]')));
    check('ét kort pr. produkt i flere størrelser',
      (await p.$$eval('#catalog > .group', (g) => g.filter((x) => x.querySelector('[data-strknap]')).length)) === 2);
    check('kun én størrelse vises ad gangen', await p.$$eval('#catalog > .group', (g) => g.every((x) =>
      !x.querySelector('[data-strknap]') || [...x.querySelectorAll('.prod-right[data-variant]')].filter((e) => !e.hidden).length === 1)));

    // Hver størrelse har sine egne antal — og kan stå i samme tilbud.
    await plus(p, 'm_tab11', 2);
    await plus(p, 'a_tab11_hand', 1);
    await plus(p, 'm_tab14', 1);
    await p.waitForTimeout(300);
    check('størrelserne har hver sit antal',
      (await p.inputValue('#qty_m_tab11')) === '2' && (await p.inputValue('#qty_m_tab14')) === '1');
    check('tilbehøret følger størrelsen', (await p.inputValue('#qty_a_tab11_hand')) === '1'
      && (await p.inputValue('#qty_a_tab14_hand')) === '0');
    check('knapperne viser antal pr. størrelse',
      (await knapper('tab87')) === '8.7",11"2,14"1');
    const row = await p.$$eval('#quote-doc table.loc-overview tfoot td', (td) => td.map((t) => t.textContent.trim()));
    check('begge størrelser står i tilbuddet med hver sin pris', kr(row[1]) === 2 * 2995 + 195 + 4495, row[1]);
    check('begge størrelser udløser licens', kr(row[2]) === 3 * 15, row[2]);

    // Kortet tegnes forfra ved fane-skift. Har den valgte størrelse indhold, bliver den.
    const aktiv = () => p.$eval('#catalog [data-strknap="tab87"]', (b) =>
      b.closest('.group').querySelector('.str-knap.active').dataset.strknap);
    await p.click('#opttabs .loctab:nth-child(1)'); await p.waitForTimeout(250);
    check('den valgte størrelse bliver, når den har indhold', (await aktiv()) === 'tab14');
    // En ny mulighed med kun 8.7": kortet springer selv til den størrelse, der har indhold.
    await p.click('#opttabs .loctab-add'); await p.waitForTimeout(250);
    await plus(p, 'm_tab87', 1);
    await p.click('#opttabs .loctab:nth-child(1)'); await p.waitForTimeout(250);
    check('kortet springer til første størrelse med indhold', (await aktiv()) === 'tab11');
    await p.click('#opttabs .loctab:nth-child(2)'); await p.waitForTimeout(250);
    check('... også i den anden mulighed', (await aktiv()) === 'tab87');
    await p.close();
  }

  /* ---------- 10: sprog i tilbuddet ---------- */
  console.log('\n# Sprog i tilbuddet');
  {
    const fs = require('fs');
    const js = (f) => fs.readFileSync(path.resolve(__dirname, '..', 'public', 'bygger', 'js', f), 'utf8');
    // Alle faste tekster i dokumentet går gennem t('…'). Nøglerne hentes fra
    // kildekoden, så en ny tekst uden oversættelse fanges her.
    const tKald = [...new Set(['quote.js', 'print.js', 'app.js']
      .flatMap((f) => [...js(f).matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)].map((m) => m[1])))];

    const p = await newPage(browser, { muligheder: true, lokationer: true });
    const tjek = await p.evaluate((tKald) => {
      const noegler = new Set(OVERSAETTELSER.map((r) => r[0]));
      const data = [];
      CATALOG.forEach((x) => data.push(x.name, x.desc));
      Object.values(ACCESSORIES).forEach((x) => data.push(x.name, x.desc));
      Object.values(LICENSE_TYPES).forEach((x) => data.push(x.name));
      MODULES.forEach((x) => data.push(x.name, x.desc));
      SAMMENLIGNING.forEach((k) => { data.push(k.kategori); k.raekker.forEach((r) => data.push(r.navn)); });
      return {
        mangler: [...new Set([...data, ...tKald])].filter((d) => !noegler.has(d)),
        ufuldstaendige: OVERSAETTELSER.filter((r) => r.length !== 5 || r.some((x) => !x)).map((r) => r[0]),
        dubletter: OVERSAETTELSER.map((r) => r[0]).filter((d, i, a) => a.indexOf(d) !== i),
        noter: SPROG_RAEKKEFOELGE.filter((l) => !standardNote(l)),
        valg: [...document.querySelectorAll('#c_sprog option')].map((o) => o.value).join(),
      };
    }, tKald);
    check('alle tekster har en oversættelse', tjek.mangler.length === 0, tjek.mangler.join(' | '));
    check('alle rækker har fem sprog', tjek.ufuldstaendige.length === 0, tjek.ufuldstaendige.join(' | '));
    check('ingen tekst står to gange', tjek.dubletter.length === 0, tjek.dubletter.join(' | '));
    check('standardteksten findes på alle sprog', tjek.noter.length === 0, tjek.noter.join());
    check('sprogvalget har de fem sprog', tjek.valg === 'da,en,nb,sv,de', tjek.valg);
    check('dansk er standard', (await p.inputValue('#c_sprog')) === 'da');

    // Et tilbud der rammer de fleste tekster: to lokationer, muligheder med
    // eget udstyr, licenser, moduler (QR inkluderet i Takeaway) og løst tilbehør.
    const saet = (k, n) => saetAntal(p, k, n);
    await p.fill('#c_company', 'Cafe Nord AS');
    await p.fill('#c_contact', 'Ola Nordmann');
    await p.fill('#c_seller', 'Rask');
    await saet('m_sot', 1); await saet('a_sot_floor', 1); await saet('eget_m_tab11', 2);
    await saet('m_kds185', 1); await saet('s_takeaway', 1); await saet('s_bi', 1);
    if (await p.$('.panel.fold.closed > h2')) { await p.click('.panel.fold.closed > h2'); await p.waitForTimeout(150); }
    await saet('x_drawer', 1);
    await p.click('#opttabs .loctab-add'); await p.waitForTimeout(250);
    await saet('m_sot', 1); await saet('m_tab14', 2); await saet('a_tab14_hand', 2); await saet('m_termstat', 1);
    await p.check('#o_anbefalet'); await p.waitForTimeout(100);
    await p.click('#loctabs .loctab-add'); await p.waitForTimeout(250);
    await saet('m_lan', 1); await saet('eget_m_wifi', 1);
    await p.waitForTimeout(300);

    const note = () => p.inputValue('#c_note');
    const tekst = () => p.$eval('#quote-doc', (e) => e.innerText);
    const danskNote = await note();
    for (const l of ['en', 'nb', 'sv', 'de']) {
      await p.selectOption('#c_sprog', l); await p.waitForTimeout(200);
      const r = await p.evaluate((l) => {
        const doc = document.getElementById('quote-doc');
        const txt = doc.innerText;
        // Danske tekster, der er anderledes på sproget, må ikke stå i dokumentet.
        // Korte ord ("ny", "og") springes over — de findes også inde i andre ord.
        const rester = OVERSAETTELSER.filter((r) => r[0].length > 6 && r[0] !== TEKST[l][r[0]])
          .map((r) => r[0].replace(/<\/?b>/g, '').split('{')[0].trim())
          .filter((d) => d.length > 6 && txt.includes(d));
        return { rester, lang: doc.lang, note: document.getElementById('c_note').value === standardNote(l) };
      }, l);
      check(`${l}: ingen dansk tekst i tilbuddet`, r.rester.length === 0, r.rester.join(' | '));
      check(`${l}: dokumentet har sprogkoden`, r.lang === l, r.lang);
    check(`${l}: ingen lang tankestreg i tilbuddet`, !(await tekst()).includes('—'));
      check(`${l}: standardteksten skifter sprog`, r.note);
      const pg = await paginate(p);
      check(`${l}: sidetal og intet i sidefoden`, pg.bad.length === 0 && pg.n > 1, pg.feet.join(' / ') + ' ' + pg.bad.join('; '));
    }
    const de = await tekst();
    check('de: sidehoved, datoer og forbehold', /ANGEBOT/.test(de) && /Gültig bis:/.test(de)
      && /Kartenakzeptanz, Zahlung vor Ort: Nach Absprache\./.test(de)
      && /Kartenakzeptanz, Online-Zahlung: Nach Absprache\./.test(de) && /zzgl\. MwSt\./.test(de), de.slice(0, 200));
    check('adressen følger ikke sproget', de.includes('Åboulevarden 69, 8000 Aarhus C\n') && !/Dänemark|Denmark/.test(de));
    check('de: sidetal på tysk', (await paginate(p)).feet[0].startsWith('Seite 1 von'));
    check('de: navne sælgeren ikke har rettet, følger sproget', /Option A/.test(de) && /Standort 2/.test(de));
    check('de: sælgerens egen tekst oversættes ikke', /Guten Tag Ola Nordmann,/.test(de) && /Rask/.test(de));
    check('de: filnavnet følger sproget', (await p.evaluate(() => quoteFilename())).startsWith('Angebot-'));
    await p.selectOption('#c_sprog', 'en'); await p.waitForTimeout(200);
    // Vejnavnet i afsenderadressen er undtaget — det er et navn, ikke dansk tekst.
    check('en: ingen æ, ø eller å', !/[æøåÆØÅ]/.test((await tekst()).replaceAll('Åboulevarden', '')));

    // En rettet afslutning er sælgerens egen tekst og følger ikke sproget.
    await skrivNote(p, 'Looking forward to hearing from you.');
    await p.selectOption('#c_sprog', 'sv'); await p.waitForTimeout(200);
    check('en rettet afslutning skifter ikke sprog', (await note()) === 'Looking forward to hearing from you.');
    await skrivNote(p, await p.evaluate(() => standardNote('sv')));
    await p.selectOption('#c_sprog', 'da'); await p.waitForTimeout(200);
    check('da: ingen lang tankestreg i tilbuddet', !(await tekst()).includes('—'));
    check('tilbage på dansk er alt som før', (await note()) === danskNote && /TILBUD/.test(await tekst())
      && /Mulighed A/.test(await tekst()));

    check('sprogvælgeren står i preview-bjælken med flag', await p.$eval('#c_sprog', (e) =>
      !!e.closest('.panel h2') && /Tilbudspreview/.test(e.closest('h2').textContent)
      && [...e.options].map((o) => o.textContent).join() === '🇩🇰 Dansk,🇬🇧 English,🇳🇴 Norsk,🇸🇪 Svenska,🇩🇪 Deutsch'));

    // Nyt tilbud: sproget går tilbage til dansk, ligesom resten af kundeoplysningerne.
    await p.click('button:has-text("+ Nyt tilbud")'); await p.waitForTimeout(300);
    check('nyt tilbud starter på dansk', (await p.inputValue('#c_sprog')) === 'da' && (await note()) === danskNote);
    await p.close();
  }

  /* ---------- 11: obligatoriske felter og åbningen ---------- */
  console.log('\n# Obligatoriske felter');
  {
    const p = await newPage(browser);
    await plus(p, 'm_sot', 1);
    await p.waitForTimeout(150);
    // Uden navn åbner brevet med "Hej," — ikke "Hej der,".
    check('uden navn åbner brevet med "Hej,"', (await p.textContent('#quote-doc .qp-hej')) === 'Hej,');
    await p.fill('#c_contact', 'Mette Sørensen'); await p.waitForTimeout(200);
    check('med navn åbner brevet med navnet', (await p.textContent('#quote-doc .qp-hej')) === 'Hej Mette Sørensen,');

    // Rollen er til CRM'et og må ikke stå i tilbuddet.
    check('rollen står ved siden af kontaktpersonen', await p.evaluate(() => {
      const k = document.getElementById('c_contact').getBoundingClientRect();
      const r = document.getElementById('c_rolle').getBoundingClientRect();
      return Math.abs(k.top - r.top) < 2 && r.left > k.left && QUOTE_FIELDS.includes('c_rolle');
    }));
    await p.fill('#c_rolle', 'Driftschef Unik'); await p.waitForTimeout(250);
    check('rollen står ikke i tilbuddet', !/Driftschef Unik/.test(await p.textContent('#quote-doc')));

    const KRAV = ['c_company', 'c_cvr', 'c_contact', 'c_email', 'c_phone', 'c_addr', 'c_zip', 'c_city', 'c_seller'];
    check('de obligatoriske felter er markeret', await p.evaluate((krav) =>
      [...document.querySelectorAll('[data-krav]')].map((e) => e.id).sort().join() === [...krav].sort().join()
      && krav.every((id) => { const s = document.getElementById(id).closest('label').querySelector('.krav');
        // Stjernen står på linje med feltnavnet, ikke på sin egen linje.
        const navn = s && s.closest('.felt-navn');
        return s && navn && s.textContent === '*' && getComputedStyle(s).color === 'rgb(25, 138, 255)'
          && Math.abs(s.getBoundingClientRect().bottom - navn.getBoundingClientRect().bottom) < 4; }), KRAV));
    check('øvrige felter har ingen *', await p.evaluate(() =>
      ['c_date', 'c_indloesning', 'c_intro'].every((id) => !document.getElementById(id).closest('label').querySelector('.krav'))));

    // Eksporten stopper, når et obligatorisk felt er tomt.
    await p.evaluate(() => { window.print = () => { window.__printKaldt = true; }; });
    let besked = '';
    p.removeAllListeners('dialog');
    p.on('dialog', (d) => { besked = d.message(); d.accept(); });
    await p.click('button[onclick="exportPDF()"]'); await p.waitForTimeout(300);
    check('eksporten stopper ved tomme felter', !(await p.evaluate(() => window.__printKaldt)));
    check('beskeden siger hvilke felter der mangler', /Firma \/ kunde/.test(besked) && /Sælger/.test(besked)
      && !/Kontaktperson/.test(besked), besked.replace(/\n/g, ' '));
    check('de tomme felter markeres med rødt', await p.evaluate(() =>
      document.getElementById('c_company').classList.contains('mangler')
      && !document.getElementById('c_contact').classList.contains('mangler')));
    await p.fill('#c_company', 'Café Mikkeller ApS');
    check('markeringen forsvinder, når der skrives', !(await p.evaluate(() =>
      document.getElementById('c_company').classList.contains('mangler'))));

    for (const [id, val] of [['c_cvr', '12345678'], ['c_email', 'mette@mikkeller.dk'], ['c_phone', '12345678'],
      ['c_addr', 'Vesterbrogade 1'], ['c_zip', '1620'], ['c_city', 'København V'], ['c_seller', 'Rask']]) {
      await p.fill('#' + id, val);
    }
    await p.click('button[onclick="exportPDF()"]'); await p.waitForTimeout(800);
    check('med alle felter udfyldt eksporteres der', await p.evaluate(() => window.__printKaldt === true));
    await p.close();
  }

  /* ---------- brugt udstyr ---------- */
  console.log('\n# Brugt udstyr');
  {
    const p = await newPage(browser);
    for (const [id, val] of [['c_company', 'Café Brugt ApS'], ['c_cvr', '12345678'], ['c_contact', 'Mette'],
      ['c_email', 'mette@brugt.dk'], ['c_phone', '12345678'], ['c_addr', 'Vestergade 1'], ['c_zip', '8000'],
      ['c_city', 'Aarhus C'], ['c_seller', 'Rask']]) await p.fill('#' + id, val);

    const total = async () => (await p.$$eval('#quote-doc table.loc-overview tfoot td',
      (td) => td.map((t) => t.textContent.trim())));
    const prisfelt = (k) => `[data-brugtpris="${k}"]`;

    check('hvert produkt og tilbehør har en tæller til brugte', await p.evaluate(() =>
      [...document.querySelectorAll('[data-qwrap]')].filter((w) => /^eget_/.test(w.dataset.qwrap))
        .every((w) => !!document.querySelector(`[data-qwrap="brugt_${w.dataset.qwrap.slice(5)}"]`))));
    check('prisfeltet er skjult, til der er sat antal', !(await p.isVisible(prisfelt('m_lan'))));

    // Kun "Nye" står fremme. De to andre tællere er foldet sammen til knapper.
    check('tomme tællere til egne og brugte er foldet sammen', await p.evaluate(() =>
      [...document.querySelectorAll('[data-kortrow]')].every((r) => r.hidden)
      && [...document.querySelectorAll('.kortchip')].every((c) => !c.hidden)));
    await p.click('[data-chip="brugt_m_wifi"]'); await p.waitForTimeout(80);
    check('knappen folder tælleren ud, sætter 1 og stiller markøren i prisfeltet', await p.evaluate(() =>
      !document.querySelector('[data-kortrow="brugt_m_wifi"]').hidden
      && document.querySelector('[data-chip="brugt_m_wifi"]').hidden
      && qBrugt('m_wifi') === 1
      && document.activeElement === document.querySelector('[data-brugtpris="m_wifi"]')));
    await p.click('[data-qwrap="brugt_m_wifi"] button:first-child'); await p.waitForTimeout(80);
    check('tælleren bliver stående på 0, til kortene tegnes forfra', await p.evaluate(() => {
      const foer = !document.querySelector('[data-kortrow="brugt_m_wifi"]').hidden;
      renderAll();
      return foer && document.querySelector('[data-kortrow="brugt_m_wifi"]').hidden;
    }));

    // Én ny og to brugte 11" tablets plus en brugt LAN-printer.
    await plus(p, 'm_tab11', 1);
    await plus(p, 'brugt_m_tab11', 2);
    await plus(p, 'brugt_m_lan', 1);
    await p.waitForTimeout(400);
    check('prisfeltet kommer frem med antallet', await p.isVisible(prisfelt('m_lan')));
    check('uden pris er feltet markeret', await p.evaluate(() =>
      document.querySelector('[data-brugtpris="m_lan"]').classList.contains('mangler')));

    // Eksporten stopper, til prisen er sat.
    await p.evaluate(() => { window.print = () => { window.__printKaldt = true; }; });
    let besked = '';
    p.removeAllListeners('dialog');
    p.on('dialog', (d) => { besked = d.message(); d.accept(); });
    await p.click('button[onclick="exportPDF()"]'); await p.waitForTimeout(300);
    check('eksporten stopper uden pris på brugt udstyr', !(await p.evaluate(() => window.__printKaldt))
      && /Pris på brugt: LAN Printer/.test(besked) && /Pris på brugt: 11" POS Tablet/.test(besked),
      besked.replace(/\n/g, ' '));

    await p.fill(prisfelt('m_tab11'), '1500');
    await p.fill(prisfelt('m_lan'), '700');
    await p.waitForTimeout(400);
    // Håndregnet: 1 ny tablet 2995 + 2 brugte à 1500 + brugt printer 700.
    const HW = 2995 + 2 * 1500 + 700;
    let row = await total();
    check('brugt udstyr koster den pris, sælgeren har skrevet', kr(row[1]) === HW, `${row[1]} vs ${HW}`);
    // Tre tablets à 15,- pr. dag. Printeren udløser ingen licens.
    check('brugt udstyr udløser licens', kr(row[2]) === 3 * 15, row[2]);
    check('markeringen forsvinder, når prisen er sat', !(await p.evaluate(() =>
      document.querySelector('[data-brugtpris="m_lan"]').classList.contains('mangler'))));

    const linjer = await p.$$eval('#quote-doc table.pv:not(.loc-overview) tbody tr', (rows) =>
      rows.map((r) => [...r.cells].map((c) => c.textContent.replace(/\s+/g, ' ').trim())));
    const tab = linjer.filter((r) => /^11" POS Tablet/.test(r[0]));
    check('brugt står lige efter det nye, mærket "Brugt"', tab.length === 2
      && /Ny/.test(tab[0][0]) && /Brugt/.test(tab[1][0]), tab.map((r) => r[0]).join(' | '));
    check('den brugte linje viser stykpris og i alt', tab[1] && tab[1][1] === '2'
      && kr(tab[1][2]) === 1500 && kr(tab[1][3]) === 3000, (tab[1] || []).join(' | '));
    check('brugt udstyr er ikke dæmpet som kundens eget',
      (await p.$$('#quote-doc tr.eget')).length === 0);

    // Kundens eget tilbehør valgt under et købt produkt står som tilbehørslinje
    // under produktet — aldrig som sin egen hovedlinje. Her har kunden ingen egen
    // 11" tablet, så holderen står under den nye.
    await plus(p, 'eget_a_tab11_hand', 1);
    await p.waitForTimeout(400);
    check('eget tilbehør til et købt produkt står under produktet', await p.$eval('#quote-doc', (e) => {
      const r = [...e.querySelectorAll('table.pv:not(.loc-overview) tbody tr')];
      const i = r.findIndex((x) => /Hand Strap/.test(x.textContent));
      const foer = r.slice(0, i).reverse().find((x) => !x.classList.contains('acc'));
      return i > -1 && r[i].classList.contains('acc') && r[i].classList.contains('eget')
        && /Jeres eget/.test(r[i].textContent) && /^\s*11" POS Tablet/.test(foer.cells[0].textContent)
        && /Ny/.test(foer.cells[0].textContent);
    }));
    check('eget tilbehør under et produkt koster stadig ingenting', kr((await total())[1]) === HW);
    // Går produktet til 0, følger tilbehøret ikke med i tilbuddet som løs linje.
    check('tilbehør uden sit produkt står ikke i tilbuddet', await p.evaluate(() => {
      const d = collectFor({ qty: { a_tab11_hand: 1 }, eget: { a_tab11_desktop: 1 }, brugt: {} });
      return d.hw.length === 0 && d.oneOff === 0;
    }));

    // Brugt tilbehør og brugt løst tilbehør.
    await plus(p, 'brugt_a_tab11_desktop', 1);
    await p.fill(prisfelt('a_tab11_desktop'), '300');
    if (await p.$('.panel.fold.closed > h2')) { await p.click('.panel.fold.closed > h2'); await p.waitForTimeout(150); }
    await plus(p, 'brugt_x_hand', 2);
    await p.fill(prisfelt('x_hand'), '50');
    await p.waitForTimeout(400);
    row = await total();
    check('brugt tilbehør regnes med', kr(row[1]) === HW + 300 + 2 * 50, `${row[1]} vs ${HW + 400}`);

    // En kopieret mulighed tager de brugte og deres priser med.
    check('kopi af muligheden beholder brugt og pris', await p.evaluate(() => {
      const o = newOpt(2, M());
      return o.brugt.m_tab11 === 2 && o.brugtPris.m_tab11 === 1500 && o.brugt !== M().brugt;
    }));

    // På engelsk hedder mærkatet "Used".
    await p.evaluate(() => { document.getElementById('c_sprog').value = 'en'; skiftSprog(); });
    await p.waitForTimeout(300);
    check('mærkatet følger sproget', /Used/.test(await p.textContent('#quote-doc')));
    await p.evaluate(() => { document.getElementById('c_sprog').value = 'da'; skiftSprog(); });

    await p.click('button[onclick="exportPDF()"]'); await p.waitForTimeout(800);
    check('med pris på det brugte eksporteres der', await p.evaluate(() => window.__printKaldt === true));
    const pg = await paginate(p);
    check('brugt udstyr: intet løber ud over sidefoden', pg.bad.length === 0, pg.bad.join(', '));
    await p.close();
  }

  /* ---------- brugt udstyr i sammenligningen ---------- */
  {
    const p = await newPage(browser, { muligheder: true });
    await plus(p, 'm_tab11', 2);
    await p.evaluate(() => addOpt()); await p.waitForTimeout(150);
    await plus(p, 'brugt_m_tab11', 2);
    await p.fill('[data-brugtpris="m_tab11"]', '1500');
    await p.waitForTimeout(400);
    const celler = await p.$$eval('#quote-doc table.sml tbody tr', (rows) =>
      (rows.find((r) => /Bemandede kassepladser/.test(r.cells[0].textContent)) || { cells: [] }).cells
        ? [...rows.find((r) => /Bemandede kassepladser/.test(r.cells[0].textContent)).cells].map((c) => c.textContent.trim()) : []);
    check('sammenligningen skelner mellem nye og brugte', celler[1] === '2 nye' && celler[2] === '2 brugte', celler.join(' | '));
    await p.close();
  }

  await browser.close();
  console.log(`\n${ok.length} ok, ${fails.length} fejl`);
  if (fails.length) { console.error('\nFejlede:\n  ' + fails.join('\n  ')); process.exit(1); }
})();
