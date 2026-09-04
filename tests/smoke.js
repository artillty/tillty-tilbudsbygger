/* Regressionstest for tillty Tilbudsbygger.
   Kører tre scenarier i headless Chromium og fejler med exit-kode 1.

   Kontroltallene nedenfor er HÅNDREGNEDE ud fra js/data.js.
   Ændrer du priser, skal de rettes med — ellers tester vi ingenting. */

const path = require('path');
const { chromium } = require('playwright');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const fails = [];
const ok = [];

function check(name, cond, detail) {
  (cond ? ok : fails).push(name + (detail ? ` — ${detail}` : ''));
  console.log(`${cond ? '  ok  ' : ' FEJL '} ${name}${detail ? ' — ' + detail : ''}`);
}

async function newPage(browser) {
  const p = await browser.newPage({ viewport: { width: 1500, height: 1300 } });
  p.on('pageerror', e => check('ingen JS-fejl', false, e.message));
  p.on('dialog', d => d.accept());
  // Værktøjet skal virke uden net. Alt hvad der ikke er en lokal fil, er en fejl.
  p.external = [];
  p.on('request', r => { if (!/^(file:|data:|blob:)/.test(r.url())) p.external.push(r.url()); });
  await p.goto(URL);
  await p.waitForTimeout(400);
  return p;
}

const plus = async (p, k, n = 1) => {
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
      bad,
    };
  });
}

const kr = s => parseFloat(String(s).replace(/\./g, '').replace(/,-$/, '').replace(',', '.'));

(async () => {
  const browser = await chromium.launch();

  /* ---------- 1: én lokation ---------- */
  console.log('\n# Én lokation');
  {
    const p = await newPage(browser);
    await p.fill('#c_company', 'Café Mikkeller ApS');
    await p.fill('#c_contact', 'Mette Sørensen');
    await p.fill('#c_number', '2026-014');
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
    const MOD = 495 + 300;                                               // 795 (QR inkluderet i Takeaway)
    const REC = LIC*30 + MOD;                                            // 3.720

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

    check('QR låst når Takeaway er valgt',
      await p.isDisabled('[data-qwrap="s_qr"] button:last-child'));
    // Feltet skal låses sammen med knapperne — ellers kan der tastes et antal
    // ind, som state nulstiller igen, uden at skærmen følger med.
    check('QR-antalsfeltet er også låst', await p.isDisabled('#qty_s_qr'));
    check('QR-antallet står på 0', (await p.inputValue('#qty_s_qr')) === '0');
    check('QR med i tilbuddet til 0,-',
      await p.$eval('#quote-doc', e => /QR bestilling/.test(e.textContent) && /Inkl\./.test(e.textContent)));

    check('kun én spec-blok', (await p.$$('#quote-doc .loc-block')).length === 1);
    check('ingen pladsholderbilleder i dokumentet', (await p.$$('#quote-doc img')).length === 0);

    const nums = await p.$$eval('#quote-doc td.num', els =>
      els.map(e => e.textContent.trim()).filter(t => /\d/.test(t) && !/^\d+$/.test(t)));
    check('alle beløb har ",-"', nums.every(t => /,-$/.test(t) || t === 'Inkl.'),
      nums.filter(t => !/,-$/.test(t) && t !== 'Inkl.').join(', ') || 'ingen afvigelser');

    const pg = await paginate(p);
    check('sidetal på alle sider', pg.feet.every((f, i) => f === `Side ${i + 1} af ${pg.n}`), pg.feet.join(' / '));
    check('tillty-bånd på alle sider', pg.bands.every(b => b === 'tillty'));
    check('kontakt i sidefod på alle sider', pg.contact);
    check('intet indhold i sidefoden', pg.bad.length === 0, pg.bad.join('; '));
    check('ingen eksterne requests', p.external.length === 0, p.external.join(', ') || 'kun lokale filer');
    await p.close();
  }

  /* ---------- 2: tre lokationer ---------- */
  console.log('\n# Tre lokationer');
  {
    const p = await newPage(browser);
    await p.fill('#c_company', 'Kaffe & Co Holding ApS');
    await p.fill('#c_contact', 'Sofie Dahl');
    await p.fill('#c_number', '2026-044');
    await p.fill('#c_seller', 'Rask');
    await p.fill('#l_name', 'Aarhus C');

    await plus(p, 'm_tab11', 4);
    await plus(p, 'a_tab11_hand', 1);
    await p.click('[data-match="a_tab11_hand"]');
    await p.waitForTimeout(60);
    await plus(p, 'm_kds185', 1);
    await plus(p, 's_takeaway', 1);

    await p.click('button.minibtn[onclick="dupLoc()"]');   // kopiér
    await p.waitForTimeout(250);
    await p.fill('#l_name', 'Risskov');
    check('kopi arvede antal', (await p.inputValue('#qty_m_tab11')) === '4');
    for (let i = 0; i < 2; i++) { await p.click('[data-qwrap="m_tab11"] button:first-child'); await p.waitForTimeout(40); }

    await p.click('.loctabs button:nth-child(1)');          // tilbage til lokation 1
    await p.waitForTimeout(250);
    check('state overlever fane-skift', (await p.inputValue('#qty_m_tab11')) === '4');

    await p.click('.loctab-add');
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
    await p.fill('#c_number', '2026-021');
    await p.fill('#c_seller', 'Rask');
    await p.fill('#c_note', 'Installation og oplæring er inkluderet i prisen.');
    await plus(p, 'm_sot', 1);
    await p.waitForTimeout(300);

    const order = await p.$$eval('#quote-doc .qp-content > *',
      els => els.map(e => e.className.split(' ')[0] || e.tagName.toLowerCase()));
    const note = order.indexOf('qp-note');
    check('beskrivelse efter specifikationen', note > order.lastIndexOf('loc-block'), order.join(' → '));
    check('beskrivelse inden hilsen', note < order.indexOf('qp-greet'));

    const pg = await paginate(p);
    check('intet indhold i sidefoden', pg.bad.length === 0, pg.bad.join('; '));
    await p.close();
  }

  /* ---------- 4: nulstil rydder også kunden ---------- */
  console.log('\n# Nulstil');
  {
    const p = await newPage(browser);
    await p.fill('#c_company', 'Skal Væk ApS');
    await p.fill('#c_number', '2026-099');
    await p.fill('#c_note', 'Gammel note');
    await p.fill('#l_name', 'Gammel lokation');
    await plus(p, 'm_sot', 2);
    await p.waitForTimeout(200);

    await p.click('.btn-ghost');            // Nulstil (confirm accepteres i newPage)
    await p.waitForTimeout(300);

    check('kundeoplysninger ryddet',
      (await p.inputValue('#c_company')) === '' && (await p.inputValue('#c_number')) === '');
    check('beskrivelse ryddet', (await p.inputValue('#c_note')) === '');
    check('produktvalg ryddet', (await p.inputValue('#qty_m_sot')) === '0');
    check('lokationen er tilbage til én tom', (await p.$$('.loctab')).length === 2); // 1 lokation + "+ Lokation"
    // Dato og gyldighed er defaults, ikke kundedata — de skal stå igen bagefter.
    check('dato sat til i dag',
      (await p.inputValue('#c_date')) === new Date().toISOString().slice(0, 10));
    check('gyldighed tilbage på 30 dage', (await p.inputValue('#c_valid')) === '30');
    await p.close();
  }

  await browser.close();
  console.log(`\n${ok.length} ok, ${fails.length} fejl`);
  if (fails.length) { console.error('\nFejlede:\n  ' + fails.join('\n  ')); process.exit(1); }
})();
