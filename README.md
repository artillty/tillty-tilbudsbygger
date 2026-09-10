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

Formatet er `2026-1543`. Numrene er bevidst **ikke** til at gennemskue:

- året starter på et skævt, tilfældigt tal mellem 1200 og 1900
- hvert nyt nummer springer 2-9 frem, ikke 1

`2026-001` ville fortælle kunden, at de er årets første tilbud, og en serie der
tæller 1001, 1002, 1003 lader to kunder regne ud, hvor mange tilbud der lå
imellem dem. Numrene er stadig strengt voksende og dermed både entydige og
sorterbare — det er kun *afstanden* mellem dem, der ikke siger noget. Nummeret tildeles med én atomar
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
hinanden, og det gør de to KDS-størrelser også. Alt i kataloget har et foto;
et nyt produkt uden billede viser en grå pladsholder, som aldrig kommer med
i PDF'en.

Nyt foto: læg en PNG i mappen, maks. 600 px på den lange led, og peg på den
fra `PRODUKTFOTO` eller `TILBEHOERFOTO`.

## Standardtekst i afslutningen

Afslutningen er forudfyldt med tilltys standardtekst om genbrug af
udstyr og afsnittet "Opsamling". Teksten står i **feltet**, ikke som en skjult
fallback i dokumentet — sælgeren kan rette i den, skrive den om eller slette
den helt. "+ Nyt tilbud" sætter den tilbage.

Ordlyden ligger i `STANDARD_NOTE` i `js/init.js`.

## Muligheder og kundens eget udstyr

Når et tilbud oprettes, vælges formen: **flere muligheder**, **flere
lokationer**, begge dele eller ingen af delene. Byggeren viser kun de paneler,
tilbuddet faktisk indeholder. Modellen er den samme uanset — et tilbud er
altid en liste af lokationer, der hver har sine muligheder, og et
almindeligt tilbud er 1×1. Man starter med én mulighed og tilføjer selv flere,
og "Kopiér lokation" tager lokationens muligheder med.

Alt hardware og tilbehør — også løst tilbehør — har **to tællere**: *Nye* (det vi sælger) og *Kundens egne*
(det kunden allerede har). Eget udstyr står i specifikationen til 0,- nederst
i hardwaretabellen, men **tæller med i licenserne** — en tablet kunden ejer,
kører stadig på systemet.

Har en lokation mindst to muligheder med indhold, stilles de **op side om
side** — udstyr, licenser, engangs- og månedspris, den anbefalede fremhævet —
efterfulgt af mulighedernes specifikation. Har tilbuddet flere lokationer, står
**prisoverblikket øverst** med mulighederne under hver lokation, og derefter
kommer hver lokation for sig. Beskrivelsen og hilsen står til sidst, som i et
almindeligt tilbud. "Kopiér mulighed" står i fanerækken: byg den første færdig,
kopiér, og ret kun det der er forskellen.

Sammenligningens rækker styres af `SAMMENLIGNING` i `js/data.js`. Kommer der et
nyt produkt i kataloget, skal det også have en række dér — testen fejler ellers.

## Indløsning

Feltet **Indløsning** er valgfrit, og tillty arbejder kun med procentsatser.

| Feltet | I tilbuddet står |
|---|---|
| tomt | `Indløsning: Aftales efter dialog.` |
| `0,45 %` | `Indløsning: 0,45 %` |

Det der skrives, står **ordret** — teksten omskrives ikke. Linjen står altid i
tilbuddet, lige under prisoverblikket sammen med de øvrige prisforbehold: et
tilbud må ikke være tavst om indløsning, bare fordi feltet blev sprunget over.

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
npm test          # byggeren: 152 checks, ingen server eller database nødvendig

TEST_DATABASE_URL="postgres://…" npm run test:api    # kartoteket: 38 checks
```

`npm test` kan ikke køre samtidig med `npm run dev` — begge bruger `.next` i
samme mappe. Stop dev-serveren først.

`test:api` starter selv en dev-server og kræver en **separat** database — den
tømmer tabellerne og ville ellers brænde rigtige tilbudsnumre. Den nægter at
køre mod `DATABASE_URL`.

Testen kører scenarierne igennem i en rigtig browser — én lokation, tre
lokationer, afslutning og indløsning, nulstilling, formvalget, kundens eget
udstyr, muligheder og lokationer med muligheder — og tjekker blandt andet at:

- totalerne stemmer med håndregnede kontroltal
- QR hverken kan faktureres eller indtastes oveni Takeaway
- alle beløb er formateret med `,-`
- intet indhold løber ud over sidefoden på nogen side
- sidetal og gentaget sidehoved er på plads
- siden ikke laver en eneste ekstern request
- "+ Nyt tilbud" rydder både kunde, lokationer og valg
- sammenligningen og prisoverblikket stemmer med buddets tal
- lokationer og muligheder har de samme knapper

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

- **"+ Nyt tilbud" rydder alt** — kunde, lokationer og valg. Er tilbuddet gemt, ligger
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
