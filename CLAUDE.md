# Projektkonventioner

Læs denne fil før du ændrer noget. Den samler de beslutninger der ikke kan
udledes af koden — og de fejl der allerede er begået én gang.

## Sprog og brand

- Alt brugervendt tekst er **dansk**. Kode og kommentarer også.
- **"tillty" skrives altid med lille t** — også først i en sætning og i
  overskrifter i versaler.
- Tone of voice: du/I-form, fagnært ordvalg, verbum-forrest.
- Selvbetjeningsenheden hedder en **selvbetjeningsterminal**. Aldrig "kiosk",
  "stander" eller "selvbetjeningsskærm".
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

To fælder der allerede har kostet tid:

1. **Mål aldrig på løsrevne kloner.** `cloneNode()`-elementer der ikke er i
   DOM'en rapporterer højden 0. Alle mål skal tages fra originalen i
   målebeholderen (`host`). Sker det ikke, løber indholdet ud over sidefoden.
2. **Tætheds-CSS skal gælde i både målebeholder og færdig side.** Ligger den
   kun i `@media print`, måler vi med skærmens mål og printer med andre.
   Reglerne er derfor scopet til `.pg-measure, .pg` — ikke til `@media print`.

En tabel åbnes først når der er plads til både overskriftsrække og mindst én
datarække, så vi aldrig efterlader et tomt tabelhoved nederst på en side.

## Test

`npm test` kører tre scenarier i headless Chromium. Kontroltallene i testen er
**håndregnede** — ændrer du priser i `js/data.js`, skal de rettes med, ellers
er testen værdiløs.

Overflow-testen tvinger `#print-root` synlig først. Måler man på et
`display:none`-element, er alle rects 0 og testen melder grønt uanset hvad.
