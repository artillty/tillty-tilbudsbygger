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
- **Fugaz One (`--font-display`) bruges kun til ordet "tillty"** — logoet.
  Overskrifter bruger Nunito (`--font-heading`). Testen håndhæver det.
- Tone of voice: du/I-form, fagnært ordvalg, verbum-forrest.
- Selvbetjeningsenheden hedder en **selvbetjeningsterminal**. Aldrig "kiosk",
  "stander" eller "selvbetjeningsskærm".
- **Kundens udstyr hedder "Kundens egne" i byggeren og "Jeres eget" i
  tilbuddet.** Byggeren er sælgerens side, tilbuddet er kundens.
- **Brandfontene er selvhostet i `fonts/`** (se `css/fonts.css`). Hent dem
  aldrig fra Google Fonts igen: sælgere sidder hos kunder uden net, og
  PDF'en faldt tilbage på systemfonte uden at nogen opdagede det. Testen
  fejler, hvis siden laver en eneste ekstern request.
- Designtokens følger <https://web.tillty.com/styleguide/>. Brug de kanoniske
  navne (`--color-primary`, `--bg-sunken`, `--radius-md`, `--space-4`).
  De korte aliaser (`--navy`, `--accent`, `--line`) findes kun af historiske
  grunde — skriv ikke nye.

## Sprog i tilbuddet

- **Kun kundens side skifter sprog.** Preview og PDF skrives på dansk,
  engelsk, norsk, svensk eller tysk (`c_sprog`, gemmes med tilbuddet);
  byggeren er altid dansk.
  Priserne er de samme og står i DKK — de udenlandske sidefødder siger det.
- Alle faste tekster i dokumentet går gennem `t('dansk tekst')`. Den danske
  tekst er nøglen, og oversættelserne står som rækker i `js/sprog.js`. Retter
  du en dansk tekst (også i `data.js`), skal rækken rettes med. Testen læser
  `t('…')`-kaldene i kildekoden og fejler, hvis en mangler.
- **Det sælgeren skriver, oversættes ikke** — indledning, afslutning,
  indløsningssats, navne. Kun standardnavnene ("Mulighed A", "Lokation 2")
  følger sproget.
- Standardteksten i afslutningen skifter sprog med, så længe den står urørt.
  Er den rettet, er det sælgerens tekst.
- **Adresser følger ikke sproget.** tillty sælger fra Danmark: afsenderadressen
  står uden land, og postnummerfeltet er dansk (fire cifre, dansk opslag).
  Udenlandske adresser er fravalgt for nu — byg det som en særskilt opgave.
- Sprogvælgeren står i preview-bjælken med flag, over det den ændrer.
- Oversættelserne er udkast skrevet af Claude. Få dem læst igennem af én der
  taler sproget, før de bruges over for kunder.

## Kundefelter

- **Obligatoriske felter** har `data-krav` i `index.html` og en blå * i
  feltnavnet: firma, CVR, kontaktperson, e-mail, telefon, adresse, postnr., by
  og sælger. Mangler ét, stopper eksporten (`kravOpfyldt()` i `print.js`) — den
  spørger ikke. Feltet markeres med rødt, til der skrives i det.
- **Sælger vælges i en liste** (`c_seller` er et `<select>` i `index.html`):
  Esben Østergaard, Aydin Bahojb-Khoshnoudi og Christian Dahl. Nye sælgere
  tilføjes som `<option>` dér. Et gammelt tilbud med en sælger uden for listen
  beholder navnet: `hentTilbud()` lægger det ind som et midlertidigt valg
  (`data-gammel`), og `slipTilbud()` fjerner det igen.
- **Kontaktpersonens rolle (`c_rolle`) står aldrig i tilbuddet.** Den gemmes til
  den kommende CRM-kobling. Testen holder den ude af dokumentet.
- Uden navn åbner brevet med "Hej," — ikke "Hej der,".

## Forretningsregler der ikke må brydes

- **Kundens eget udstyr koster 0, men udløser licens.** En tablet kunden
  allerede ejer, kører stadig på systemet. `computeLicensesFor(Q,E)` lægger
  begge antalskort sammen; `oneOff` gør ikke. Det er et af de steder, et
  tilbud let kommer til at love for lidt.
- Eget udstyr står **nederst** i hardwaretabellen, ikke blandet ind mellem de
  nye linjer — ellers er det svært at se, hvad der rent faktisk købes.
- **Kundens eget tilbehør koster også 0**, men udløser ingen licens. Eget løst
  tilbehør står nederst i tilbehørstabellen.
- **Tilbehør valgt under et produkt står altid som tilbehørslinje under
  produktet** — nyt, brugt og kundens eget. Aldrig som sin egen hovedlinje; det
  gør kun løst tilbehør. Hver slags står under det eksemplar, den ligner (eget
  under eget, brugt under brugt), og ellers under det første der findes. Eget
  tilbehør til et nyt produkt stod før som hovedlinje nederst; det er fravalgt
  af tillty. Uden produktet kommer tilbehøret slet ikke med.
- Mærkatet **"Ny"** sættes kun, når samme produkt også står som kundens eget
  eller som brugt. Uden den tvivl er mærkatet bare støj.
- **Brugt udstyr har ingen listepris.** Hvert produkt og tilbehør har en tredje
  tæller, "Brugte", med et prisfelt: antallet ligger i `brugt`, stykprisen i
  `brugtPris`, begge pr. varenøgle på muligheden. Priserne i `js/data.js` gælder
  kun nyt. Brugt udstyr **udløser licens** og tæller med i engangsprisen.
- **Kun "Nye" står fremme på et kort.** "Kundens egne" og "Brugte" er små
  knapper (`taellere()` og `aabnKort()` i `js/app.js`), der folder tælleren ud
  og sætter antallet til 1. Med tre tællere fremme på hvert kort og tilbehør
  blev listen for lang. En tæller med antal står altid fremme; en tom, udfoldet
  tæller foldes først sammen, når kortene tegnes forfra (`aabneKort`).
- **Uden pris stopper eksporten** (`kravOpfyldt()` læser `udenPris` fra
  `collectFor`). Tomt felt er "ikke sat"; 0 er en pris, sælgeren har valgt.
- Brugt står **lige efter det nye** i tabellen med mærkatet "Brugt", ikke nede
  ved kundens eget: det er noget kunden køber. Tilbehør står under det
  eksemplar, det ligner. Købt tilbehør til et produkt, kunden kun har som sit
  eget, står under det egne produkt med sin pris — før blev det tabt.

- **Stationær betalingsterminal (`termstat`) udløser ingen licens.** Den tager
  kun imod betalinger og har intet særligt datatræk. Den mobile terminal
  (`termmobil`) har POS ombord og udløser derfor licens. Asymmetrien er
  bevidst — lad være med at "rette" den.
- **QR bestilling er inkluderet i Takeaway.** Vælges Takeaway, låses QR til 0
  og vises i tilbuddet som en gratis underlinje. Reglen ligger i data
  (`MODULES[].includes`), ikke i logikken — nye bundles tilføjes samme sted.
- **Valutaen står én gang, øverst:** "Alle beløb er i danske kroner (DKK)."
  som første forbehold under prisoverblikket eller sammenligningen
  (`prisNoter()`), og i PAY-tilbuddet nederst i prisboksen. Ikke i
  tabellernes kolonneoverskrifter.
- **Indløsning står altid i tilbuddet.** Enten satsen fra feltet, ordret, eller
  `Aftales efter dialog.` Gør den ikke betinget af, at feltet er udfyldt.
  Omskriv ikke det indtastede — tillty arbejder kun med procentsatser, og
  sælgeren skriver dem selv.
- **Online betaling har sin egen sats** (`c_indloesning_online`). Linjen står
  kun i tilbuddet, når det har et modul mærket `online:true` i `js/data.js`
  (Takeaway, QR bestilling) i en af mulighederne, eller når feltet er udfyldt.
  Så hedder de to linjer "Indløsning, fysisk betaling" og "Indløsning, online
  betaling", og en tom online-sats giver også `Aftales efter dialog.` Uden
  online står der bare `Indløsning:` som før. Feltet til fysisk betaling
  beholder id'et `c_indloesning`, så gamle tilbud åbner med deres sats.
- **En måned er altid 30 dage** ved omregning fra dagslicens til månedspris.
  Ingen indstilling, ingen "ca."-forbehold.
- **Et tilbud gælder altid 30 dage** fra det er sendt (`GYLDIG_DAGE`). Der er
  intet felt til det — det er fjernet med vilje.
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
- `resetAll()` rydder **alt** — også kundeoplysningerne. Dato og
  standardteksten sættes tilbage til deres defaults, for de er ikke kundedata.
- **Standardteksten (`STANDARD_NOTE` i `js/init.js`) står i feltet**, ikke som
  en fallback i dokumentet. Sælgeren skal kunne rette i den og slette den helt;
  en usynlig fallback ville komme snigende tilbage.
- **Spalterne ruller hver for sig** på skærme over 1000 px. Højden regnes af en
  flexboks på `body`; hårdkod ikke sidehovedets højde, den ændrer sig når
  knapperne brydes om. `@media print` sætter det hele tilbage til normalt flow,
  ellers klippes alt efter første side væk.

## Størrelseskort i byggeren

- **Tablets (8.7"/11"/14") og KDS (18.5"/22") står som ét kort med en
  størrelsesvælger** (`STOERRELSER` i `js/data.js`). Det er kun visning: hver
  størrelse er stadig sit eget produkt med egen pris, varenøgle og licens, så
  beregning, tilbud, sammenligning og gemte tilbud er uændrede. Slå dem ikke
  sammen til ét produkt med en størrelse i state.
- **Kun rigtige størrelser.** LAN- og WiFi-printeren blev prøvet som ét kort og
  skilt ad igen — det er to forskellige printere med hver sit foto.
- Den valgte størrelse er UI-state. Kortet bliver på den, så længe den har
  indhold, og springer ellers til første størrelse med indhold.
- Testen vælger størrelsen før den klikker (`str()` i `tests/smoke.js`) —
  skjulte størrelser kan ikke klikkes.

## Tilbudsdokumentet

- **Ingen lang tankestreg (—) i tilbuddet**, heller ikke i oversættelserne.
  Skriv sætningen om. Tomme celler og manglende nummer/dato viser en kort
  tankestreg (–). Testen tjekker dokumentet på alle sprog.

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

- **Fotoet står til venstre for navn og beskrivelse** (`.pv-prod`), ikke over
  beskrivelsen. Med beskrivelsen under fotoet blev hver række så høj, at en
  mulighed løb over på en ekstra side med kun opsummeringen på.

## Flere muligheder i dokumentet

**Lokationen er øverst, og mulighederne hører til den.** Et tilbud er en liste
af lokationer, der hver har sine muligheder, og det er mulighederne der bærer
opsætningen (`qty`, `eget`). Et almindeligt tilbud er 1×1. Mulighederne er
først prøvet øverst med lokationer under — det gav lokationer, der ikke passede
sammen på tværs af muligheder. Vend det ikke om igen.

Har en lokation mindst to muligheder med indhold, bliver dokumentet:

```
én lokation:      parter → Hej X → indledning → Sammenlign muligheder → forbehold
                  → mulighedernes blokke → beskrivelse → hilsen
flere lokationer: parter → Hej X → indledning → Samlet prisoverblik (lokation
                  med mulighederne under, ingen total) → forbehold →
                  for hver lokation: overskrift → Sammenlign muligheder →
                  mulighedernes blokke → beskrivelse → hilsen
```

- **I byggeren fungerer muligheder som lokationer:** man starter med én og
  tilføjer selv flere ("Mulighed A", "Mulighed B"). Ingen foruddefinerede
  muligheder. Man bliver stående i lokationen, mens man arbejder med dens
  muligheder.
- **"Kopiér lokation" tager lokationens muligheder med; "+ Lokation" starter
  tom.**
- **Lokationer og muligheder betjenes ens:** fanerne har nummer eller bogstav,
  "+ …" og "⧉ Kopiér …" står i fanerækken, og navnefelt og "✕ Slet …" står
  under den. Kopier lægges sidst begge steder, så de andre beholder nummer
  eller bogstav. Testen holder de to paneler ens.
- Prisoverblikket har **ingen samlet total**, når en lokation har flere
  muligheder — de er alternativer, og totalen afhænger af kundens valg.
- Lokationens overskrift (`.lok-titel`) er ikke en blå bjælke — den er
  forbeholdt blokkene, ellers ligner lokationen endnu en mulighed.
- **Muligheder har bogstaver (A, B, C), lokationer tal.** Med tal på begge blev
  "1 Genbrug" og "1 Aarhus C" blandet sammen. Alle mærkater er firkantede.
- **Muligheder har ingen egen beskrivelse** — kun navn, underrubrik og
  anbefaling. Feltet er prøvet og fravalgt af tillty; testen holder det ude.

- **Afslutning og hilsen står til sidst i hele tilbuddet**, efter sidste
  mulighed — ikke på forsiden. Der er heller ingen "Sådan siger I ja"-boks;
  begge dele er fravalgt af tillty.

- **Mulighederne følger efter hinanden uden sideskift.** Pagineringen flytter
  eller deler en mulighedsblok ligesom en lokationsblok. Tvungne sideskift pr.
  mulighed er prøvet og fravalgt af tillty.
- **Ingen pris i mulighedens bjælke.** Prisen står i blokkens opsummering og i
  sammenligningen.
- Kun muligheder **med indhold** kommer med, og de nummereres uden huller. Har
  kun én indhold, er der intet at sammenligne, og det er et almindeligt tilbud.
- **Sammenligningens rækker kommer fra `SAMMENLIGNING` i `js/data.js`.** Alle
  produkter i kataloget skal have en række — ellers er de usynlige på forsiden,
  og testen fejler. Software og licens bygges automatisk af `MODULES` og
  `LICENSE_TYPES`.
- Cellerne siger kun **ny/jeres**, når kunden har eget udstyr i rækken, og kun
  **varianten** (11", LAN), når mulighederne bruger forskellige. Et ettal alene
  udelades ved siden af et ord: "Ny WiFi", ikke "1 ny WiFi". Det er bevidst —
  alt andet er støj i en oversigt, kunden skal læse i ét blik.

## tillty PAY (egen tilbudstype)

- **PAY er sin egen tilbudstype** (`FORM.type === 'pay'`, vælges ved opstart) og
  har intet med udstyrstilbuddet at gøre: ingen hardware, licenser, moduler,
  lokationer eller muligheder. `LOCS` findes stadig (tom) og sendes med, så
  API'ets validering holder. Tilbud uden `type` er udstyrstilbud.
- **Satserne står kun i `js/data.js`** (`PAY_KORT`, `PAY_KURS_EUR`, `PAY_MARGIN`,
  `PAY_KILDE`): interchange, scheme fee og fast scheme-gebyr pr. korttype fra
  Worldline, Danmark, april 2026. De kan ikke ændres i byggeren. Ændrer
  Worldline dem, rettes de her — med kilde og dato.
- **Formlerne er regnearkets** ("tillty - Prisudregner", fanen PAY), én til én i
  `payBeregn()` i `js/pay.js`: effektiv rate = interchange + scheme fee +
  margin; pr. transaktion = gns. beløb × rate + fast gebyr × kurs; pr. måned =
  transaktioner × andel × pr. transaktion. Lav dem ikke om uden at rette
  regnearket med — de skal give samme tal.
- **Brøker i state, procent i felterne.** `PAY.margin` er 0.006, feltet viser
  0,6. Tomt felt er `null` ("ikke sat"), ikke 0.
- **Ingen fast fee pr. transaktion.** tillty har ingen og får ingen. Regnearkets
  felt er bevidst udeladt — tilføj det ikke.
- **Ingen `data-krav` på PAY-felterne.** De ville stoppe eksporten af
  udstyrstilbud, hvor felterne er skjulte og tomme. PAY's manglende felter
  kommer fra `payBeregn(PAY).mangler` og lægges ind i `kravOpfyldt()`.
- **"Hvad er IC++?" er regnearkets forklaring**, i I-form: indledning, de tre
  dele med punkter og summelinjen. Summen står i en mørkeblå boks under de tre dele. Satserne i punkterne
  hentes fra `PAY_KORT` og marginen. Tredje del er "Acquirer markup" hos
  Worldline (inkl. tillty) uden regnearkets "Fast fee pr. transaktion": tillty
  har ingen. Linjen "Worldline (inkl. tillty)" må ikke stå med versaler. Talsatserne pr. korttype står ikke i tilbuddet; kortfordelingen
  viser kun den effektive rate, som i regnearket.
- **Surcharge kun på firmakort og internationale kort** (`surcharge:null` i
  `PAY_KORT` betyder "må ikke"). Netto-effekten er højst korttypens egen
  omkostning — surcharge kan aldrig gøre et kort til en indtægt.
- **Surcharge er slået fra som standard** (`PAY.surchargeTil`, kontakten i
  panelet). Satserne står klar med regnearkets 2,5 %, men regnes først med, og
  vises først i tilbuddet, når kontakten er slået til. tillty vil selv vælge
  det pr. tilbud.
- **I kartoteket** er Engangs "—", og Løbende/md. er netto betalingsomkostningen
  pr. måned (`samlTotaler()` lægger den i `mod_md`). Listen læser typen ud af
  `data->'form'->>'type'` og viser mærkatet "PAY".
- **Opstarten er to trin.** Først tilbudstypen som to knapper
  (`.opstart-type`, `vaelgType()`); PAY starter med det samme, udstyr folder
  muligheder og lokationer ud under knapperne og bekræftes med startknappen.
  Man starter altid på typevalget, også efter "+ Nyt tilbud".
- **Kartoteket er delt i udstyr og PAY** med hver sin tabel (`UdstyrTabel`,
  `PayTabel` i `app/kartotek.tsx`): PAY har ingen engangspris, kun "Netto
  betaling/md.". Typeknapperne deler listen op, statusknapperne snævrer ind,
  og tællerne følger søgningen.
- **Panelerne styres af typen**, ikke af koden i hvert panel: `anvendForm()`
  sætter `body.form-pay`, og alt der kun hører til udstyr (hardware, tilbehør,
  software, indløsningsfelterne) er mærket `kun-udstyr` i `index.html`.
  Et nyt udstyrspanel skal have klassen med, ellers står det i PAY-tilbuddet.
- **Afslutningen har én standardtekst pr. type** (`STANDARD_NOTE` og
  `STANDARD_NOTE_PAY` i `init.js`, oversat i `sprog.js`). `standardNote(l, type)`
  vælger; ved opstart følger teksten med over på den valgte type, men kun så
  længe den er en af standardteksterne. Sælgerens egen tekst røres ikke.
- **PAY-tilbuddet har to dele.** Først forklaringen, fritstående og uden
  nummer: prisen som kort lige efter indledningen (`.pay-pris`), med IC++-satsen
  først og størst og resultatets nøgletal under (netto pr. måned fremhævet i
  blåt, effektiv rate, gns. pr. transaktion, og før/surcharge som note), så "Hvad er
  IC++?" og "Hvorfor IC++?" som overskrift og indhold uden ramme (`.pay-sek`,
  ét element hver, så pagineringen flytter dem samlet). Derefter selve
  tilbuddet som nummererede blokke med blå bjælke (`blok()`, `pay-blok`): Jeres
  tal, Kortfordeling, Surcharge (kun når den er slået til) og Jeres resultat.
  Numrene følger med, når surcharge er væk. Tabellernes header-række må ikke
  gentage bjælkens navn, derfor hedder de `Omsætning`, `Korttype` og
  `Betalingsomkostning` inde i blokkene.
- Regnestykket i "Hvad er IC++?": tre kort med blåt plus imellem, et lyseblåt
  lig med under og summen i en mørkeblå boks. "Hvorfor IC++?" er tre kort med
  hvert sit ikon som inline-SVG (øje, vægt, graf), ikke ikonfiler eller en
  ikonfont, af samme grund som fontene.
- **"Jeres resultat" er en almindelig tabel** med alle regnearkets rækker:
  før surcharge, surcharge, netto pr. måned som totallinje, og effektiv rate
  og gns. pr. transaktion under den. Regnearkets farvede bokse er prøvet og
  fravalgt af tillty; tabellen skal se ud som resten af tilbuddet.
- **Kortfordelingen har præcis regnearkets kolonner**: Korttype, Andel,
  Effektiv rate, Pr. transaktion, Pr. md. Ingen interchange, scheme fee,
  margin, fast gebyr eller beskrivelser i tabellen; tillty har valgt det ud som
  for omfattende. Interchange og scheme fee forklares i "Hvad er IC++?".
- **Store beløb står i hele kroner, små med ører.** Månedsbeløb, omsætning,
  grundlag og tillæg rundes af (det er et estimat); beløb pr. transaktion
  beholder ørerne ("2,29,-"). Alt skrives med `fmt()`. Afrundingen sker i
  `payBeregn()` (`perMdKr`, `foerKr`, `nettoKr` …), ikke i visningen, og
  linjerne fordeles med `fordelKr()`, så en kolonne altid summer til sin
  total. Netto er før minus surcharge i hele kroner. Panelet og kartoteket
  bruger de samme afrundede tal.
- Prisboksen har ingen forklarende sætning under IC++-satsen; forklaringen står
  i "Hvad er IC++?".

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

`exportPDF()` venter på, at fotoene i de nybyggede printsider er afkodet (højst
3 sekunder), før `window.print()` kaldes. Printdialogen tager et øjebliksbillede,
og et foto der ikke er klar, kan komme ud som et hul. Headless-testene rammer
aldrig den timing — de kalder `buildPrintPages()` direkte.

## Tilbudsnumre

- **Nummeret er ikke et felt i byggeren.** `c_number` er et skjult input, som
  gem og genåbning skriver i; nummeret står kun i tilbuddets sidehoved. Det er
  prøvet som skrivebeskyttet felt og fjernet, fordi det ikke er noget man
  retter i. Gør det ikke synligt eller redigerbart igen; hele pointen med
  kartoteket er, at numre er entydige.
- `resetAll()` kalder `slipTilbud()`, som nulstiller `aktivtNr`. Uden det ville
  næste Gem sende det gamle nummer med og **overskrive kundens forrige tilbud**.
- Nummeret tildeles **af serveren** ved første gem — også når eksporten gemmer
  automatisk først. Feltet er skrivebeskyttet, når der er en server bag.
- Tildelingen er én atomar `insert … on conflict … returning` (`lib/nummer.ts`).
  Neons HTTP-driver har ikke rigtige transaktioner, så det skal afgøres i
  databasen. Lav den ikke om til læs-så-skriv.
- **Numrene skal ikke kunne afkodes** (`lib/nummer.ts`). Året starter på et
  skævt tilfældigt tal (1200-1900), og hvert spring er 2-9. `2026-001` afslører,
  at kunden er årets første; 1001, 1002, 1003 lader to kunder regne ud, hvor
  mange tilbud der lå imellem. To fælder, der begge er prøvet af og rettet:
  et **fast** gulv får enhver lav tæller til at lande på præcis det tal, og
  `greatest(seq + spring, nyt tilfældigt tal)` trækker et nyt gulv ved hvert
  kald og giver spring langt over 9. Derfor et eksplicit `case`: løft én gang,
  dernæst rene spring.
- **Numre genbruges aldrig.** Tælleren rulles ikke tilbage, når et tilbud
  slettes — det kan allerede være sendt til en kunde.

## Billeder og adresser

- **Produktfotos i `public/bygger/produktbilleder/`** kommer med i kundens PDF.
  Grå canvas-pladsholdere gør ikke — den regel står stadig. `pdfImg()` afgør
  forskellen; `getImg()` er kun til skærmen.
- Fotos vises med `object-fit:contain`, ikke `cover`. Produkterne har vidt
  forskellige formater — SOT'en er næsten tre gange så høj som bred — og en
  firkantet beskæring klipper produktet midt over.
- Adressen er delt i vej, postnr. og by. `js/postnumre.js` er en lokal tabel;
  slå ikke op mod en API, af samme grund som med fontene.

## Test

`npm test` kører scenarierne i headless Chromium mod `file://`, uden server
eller database. `npm run test:api` kræver en **separat** database og nægter at
køre mod `DATABASE_URL` — den tømmer tabellerne og ville ellers brænde rigtige
tilbudsnumre.

**Ændrer du det, byggeren gemmer, så kør `npm run test:api`.** `npm test`
kører uden server og opdager ikke, hvis API'et afviser det nye format. Det
skete med muligheder: `POST /api/tilbud` godkendte kun `lokationer` i roden,
så ethvert gem fejlede med 400. API'et tager nu imod begge formater — gamle
tilbud skal stadig kunne gemmes igen.

Testen fanger også tavse 404'er på lokale filer. Det er ikke teoretisk: en
forkert relativ sti i `css/fonts.css` gjorde, at alle fontene 404'ede, og
appen kørte i systemfonte uden at nogen opdagede det.

`npm test` kører scenarierne i headless Chromium. Kontroltallene i testen er
**håndregnede** — ændrer du priser i `js/data.js`, skal de rettes med, ellers
er testen værdiløs.

Overflow-testen tvinger `#print-root` synlig først. Måler man på et
`display:none`-element, er alle rects 0 og testen melder grønt uanset hvad.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
