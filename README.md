# tillty Tilbudsbygger

Internt salgsværktøj. Sammensæt et tilbud på hardware, tilbehør, licenser og
moduler — for én forretning eller for en kæde med flere lokationer — og
eksportér det som en færdig PDF til kunden.

Hvert tilbud får automatisk et nummer (`2026-001`) og lander i et kartotek, så
det kan findes frem igen.

Selve byggeren er stadig ren HTML, CSS og JavaScript uden build — den kan åbnes
direkte fra disken og virker uden net. Udenom ligger en Next.js-skal, der
håndterer login, kartotek og API.

---

## Kom i gang

```bash
npm install
cp .env.example .env.local     # udfyld APP_PASSWORD og DATABASE_URL
npm run dev                    # http://localhost:3000
```

Skal du kun rette i selve byggeren — priser, layout, paginering — kan du nøjes
med at åbne `public/bygger/index.html` direkte i en browser. Uden en server bag
slås kartoteket fra, og resten opfører sig præcis som før. Det er også sådan
`npm test` kører.

## Sådan retter du priser

**Alle priser står i `js/data.js`.** Der er ikke priser noget andet sted i
koden — hvis du finder et beløb uden for den fil, er det en fejl.

| Hvad                | Hvor i `js/data.js` |
|---------------------|---------------------|
| Hardware            | `CATALOG`           |
| Produktfotos        | `PRODUKTFOTO` / `TILBEHOERFOTO` (filer i `public/bygger/produktbilleder/`) |
| Tilbehør            | `ACCESSORIES`       |
| Licenstyper og dagspris | `LICENSE_TYPES` |
| Hvilke produkter der udløser licens | `PRODUCT_LICENSE` |
| Moduler (pr. måned) | `MODULES`           |
| tilltys egne oplysninger | `SENDER`       |

Efter en prisændring: kør `npm test` og tjek at tallene i testens
kontrolregning stadig passer (de er håndregnet og skal rettes med).

## Filerne

```
app/                      Next.js-skallen — alt det nye
  page.tsx, kartotek.tsx  kartoteket
  login/page.tsx          kodeordslås
  api/tilbud/…            gem, hent, slet · her tildeles nummeret
  api/billeder/…          delt katalog over produktfotos
lib/db.ts                 Neon-klient og tabeller
lib/nummer.ts             nummertildelingen
proxy.ts                  alt bag login

public/bygger/            byggeren — uændret vanilla, ingen build
  index.html              markup — formular, paneler, preview
  css/styles.css          alt design, tokens fra styleguiden
  css/fonts.css           @font-face for de selvhostede brandfonte
  fonts/                  selve fontfilerne (woff2, latin + latin-ext)
  js/data.js              priser og katalog  ← den fil forretningen retter i
  js/postnumre.js         postnr. -> by, 1.089 danske postnumre
  produktbilleder/        tilltys officielle produktfotos
  js/app.js               state (lokationer, antal) og byggerens venstre side
  js/quote.js             selve tilbudsdokumentet
  js/print.js             paginering og PDF-eksport
  js/init.js              nulstil og opstart
  js/store.js             gem/hent mod kartoteket — slår fra uden server

tests/smoke.js            byggeren, mod file:// — ingen server nødvendig
tests/api.js              kartotek og nummerering, mod en rigtig database
```

Scriptrækkefølgen i `index.html` betyder noget: `data` → `app` → `quote` →
`print` → `init`.

## Tilbudsnumre

Nummeret tildeles af serveren, første gang et tilbud gemmes — enten fordi
sælgeren trykker Gem, eller fordi eksporten gemmer automatisk først. Et tilbud
kan altså ikke forlade huset uden at stå i kartoteket.

Formatet er `2026-001`, løbenummer pr. år. Nummeret tildeles med én atomar
sætning i databasen (`lib/nummer.ts`), så to sælgere der gemmer samtidig ikke
kan få samme nummer. **Numre genbruges aldrig** — heller ikke når et tilbud
slettes, for det kan allerede være sendt til en kunde.

Feltet er skrivebeskyttet i browseren. Åbnes byggeren som løs fil, uden server,
kan man taste et nummer selv — der er jo ingen til at tildele et.

## Produktfotos

tilltys egne fotos ligger i `public/bygger/produktbilleder/` og kobles til
varenøglerne i `js/data.js`. De vises i byggeren i stedet for de grå
pladsholdere **og kommer med i kundens PDF**. Sælgeren kan stadig uploade sit
eget billede oveni; en upload vinder altid.

Flere produkter deler samme foto med vilje — de tre tabletstørrelser ligner
hinanden, og det gør de to KDS-størrelser også. **Vesa Arm og Pengeskuffe
mangler et foto** og viser en pladsholder, som aldrig kommer med i PDF'en.

Nyt foto: læg en PNG i mappen, maks. 600 px på den lange led, og peg på den
fra `PRODUKTFOTO` eller `TILBEHOERFOTO`.

## Postnumre

`js/postnumre.js` er en lokal tabel over alle danske postnumre. Skriver
sælgeren fire cifre, udfyldes byen selv. Tabellen ligger lokalt af samme grund
som fontene — værktøjet skal virke uden net. Opdatér den med:

```bash
curl -s https://api.dataforsyningen.dk/postnumre   # kilde: DAWA / Dataforsyningen
```

## Test

```bash
npm install
npm test          # byggeren: 44 checks, ingen server eller database nødvendig

TEST_DATABASE_URL="postgres://…" npm run test:api    # kartoteket: 33 checks
```

`npm test` kan ikke køre samtidig med `npm run dev` — begge bruger `.next` i
samme mappe. Stop dev-serveren først.

`test:api` starter selv en dev-server og kræver en **separat** database — den
tømmer tabellerne og ville ellers brænde rigtige tilbudsnumre. Den nægter at
køre mod `DATABASE_URL`.

Testen kører fire scenarier igennem i en rigtig browser — én lokation, tre
lokationer, et tilbud med beskrivelse, og en nulstilling — og tjekker blandt
andet at:

- totalerne stemmer med håndregnede kontroltal
- QR hverken kan faktureres eller indtastes oveni Takeaway
- alle beløb er formateret med `,-`
- intet indhold løber ud over sidefoden på nogen side
- sidetal og gentaget sidehoved er på plads
- siden ikke laver en eneste ekstern request
- Nulstil rydder både kunde, lokationer og valg

## Eksport til PDF

Eksporten bruger browserens egen print-til-PDF, så resultatet er en ægte
vektor-PDF. Dokumentet bliver pagineret af `js/print.js` inden print, fordi
Chrome hverken kan sætte sidetal via CSS eller gentage et sidehoved uden at
lægge det oven på indholdet.

**Sælgeren skal slå browserens eget sidehoved og sidefod fra** i printdialogen
under "Flere indstillinger" — ellers kommer filstien og browserens sidetal med
ud til kunden. Det kan ikke styres fra HTML. Vil vi af med det trin, skal
eksporten flyttes til serversiden (Playwright eller Puppeteer), som også ville
give os kontrol over filnavnet uden at gå gennem `document.title`.

## Kendte begrænsninger

- **Nulstil rydder alt** — kunde, lokationer og valg. Er tilbuddet gemt, ligger
  det stadig i kartoteket; er det ikke, er det væk.
- Der er ingen automatisk gem undervejs. Lukker sælgeren fanen uden at trykke
  Gem, er det ugemte væk.
- Uploadede produktbilleder komprimeres ikke, så mange store fotos giver en
  tung PDF.
- Uploadede billeder deles på tværs af lokationer (med vilje — det er de samme
  produkter), men gemmes ikke.

## Næste skridt

1. **Rigtigt domæne** på `web.tillty.com/tilbud` i stedet for `.vercel.app`.
2. **Automatisk gem** undervejs, så et uheldigt luk ikke koster arbejde.
3. **Kopiér et tilbud** som udgangspunkt for et nyt — kæder køber ens setup.
4. **Server-side PDF** hvis printdialogen bliver et problem i praksis.
