/* Ende-til-ende-test af kartoteket: nummertildeling, gem, genåbning.

   Kører mod en rigtig `next dev` og en RIGTIG database — derfor kræver den
   TEST_DATABASE_URL og nægter at køre mod produktionsdatabasen. Et testkørsel
   opretter tilbud og ville ellers brænde rigtige tilbudsnumre, som kunder
   allerede har set. Tabellerne tømmes ved start, så numrene er forudsigelige.

   Kør:  TEST_DATABASE_URL="postgres://…" npm run test:api            */

const { spawn } = require('child_process');
const path = require('path');
const { chromium } = require('playwright');
const { neon } = require('@neondatabase/serverless');

const DB = process.env.TEST_DATABASE_URL;
const PW = 'test-kodeord';
const PORT = 3123;
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, '..');

if (!DB) {
  console.error(`
Mangler TEST_DATABASE_URL.

  Testen opretter og sletter tilbud, så den må ikke røre produktionsdatabasen.
  Opret en Neon-branch til test og kør:

    TEST_DATABASE_URL="postgres://…" npm run test:api
`);
  process.exit(1);
}
if (DB === process.env.DATABASE_URL) {
  console.error('TEST_DATABASE_URL er den samme som DATABASE_URL. Brug en separat database.');
  process.exit(1);
}

const fails = [];
const ok = [];
function check(name, cond, detail) {
  (cond ? ok : fails).push(name + (detail ? ` — ${detail}` : ''));
  console.log(`${cond ? '  ok  ' : ' FEJL '} ${name}${detail ? ' — ' + detail : ''}`);
}

const sql = neon(DB);
const AAR = new Date().getFullYear();
// Rækken starter ved 1001 — se lib/nummer.ts.
const nr = (n) => `${AAR}-${1000 + n}`;

async function ryd() {
  await sql`drop table if exists tilbud`;
  await sql`drop table if exists tilbud_taeller`;
  await sql`drop table if exists produktbilleder`;
}

async function vent(url, ms = 90000) {
  const slut = Date.now() + ms;
  while (Date.now() < slut) {
    try {
      const r = await fetch(url, { redirect: 'manual' });
      if (r.status) return true;
    } catch { /* serveren er ikke oppe endnu */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('next dev startede ikke i tide');
}

(async () => {
  await ryd();

  const server = spawn('npx', ['next', 'dev', '-p', String(PORT)], {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: DB, APP_PASSWORD: PW, NODE_ENV: 'development' },
    stdio: 'ignore',
  });
  const luk = () => { try { server.kill('SIGTERM'); } catch {} };
  process.on('exit', luk);

  let browser;
  try {
    await vent(BASE + '/login');

    /* ---------- 1: låsen ---------- */
    console.log('\n# Adgang');
    {
      const r = await fetch(BASE + '/api/tilbud', { redirect: 'manual' });
      check('API kræver login', r.status === 401, `status ${r.status}`);
      const s = await fetch(BASE + '/bygger/index.html', { redirect: 'manual' });
      check('byggeren er bag låsen', s.status === 307 || s.status === 302, `status ${s.status}`);
      const f = await fetch(BASE + '/bygger/fonts/Nunito-400-latin.woff2', { redirect: 'manual' });
      check('fontene slipper igennem til login-siden', f.status === 200, `status ${f.status}`);
    }

    browser = await chromium.launch();
    const p = await browser.newPage({ viewport: { width: 1500, height: 1300 } });
    p.on('pageerror', (e) => check('ingen JS-fejl', false, e.message));
    p.on('dialog', (d) => d.accept());
    // En forkert sti giver en tavs 404 og en tom side — det skal testen sige højt.
    p.mangler = [];
    p.on('response', (r) => { if (r.status() >= 400) p.mangler.push(`${r.status()} ${r.url()}`); });

    /* ---------- 2: login ---------- */
    console.log('\n# Login');
    await p.goto(BASE + '/login');
    await p.fill('#pw', 'forkert');
    await p.click('button[type=submit]');
    await p.waitForTimeout(700);
    check('forkert kodeord afvises', await p.isVisible('.gate-err'));

    await p.fill('#pw', PW);
    await p.click('button[type=submit]');
    await p.waitForTimeout(1500);
    check('rigtigt kodeord lukker op', /\/$|kartotek/.test(new URL(p.url()).pathname));

    /* ---------- 3: første tilbud får 2026-1001 ---------- */
    // Lav en tæller der står lavt, som produktionen gjorde efter de første
    // prøvetilbud. Rækken skal løftes til forskydningen, ikke fortsætte fra 3.
    await sql`insert into tilbud_taeller (aar, seq) values (${AAR}, 2)
              on conflict (aar) do update set seq = 2`;

    console.log('\n# Nummertildeling');
    p.mangler = [];   // login-scenariet ovenfor gav med vilje en 401
    await p.goto(BASE + '/bygger/index.html');
    await p.waitForTimeout(1200);
    check('byggeren henter alle sine filer', p.mangler.length === 0, p.mangler.join(', ') || 'intet mangler');
    check('nummerfeltet kan ikke tastes i', await p.getAttribute('#c_number', 'readonly') !== null);

    await p.fill('#c_company', 'Første Kunde ApS');
    await p.fill('#c_seller', 'Rask');
    await p.fill('#c_addr', 'Åboulevarden 69');
    await p.fill('#c_zip', '8000');
    await p.waitForTimeout(250);
    check('postnummeret slog byen op', (await p.inputValue('#c_city')) === 'Aarhus C',
      await p.inputValue('#c_city'));
    for (let i = 0; i < 2; i++) {
      await p.click('[data-qwrap="m_sot"] button:last-child');
      await p.waitForTimeout(60);
    }
    await p.click('button[onclick="gemTilbud()"]');
    await p.waitForTimeout(1500);
    check('første tilbud får ' + nr(1), (await p.inputValue('#c_number')) === nr(1),
      await p.inputValue('#c_number'));
    check('URL peger på tilbuddet', p.url().includes('nr=' + nr(1)), p.url());

    // Gem igen — nummeret må ikke skifte.
    await p.fill('#c_contact', 'Mette Sørensen');
    await p.click('button[onclick="gemTilbud()"]');
    await p.waitForTimeout(1200);
    check('gem igen beholder nummeret', (await p.inputValue('#c_number')) === nr(1),
      await p.inputValue('#c_number'));

    /* ---------- 4: næste tilbud får 2026-002 ---------- */
    await p.goto(BASE + '/bygger/index.html');
    await p.waitForTimeout(1200);
    await p.fill('#c_company', 'Anden Kunde ApS');
    await p.fill('#c_seller', 'Rask');
    await p.click('[data-qwrap="m_tab11"] button:last-child');
    await p.waitForTimeout(80);
    await p.click('button[onclick="gemTilbud()"]');
    await p.waitForTimeout(1500);
    check('andet tilbud får ' + nr(2), (await p.inputValue('#c_number')) === nr(2),
      await p.inputValue('#c_number'));

    /* ---------- 5: genåbning gendanner alt ---------- */
    console.log('\n# Genåbning');
    await p.goto(BASE + '/bygger/index.html?nr=' + nr(1));
    await p.waitForTimeout(1500);
    check('firma gendannet', (await p.inputValue('#c_company')) === 'Første Kunde ApS');
    check('kontakt gendannet', (await p.inputValue('#c_contact')) === 'Mette Sørensen');
    check('antal gendannet', (await p.inputValue('#qty_m_sot')) === '2',
      await p.inputValue('#qty_m_sot'));
    check('vej gendannet', (await p.inputValue('#c_addr')) === 'Åboulevarden 69');
    check('postnr. og by gendannet',
      (await p.inputValue('#c_zip')) === '8000' && (await p.inputValue('#c_city')) === 'Aarhus C');
    check('adressen står i tilbuddet',
      await p.$eval('#quote-doc .qp-parties', e => /Åboulevarden 69[\s\S]*8000 Aarhus C/.test(e.textContent)));
    check('produktfotos er med i tilbuddet',
      (await p.$$('#quote-doc img')).length > 0);
    const total = await p.$eval('#quote-doc table.loc-overview tfoot td:nth-child(2)',
      (e) => e.textContent.trim());
    check('totalen er den samme som før', total === '27.990,-', total);

    /* ---------- 5b: Nulstil slipper tilbuddet ---------- */
    await p.click('button[onclick="resetAll()"]');
    await p.waitForTimeout(1000);
    check('nulstil rydder nummeret', (await p.inputValue('#c_number')) === '',
      await p.inputValue('#c_number'));
    await p.fill('#c_company', 'Efter Nulstil ApS');
    await p.click('[data-qwrap="m_lan"] button:last-child');
    await p.waitForTimeout(80);
    await p.click('button[onclick="gemTilbud()"]');
    await p.waitForTimeout(1500);
    const efterNulstil = await p.inputValue('#c_number');
    check('gem efter nulstil laver et NYT tilbud, ikke en overskrivning',
      efterNulstil === nr(3), efterNulstil);
    const stadig = await sql`select firma from tilbud where nr = ${nr(1)}`;
    check('det oprindelige tilbud er urørt', stadig[0]?.firma === 'Første Kunde ApS',
      stadig[0]?.firma);

    /* ---------- 6: kartoteket ---------- */
    console.log('\n# Kartotek');
    await p.goto(BASE + '/');
    await p.waitForTimeout(1200);
    const raekker = await p.$$eval('table.kart tbody tr', (r) => r.length);
    check('alle tre tilbud står i kartoteket', raekker === 3, `${raekker} rækker`);
    check('nyeste står øverst',
      (await p.$eval('table.kart tbody tr:first-child .nr', (e) => e.textContent)) === nr(3));

    await p.fill('.soeg', 'Første');
    await p.waitForTimeout(400);
    check('søgning filtrerer',
      (await p.$$eval('table.kart tbody tr', (r) => r.length)) === 1);

    await p.fill('.soeg', nr(3));
    await p.waitForTimeout(400);
    check('søgning på nummer virker',
      (await p.$$eval('table.kart tbody tr', (r) => r.length)) === 1);

    /* ---------- 7: eksport gemmer automatisk ---------- */
    console.log('\n# Eksport gemmer først');
    await p.goto(BASE + '/bygger/index.html');
    await p.waitForTimeout(1200);
    await p.fill('#c_company', 'Eksport Uden Gem ApS');
    await p.fill('#c_seller', 'Rask');
    await p.click('[data-qwrap="m_lan"] button:last-child');
    await p.waitForTimeout(80);
    // window.print() ville blokere i headless — vi neutraliserer den og tjekker
    // at gem-delen af exportPDF() alligevel er kørt.
    await p.evaluate(() => { window.print = () => { window.__printKaldt = true; }; });
    await p.click('button[onclick="exportPDF()"]');
    await p.waitForTimeout(2000);
    check('eksport tildelte ' + nr(4), (await p.inputValue('#c_number')) === nr(4),
      await p.inputValue('#c_number'));
    check('der blev rent faktisk printet', await p.evaluate(() => window.__printKaldt === true));

    const status = await sql`select status from tilbud where nr = ${nr(4)}`;
    check('eksporteret tilbud står som sendt', status[0]?.status === 'sendt', status[0]?.status);

    const kladde = await sql`select status from tilbud where nr = ${nr(1)}`;
    check('gemt-men-ikke-sendt står som kladde', kladde[0]?.status === 'kladde', kladde[0]?.status);

    /* ---------- 8: sletning genbruger ikke nummeret ---------- */
    console.log('\n# Sletning');
    await p.goto(BASE + '/');
    await p.waitForTimeout(1000);
    await p.click('table.kart tbody tr:first-child button.rowbtn.fare');
    await p.waitForTimeout(1200);
    check('tilbuddet er væk fra kartoteket',
      (await p.$$eval('table.kart tbody tr', (r) => r.length)) === 3);

    await p.goto(BASE + '/bygger/index.html');
    await p.waitForTimeout(1000);
    await p.fill('#c_company', 'Efter Sletning ApS');
    await p.click('[data-qwrap="m_lan"] button:last-child');
    await p.waitForTimeout(80);
    await p.click('button[onclick="gemTilbud()"]');
    await p.waitForTimeout(1500);
    check('nummeret efter en sletning genbruges ikke',
      (await p.inputValue('#c_number')) === nr(5), await p.inputValue('#c_number'));

    await p.close();
  } finally {
    if (browser) await browser.close();
    luk();
  }

  console.log(`\n${ok.length} ok, ${fails.length} fejl`);
  if (fails.length) { console.error('\nFejlede:\n  ' + fails.join('\n  ')); process.exit(1); }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
