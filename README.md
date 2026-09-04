# tillty Tilbudsbygger

Internt salgsværktøj. Sammensæt et tilbud på hardware, tilbehør, licenser og
moduler — for én forretning eller for en kæde med flere lokationer — og
eksportér det som en færdig PDF til kunden.

Ingen build, ingen afhængigheder i drift. Ren HTML, CSS og JavaScript.

---

## Kom i gang

Åbn `index.html` i en browser. Det er det.

Til udvikling er en lille server rarere (så browseren ikke behandler filerne
som `file://`):

```bash
npx serve .
```

## Sådan retter du priser

**Alle priser står i `js/data.js`.** Der er ikke priser noget andet sted i
koden — hvis du finder et beløb uden for den fil, er det en fejl.

| Hvad                | Hvor i `js/data.js` |
|---------------------|---------------------|
| Hardware            | `CATALOG`           |
| Tilbehør            | `ACCESSORIES`       |
| Licenstyper og dagspris | `LICENSE_TYPES` |
| Hvilke produkter der udløser licens | `PRODUCT_LICENSE` |
| Moduler (pr. måned) | `MODULES`           |
| tilltys egne oplysninger | `SENDER`       |

Efter en prisændring: kør `npm test` og tjek at tallene i testens
kontrolregning stadig passer (de er håndregnet og skal rettes med).

## Filerne

```
index.html        markup — formular, paneler, preview
css/styles.css    alt design, tokens fra styleguiden
js/data.js        priser og katalog  ← den fil forretningen retter i
js/app.js         state (lokationer, antal) og byggerens venstre side
js/quote.js       selve tilbudsdokumentet
js/print.js       paginering og PDF-eksport
js/init.js        nulstil og opstart
tests/smoke.js    regressionstest i headless Chromium
```

Scriptrækkefølgen i `index.html` betyder noget: `data` → `app` → `quote` →
`print` → `init`.

## Test

```bash
npm install     # henter playwright (kun til test)
npm test
```

Testen kører tre scenarier igennem i en rigtig browser — én lokation, tre
lokationer, og et tilbud med beskrivelse — og tjekker blandt andet at:

- totalerne stemmer med håndregnede kontroltal
- QR ikke kan faktureres oveni Takeaway
- alle beløb er formateret med `,-`
- intet indhold løber ud over sidefoden på nogen side
- sidetal og gentaget sidehoved er på plads

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

- **Ingen persistens.** Et tilbud lever kun i browserfanen. Lukker sælgeren
  fanen, er alt væk. Det er det næste der bør laves — se nedenfor.
- Uploadede produktbilleder komprimeres ikke, så mange store fotos giver en
  tung PDF.
- Uploadede billeder deles på tværs af lokationer (med vilje — det er de samme
  produkter), men gemmes ikke.

## Næste skridt

1. **Gem og hent tilbud** — localStorage til at starte med, så et uheldigt
   F5 ikke koster en halv times arbejde. Derefter eventuelt eksport/import
   som `.json`, så tilbud kan sendes mellem sælgere.
2. **Deploy** på `web.tillty.com/tilbud` bag login, så alle sælgere altid
   arbejder med nyeste priser.
3. **Server-side PDF** hvis printdialogen bliver et problem i praksis.
