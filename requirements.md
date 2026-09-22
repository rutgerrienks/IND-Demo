Wat willen we met de demo?

<!-- Documentversie: 1.48 — 2026-09-22: publieke GitHub-repository gepubliceerd -->

De demo wordt een demo die notas en beleidsstukken checkt op consistentie, tegenstrijdigheden en volledigheid.


Consistentie onderdelen zijn:
    -Tone of Voice
    -Layout
    -Consistent gebruik van terminologie en schrijfwijze
    -Worden de referenties op eenzelfde manier weergegeven
    -Worden data en tijdstippen op eenzelfde manier geschreven
    -Voldoet het document aan de norm voor zijn of haar type (bijvoorbeeld lengte, geen taalfouten in de spelling, zinsbouw, inleiding of probleemstelling aanwezig, conclusie op het einde, etc.)

Tegenstrijdigheden waar typisch naar gekeken wordt zijn:
    -Spreekt het document zichzelf tegen
    -Is de opbouw van het stuk logisch
    -[optioneel - mogelijk later] Zijn er andere documenten in de database aanwezig waarmee het stuk tegenstrijdige inhoud bevat.

Met Volledigheid bedoelen we:
    - ontbreken er cruciale onderdelen in de argumentatie
    - ontbreken er cruciale onderdelen in het voorgestelde besluit / proces
    - ontbreken er curuciale onderdelen in de metadata (zijn alle velden zoals afzender, datum etc. gevuld)

Bestands-, formaat-, PII- en tabelcontroles deterministisch door code uitvoeren. De inhoudelijke documentreview semantisch met een LLM uitvoeren op consistentie, tegenstrijdigheden en volledigheid.
Max bestandgrote voor een memo is 10mb. 
Doe een check of het document tabellen bevat (Maak hier tijdens het uploaden een melding van. Demo gedrag is dat deze onveranderlijk worden behandeld.)

De tool krijgt een login en gebruikersniveau die de gebruiker routeert naar zijn omgeving.
De styling conform de ../IND-inspiratiesessie tool met het IND logo etc. 

1) We zien een uploadfunctionaliteit voor ons van .docx bestanden (andere formaten voorlopig niet toestaan), het document wordt in preview modus getoond (gothenburg container?). Te tool checkt aan de voorkant op de aanwezigheid van persoonsgegevens en sluit deze uit van analyse. Deze worden zwart gemarkeert (aflakken) in de preview en zijn niet te downloaden. 
2) Het document wordt op de genoemde drie punten geanalyseerd middels een modal die de analyse stappen (drie groepen) doorloopt en tijdens het doorlopen
3) De resultaten worden getoond in een findings paneel inclusief een de preview met gemarkeerde zinnen/stukken (drie kleuren). Per bevinding is een toelichting beschikbaar en direct daaronder een aantal verbetersuggestie (zelfde box voor overzichtelijkheid) in de kantlijn. Maak het zo dat je makkelijk door de verbetersuggesties heen kan klikken en degene die je wilt toepassen eenvoudig kan accepteren. 
4) Ter verbetering van het document worden twee opties geboden
    a) Direct live de verbetersuggestie accepteren in de Box in de kantlijn, preview wordt direct geupdate en bijgewerkt. (undo knop toevoegen)
    b) Er kan een resultaat in .docx worden gedownload (word met track changes) met daarin alle eventueel verwerkte markeringen en verbetersuggesties. Ook wordt de optie geboden om het resultaat op te slaan de gebruikersomgeving voor later gebruik en of deze te delen met een centrale repository/database waar tegen anderen hun documenten [mogelijk in een latere versie] kunnen matchen op consistentie etc.
5) Het tussenresultaat moet altijd gedownload kunnen worden als .docx

Vanuit de gebruikersomgeving wordt een log bijgehouden met alle acties en is deze eenvoudig met een knop direct als .docx te downloaden.

### Verbeterpunten v1.1 (eerste iteratie na feedback)
- [x] V1.1.1. Kies één duidelijke landing page en maak de navigatie persistent, zodat de tool als één applicatie aanvoelt.
- [x] V1.1.2. Voeg actieve state en breadcrumbs toe aan alle schermen voor betere oriëntatie.
- [x] V1.1.3. Maak sidebar- en menu-gedrag consistent op alle schermen.
- [x] V1.1.4. Toon in de preview expliciet de gemarkeerde fragmenten en afgelakte PII, niet alleen het brondocument.
- [x] V1.1.5. Maak findings specifieker met exacte tekstfragmenten en betere context per bevinding.
- [x] V1.1.6. Geef verbetersuggesties als concrete herschrijvingen in plaats van alleen algemene instructies.
- [x] V1.1.7. Verfijn layout, spacing en uitlijning zodat schermen visueel als één geheel lezen.
- [x] V1.1.8. Breng terminologie, kleurgebruik en legenda's onder één consistent betekenismodel.

### Verbeterpunten v1.2 (tweede iteratie na feedback)
- [x] V1.2.1. Splits de app in een duidelijke documentstap en reviewstap, zodat uploaden niet continu op het centrale scherm zichtbaar is.
- [x] V1.2.2. Maak de PDF-preview de primaire weergave van het document en gebruik markeringen als ondersteunende context.
- [x] V1.2.3. Verplaats de knoppen voor volgende bevinding en undo naar de findings-/bewerkzone.
- [x] V1.2.4. Verplaats de Gotenberg-informatiebalk naar onder de preview.
- [x] V1.2.5. Laat de uploadfunctionaliteit alleen via de menubalk bereikbaar zijn in plaats van midden op het reviewscherm.
- [x] V1.2.6. Verminder visuele ruis door irrelevante samenvattingsblokken of losse statusbalken te verwijderen.

------------Volgende versies / verdere ideeen-----------------
Meerdere documenten uploaden en in onderlinge samenhang beoordelen
Vergelijken met een repo aan eerder geuploade documenten
Opslaan van gebruikershistorie per gebruiker (login)
Het gebruikersgedrag in de tool kan gebruikt worden om de suggesties ter verbetering verder te optimaliseren.
Voeg een chat interface toe om de review met de gebruiker meer interactief te maken in plaats van een eenzijdige controle
Gedeelde omgeving, een gebruiker kan zijn of haar document in een bepaalde versie uploaden aan 
Slim omgaan met tabellen

---

## Bouwstatus (pilot v1.0)

Werkitems 1-op-1 afleidbaar uit de requirements hierboven. Elk item is los af te vinken.
Status: upload-, analyse- en exportflow staan live in Docker en zijn lokaal geverifieerd.

### A. Fundament & app-scaffolding
- [x] A1. React SPA + Express-proxy scaffolding (vervangt Hello World-placeholder in de container)
- [x] A2. Express `/api/*`-proxy naar Azure OpenAI; API-sleutels blijven server-side (uit `.env`)
- [x] A3. Gotenberg-container toevoegen aan docker-compose voor `.docx`-preview-rendering

### B. Login & gebruikersomgeving (regel 28)
- [x] B1. Login op gebruikersniveau (e-mail + wachtwoord), geseede demo-accounts
- [x] B2. Na login routering naar de eigen gebruikersomgeving
- [x] B3. Actie-log per gebruiker: elke actie vastgelegd met tijdstip (regel 39)
- [x] B4. Actie-log met één knop downloadbaar als `.docx` (regel 39)

### C. Styling (regel 29)
- [x] C1. Huisstijl conform ../IND-Inspiratiesessie (IND-logo, kleuren, componenten)

### D. Upload & preview (regel 31)
- [x] D1. Upload-functionaliteit, uitsluitend `.docx` toestaan (andere formaten weigeren)
- [x] D2. Validatie max bestandsgrootte 10 MB (regel 25)
- [x] D3. Tabel-detectie bij upload + melding; tabellen worden onveranderlijk behandeld (regel 26)
- [x] D4. Document in preview-modus tonen (via Gotenberg-rendering)

### E. Persoonsgegevens aflakken (regel 31)
- [x] E1. Server-side PII-detectie vóór analyse (o.a. BSN, NAW, e-mail, telefoon)
- [x] E2. PII uitsluiten van analyse (nooit naar de LLM sturen)
- [x] E3. PII zwart gemarkeerd (afgelakt) in de preview
- [x] E4. Afgelakte PII niet downloadbaar (ook niet in geëxporteerde `.docx`)

### F. Analyse — 3 groepen via voortgangsmodal (regel 32)
- [x] F1. Analysemodal die de drie groepen zichtbaar doorloopt
- [x] F2. Bevindingen verankerd aan exact tekstfragment (citaat/offset) voor markering

**Consistentie (regel 6-12)** — semantische inhoudsanalyse via LLM; technische controles blijven deterministisch
- [x] F3. Consistentie: Tone of Voice
- [x] F4. Consistentie: Layout
- [x] F5. Consistentie: terminologie & schrijfwijze
- [x] F6. Consistentie: uniforme weergave van referenties (deterministisch)
- [x] F7. Consistentie: uniforme notatie van data & tijdstippen (deterministisch)
- [x] F8. Consistentie: norm voor documenttype (lengte, spelling/zinsbouw, inleiding/probleemstelling, conclusie)

**Tegenstrijdigheden (regel 14-16)**
- [x] F9. Tegenstrijdigheid: spreekt het document zichzelf tegen
- [x] F10. Tegenstrijdigheid: is de opbouw logisch

**Volledigheid (regel 19-22)**
- [x] F11. Volledigheid: ontbrekende cruciale onderdelen in de argumentatie
- [x] F12. Volledigheid: ontbrekende cruciale onderdelen in besluit/proces
- [x] F13. Volledigheid: ontbrekende cruciale metadata (afzender, datum, etc.)

### G. Findings-paneel & suggesties (regel 33)
- [x] G1. Findings-paneel met bevindingen, gegroepeerd per categorie (drie kleuren)
- [x] G2. Gemarkeerde zinnen/stukken in de preview in drie kleuren
- [x] G3. Per bevinding: toelichting + één of meer verbetersuggesties in dezelfde kantlijn-box
- [x] G4. Eenvoudig door verbetersuggesties heen klikken en de gewenste accepteren

### H. Document verbeteren (regel 34-37)
- [x] H1. Suggestie live accepteren in de kantlijn-box; preview direct bijgewerkt (regel 35)
- [x] H2. Undo-knop voor geaccepteerde suggesties (regel 35)
- [x] H3. Export `.docx` met track changes van alle verwerkte markeringen/suggesties (regel 36)
- [x] H4. Resultaat opslaan in de eigen gebruikersomgeving voor later gebruik (regel 36)
- [x] H5. Tussenresultaat altijd downloadbaar als `.docx` (regel 37)

### Verbeterpunten v1.3 (derde iteratie na feedback)
- [x] V1.3.1. Meerdere documenten uploaden en in onderlinge samenhang beoordelen vanuit de eigen gebruikersomgeving.
- [ ] V1.3.2. Documenten centraal beschikbaar en raadpleegbaar maken met versiebeheer, zodat gebruikers eigen documenten kunnen delen binnen een centrale repo.
- [x] V1.3.3. Gebruikershistorie per login opslaan, inclusief eerder bekeken en opgeslagen reviews.
- [ ] V1.3.4. Gebruikersgedrag gebruiken om verbetersuggesties verder te optimaliseren.
- [x] V1.3.5. Een chatinterface toevoegen om de review interactiever te maken in plaats van een volledig eenzijdige controle.
- [ ] V1.3.6. Slimmer omgaan met tabellen, zodat tabelinhoud en tabellaantallen explicieter terugkomen in de review.
- [x] V1.3.7. Findings en afgelakte persoonsgegevens direct in een tijdelijke kopie van het oorspronkelijke `.docx` markeren en deze via Gotenberg als primaire PDF-preview tonen, met behoud van de bronopmaak.
- [x] V1.3.8. Na accepteren of undo de PDF-preview direct opnieuw renderen, met een zichtbare verwerkingsstatus en behoud van PII-aflakking en overige open markeringen.
- [x] V1.3.9. De term “Findings” vervangen door “Bevindingen” en de bevindingen als horizontale carrousel naast de statische preview tonen.
- [x] V1.3.10. Het actielog naar een aparte menupagina verplaatsen, inclusief de logdownload, en de knoppen voor resultaatdownload en handmatig opslaan uit de review verwijderen.
- [x] V1.3.11. De laatste reviewstatus en het bijbehorende actielog na iedere documentactie automatisch per gebruiker en document synchroniseren in de demo-gebruikersomgeving.
- [x] V1.3.12. Gebruikers moeiteloos laten schakelen tussen de bestaande bevindingencarrousel en een vrije documentchat die dezelfde bevindingen één voor één begeleidt en uitgebreider toelicht.
- [x] V1.3.13. Wijzigingen vanuit de chat uitsluitend na een expliciete klik op Accepteren verwerken via dezelfde PDF-her-render als de bevindingencarrousel.
- [x] V1.3.14. De Gotenberg-preview zonder browserafhankelijke PDF-plugin of overzichtrail tonen door de PDF server-side naar zichtbare documentpagina's te renderen; het grijze bestandsinformatieblok verwijderen.
- [x] V1.3.15. Uitsluitend geredigeerde document- en chattekst naar de browser, browseropslag en Azure OpenAI sturen; bestaande lokale reviewopslag bij laden opschonen.
- [x] V1.3.16. De chat direct herkenbaar en bruikbaar maken met toelichting en advies in het actuele-bevindingblok, één korte introductie, zichtbare vrije invoer en voorgestelde contextspecifieke vragen zonder dubbele berichten bij navigatie.
- [x] V1.3.17. De review vereenvoudigen tot uitsluitend de chatflow, met behoud van actuele bevinding, vorige/volgende, Undo, uitlegvragen en expliciet Accepteren; het losse introductiebericht verwijderen.
- [x] V1.3.18. De actuele gemarkeerde preview als PDF kunnen downloaden, waarbij persoonsgegevens vóór Gotenberg-rendering werkelijk door `[afgelakt]` zijn vervangen en niet als onderliggende PDF-tekst terughaalbaar zijn.
- [x] V1.3.19. De chatsectie hernoemen naar “Bewerken” en Vorige/Volgende boven het blok met de actuele bevinding plaatsen.
- [x] V1.3.20. Accepteren na toepassing op dezelfde knop in Undo veranderen, zodat toepassen en terugdraaien één contextuele actie vormen.
- [x] V1.3.21. De preview tot maximaal één zichtbaar paginavenster begrenzen, verticaal scrollbaar maken en bij navigatie automatisch naar de documentpagina van de actieve bevinding laten springen.
- [x] V1.3.22. De preview als actuele documentopmaak benoemen en de verwijzing naar gemarkeerde bevindingen alleen tonen zolang er nog open bevindingen zijn.

### Vergelijkingsworkflow v1.4
- [x] V1.4.1. Vanuit Eerdere documenten één **Werkdocument** selecteren dat verbeterd mag worden en één statisch **Referentiedocument** als vergelijkingsbasis.
- [x] V1.4.2. Originele documenten en door de tool aangepaste versies herkenbaar tonen, inclusief versieherkomst en relatie met het brondocument.
- [x] V1.4.3. Van ieder document uitsluitend een volledig geredigeerde `.docx` veilig bewaren, zodat heropenen vanuit Eerdere documenten altijd opnieuw Gotenberg activeert.
- [x] V1.4.4. De volledige afgelakte tekst van beide complete documenten samen als analysecontext aan Azure OpenAI aanbieden, zonder woordelijke diff.
- [x] V1.4.5. Beide complete documenten semantisch beoordelen langs exact de drie bestaande requirementsgroepen en al hun subcriteria: consistentie, tegenstrijdigheden en volledigheid.
- [x] V1.4.6. Iedere vergelijkingsbevinding onderbouwen met concrete bewijsfragmenten uit zowel het Werkdocument als het Referentiedocument.
- [x] V1.4.7. Een begeleide vergelijkingsreview bieden met previews, actuele bevinding, advies en Vorige/Volgende-navigatie, vergelijkbaar met Bewerken.
- [x] V1.4.8. Echte Accepteren- en Undo-tekstwijzigingen uitsluitend in het Werkdocument uitvoeren; het Referentiedocument blijft statisch.
- [x] V1.4.9. Iedere afgeleide Werkdocumentversie herkenbaar opslaan, opnieuw selecteerbaar maken en als `.docx` downloadbaar maken.
- [x] V1.4.10. Privacy borgen: nooit ongeredigeerde PII naar browseropslag of Azure OpenAI sturen; alleen volledig geredigeerde documentinhoud bewaren en analyseren.
- [x] V1.4.11. Na login eerst laten kiezen tussen één document beoordelen en twee documenten vergelijken, met per werkstroom een eigen menubalk zonder directe wissel tussen Bewerken en Vergelijking.
- [x] V1.4.12. Eerdere documenten alleen open- en selecteerbaar maken wanneer de veilige geredigeerde DOCX-versie werkelijk beschikbaar is; ontbrekende legacy-bronnen herkenbaar blokkeren en via herupload herstelbaar maken.
- [x] V1.4.13. Vóór navigatie naar de vergelijkingspagina beide gekozen DOCX-bronnen valideren, zodat een opslagfout nooit als twee lege previewpanelen wordt getoond.
- [x] V1.4.14. Uploadgedrag en actielog aan de gekozen werkstroom aanpassen: review opent Bewerken, vergelijking blijft bij documentselectie.
- [x] V1.4.15. De gekozen werkstroom als centrale context boven de volledige documentomgeving tonen en de uploadkaart generiek als “Document toevoegen” presenteren.
- [x] V1.4.16. Ieder persoonlijk document met een kleine prullenbak volledig uit metadata, actieve selectie en veilige IndexedDB-versies kunnen verwijderen.
- [x] V1.4.17. Gebruikershistorie volledig kunnen wissen en bij meer dan zes kaarten binnen een exact begrensde lijst verticaal laten scrollen.
- [x] V1.4.18. Uitsluitend geanonimiseerde DOCX-bestanden uit de voorbeeldenmap server-side meeleveren als aparte catalogus, altijd via de volledige PII-, analyse- en Gotenbergketen openen en pas daarna als persoonlijke veilige kopie opslaan.
- [x] V1.4.19. Uploaden als onderdeel van Document(en) selecteren tonen, zodat toevoegen en kiezen één samenhangende documenthandeling vormen.
- [x] V1.4.20. Een eerder document pas openen nadat de veilige lokale DOCX en actuele Gotenberg-preview succesvol zijn hersteld; iedere fout moet de laadstatus beëindigen en zichtbaar maken.
- [x] V1.4.21. Gebruikershistorie volledig samenvoegen met het Actielog en de prominente losse historiekaart uit de documentomgeving verwijderen, inclusief behoud van wissen en documentgebonden logdownload.
- [x] V1.4.22. De hoofdnavigatie “Omgeving” hernoemen naar “Beginscherm”.
- [x] V1.4.23. Meegeleverde voorbeelden zonder aparte categorie standaard en zonder duplicaten onder “Mijn documenten” tonen, met een prullenbak die het voorbeeld per account verwijdert zonder de gedeelde serverbron te wissen.
- [x] V1.4.24. In de werkstroom voor één document de instructie onder Document selecteren exact tonen als “Open een document ter review.”, zonder de vergelijkingstekst te wijzigen.
- [x] V1.4.25. Ook de enkel-documentreview op de volledige afgelakte tekst semantisch via Azure OpenAI uitvoeren langs exact consistentie, tegenstrijdigheden en volledigheid; alleen technische, PII- en tabelcontroles blijven deterministisch.
- [x] V1.4.26. Tijdens upload en openen van een voorbeeld een zichtbare doorlopende animatie tonen en consistentie, tegenstrijdigheden en volledigheid één voor één als actieve LLM-analysestap presenteren.
- [x] V1.4.27. De losse gebruikershistorie en alle legacy-opslag daarvan volledig verwijderen; alle uitgebreide account- en documentevents persistent in één accountbreed Actielog schrijven en dat log ook zonder actief document downloadbaar maken.
- [x] V1.4.28. Chatantwoorden niet onbedoeld afkappen: ruimere antwoordlengte bieden en bij een tokenlimiet automatisch gecontroleerd vervolgen tot een volledige afsluitende zin.
- [x] V1.4.29. Een nog niet geopend meegeleverd voorbeeld in de vergelijkingsomgeving direct als Werkdocument of Referentiedocument kunnen kiezen; veilige import, analyse en Gotenberg-rendering gebeuren vóór roltoekenning.
- [x] V1.4.30. De vergelijkingsreview voorzien van een privacyveilige vrije chat die de volledige afgelakte teksten, beide documentrollen en de actuele vergelijkingsbevinding als context gebruikt.
- [x] V1.4.31. Toegankelijke in- en uitzoomknoppen toevoegen aan zowel de enkel-documentpreview als beide vergelijkingspreviews.
- [x] V1.4.32. Alle bevindingen, inclusief tegenstrijdigheden, in de primaire Gotenberg-preview markeren wanneer het letterlijke fragment over meerdere interne Word-runs verdeeld is; PII-aflakking blijft voorgaan.
- [x] V1.4.33. Accepteren in de enkel-documentreview moet de tekst werkelijk in de DOCX vervangen, een nieuwe herkenbare catalogusversie bewaren, de actuele preview opnieuw renderen en via Undo naar de vorige echte versie kunnen terugkeren.
- [x] V1.4.34. Chatantwoorden veilig leesbaar opmaken met herkenbare koppen en symbolen, ingesprongen opsommingen en visueel benadrukte concrete actiepunten.
- [x] V1.4.35. Een knop “Afronden en opslaan” bieden die de actuele bijgewerkte documentversie in Mijn documenten bewaart en terugkeert naar Beginscherm, voor zowel review als vergelijking.
- [x] V1.4.36. Bij iedere primaire documentpreview een legenda tonen voor consistentie, tegenstrijdigheid, volledigheid en afgelakte persoonsgegevens.
- [x] V1.4.37. Vrije chatopdrachten om tekst te wijzigen herkennen, een voorstel met exact bestaand fragment en concrete vervanging tonen en de DOCX pas na expliciet Accepteren wijzigen; in vergelijking uitsluitend het Werkdocument.
- [x] V1.4.38. De analysemodal moet het werkelijke proces tonen als uploadcontrole gevolgd door documentverwerking en één gezamenlijke semantische LLM-analyse, waarbij consistentie, tegenstrijdigheden en volledigheid als onderdelen van die analyse worden getoond en niet als losse opeenvolgende processtappen.
- [x] V1.4.39. De enkel-documentchat en vergelijkingschat moeten bij een nieuw gebruikersbericht, laadstatus, antwoord of wijzigingsvoorstel automatisch naar het nieuwste bericht scrollen.
- [x] V1.4.40. Iedere valide semantische bevinding moet geaccepteerd kunnen worden wanneer het letterlijke bronfragment over meerdere Word-runs en meerdere Word-alinea's loopt of Word extra whitespace bevat; de echte DOCX-tekst, preview, versie en resterende bevindingen moeten correct worden bijgewerkt.
- [x] V1.4.41. Een afzonderlijke herhaalbare demokwaliteitssuite bieden die tegen een draaiende omgeving health, voorbeeldcatalogus, analyse van alle voorbeelden, privacy- en findingcontracten, Gotenberg-previews, volledige bevindingacceptatie, chat, wijzigingsvoorstellen en tweedocumentvergelijking controleert.
- [ ] V1.4.42. IndexedDB-document- en versiekeys accountgescopeerd maken en een veilige migratie bieden, zodat reviewer en beheerder bij gelijke bestandsnamen nooit elkaars lokale documentversies overschrijven of herstellen.
- [ ] V1.4.43. De belangrijkste frontendflows als herhaalbare browserregressiesuite in de repository opnemen, inclusief login, analysemodal, chatautoscroll, Accepteren/Undo, vergelijking, documentverwijdering en toetsenbord-/dialogtoegankelijkheid.
- [ ] V1.4.44. Een vaste geanonimiseerde inhoudelijke evaluatieset voor de LLM toevoegen met verwachte kernbevindingen en toleranties per categorie, zodat niet alleen responsecontracten maar ook semantische kwaliteit en regressies meetbaar worden.
- [x] V1.4.45. Naast Versturen in zowel de enkel-documentchat als vergelijkingschat een knop “Wis chat” bieden die berichten, laadfouten en een eventueel open wijzigingsvoorstel voor de actuele flow wist.
- [x] V1.4.46. Geaccepteerde bevindingen tot “Afronden en opslaan” zichtbaar in de bevindingenlijst houden met een veilige Undo-status; pas bij afronden verdwijnen verwerkte bevindingen uit de opgeslagen reviewmetadata.
- [x] V1.4.47. Advies en tekstvoorstel expliciet scheiden en garanderen dat Accepteren uitsluitend direct publiceerbare vervangtekst in de nota plaatst; instructieve adviezen zoals “voeg drie argumenten toe” moeten vóór toepassing semantisch worden uitgewerkt tot concrete notatekst.
- [x] V1.4.48. `Download preview` moet de actuele veilige documentversie als `.docx` downloaden in plaats van de interne PDF-preview.
- [x] V1.4.49. Het accountbrede Actielog moet bestaande gebeurtenissen behouden wanneer een gebruiker uitlogt en later opnieuw inlogt; een nieuwe login voegt één gebeurtenis toe zonder eerdere regels te overschrijven.
- [x] V1.4.50. `Afronden en opslaan` moet de actuele bewerkte DOCX als `naamdocument_bewerkt.docx` onder Mijn documenten bewaren en tegelijk het ongewijzigde origineel beschikbaar houden, voor zowel enkel-review als vergelijking.
- [x] V1.4.51. Navigeren naar `Beginscherm` moet bij geaccepteerde wijzigingen dezelfde veilige afrondtransactie uitvoeren als `Afronden en opslaan`, zodat de aparte `_bewerkt.docx` direct in de catalogus verschijnt.
- [x] V1.4.52. Klikken of toetsenbordactiveren op gemarkeerde bevindingtekst in de Gotenberg-preview moet de gekoppelde bevinding in de rechterrail selecteren; de klikregio moet uit echte PDF-woordcoördinaten worden afgeleid.
- [x] V1.4.53. Een nieuw geanalyseerde of opnieuw geopende enkel-documentreview moet bij binnenkomst altijd de eerste bevinding in de zichtbare gesorteerde rail selecteren en daardoor `1 van x` tonen.
- [x] V1.4.54. Een Nederlandstalige Word-handleiding voor IND Bedrijfsvoering opleveren met actuele live screenshots, taakgerichte scenario's, uitleg van alle kernfuncties, privacyrichtlijnen, probleemoplossing en een compact demoscript.
- [x] V1.4.55. De reviewscreenshot in de handleiding vervangen door een geanonimiseerde nota en pagina met aantoonbaar meer en meerdere kleuren markeringen, zodat de semantische reviewfunctionaliteit visueel overtuigender wordt uitgelegd.
- [x] V1.4.56. Een demovideo van circa twee minuten opleveren die de basale functionaliteiten toont (login, upload met PII-check, analyse, bevindingen, accepteren/undo, export en actielog), met Nederlandse voice-over (stem Ash, correcte uitspraak van IND en docx) gegenereerd via Vocal Bridge, ingebrande Nederlandse ondertiteling plus los SRT-bestand, browseropnames van de live app, het aangeleverde coverbeeld als opening/thumbnail en per scene uitgelijnde audio en beeld.

### Open punten
- [ ] Documenten door gebruikers centraal beschikbaar en raadpleegbaar maken in een gedeelde repository, inclusief centraal versiebeheer en vergelijking met door anderen gedeelde documenten (V1.3.2).
- [ ] Gebruikersgedrag gebruiken om verbetersuggesties automatisch verder te optimaliseren (V1.3.4).
- [ ] Tabelinhoud inhoudelijk analyseren en gericht verbeteren; tabellen worden nu wel gedetecteerd en gemeld, maar bewust onveranderlijk behandeld (V1.3.6).
- [x] V1.4.57. Azure OpenAI contentfilter-fouten (o.a. jailbreakdetectie) in alle chat- en analysepaden afvangen met een begrijpelijke Nederlandse melding dat de assistent alleen vragen binnen de context van de applicatie en het geopende document beantwoordt, in plaats van de ruwe API-fout.
- [x] V1.4.58. De demo-inloggegevens niet meer zichtbaar tonen op de loginpagina: het loginformulier start leeg en het blok met klikbare demo-accounts is verwijderd, terwijl de bestaande accounts geldig blijven.
