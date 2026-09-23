/* ============================================================
   tillty Tilbudsbygger — SPROG I TILBUDDET

   Byggeren er sælgerens side og er altid dansk. Preview og PDF — kundens
   side — skrives på det sprog, der er valgt i "Sprog i tilbuddet".

   Den danske tekst er nøglen. Hver række herunder er samme tekst på
   dansk, engelsk, norsk, svensk og tysk, så de kan læses igennem side om
   side. Retter du en dansk tekst her eller i data.js, skal rækken rettes
   med — ellers står teksten på dansk i et udenlandsk tilbud (testen fanger det).

   Priserne er de samme på alle sprog og står i DKK. Det, sælgeren selv
   skriver (indledning, afslutning, navne på lokationer og muligheder),
   oversættes ikke. Adresser følger heller ikke sproget — tillty sælger fra
   Danmark, og postnummeropslaget er dansk.
   ============================================================ */

const SPROG = {
  da:{navn:'Dansk',   flag:'🇩🇰', locale:'da-DK', talord:{2:'to',  3:'tre',  4:'fire'}},
  en:{navn:'English', flag:'🇬🇧', locale:'en-GB', talord:{2:'two', 3:'three',4:'four'}},
  nb:{navn:'Norsk',   flag:'🇳🇴', locale:'nb-NO', talord:{2:'to',  3:'tre',  4:'fire'}},
  sv:{navn:'Svenska', flag:'🇸🇪', locale:'sv-SE', talord:{2:'två', 3:'tre',  4:'fyra'}},
  de:{navn:'Deutsch', flag:'🇩🇪', locale:'de-DE', talord:{2:'zwei',3:'drei', 4:'vier'}},
};
const SPROG_RAEKKEFOELGE = ['da','en','nb','sv','de'];

/* [dansk, engelsk, norsk, svensk, tysk]. {navn} o.l. er pladsholdere. */
const OVERSAETTELSER = [
  /* ---------- sidehoved og sidefod ---------- */
  ['TILBUD', 'QUOTE', 'TILBUD', 'OFFERT', 'ANGEBOT'],
  ['Nr.', 'No.', 'Nr.', 'Nr', 'Nr.'],
  ['Sendt:', 'Sent:', 'Sendt:', 'Skickad:', 'Datum:'],
  ['Gælder til:', 'Valid until:', 'Gyldig til:', 'Giltig till:', 'Gültig bis:'],
  ['Side {n} af {total}', 'Page {n} of {total}', 'Side {n} av {total}', 'Sida {n} av {total}', 'Seite {n} von {total}'],
  ['(fortsat)', '(continued)', '(fortsatt)', '(forts.)', '(Fortsetzung)'],
  ['Alle priser er ekskl. moms medmindre andet er angivet.',
   'All prices are in DKK excluding VAT unless otherwise stated.',
   'Alle priser er i DKK ekskl. mva. med mindre annet er oppgitt.',
   'Alla priser är i DKK exkl. moms om inget annat anges.',
   'Alle Preise in DKK zzgl. MwSt., sofern nicht anders angegeben.'],
  ['CVR', 'VAT no.', 'Org.nr.', 'Org.nr', 'USt-IdNr.'],
  ['Tilbud', 'Quote', 'Tilbud', 'Offert', 'Angebot'],

  /* ---------- brevet ---------- */
  ['Fra', 'From', 'Fra', 'Från', 'Von'],
  ['Til', 'To', 'Til', 'Till', 'An'],
  ['Hej {navn},', 'Hi {navn},', 'Hei {navn},', 'Hej {navn},', 'Guten Tag {navn},'],
  ['Hej,', 'Hi,', 'Hei,', 'Hej,', 'Guten Tag,'],
  ['Tak for en god dialog. Herunder finder I vores tilbud på en tillty-løsning tilpasset jer, med det udstyr og de licenser vi har talt om.',
   'Thank you for a good conversation. Below you will find our quote for a tillty solution tailored to you, with the equipment and licences we discussed.',
   'Takk for en god dialog. Nedenfor finner dere vårt tilbud på en tillty-løsning tilpasset dere, med utstyret og lisensene vi har snakket om.',
   'Tack för en bra dialog. Nedan hittar ni vår offert på en tillty-lösning anpassad för er, med den utrustning och de licenser vi har pratat om.',
   'Vielen Dank für das gute Gespräch. Nachfolgend finden Sie unser Angebot für eine auf Sie zugeschnittene tillty-Lösung mit den besprochenen Geräten und Lizenzen.'],
  ['Tak for en god dialog. Herunder finder I vores tilbud på en tillty-løsning tilpasset jer. Den er sat op pr. lokation, så I kan se både den enkelte forretning og den samlede investering.',
   'Thank you for a good conversation. Below you will find our quote for a tillty solution tailored to you. It is set out per location, so you can see both each individual business and the total investment.',
   'Takk for en god dialog. Nedenfor finner dere vårt tilbud på en tillty-løsning tilpasset dere. Den er satt opp per lokasjon, slik at dere kan se både den enkelte virksomheten og den samlede investeringen.',
   'Tack för en bra dialog. Nedan hittar ni vår offert på en tillty-lösning anpassad för er. Den är uppställd per plats, så att ni kan se både den enskilda verksamheten och den totala investeringen.',
   'Vielen Dank für das gute Gespräch. Nachfolgend finden Sie unser Angebot für eine auf Sie zugeschnittene tillty-Lösung. Es ist nach Standorten aufgeteilt, sodass Sie sowohl den einzelnen Betrieb als auch die Gesamtinvestition sehen.'],
  ['Tak for en god dialog. Herunder finder I vores tilbud på det tilbehør, I mangler til jeres nuværende tillty-opsætning.',
   'Thank you for a good conversation. Below you will find our quote for the accessories you need for your current tillty setup.',
   'Takk for en god dialog. Nedenfor finner dere vårt tilbud på tilbehøret dere mangler til deres nåværende tillty-oppsett.',
   'Tack för en bra dialog. Nedan hittar ni vår offert på de tillbehör ni behöver till er nuvarande tillty-lösning.',
   'Vielen Dank für das gute Gespräch. Nachfolgend finden Sie unser Angebot für das Zubehör, das Ihnen für Ihre bestehende tillty-Installation noch fehlt.'],
  ['Tak for en god dialog. Herunder finder I {antal} måder at gribe det an på, stillet op side om side, med specifikationen af hver mulighed nedenfor.',
   'Thank you for a good conversation. Below you will find {antal} ways to approach it, set out side by side, with the specification of each option further down.',
   'Takk for en god dialog. Nedenfor finner dere {antal} måter å gripe det an på, stilt opp side om side, med spesifikasjonen av hvert alternativ lenger ned.',
   'Tack för en bra dialog. Nedan hittar ni {antal} sätt att angripa det på, uppställda sida vid sida, med specifikationen av varje alternativ längre ned.',
   'Vielen Dank für das gute Gespräch. Nachfolgend finden Sie {antal} mögliche Lösungswege im direkten Vergleich, mit der Spezifikation jeder Option weiter unten.'],
  ['Tak for en god dialog. Herunder finder I vores tilbud pr. lokation, med de muligheder vi har talt om for hver af dem stillet op side om side.',
   'Thank you for a good conversation. Below you will find our quote per location, with the options we discussed for each of them set out side by side.',
   'Takk for en god dialog. Nedenfor finner dere vårt tilbud per lokasjon, med alternativene vi har snakket om for hver av dem stilt opp side om side.',
   'Tack för en bra dialog. Nedan hittar ni vår offert per plats, med de alternativ vi har pratat om för var och en av dem uppställda sida vid sida.',
   'Vielen Dank für das gute Gespräch. Nachfolgend finden Sie unser Angebot je Standort, mit den besprochenen Optionen für jeden Standort im direkten Vergleich.'],
  ['Hilsen {saelger} og tillty teamet', 'Kind regards, {saelger} and the tillty team', 'Hilsen {saelger} og tillty-teamet', 'Hälsningar {saelger} och tillty-teamet', 'Viele Grüße, {saelger} und das tillty-Team'],
  ['Hilsen tillty teamet', 'Kind regards, the tillty team', 'Hilsen tillty-teamet', 'Hälsningar tillty-teamet', 'Viele Grüße, Ihr tillty-Team'],

  /* ---------- tabeller ---------- */
  ['Specifikation', 'Specification', 'Spesifikasjon', 'Specifikation', 'Spezifikation'],
  ['Hardware', 'Hardware', 'Hardware', 'Hårdvara', 'Hardware'],
  ['Ekstra tilbehør', 'Additional accessories', 'Ekstra tilbehør', 'Extra tillbehör', 'Zusätzliches Zubehör'],
  ['Licens', 'Licence', 'Lisens', 'Licens', 'Lizenz'],
  ['Modul', 'Module', 'Modul', 'Modul', 'Modul'],
  ['Antal', 'Qty', 'Antall', 'Antal', 'Menge'],
  ['Stk. pris', 'Unit price', 'Stykkpris', 'Styckpris', 'Stückpreis'],
  ['I alt', 'Total', 'Totalt', 'Totalt', 'Gesamt'],
  ['Pris/dag', 'Price/day', 'Pris/dag', 'Pris/dag', 'Preis/Tag'],
  ['I alt/dag', 'Total/day', 'Totalt/dag', 'Totalt/dag', 'Gesamt/Tag'],
  ['Pr. md.', 'Per month', 'Per mnd.', 'Per mån.', 'Pro Monat'],
  ['Pris/md.', 'Price/month', 'Pris/mnd.', 'Pris/mån.', 'Preis/Monat'],
  ['Md. i alt', 'Monthly total', 'Totalt/mnd.', 'Totalt/mån.', 'Gesamt/Monat'],
  ['Inkl.', 'Incl.', 'Inkl.', 'Ingår', 'Inkl.'],
  ['Jeres eget', 'Your own', 'Deres eget', 'Ert eget', 'Bereits vorhanden'],
  ['Ny', 'New', 'Ny', 'Ny', 'Neu'],
  ['Brugt', 'Used', 'Brukt', 'Begagnad', 'Gebraucht'],
  ['Jeres nuværende udstyr, som vi sætter op i systemet.',
   'Your existing equipment, which we will set up in the system.',
   'Deres nåværende utstyr, som vi setter opp i systemet.',
   'Er befintliga utrustning, som vi sätter upp i systemet.',
   'Ihre vorhandenen Geräte, die wir im System einrichten.'],
  ['Engangs', 'One-off', 'Engangs', 'Engång', 'Einmalig'],
  ['Licenser / dag', 'Licences / day', 'Lisenser / dag', 'Licenser / dag', 'Lizenzen / Tag'],
  ['Moduler / md.', 'Modules / month', 'Moduler / mnd.', 'Moduler / mån.', 'Module / Monat'],
  ['Løbende / md.', 'Recurring / month', 'Løpende / mnd.', 'Löpande / mån.', 'Laufend / Monat'],

  /* ---------- prisoverblik og forbehold ---------- */
  ['Samlet prisoverblik', 'Price overview', 'Samlet prisoversikt', 'Samlad prisöversikt', 'Preisübersicht'],
  ['Licens/dag', 'Licence/day', 'Lisens/dag', 'Licens/dag', 'Lizenz/Tag'],
  ['Moduler/md.', 'Modules/month', 'Moduler/mnd.', 'Moduler/mån.', 'Module/Monat'],
  ['Løbende/md.', 'Recurring/month', 'Løpende/mnd.', 'Löpande/mån.', 'Laufend/Monat'],
  ['Samlet pris', 'Total price', 'Samlet pris', 'Totalpris', 'Gesamtpreis'],
  ['Licenser afregnes <b>pr. dag i brug</b>{dagspris}. Månedsprisen er regnet med en måned på {dage} dage; I betaler kun for de dage, terminalen er slået til.',
   'Licences are billed <b>per day in use</b>{dagspris}. The monthly price is based on a {dage}-day month; you only pay for the days the terminal is switched on.',
   'Lisenser faktureres <b>per dag i bruk</b>{dagspris}. Månedsprisen er beregnet med en måned på {dage} dager; dere betaler kun for de dagene terminalen er slått på.',
   'Licenser debiteras <b>per dag i bruk</b>{dagspris}. Månadspriset är beräknat på en månad om {dage} dagar; ni betalar bara för de dagar terminalen är påslagen.',
   'Lizenzen werden <b>pro Nutzungstag</b> abgerechnet{dagspris}. Der Monatspreis basiert auf einem Monat mit {dage} Tagen; Sie zahlen nur für die Tage, an denen das Terminal eingeschaltet ist.'],
  [' ({pris} pr. dag)', ' ({pris} per day)', ' ({pris} per dag)', ' ({pris} per dag)', ' ({pris} pro Tag)'],
  ['Bemærk at jeres eget udstyr også kræver licens og tæller med i licenserne.',
   'Please note that your own equipment also requires a licence and is included in the licence count.',
   'Merk at deres eget utstyr også krever lisens og teller med i lisensene.',
   'Observera att er egen utrustning också kräver licens och räknas med i licenserna.',
   'Bitte beachten Sie, dass auch Ihre vorhandenen Geräte eine Lizenz benötigen und mitgezählt werden.'],
  ['Indløsning:', 'Card acquiring:', 'Innløsning:', 'Kortinlösen:', 'Kartenakzeptanz:'],
  ['Indløsning, fysisk betaling:', 'Card acquiring, in-store payments:', 'Innløsning, fysisk betaling:', 'Kortinlösen, fysisk betalning:', 'Kartenakzeptanz, Zahlung vor Ort:'],
  ['Indløsning, online betaling:', 'Card acquiring, online payments:', 'Innløsning, nettbetaling:', 'Kortinlösen, onlinebetalning:', 'Kartenakzeptanz, Online-Zahlung:'],
  ['Aftales efter dialog.', 'To be agreed.', 'Avtales etter dialog.', 'Enligt överenskommelse.', 'Nach Absprache.'],
  ['Der er ingen samlet pris, fordi den afhænger af, hvilken mulighed I vælger for hver lokation.',
   'There is no total price, as it depends on which option you choose for each location.',
   'Det er ingen samlet pris, fordi den avhenger av hvilket alternativ dere velger for hver lokasjon.',
   'Det finns inget totalpris, eftersom det beror på vilket alternativ ni väljer för varje plats.',
   'Es gibt keinen Gesamtpreis, da dieser davon abhängt, welche Option Sie für jeden Standort wählen.'],

  /* ---------- muligheder og sammenligning ---------- */
  ['Mulighed', 'Option', 'Alternativ', 'Alternativ', 'Option'],
  ['Lokation', 'Location', 'Lokasjon', 'Plats', 'Standort'],
  ['Sammenlign muligheder', 'Compare options', 'Sammenlign alternativer', 'Jämför alternativ', 'Optionen im Vergleich'],
  ['Vi anbefaler', 'We recommend', 'Vi anbefaler', 'Vi rekommenderar', 'Unsere Empfehlung'],
  ['Software og licens', 'Software and licences', 'Programvare og lisens', 'Programvara och licens', 'Software und Lizenzen'],
  ['Løbende pr. måned', 'Recurring per month', 'Løpende per måned', 'Löpande per månad', 'Laufend pro Monat'],
  ['(inkl. jeres eget udstyr)', '(incl. your own equipment)', '(inkl. deres eget utstyr)', '(inkl. er egen utrustning)', '(inkl. vorhandener Geräte)'],
  ['jeres', 'existing', 'deres egne', 'era egna', 'vorhandene'],
  ['ny', 'new', 'ny', 'ny', 'neu'],
  ['nye', 'new', 'nye', 'nya', 'neue'],
  ['brugt', 'used', 'brukt', 'begagnad', 'gebraucht'],
  ['brugte', 'used', 'brukte', 'begagnade', 'gebrauchte'],
  ['og', 'and', 'og', 'och', 'und'],

  /* ---------- katalog (data.js) ---------- */
  ['Til hurtig og effektiv ordreafgivelse (inkl. vægbeslag).', 'For quick and efficient ordering (incl. wall mount).', 'For rask og effektiv bestilling (inkl. veggbrakett).', 'För snabb och effektiv beställning (inkl. väggfäste).', 'Für schnelle und effiziente Bestellungen (inkl. Wandhalterung).'],
  ['15.4" POS Kasseskærm', '15.4" POS display', '15.4" POS kasseskjerm', '15.4" POS kassaskärm', '15.4" POS-Kassenbildschirm'],
  ['Stationær skærm til kassesystemet.', 'Stationary display for the POS system.', 'Stasjonær skjerm til kassesystemet.', 'Stationär skärm till kassasystemet.', 'Stationärer Bildschirm für das Kassensystem.'],
  ['8.7" POS Tablet', '8.7" POS Tablet', '8.7" POS Tablet', '8.7" POS Tablet', '8.7" POS Tablet'],
  ['11" POS Tablet', '11" POS Tablet', '11" POS Tablet', '11" POS Tablet', '11" POS Tablet'],
  ['14" POS Tablet', '14" POS Tablet', '14" POS Tablet', '14" POS Tablet', '14" POS Tablet'],
  ['Både stationær og mobil skærm til kassesystemet.', 'Both a stationary and a mobile display for the POS system.', 'Både stasjonær og mobil skjerm til kassesystemet.', 'Både stationär och mobil skärm till kassasystemet.', 'Stationärer und mobiler Bildschirm für das Kassensystem in einem.'],
  ['18.5" KDS – Køkkenskærm', '18.5" KDS – Kitchen display', '18.5" KDS – Kjøkkenskjerm', '18.5" KDS – Köksskärm', '18.5" KDS – Küchenbildschirm'],
  ['22" KDS – Køkkenskærm', '22" KDS – Kitchen display', '22" KDS – Kjøkkenskjerm', '22" KDS – Köksskärm', '22" KDS – Küchenbildschirm'],
  ['Digital skærm til ordrevisning i køkkenet.', 'Digital display showing orders in the kitchen.', 'Digital skjerm for ordervisning på kjøkkenet.', 'Digital skärm för ordervisning i köket.', 'Digitaler Bildschirm zur Bestellanzeige in der Küche.'],
  ['Stationær Betalingsterminal', 'Stationary payment terminal', 'Stasjonær betalingsterminal', 'Stationär betalterminal', 'Stationäres Zahlungsterminal'],
  ['Fast betalingsterminal – anbefales på SOT og kasse.', 'Fixed payment terminal – recommended for SOT and checkout.', 'Fast betalingsterminal – anbefales på SOT og kasse.', 'Fast betalterminal – rekommenderas vid SOT och kassa.', 'Festes Zahlungsterminal – empfohlen für SOT und Kasse.'],
  ['Mobil Betalingsterminal', 'Mobile payment terminal', 'Mobil betalingsterminal', 'Mobil betalterminal', 'Mobiles Zahlungsterminal'],
  ['Håndholdt betalingsterminal for mobilbetaling.', 'Handheld terminal for mobile payments.', 'Håndholdt betalingsterminal for mobilbetaling.', 'Handhållen betalterminal för mobil betalning.', 'Handterminal für mobile Zahlungen.'],
  ['LAN Printer', 'LAN Printer', 'LAN-skriver', 'LAN-skrivare', 'LAN-Drucker'],
  ['WiFi Printer', 'WiFi Printer', 'WiFi-skriver', 'WiFi-skrivare', 'WLAN-Drucker'],
  ['Bon- og kvitteringsprinter (kasse og køkken).', 'Receipt and order printer (checkout and kitchen).', 'Bong- og kvitteringsskriver (kasse og kjøkken).', 'Kvitto- och bongskrivare (kassa och kök).', 'Bon- und Belegdrucker (Kasse und Küche).'],

  /* Tilbehør med engelske produktnavne beholder dem, som på dansk. */
  ['Floor stand', 'Floor stand', 'Floor stand', 'Floor stand', 'Floor stand'],
  ['Gulvstander, der giver et professionelt look.', 'Floor stand for a professional look.', 'Gulvstativ som gir et profesjonelt uttrykk.', 'Golvstativ som ger ett professionellt intryck.', 'Bodenständer für einen professionellen Auftritt.'],
  ['Holder til betalingsterminal (Beslag)', 'Payment terminal holder (bracket)', 'Holder til betalingsterminal (brakett)', 'Hållare för betalterminal (fäste)', 'Halterung für Zahlungsterminal'],
  ['Beslag til montering af betalingsterminal på SOT.', 'Bracket for mounting a payment terminal on the SOT.', 'Brakett for montering av betalingsterminal på SOT.', 'Fäste för montering av betalterminal på SOT.', 'Halterung zur Montage des Zahlungsterminals am SOT.'],
  ['Mount Adapter', 'Mount Adapter', 'Mount Adapter', 'Mount Adapter', 'Mount Adapter'],
  ['Beslag til fastgørelse af skærmen på andre baser og mounts.', 'Adapter for attaching the display to other bases and mounts.', 'Brakett for å feste skjermen på andre baser og holdere.', 'Fäste för att montera skärmen på andra baser och hållare.', 'Adapter zur Befestigung des Bildschirms an anderen Standfüßen und Halterungen.'],
  ['Desktop Base', 'Desktop Base', 'Desktop Base', 'Desktop Base', 'Desktop Base'],
  ['Enkel holder til fast placering på disken.', 'Simple stand for fixed placement on the counter.', 'Enkel holder for fast plassering på disken.', 'Enkel hållare för fast placering på disken.', 'Einfacher Standfuß für den festen Platz auf dem Tresen.'],
  ['Multi-Function Base', 'Multi-Function Base', 'Multi-Function Base', 'Multi-Function Base', 'Multi-Function Base'],
  ['Multi-funktionel holder til fast placering på disken.', 'Multi-function stand for fixed placement on the counter.', 'Multifunksjonell holder for fast plassering på disken.', 'Multifunktionell hållare för fast placering på disken.', 'Multifunktionaler Standfuß für den festen Platz auf dem Tresen.'],
  ['Vesa Arm', 'VESA Arm', 'VESA Arm', 'VESA Arm', 'VESA Arm'],
  ['Fleksibel skærmarm til bordmontering.', 'Flexible display arm for table mounting.', 'Fleksibel skjermarm for bordmontering.', 'Flexibel skärmarm för bordsmontering.', 'Flexibler Bildschirmarm zur Tischmontage.'],
  ['Table-Side Fixed Stand', 'Table-Side Fixed Stand', 'Table-Side Fixed Stand', 'Table-Side Fixed Stand', 'Table-Side Fixed Stand'],
  ['Stativ, der spændes fast på kanten af bordet eller disken.', 'Stand that clamps onto the edge of the table or counter.', 'Stativ som spennes fast på kanten av bordet eller disken.', 'Stativ som spänns fast på kanten av bordet eller disken.', 'Ständer, der an der Tisch- oder Tresenkante festgeklemmt wird.'],
  ['Table-Side Stand', 'Table-Side Stand', 'Table-Side Stand', 'Table-Side Stand', 'Table-Side Stand'],
  ['Holder i lav højde.', 'Low-height stand.', 'Holder i lav høyde.', 'Hållare i låg höjd.', 'Halterung in niedriger Höhe.'],
  ['Hand Strap', 'Hand Strap', 'Hand Strap', 'Hand Strap', 'Hand Strap'],
  ['Sikkert greb, når skærmen bruges håndholdt.', 'Secure grip when the display is used handheld.', 'Sikkert grep når skjermen brukes håndholdt.', 'Säkert grepp när skärmen används handhållen.', 'Sicherer Halt, wenn der Bildschirm in der Hand genutzt wird.'],
  ['Pengeskuffe', 'Cash drawer', 'Kasseskuff', 'Kassalåda', 'Kassenschublade'],
  ['Pengeskuffe til kontanter.', 'Cash drawer for notes and coins.', 'Kasseskuff for kontanter.', 'Kassalåda för kontanter.', 'Kassenschublade für Bargeld.'],
  ['Cradle til Mobil Betalingsterminal', 'Cradle for mobile payment terminal', 'Ladeholder til mobil betalingsterminal', 'Laddställ för mobil betalterminal', 'Ladestation für mobiles Zahlungsterminal'],
  ['Ladestander til den håndholdte terminal.', 'Charging cradle for the handheld terminal.', 'Ladestativ til den håndholdte terminalen.', 'Laddställ för den handhållna terminalen.', 'Ladestation für das Handterminal.'],

  ['POS & SOT licens', 'POS & SOT licence', 'POS & SOT lisens', 'POS & SOT licens', 'POS & SOT Lizenz'],
  ['KDS licens', 'KDS licence', 'KDS lisens', 'KDS licens', 'KDS Lizenz'],
  ['DS licens', 'DS licence', 'DS lisens', 'DS licens', 'DS Lizenz'],

  ['Takeaway', 'Takeaway', 'Takeaway', 'Takeaway', 'Takeaway'],
  ['Online takeaway-modul. Pr. forretning / md.', 'Online takeaway module. Per business / month.', 'Online takeaway-modul. Per virksomhet / mnd.', 'Onlinemodul för takeaway. Per verksamhet / mån.', 'Online-Takeaway-Modul. Pro Betrieb / Monat.'],
  ['QR bestilling', 'QR ordering', 'QR-bestilling', 'QR-beställning', 'QR-Bestellung'],
  ['Bestilling via QR-koder. Inkluderet i Takeaway.', 'Ordering via QR codes. Included in Takeaway.', 'Bestilling via QR-koder. Inkludert i Takeaway.', 'Beställning via QR-koder. Ingår i Takeaway.', 'Bestellung per QR-Code. In Takeaway enthalten.'],
  ['BI', 'BI', 'BI', 'BI', 'BI'],
  ['Business Intelligence. Pr. md.', 'Business Intelligence. Per month.', 'Business Intelligence. Per mnd.', 'Business Intelligence. Per mån.', 'Business Intelligence. Pro Monat.'],

  /* SAMMENLIGNING — kategorier og rækker */
  ['Kasse og bestilling', 'Checkout and ordering', 'Kasse og bestilling', 'Kassa och beställning', 'Kasse und Bestellung'],
  ['Selvbetjeningsterminal', 'Self-order terminal', 'Selvbetjeningsterminal', 'Självbetjäningsterminal', 'Selbstbedienungsterminal'],
  ['Bemandede kassepladser', 'Staffed checkouts', 'Betjente kassepunkter', 'Bemannade kassaplatser', 'Bediente Kassenplätze'],
  ['Holder eller base til kassetablet', 'Stand or base for POS tablet', 'Holder eller base til kassenettbrett', 'Hållare eller bas till kassaplatta', 'Halterung oder Standfuß für Kassentablet'],
  ['Køkken', 'Kitchen', 'Kjøkken', 'Kök', 'Küche'],
  ['Køkkenskærm (KDS)', 'Kitchen display (KDS)', 'Kjøkkenskjerm (KDS)', 'Köksskärm (KDS)', 'Küchenbildschirm (KDS)'],
  ['Bonprinter', 'Receipt printer', 'Bongskriver', 'Bongskrivare', 'Bondrucker'],
  ['Betaling', 'Payment', 'Betaling', 'Betalning', 'Zahlung'],
  ['Stationær betalingsterminal', 'Stationary payment terminal', 'Stasjonær betalingsterminal', 'Stationär betalterminal', 'Stationäres Zahlungsterminal'],
  ['Mobil betalingsterminal', 'Mobile payment terminal', 'Mobil betalingsterminal', 'Mobil betalterminal', 'Mobiles Zahlungsterminal'],
  /* ---------- tillty PAY ----------
     Betalingsløsningen har sit eget tilbud (FORM.type==='pay'). Fagtermerne
     IC++, Interchange, Scheme fee og Surcharge bevares på alle sprog. */
  ['Tak for en god dialog. Herunder finder I vores tilbud på tillty PAY: én gennemsigtig pris pr. korttype, regnet ud fra jeres egne tal.',
   'Thank you for a good conversation. Below you will find our quote for tillty PAY: one transparent price per card type, calculated from your own figures.',
   'Takk for en god dialog. Nedenfor finner dere vårt tilbud på tillty PAY: én transparent pris per korttype, beregnet ut fra deres egne tall.',
   'Tack för en bra dialog. Nedan hittar ni vår offert på tillty PAY: ett transparent pris per korttyp, beräknat utifrån era egna siffror.',
   'Vielen Dank für das gute Gespräch. Nachfolgend finden Sie unser Angebot für tillty PAY: ein transparenter Preis je Kartentyp, berechnet aus Ihren eigenen Zahlen.'],
  ['Jeres pris', 'Your price', 'Deres pris', 'Ert pris', 'Ihr Preis'],
  ['Effektiv rate (% af omsætning)', 'Effective rate (% of turnover)', 'Effektiv sats (% av omsetning)', 'Effektiv sats (% av omsättning)', 'Effektiver Satz (% vom Umsatz)'],
  ['Gns. omkostning pr. transaktion', 'Avg. cost per transaction', 'Gj.snittlig kostnad per transaksjon', 'Genomsnittlig kostnad per transaktion', 'Ø Kosten pro Transaktion'],
  ['{foer} før surcharge, {sur} i surcharge opkrævet af betaleren.',
   '{foer} before surcharge, {sur} in surcharge collected from the payer.',
   '{foer} før surcharge, {sur} i surcharge innkrevd fra betaleren.',
   '{foer} före surcharge, {sur} i surcharge som tas ut av betalaren.',
   '{foer} vor Surcharge, {sur} Surcharge, die vom Zahler erhoben wird.'],
  ['Alle beløb er i danske kroner (DKK).', 'All amounts are in Danish kroner (DKK).', 'Alle beløp er i danske kroner (DKK).', 'Alla belopp är i danska kronor (DKK).', 'Alle Beträge in Dänischen Kronen (DKK).'],
  ['Hvad er IC++?', 'What is IC++?', 'Hva er IC++?', 'Vad är IC++?', 'Was ist IC++?'],
  ['IC++ (Interchange++) er den mest gennemsigtige prismodel for kortbetalinger. I stedet for ét samlet gebyr (fx 0,99 % "blended") er prisen delt i tre dele, så I kan se præcist, hvor pengene går hen. Det giver jer bedre kontrol over omkostningerne og en fair pris ud fra jeres faktiske kortmix.',
   'IC++ (Interchange++) is the most transparent pricing model for card payments. Instead of one combined fee (e.g. 0.99% "blended"), the price is split into three parts, so you can see exactly where the money goes. It gives you better control of your costs and a fair price based on your actual card mix.',
   'IC++ (Interchange++) er den mest transparente prismodellen for kortbetalinger. I stedet for ett samlet gebyr (f.eks. 0,99 % "blended") er prisen delt i tre deler, slik at dere kan se nøyaktig hvor pengene går. Det gir dere bedre kontroll over kostnadene og en rettferdig pris ut fra deres faktiske kortmiks.',
   'IC++ (Interchange++) är den mest transparenta prismodellen för kortbetalningar. I stället för en samlad avgift (t.ex. 0,99 % "blended") är priset uppdelat i tre delar, så att ni kan se exakt vart pengarna går. Det ger er bättre kontroll över kostnaderna och ett rättvist pris utifrån er faktiska kortmix.',
   'IC++ (Interchange++) ist das transparenteste Preismodell für Kartenzahlungen. Statt einer Pauschalgebühr (z. B. 0,99 % "blended") ist der Preis in drei Teile gegliedert, sodass Sie genau sehen, wohin das Geld geht. Das gibt Ihnen mehr Kontrolle über die Kosten und einen fairen Preis auf Basis Ihres tatsächlichen Kartenmix.'],
  ['Interchange', 'Interchange', 'Interchange', 'Interchange', 'Interchange'],
  ['Kortudstedende bank', 'Card-issuing bank', 'Kortutstedende bank', 'Kortutgivande bank', 'Kartenausgebende Bank'],
  ['Gebyr som kortholders bank beholder for at udstede kortet og håndtere risikoen.',
   'Fee kept by the cardholder\'s bank for issuing the card and handling the risk.',
   'Gebyr som kortholderens bank beholder for å utstede kortet og håndtere risikoen.',
   'Avgift som kortinnehavarens bank behåller för att ge ut kortet och hantera risken.',
   'Gebühr, die die Bank des Karteninhabers für die Ausgabe der Karte und das Risiko einbehält.'],
  ['EU debit: {sats} (loft)', 'EU debit: {sats} (cap)', 'EU debet: {sats} (tak)', 'EU debit: {sats} (tak)', 'EU-Debit: {sats} (Obergrenze)'],
  ['EU credit: {sats} (loft)', 'EU credit: {sats} (cap)', 'EU kreditt: {sats} (tak)', 'EU kredit: {sats} (tak)', 'EU-Kredit: {sats} (Obergrenze)'],
  ['Firmakort og kort uden for EØS: typisk 1,2–1,8 %', 'Commercial and non-EEA cards: typically 1.2–1.8%', 'Firmakort og kort utenfor EØS: typisk 1,2–1,8 %', 'Företagskort och kort utanför EES: vanligtvis 1,2–1,8 %', 'Firmenkarten und Karten außerhalb des EWR: typisch 1,2–1,8 %'],
  ['Scheme fee', 'Scheme fee', 'Scheme fee', 'Scheme fee', 'Scheme fee'],
  ['Visa og Mastercard', 'Visa and Mastercard', 'Visa og Mastercard', 'Visa och Mastercard', 'Visa und Mastercard'],
  ['Gebyr til kortnetværket for brug af infrastrukturen: clearing, afregning og autorisation.',
   'Fee to the card scheme for use of its infrastructure: clearing, settlement and authorisation.',
   'Gebyr til kortnettverket for bruk av infrastrukturen: clearing, oppgjør og autorisasjon.',
   'Avgift till kortnätverket för användning av infrastrukturen: clearing, avräkning och auktorisation.',
   'Gebühr an das Kartennetzwerk für die Nutzung der Infrastruktur: Clearing, Abrechnung und Autorisierung.'],
  ['EU-kort ved disken: typisk {sats}', 'EU cards in store: typically {sats}', 'EU-kort i butikk: typisk {sats}', 'EU-kort i butik: vanligtvis {sats}', 'EU-Karten vor Ort: typisch {sats}'],
  ['Plus små faste gebyrer pr. transaktion', 'Plus small fixed fees per transaction', 'Pluss små faste gebyrer per transaksjon', 'Plus små fasta avgifter per transaktion', 'Zuzüglich kleiner Festgebühren pro Transaktion'],
  ['Acquirer markup', 'Acquirer markup', 'Acquirer markup', 'Acquirer markup', 'Acquirer-Aufschlag'],
  ['Worldline (inkl. tillty)', 'Worldline (incl. tillty)', 'Worldline (inkl. tillty)', 'Worldline (inkl. tillty)', 'Worldline (inkl. tillty)'],
  ['Margin som dækker indløsning, gateway, support og tilltys tjeneste.',
   'Margin covering acquiring, gateway, support and tillty\'s service.',
   'Margin som dekker innløsning, gateway, support og tilltys tjeneste.',
   'Marginal som täcker inlösen, gateway, support och tilltys tjänst.',
   'Marge für Acquiring, Gateway, Support und die Leistung von tillty.'],
  ['Fast procent pr. transaktion: {sats}', 'Fixed percentage per transaction: {sats}', 'Fast prosent per transaksjon: {sats}', 'Fast procent per transaktion: {sats}', 'Fester Prozentsatz pro Transaktion: {sats}'],
  ['Samme sats på alle korttyper', 'Same rate on all card types', 'Samme sats på alle korttyper', 'Samma sats på alla korttyper', 'Gleicher Satz für alle Kartentypen'],
  ['Summen er den samlede transaktionspris, I betaler. Fuldt gennemsigtigt.',
   'The sum is the total transaction price you pay. Fully transparent.',
   'Summen er den samlede transaksjonsprisen dere betaler. Helt transparent.',
   'Summan är det totala transaktionspriset ni betalar. Helt transparent.',
   'Die Summe ist der gesamte Transaktionspreis, den Sie zahlen. Vollständig transparent.'],
  ['Hvorfor IC++?', 'Why IC++?', 'Hvorfor IC++?', 'Varför IC++?', 'Warum IC++?'],
  ['Gennemsigtighed', 'Transparency', 'Transparens', 'Transparens', 'Transparenz'],
  ['I ser præcist, hvad hvert gebyr dækker. Ingen skjulte marginer.',
   'You see exactly what each fee covers. No hidden margins.',
   'Dere ser nøyaktig hva hvert gebyr dekker. Ingen skjulte marginer.',
   'Ni ser exakt vad varje avgift täcker. Inga dolda marginaler.',
   'Sie sehen genau, was jede Gebühr abdeckt. Keine versteckten Margen.'],
  ['Fair pris', 'Fair price', 'Rettferdig pris', 'Rättvist pris', 'Fairer Preis'],
  ['I betaler kun den faktiske omkostning plus markup. Billige kort som EU debit koster mindre end dyre kort som firmakort og udenlandske kort.',
   'You only pay the actual cost plus markup. Low-cost cards such as EU debit cost less than expensive cards such as commercial and foreign cards.',
   'Dere betaler bare den faktiske kostnaden pluss markup. Billige kort som EU debet koster mindre enn dyre kort som firmakort og utenlandske kort.',
   'Ni betalar bara den faktiska kostnaden plus påslag. Billiga kort som EU debit kostar mindre än dyra kort som företagskort och utländska kort.',
   'Sie zahlen nur die tatsächlichen Kosten plus Aufschlag. Günstige Karten wie EU-Debit kosten weniger als teure Karten wie Firmen- und ausländische Karten.'],
  ['Kontrol', 'Control', 'Kontroll', 'Kontroll', 'Kontrolle'],
  ['Når I kender jeres kortmix, kan I forudsige jeres betalingsomkostninger præcist og planlægge derefter.',
   'When you know your card mix, you can predict your payment costs precisely and plan accordingly.',
   'Når dere kjenner kortmiksen deres, kan dere forutsi betalingskostnadene nøyaktig og planlegge deretter.',
   'När ni känner till er kortmix kan ni förutse era betalningskostnader exakt och planera därefter.',
   'Wenn Sie Ihren Kartenmix kennen, können Sie Ihre Zahlungskosten genau vorhersagen und entsprechend planen.'],
  ['Jeres tal', 'Your figures', 'Deres tall', 'Era siffror', 'Ihre Zahlen'],
  ['Månedlig kortomsætning', 'Monthly card turnover', 'Månedlig kortomsetning', 'Månatlig kortomsättning', 'Monatlicher Kartenumsatz'],
  ['Gns. transaktionsbeløb', 'Avg. transaction amount', 'Gj.sn. transaksjonsbeløp', 'Genomsn. transaktionsbelopp', 'Durchschn. Transaktionsbetrag'],
  ['Transaktioner pr. måned', 'Transactions per month', 'Transaksjoner per måned', 'Transaktioner per månad', 'Transaktionen pro Monat'],
  ['Effektiv rate', 'Effective rate', 'Effektiv sats', 'Effektiv sats', 'Effektiver Satz'],
  ['Andel', 'Share', 'Andel', 'Andel', 'Anteil'],
  ['Pr. transaktion', 'Per transaction', 'Per transaksjon', 'Per transaktion', 'Pro Transaktion'],
  ['Surcharge', 'Surcharge', 'Surcharge', 'Surcharge', 'Surcharge'],
  ['Sats', 'Rate', 'Sats', 'Sats', 'Satz'],
  ['Grundlag pr. md.', 'Basis/month', 'Grunnlag per mnd.', 'Underlag per mån.', 'Grundlage/Monat'],
  ['Tillæg pr. md.', 'Surcharge amount/month', 'Tillegg per mnd.', 'Tillägg per mån.', 'Aufschlag/Monat'],
  ['Netto-effekt pr. md.', 'Net effect/month', 'Nettoeffekt per mnd.', 'Nettoeffekt per mån.', 'Nettoeffekt/Monat'],
  ['Samlet surcharge-effekt', 'Total surcharge effect', 'Samlet surcharge-effekt', 'Total surcharge-effekt', 'Gesamter Surcharge-Effekt'],
  ['Surcharge er et tillæg, I selv opkræver af betaleren på firmakort og internationale kort. Det må ikke lægges på EU-forbrugerkort, og netto-effekten kan højst udligne korttypens egen omkostning.',
   'Surcharge is an extra charge you collect from the payer yourself on commercial and international cards. It may not be applied to EU consumer cards, and the net effect can at most offset the cost of that card type.',
   'Surcharge er et tillegg dere selv krever inn fra betaleren på firmakort og internasjonale kort. Det kan ikke legges på EU-forbrukerkort, og nettoeffekten kan høyst utligne korttypens egen kostnad.',
   'Surcharge är ett tillägg som ni själva tar ut av betalaren på företagskort och internationella kort. Det får inte läggas på EU-konsumentkort, och nettoeffekten kan högst kvitta korttypens egen kostnad.',
   'Surcharge ist ein Aufschlag, den Sie selbst vom Zahler auf Firmenkarten und internationale Karten erheben. Er darf nicht auf EU-Verbraucherkarten erhoben werden, und der Nettoeffekt kann höchstens die Kosten des jeweiligen Kartentyps ausgleichen.'],
  ['Jeres resultat', 'Your result', 'Deres resultat', 'Ert resultat', 'Ihr Ergebnis'],
  ['Omsætning', 'Turnover', 'Omsetning', 'Omsättning', 'Umsatz'],
  ['Kortfordeling', 'Card mix', 'Kortfordeling', 'Kortfördelning', 'Kartenmix'],
  ['Korttype', 'Card type', 'Korttype', 'Korttyp', 'Kartentyp'],
  ['Betalingsomkostning', 'Payment cost', 'Betalingskostnad', 'Betalningskostnad', 'Zahlungskosten'],
  ['Omkostning før surcharge', 'Cost before surcharge', 'Kostnad før surcharge', 'Kostnad före surcharge', 'Kosten vor Surcharge'],
  ['Surcharge, opkræves af betaleren', 'Surcharge, collected from the payer', 'Surcharge, kreves inn fra betaleren', 'Surcharge, tas ut av betalaren', 'Surcharge, vom Zahler erhoben'],
  ['Netto betalingsomkostning pr. måned', 'Net payment cost per month', 'Netto betalingskostnad per måned', 'Netto betalningskostnad per månad', 'Netto-Zahlungskosten pro Monat'],
  ['Beregningen bygger på den omsætning, det transaktionsbeløb og den kortfordeling, I har oplyst. Den faktiske omkostning følger jeres faktiske kortmix og afregnes pr. transaktion. Interchange og scheme fee er kortnetværkenes vejledende satser for Danmark ({kilde}) og kan ændre sig.',
   'The calculation is based on the turnover, transaction amount and card mix you have provided. The actual cost follows your actual card mix and is settled per transaction. Interchange and scheme fee are the card schemes\' indicative rates for Denmark ({kilde}) and may change.',
   'Beregningen bygger på omsetningen, transaksjonsbeløpet og kortfordelingen dere har oppgitt. Den faktiske kostnaden følger deres faktiske kortmiks og avregnes per transaksjon. Interchange og scheme fee er kortnettverkenes veiledende satser for Danmark ({kilde}) og kan endre seg.',
   'Beräkningen bygger på den omsättning, det transaktionsbelopp och den kortfördelning ni har uppgett. Den faktiska kostnaden följer er faktiska kortmix och avräknas per transaktion. Interchange och scheme fee är kortnätverkens vägledande satser för Danmark ({kilde}) och kan ändras.',
   'Die Berechnung beruht auf dem Umsatz, dem Transaktionsbetrag und der Kartenverteilung, die Sie angegeben haben. Die tatsächlichen Kosten folgen Ihrem tatsächlichen Kartenmix und werden pro Transaktion abgerechnet. Interchange und Scheme fee sind die Richtsätze der Kartennetzwerke für Dänemark ({kilde}) und können sich ändern.'],
  /* korttyperne fra PAY_KORT i data.js */
  ['EU forbruger debit', 'EU consumer debit', 'EU forbruker debet', 'EU konsument debet', 'EU-Verbraucher Debit'],
  ['Dankort, Visa Debit og andre debetkort udstedt i EU.', 'Dankort, Visa Debit and other debit cards issued in the EU.', 'Dankort, Visa Debit og andre debetkort utstedt i EU.', 'Dankort, Visa Debit och andra betalkort utgivna i EU.', 'Dankort, Visa Debit und andere in der EU ausgegebene Debitkarten.'],
  ['EU forbruger credit', 'EU consumer credit', 'EU forbruker kreditt', 'EU konsument kredit', 'EU-Verbraucher Kredit'],
  ['Kreditkort fra Visa og Mastercard udstedt i EU.', 'Visa and Mastercard credit cards issued in the EU.', 'Kredittkort fra Visa og Mastercard utstedt i EU.', 'Kreditkort från Visa och Mastercard utgivna i EU.', 'In der EU ausgegebene Kreditkarten von Visa und Mastercard.'],
  ['Firmakort', 'Commercial cards', 'Firmakort', 'Företagskort', 'Firmenkarten'],
  ['Firma- og erhvervskort. Ikke omfattet af EU-loftet.', 'Business and corporate cards. Not covered by the EU cap.', 'Firma- og bedriftskort. Ikke omfattet av EU-taket.', 'Företags- och tjänstekort. Omfattas inte av EU-taket.', 'Firmen- und Geschäftskarten. Nicht von der EU-Obergrenze erfasst.'],
  ['Internationale kort', 'International cards', 'Internasjonale kort', 'Internationella kort', 'Internationale Karten'],
  ['Kort udstedt uden for EEA, fx USA, UK og Asien.', 'Cards issued outside the EEA, e.g. the US, UK and Asia.', 'Kort utstedt utenfor EØS, f.eks. USA, Storbritannia og Asia.', 'Kort utgivna utanför EES, t.ex. USA, Storbritannien och Asien.', 'Außerhalb des EWR ausgegebene Karten, z. B. USA, Großbritannien und Asien.'],
];

/* Standardteksten i afslutningen. Den danske står i init.js (STANDARD_NOTE). */
const STANDARD_NOTE_SPROG = {
  en:
`As we mentioned at the meeting, we are always open to reusing any equipment that can be reused. Our systems are based on Android and iOS, and we support all devices running either operating system. We cannot guarantee optimal operation when equipment is reused – but in many cases we have set customers up with their existing equipment, and it has worked perfectly well.

Summary
I hope this proposal matches your expectations and strategic goals for the future. I am of course available to go through the quote with you and answer any questions you may have.`,
  nb:
`Som vi nevnte på møtet, er vi alltid åpne for å gjenbruke det utstyret som kan gjenbrukes. Systemene våre er basert på Android og iOS, og vi støtter alle enheter som kjører begge operativsystemene. Vi kan ikke garantere optimal drift når vi gjenbruker utstyr – men vi har i mange tilfeller satt opp kunder med utstyr de hadde fra før, og det har fungert helt fint.

Oppsummering
Jeg håper at dette forslaget samsvarer med dine forventninger og strategiske mål for fremtiden. Jeg står selvfølgelig til disposisjon for å gå gjennom tilbudet og svare på eventuelle spørsmål du måtte ha.`,
  sv:
`Som vi nämnde på mötet är vi alltid öppna för att återanvända den utrustning som går att återanvända. Våra system är baserade på Android och iOS, och vi stöder alla enheter som kör något av operativsystemen. Vi kan inte garantera optimal drift när utrustning återanvänds – men vi har i många fall satt upp kunder med befintlig utrustning, och det har fungerat alldeles utmärkt.

Sammanfattning
Jag hoppas att detta förslag motsvarar dina förväntningar och strategiska mål för framtiden. Jag finns naturligtvis tillgänglig för att gå igenom offerten och svara på eventuella frågor du kan ha.`,
  de:
`Wie bereits in unserem Gespräch erwähnt, sind wir stets offen dafür, vorhandene Geräte weiterzuverwenden, wo dies möglich ist. Unsere Systeme basieren auf Android und iOS, und wir unterstützen alle Geräte mit einem dieser Betriebssysteme. Bei der Weiterverwendung vorhandener Geräte können wir keinen optimalen Betrieb garantieren – wir haben jedoch in vielen Fällen Kunden mit ihren bisherigen Geräten eingerichtet, und das hat einwandfrei funktioniert.

Zusammenfassung
Ich hoffe, dass dieser Vorschlag Ihren Erwartungen und strategischen Zielen für die Zukunft entspricht. Selbstverständlich stehe ich Ihnen gerne zur Verfügung, um das Angebot mit Ihnen durchzugehen und Ihre Fragen zu beantworten.`,
};

/* Standardafslutningen til et PAY-tilbud. Den danske står i init.js (STANDARD_NOTE_PAY). */
const STANDARD_NOTE_PAY_SPROG = {
  en:
`Summary
I hope this proposal matches your expectations. I am of course available to go through the calculation with you, also with your actual card mix, and to answer any questions you may have.`,
  nb:
`Oppsummering
Jeg håper at dette forslaget samsvarer med deres forventninger. Jeg står selvfølgelig til disposisjon for å gå gjennom beregningen med dere, også med deres faktiske kortmiks, og svare på eventuelle spørsmål.`,
  sv:
`Sammanfattning
Jag hoppas att detta förslag motsvarar era förväntningar. Jag finns naturligtvis tillgänglig för att gå igenom beräkningen med er, även med er faktiska kortmix, och svara på eventuella frågor.`,
  de:
`Zusammenfassung
Ich hoffe, dass dieser Vorschlag Ihren Erwartungen entspricht. Selbstverständlich stehe ich Ihnen gerne zur Verfügung, um die Berechnung mit Ihnen durchzugehen, auch mit Ihrem tatsächlichen Kartenmix, und Ihre Fragen zu beantworten.`,
};

/* Opslag: sprog -> dansk tekst -> oversættelse. */
const TEKST = {};
SPROG_RAEKKEFOELGE.slice(1).forEach((l,i)=>{
  TEKST[l] = {};
  OVERSAETTELSER.forEach(r=>{ TEKST[l][r[0]] = r[i+1]; });
});

/* Tilbuddets sprog. Uden feltet (eller med en ukendt værdi) er det dansk. */
function sprog(){
  const e = typeof document!=='undefined' && document.getElementById('c_sprog');
  return e && SPROG[e.value] ? e.value : 'da';
}

/* t('Dansk tekst', {pladsholder: værdi}) — teksten på tilbuddets sprog.
   Mangler en oversættelse, står den danske; testen sørger for at det ikke sker.
   Værdierne sættes ind som de er — escape brugerinput før det sendes med. */
function t(da, vaerdier){
  const l = sprog();
  let s = l==='da' ? da : (TEKST[l][da] ?? da);
  if(vaerdier) s = s.replace(/\{(\w+)\}/g, (m,k)=>k in vaerdier ? vaerdier[k] : m);
  return s;
}
/* Afslutningens standardtekst følger tilbudstypen: 'udstyr' eller 'pay'. Uden
   `type` bruges FORM.type (app.js); findes FORM ikke (fx et script der kun
   læser tabellen), er det udstyr. Med `type` er FORM ligegyldig. */
function standardNote(l, type){
  const t = type || (typeof FORM!=='undefined' && FORM && FORM.type) || 'udstyr';
  const pay = t==='pay';
  if(l==='da') return pay ? STANDARD_NOTE_PAY : STANDARD_NOTE;
  return pay ? STANDARD_NOTE_PAY_SPROG[l] : STANDARD_NOTE_SPROG[l];
}
