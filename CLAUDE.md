# Projektkonventioner

## Arkitektur — læs først

To verdener i ét repo, og grænsen mellem dem er vigtig:

- **`public/bygger/`** er den oprindelige app: vanilla JS, ingen build, virker
  fra `file://`. **Skriv den ikke om til React.** `js/print.js` er 222 linjer
  DOM-måling og print-CSS med fælder, der allerede har kostet tid (se nedenfor).
- **`app/`, `lib/`, `proxy.ts`** er Next.js-skallen: login, kartotek, API.
  Alt nyt, der ikke handler om selve tilbudsdokumentet, hører til her.

Byggeren skal blive ved med at virke uden server. `js/store.js` slår sig selv
fra på `file://`, og det er dét, der holder `npm test` kørende uden database.

**Byggeren linkes som `/bygger/index.html`, ikke `/bygger`.** Dens stier er
relative, og fra `/bygger` opløses `js/app.js` til `/js/app.js` — hele appens
JavaScript 404'er, og siden står tom. Et redirect til `/bygger/` duer ikke:
Next normaliserer skråstregen væk igen, og de to løber i ring.

Læs denne fil før du ændrer noget. Den samler de beslutninger der ikke kan
udledes af koden — og de fejl der allerede er begået én gang.

## Sprog og brand

- Alt brugervendt tekst er **dansk**. Kode og kommentarer også.
- **"tillty" skrives altid med lille t** — også først i en sætning og i
  overskrifter i versaler.
- Tone of voice: du/I-form, fagnært ordvalg, verbum-forrest.
- Selvbetjeningsenheden hedder en **selvbetjeningsterminal**. Aldrig "kiosk",
  "stander" eller "selvbetjeningsskærm".
- **Brandfontene er selvhostet i `fonts/`** (se `css/fonts.css`). Hent dem
  aldrig fra Google Fonts igen: sælgere sidder hos kunder uden net, og
  PDF'en faldt tilbage på systemfonte uden at nogen opdagede det. Testen
  fejler, hvis siden laver en eneste ekstern request.
- Designtokens følger <https://web.tillty.com/styleguide/>. Brug de kanoniske
  navne (`--color-primary`, `--bg-sunken`, `--radius-md`, `--space-4`).
  De korte aliaser (`--navy`, `--accent`, `--line`) findes kun af historiske
  grunde — skriv ikke nye.

## Forretningsregler der ikke må brydes

- **Stationær betalingsterminal (`termstat`) udløser ingen licens.** Den tager
  kun imod betalinger og har intet særligt datatræk. Den mobile terminal
  (`termmobil`) har POS ombord og udløser derfor licens. Asymmetrien er
  bevidst — lad være med at "rette" den.
- **QR bestilling er inkluderet i Takeaway.** Vælges Takeaway, låses QR til 0
  og vises i tilbuddet som en gratis underlinje. Reglen ligger i data
  (`MODULES[].includes`), ikke i logikken — nye bundles tilføjes samme sted.
- **En måned er altid 30 dage** ved omregning fra dagslicens til månedspris.
  Ingen indstilling, ingen "ca."-forbehold.
- Licenser afregnes **pr. dag i brug**. Det er et salgsargument og skal stå i
  dokumentet, ikke gemmes væk.

## Formatering

- Beløb: `fmt()` i `js/app.js`. Alle beløb ender på `,-`, også dem med ører
  (`7,50,-`). Det følger tilltys egen prisliste. Typografisk er det diskutabelt,
  men det er husets stil — lav det ikke om uden at spørge.
- Priser står **kun** i `js/data.js`.

## Preview og state

- `syncUI()` kalder **`syncIncludedModules()` først**. Den funktion retter i
  state (tvinger fx QR til 0, når Takeaway er valgt), så den skal køre før
  DOM'en tegnes — ellers viser antalsfeltet et tal, tilbuddet ikke regner med.
- Klik (steppere, faner, knapper) kalder `update()` direkte og er synkrone.
  **Tekstfelterne kalder `updateSoon()`**, som venter 90 ms. `update()` bygger
  hele preview'et forfra inkl. billedernes data-URL'er, og ét kald pr. anslag
  bliver tungt, så snart der er produktfotos i tilbuddet.
- `resetAll()` rydder **alt** — også kundeoplysningerne. Dato og gyldighed
  sættes tilbage til deres defaults, for de er ikke kundedata.

## Tilbudsdokumentet

Samme opbygning uanset antal lokationer:

```
parter (Fra/Til) → Hej X → indledning → Samlet prisoverblik →
Specifikation (indrammede blokke) → beskrivelse → hilsen
```

- **Ingen overskrifter over de mørkeblå tabelrækker.** Tabellens navn står i
  første kolonne i selve header-rækken: `Hardware`, `Ekstra tilbehør`,
  `Licens`, `Modul`, `Samlet prisoverblik`.
- Lokationsbjælken viser kun nummer og navn — ikke ordet "Lokation".
- Ved én lokation viser prisoverblikket kun totalrækken (`Samlet pris`).
  En enkelt datalinje plus en identisk totallinje ligner en fejl.
- **Pladsholderbilleder må aldrig i PDF'en.** Byggeren viser grå
  canvas-pladsholdere som upload-knap; kun rigtige uploads ryger i dokumentet.

## Paginering (`js/print.js`) — læs før du retter

Chrome kan ikke sætte sidetal via CSS (`@page`-margenbokse understøttes ikke),
og et `position:fixed` sidehoved lægger sig oven på indholdet. Derfor deler vi
selv dokumentet op i A4-sider.

Tre fælder der allerede har kostet tid:

1. **Mål aldrig på løsrevne kloner.** `cloneNode()`-elementer der ikke er i
   DOM'en rapporterer højden 0. Alle mål skal tages fra originalen i
   målebeholderen (`host`). Sker det ikke, løber indholdet ud over sidefoden.
2. **Tætheds-CSS skal gælde i både målebeholder og færdig side.** Ligger den
   kun i `@media print`, måler vi med skærmens mål og printer med andre.
   Reglerne er derfor scopet til `.pg-measure, .pg` — ikke til `@media print`.
3. **Der er kun én tabeldeler.** `splitTable(t, attach, onBreak)` bruges både
   til tabeller direkte på siden og til tabeller inde i en lokationsblok —
   forskellen er alene de to callbacks. Logikken lå før duplikeret to steder,
   hvor kun den ene blev rettet. Læg ikke en tredje kopi ind.

En tabel åbnes først når der er plads til både overskriftsrække og mindst én
datarække, så vi aldrig efterlader et tomt tabelhoved nederst på en side.

Højder som blokkens margen og `.loc-body`'s bundpadding måles med
`getComputedStyle` på originalen — de må ikke hårdkodes som tal i JS, for så
skal de holdes i sync med stilarket i hånden.

## Tilbudsnumre

- Nummeret tildeles **af serveren** ved første gem — også når eksporten gemmer
  automatisk først. Feltet er skrivebeskyttet, når der er en server bag.
- Tildelingen er én atomar `insert … on conflict … returning` (`lib/nummer.ts`).
  Neons HTTP-driver har ikke rigtige transaktioner, så det skal afgøres i
  databasen. Lav den ikke om til læs-så-skriv.
- **Numre genbruges aldrig.** Tælleren rulles ikke tilbage, når et tilbud
  slettes — det kan allerede være sendt til en kunde.

## Test

`npm test` kører fire scenarier i headless Chromium mod `file://`, uden server
eller database. `npm run test:api` kræver en **separat** database og nægter at
køre mod `DATABASE_URL` — den tømmer tabellerne og ville ellers brænde rigtige
tilbudsnumre.

Testen fanger også tavse 404'er på lokale filer. Det er ikke teoretisk: en
forkert relativ sti i `css/fonts.css` gjorde, at alle fontene 404'ede, og
appen kørte i systemfonte uden at nogen opdagede det.

`npm test` kører fire scenarier i headless Chromium. Kontroltallene i testen er
**håndregnede** — ændrer du priser i `js/data.js`, skal de rettes med, ellers
er testen værdiløs.

Overflow-testen tvinger `#print-root` synlig først. Måler man på et
`display:none`-element, er alle rects 0 og testen melder grønt uanset hvad.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
