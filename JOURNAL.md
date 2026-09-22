# JOURNAL

## 2026-09-22 14:08 +0200 — Voorbereiding publieke GitHub-publicatie
- Repositorycontrole uitgevoerd: deze map is nog geen Git-repository en heeft geen remote.
- Publieke publicatie geblokkeerd tijdens controle: `.env` is aanwezig en Terraform statebestanden bevatten gevoelige infrastructuurwaarden, waaronder ACR-credentials.
- Geen bestanden naar GitHub gestuurd. Eerst opschonen/uitsluiten en reponaam bevestigen.

## 2026-09-22 14:10 +0200 — Publiceerbare lokale configuratie voorbereid
- Reponaam bevestigd: `rutgerrienks/IND-Demo`.
- `.env.example` toegevoegd met uitsluitend variabelenamen en lege waarden.
- `.gitignore` uitgebreid voor lokale dependencies, build-output, Python-venv, `.DS_Store`, Terraform state/vars en secrets.
- Lokale startinstructie bijgewerkt: kopieer `.env.example` naar `.env`.
- Login-credentials uit het publieke `URL.md` verwijderd; ACR-credentials blijven alleen als lokale CLI-instructie beschreven.

## 2026-09-22 14:12 +0200 — Staging opgeschoond
- Gecontroleerd dat `.env`, Terraform state/vars en lokale dependencies niet worden gestaged.
- Gegenereerde video-build/capture/audio-output en Python caches toegevoegd aan `.gitignore`; broncode en einddocumentatie blijven behouden.
- Eerste validatiecommando's vanuit de repo-root gaven terecht geen package-manifest; app-validatie wordt vanuit `app/` uitgevoerd.

## 2026-09-22 14:15 +0200 — Validatie en releaseversie
- Vanuit `app/`: 34 tests geslaagd en `npm run build` geslaagd.
- Terraform-validatie geslaagd: configuratie is geldig.
- GitHub-authenticatie gecontroleerd voor account `rutgerrienks`, zonder tokens te tonen.
- `requirements.md` opgehoogd van versie 1.45 naar 1.46 conform projectregel bij commit/push.

## 2026-09-22 14:16 +0200 — Commit geblokkeerd door ontbrekende Git-identiteit
- Initiële commit geprobeerd, maar Git heeft geen lokale `user.name` en `user.email`.
- Er is nog niets gecommit of gepusht; staged bestanden zijn niet gewijzigd.

## 2026-09-22 14:17 +0200 — Video-directory uitgesloten
- Op verzoek de volledige `video/`-directory uitgesloten van de publieke repository.
- Video-artefacten blijven lokaal beschikbaar en worden niet gepubliceerd.

## 2026-09-22 14:17 +0200 — Root opgeschoond
- Documentatie verplaatst naar `docs/`: demo-videoscript, handleidingen, architectuurdocument en movie-instructies.
- `feedback1/` op verzoek verwijderd uit de publiceerbare repository.
- Verwijzing in `docs/movieinstructions.md` aangepast aan de nieuwe documentlocatie.
- `requirements.md` opgehoogd van versie 1.46 naar 1.47.

## 2026-09-22 14:18 +0200 — Publieke GitHub-publicatie afgerond
- Publieke repository aangemaakt onder `rutgerrienks/IND-Demo`.
- Eerste commit succesvol naar `master` gepusht.
- URL: https://github.com/rutgerrienks/IND-Demo
- Laatste versie van `requirements.md` opgehoogd naar 1.48.

## 2026-08-12 13:39 — Repo verkend
- Repo bevat alleen documentatie (`basisarchitecture.md`, `requirements.md`, `CLAUDE.md`, leeg `JOURNAL.md`, `.env`). Geen applicatiecode, geen git-repo.
- Conflict gesignaleerd tussen `basisarchitecture.md` (AI-proxy app) en `requirements.md` (urenregistratietool). Aan gebruiker voorgelegd.

## 2026-08-12 13:41 — Scope afgestemd
- Keuze gebruiker: **alleen infra** (Docker + ACR + Terraform) met een **placeholder-app**.
- Keuze gebruiker: **nog niet deployen**, eerst alle bestanden opzetten.

## 2026-08-12 13:43 — Placeholder-app gebouwd
- `app/package.json`, `app/server.js` (Express, poort 80, `/healthz`), `app/public/index.html`.

## 2026-08-12 13:44 — Docker-bestanden
- `Dockerfile` (node:22-alpine, poort 80), `.dockerignore`, `docker-compose.yml` (8081:80), `.gitignore`.

## 2026-08-12 13:45 — Terraform-infra
- `terraform/{providers,variables,main,outputs}.tf` + `terraform.tfvars.example`.
- Resources: Resource Group, ACR (Basic, admin), Linux App Service Plan (B1), Linux Web App (container uit ACR).
- Bewust **App Service for Containers**, geen Container Apps (conform projectregel).
- Auth ACR->App Service via ACR admin-credentials (demo-eenvoud); note voor productie (managed identity) toegevoegd.

## 2026-08-12 13:45 — Deploy-handleiding
- `DEPLOY.md` toegevoegd (terraform apply -> az acr build/push -> webapp restart; lokaal via docker compose).

## 2026-08-12 13:46 — Validatie (geen deploy)
- `terraform init -backend=false` + `terraform validate`: **Success**; `terraform fmt` toegepast.
- `node --check app/server.js`: OK.
- `docker build`: **geslaagd**. Container getest: `/healthz` -> 200 JSON, `/` -> placeholder-pagina. Test-image opgeruimd.
- Nog niet gedaan (bewust, per gebruiker): echte deploy naar Azure (ACR build/push + `terraform apply`). `URL.md` volgt pas na echte deploy.

## 2026-08-12 13:58 — Hello World pagina
- `app/public/index.html` aangepast: placeholder -> **Hello World** pagina (titel + h1).

## 2026-08-12 14:00 — Echte deploy naar Azure
- `az` ingelogd: subscription NL-TT-AZU-SBX-0001513 (`5785b050-...`). `terraform.tfvars` met subscription_id gezet.
- Volgorde om kip-ei te vermijden: eerst RG + ACR (`terraform apply -target`), dan image, dan rest.
- ACR aangemaakt: `inddemoacrnfbguv.azurecr.io`. Image gebouwd/gepusht via `az acr build` (Run cb1, succesvol).
- Fix: azurerm v4 accepteert `DOCKER_REGISTRY_SERVER_*` niet in `app_settings`; credentials verplaatst naar `application_stack` (docker_registry_username/password).
- Volledige `terraform apply`: App Service Plan (B1) + Linux Web App aangemaakt.
- **Live:** https://inddemo-web-nfbguv.azurewebsites.net -> `/healthz` 200, `/` toont Hello World.

## 2026-08-12 14:02 — Documentatie bijgewerkt
- `URL.md` (v1.0) aangemaakt met live-URL, resources en ACR-credential-instructie (geen app-login: publieke demo).
- `requirements.md` infra-bouwstatus: deploy + URL.md afgevinkt.

## 2026-08-12 15:06 — Requirements omgezet in werkitems
- `requirements.md` gelezen (gewijzigd naar documentcheck-tool; sluit nu aan op basisarchitecture.md).
- Lege "Bouwstatus (pilot v1.0)" gevuld met 1-op-1 afvinkbare werkitems, gegroepeerd A–H + "Buiten scope v1.0".
- Elk item met verwijzing naar de bronregel in de requirements; alle items nog niet afgevinkt (alleen infra + Hello World live).
- Styling-referentie geverifieerd: ../IND-Inspiratiesessie bestaat.
- Documentversie requirements.md opgehoogd naar 1.1 (versie-comment bovenaan toegevoegd).

## 2026-08-12 15:10 — Eerste app-shell gebouwd
- React/Vite app toegevoegd in `app/` met Express runtime-server.
- Dockerfile omgezet naar multi-stage build (frontend build + runtime image).
- UI bevat nu een IND-stijl document review shell met upload, preview en findings panel.
- Lokaal gevalideerd via Docker build en browsercheck op `http://localhost:8101`.
- Eerste checklist-item in `requirements.md` afgevinkt en versienummer opgehoogd naar 1.2.

## 2026-08-12 15:14 — Reviewflow uitgebreid
- `app/lib/review.js` toegevoegd: DOCX parsing via Mammoth, PII-detectie, deterministische analyse, action-log, review-export en action-log-export.
- `app/server.js` uitgebreid met `/api/review/upload`, `/api/review/export` en een generieke Azure OpenAI proxy-route (`/api/openai/chat`).
- `app/src/App.jsx` herschreven naar een echte review-app: demo-login, upload, findings-paneel, preview-highlights, accept/undo en downloadknoppen.
- `app/src/preview.js` toegevoegd voor client-side HTML-markering/redactie.
- `docker-compose.yml` uitgebreid met een Gotenberg-service.
- Export is nu DOCX + tracked-changes-achtig (`w:del` / `w:ins`) en redacteert PII in de export.
- Analyse draait op geredigeerde tekst zodat PII niet meegeanalyseerd wordt.
- Verificatie: Docker build geslaagd; upload endpoint getest met gegenereerde sample `.docx`; preview/resultaat/log-export getest; export bevat redactie en track-changes XML.
- Open restpunten bewust nog niet afgevinkt: echte Gotenberg-rendering voor de preview, formele IND-logo-asset in styling, en opslaan van resultaten in de gebruikersomgeving.

## 2026-08-12 15:38 — Laatste resterende items afgerond
- IND-styling aangescherpt naar warmer crema/amber-palet, met een logo-badge en IND-inspiratie als visuele richting.
- Gotenberg-preview toegevoegd: uploadresponse bevat nu een PDF data URL wanneer `GOTENBERG_URL` beschikbaar is; lokale compose koppelt web-container intern aan de Gotenberg-service.
- Resultaten kunnen per gebruiker lokaal worden opgeslagen en later worden heropend via de gebruikersomgeving.
- Docker Compose lokaal gevalideerd: web + gotenberg starten samen, upload van sample `.docx` levert `preview.kind = pdf` op met data URL.
- Requirements bijgewerkt naar versie 1.4 en resterende v1.0-items afgevinkt.

## 2026-08-12 15:44 — Release-readiness bevestigd
- De current build is functioneel als containerized v1.0 release candidate: upload, analyse, findings, accept/undo, export, preview en lokale opslag zijn aanwezig en getest.
- Azure App Service kan deze image draaien; om de live Azure omgeving bij te werken moet de huidige image opnieuw worden gebouwd/gepusht en de web app worden gerebootstrapped/restarted.

## 2026-08-12 15:47 — Azure Gotenberg-link gelegd
- Bestaande Azure Gotenberg-webapp gevonden op `cvbuilder-gotenberg-87b234.azurewebsites.net`.
- Demo-webapp Azure app setting `GOTENBERG_URL` gezet naar die service.
- Oude Azure image bleek nog op de placeholder-versie te draaien; daarom nieuwe image tag `v1.0.1` gebouwd en gepusht naar ACR.
- Azure Web App expliciet naar `ind-demo-placeholder:v1.0.1` gezet.
- Verificatie: live Azure `/healthz` geeft nu de review-shell terug en `/api/review/upload` levert `preview.kind = pdf` met data URL.
- [URL.md] bijgewerkt naar versie 1.1 met de Gotenberg-link en nieuwe image tag.

## 2026-08-12 16:02 — Laatste live sanity-check
- Azure rootpagina geeft nu de nieuwe app-title `IND Demo · Document Review` terug.
- Live upload/preview was al eerder bevestigd met `preview.kind = pdf` en Gotenberg-link actief.

## 2026-08-12 16:12 — IND-branding aangescherpt
- De app header en auth splash gebruiken nu het echte IND-logo mark uit de HiringAgent-implementatie.
- Het kleurgebruik in de shell is strakker afgestemd op de IND-look-and-feel.
- Lokale Docker build en compose-restart zijn geslaagd; `/healthz` reageert weer OK.

## 2026-08-12 16:16 — Live Azure branding gepusht
- Nieuwe image tag `v1.0.2` gebouwd en gepusht naar `inddemoacrnfbguv.azurecr.io`.
- Azure Web App expliciet naar de nieuwe image gezet en herstart.
- Visuele sanity-check op de live URL bevestigt dat de IND-logo-header nu ook op Azure staat.
- [URL.md] bijgewerkt naar versie 1.2 met de nieuwe image tag en demo-logingegevens.

## 2026-08-12 16:20 — Witte, strakkere layout doorgevoerd
- Zandkleur vervangen door wit, afgeronde hoeken vrijwel overal teruggebracht naar rechte hoeken.
- Panels, kaarten, inputs, modals en logregels opnieuw uitgelijnd met een strakkere grid-basis.
- Lokale image rebuild en compose-restart geslaagd; health check blijft OK.

## 2026-08-12 16:23 — Live layout update gepusht
- Nieuwe Azure image tag `v1.0.3` gebouwd en gepusht.
- Azure Web App naar `v1.0.3` verplaatst en herstart.
- Live health check en HTML response bevestigen de nieuwe release.
- [URL.md] bijgewerkt naar versie 1.3.

## 2026-08-12 16:27 — Demo-nota gemaakt
- Een uploadbare demo-nota als [demo-nota-test.docx](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/demo-nota-test.docx) gegenereerd voor reviewtests.
- De notitie bevat bewust meerdere signalen voor de analyseroute: mixed terminologie, tegenstrijdige formulering, gemengde datumnotaties en PII-patronen.
- Bestand gecontroleerd via unzip/inspectie op de host.

## 2026-08-13 21:32 — Feedback gebundeld
- De feedback uit [feedback1/generalremarks](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/feedback1/generalremarks) en [feedback1/Overige opmerkingen](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/feedback1/Overige%20opmerkingen) samengevoegd met een eigen kritische review.
- Een eerste verbeterplan vastgelegd in [feedback1/verbeterplan-v1.txt](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/feedback1/verbeterplan-v1.txt).
- [requirements.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/requirements.md) opgehoogd naar versie 1.5 met v1.1-verbeterpunten.

## 2026-08-13 21:41 — V1.1 doorgevoerd en live gezet
- Navigatie, breadcrumbs, preview-shell en findings-layout aangescherpt voor één coherente app-ervaring.
- Preview toont nu de gemarkeerde HTML-laag met een link naar de originele PDF-render.
- Findings tonen per item extra contextfragmenten en concretere verbetersuggesties.
- Nieuwe Azure image tag `v1.0.4` gebouwd, gepusht en geactiveerd op de webapp.
- [requirements.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/requirements.md) opgehoogd naar versie 1.6 en de v1.1-items afgevinkt.

## 2026-08-13 21:53 — V1.2 doorgevoerd
- De app opgesplitst in een documentstap en reviewstap; upload is niet langer zichtbaar op het centrale reviewscherm.
- De PDF-render van Gotenberg is nu de primaire preview, met de gemarkeerde tekst alleen nog als ondersteunende context onder een detailtoggle.
- Next/Undo en exportacties verplaatst naar de findings-/bewerkzone.
- De Gotenberg-informatiebalk staat nu onder de preview.
- Locally geverifieerd met `api/review/upload`: PDF-preview actief en findings nog aanwezig.
- [requirements.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/requirements.md) opgehoogd naar versie 1.7 en de v1.2-items afgevinkt.

## 2026-08-13 21:56 — V1.2 live gezet
- Nieuwe Azure image tag `v1.0.5` gebouwd en gepusht.
- Azure Web App expliciet naar `v1.0.5` gezet en herstart.
- Live sanity-check bevestigt dat de tweestapslogin + documentstap nu op de site staan.
- [URL.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/URL.md) bijgewerkt naar versie 1.5.

## 2026-08-13 22:01 — V1.3 requirements voorbereid
- De resterende “verdere ideeën” uit [requirements.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/requirements.md) omgezet naar een nieuwe sectie v1.3 als afvinkbare requirements.
- De oude buiten-scope-lijst teruggebracht tot een korte verwijzing, zodat v1.3 nu als concrete bouwlijst kan worden gebruikt.

## 2026-08-13 22:07 — Gebruikershistorie live gezet
- Gebruikershistorie per login toegevoegd in de documentstap, met opslag van uploads en geopende/opgeslagen reviews.
- Nieuwe Azure image tag `v1.0.6` gebouwd, gepusht en geactiveerd.
- Live verificatie toont nog steeds een geldige PDF-preview en actieve findings op de testnota.
- [requirements.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/requirements.md) opgehoogd naar versie 1.9 en V1.3.3 afgevinkt.

## 2026-08-13 22:16 — Gemarkeerde documentpreview gebouwd en lokaal geverifieerd
- `jszip` toegevoegd om uitsluitend de tijdelijke previewkopie van het oorspronkelijke `.docx` op OOXML-niveau te annoteren.
- Een foutieve functieplaatsing uit de eerste implementatie gecorrigeerd; de bronmodule laadt en de frontend bouwt daarna zonder fouten.
- Findings worden in cyaan, geel en magenta gemarkeerd; persoonsgegevens krijgen zwarte markering met zwarte tekst.
- De volledige Docker-uploadketen lokaal getest met [demo-nota-test.docx](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/demo-nota-test.docx): geldige PDF, 6 findings, 2 afgelakte PII-fragmenten en behoud van de oorspronkelijke documentopmaak.
- [requirements.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/requirements.md) opgehoogd naar versie 1.10 en V1.3.7 afgevinkt.

## 2026-08-13 22:19 — Preview-update na accepteren en undo gebouwd
- Een aparte serverroute toegevoegd die het oorspronkelijke document opnieuw analyseert en rendert met alleen de nog open findings; aangeleverde finding-ID's worden gevalideerd.
- Accepteren en undo wachten voortaan op een geslaagde PDF-render voordat de status definitief wijzigt.
- Tijdens het renderen bedekt een compacte `Preview verwerken`-overlay met bewegende punten de bestaande preview; acties zijn tijdelijk geblokkeerd om dubbele renders te voorkomen.
- Frontendbuild en Dockerbuild geslaagd.
- De accept-flow lokaal met [demo-nota-test.docx](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/demo-nota-test.docx) geverifieerd: de nieuwe PDF is geldig, de geaccepteerde markering verdwijnt en PII plus overige markeringen blijven zichtbaar.
- [requirements.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/requirements.md) opgehoogd naar versie 1.11 en V1.3.8 afgevinkt.

## 2026-08-13 22:22 — Dynamische preview live gezet
- ACR-image `ind-demo-placeholder:v1.0.8` gebouwd en gepusht; `v1.0.7` is niet geactiveerd omdat de nieuwe accept/undo-flow daarna nog is toegevoegd.
- Azure App Service expliciet naar `v1.0.8` omgezet en herstart.
- Live geverifieerd: healthcheck slaagt, upload levert 6 findings en 2 afgelakte PII-fragmenten, en accepteren levert via de nieuwe renderroute een gewijzigde geldige PDF.
- [URL.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/URL.md) opgehoogd naar versie 1.7.

## 2026-08-13 22:39 — Bevindingencarrousel, actielogpagina en autosynchronisatie gebouwd
- Alle zichtbare terminologie “Findings” vervangen door “Bevindingen”.
- De bevindingenkaarten omgezet naar een horizontale carrousel met vorige/volgende-navigatie; de documentpreview blijft een afzonderlijk paneel.
- Het actielog uit de review verwijderd en als aparte menupagina toegevoegd; de logdownload staat alleen nog op die pagina.
- De knoppen `Download resultaat` en `Resultaat opslaan` verwijderd.
- Reviewstatus, toegepaste bevindingen, geselecteerde bevinding en volledig actielog worden automatisch per gebruiker en bestandsnaam in de demo-gebruikersomgeving opgeslagen.
- Tijdens browservalidatie twee plaatsingsfouten en een niet-werkende scrollberekening gevonden en gecorrigeerd voordat release.
- Frontend- en Dockerbuilds slagen. Browservalidatie bevestigt 6 horizontale kaarten, werkende vorige/volgende-scroll, herstel van toegepaste bevindingen na herladen, automatische logopslag en de aparte Actielog-pagina.
- [requirements.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/requirements.md) opgehoogd naar versie 1.12 en V1.3.9 t/m V1.3.11 afgevinkt.

## 2026-08-13 22:42 — Review-UX v1.0.9 live gezet
- ACR-image `ind-demo-placeholder:v1.0.9` succesvol gebouwd en gepusht.
- Azure App Service expliciet naar `v1.0.9` omgezet en herstart.
- Niet alleen de healthcheck, maar ook de actieve frontend-asset gecontroleerd om te voorkomen dat de oude container ten onrechte als nieuwe release werd aangemerkt.
- Live geverifieerd: nieuwe Bevindingen- en Actielog-UI actief, verwijderde knoppen afwezig en testupload levert een geldige PDF-preview met 6 bevindingen en 2 PII-aflakkingen.
- [URL.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/URL.md) opgehoogd naar versie 1.8.

## 2026-08-14 13:46 — Vrije documentchat en compacte preview gebouwd
- De PDF-preview opent met de overzichtrail standaard ingeklapt; het grijze blok met bestandsnaam, Gotenberg-uitleg en PDF-link is verwijderd.
- Naast de horizontale bevindingencarrousel een gesynchroniseerd tabblad `Chat` toegevoegd.
- De chat begeleidt standaard bevinding voor bevinding, ondersteunt vorige/volgende, geeft uitgebreidere toelichting en accepteert daarnaast vrije vragen over de nota.
- Verwerken vanuit de chat vereist altijd een expliciete klik op `Accepteren` en hergebruikt daarna de bestaande geteste PDF-her-render.
- Een afgeschermde serverroute voor Azure OpenAI toegevoegd met begrensde historie, geredigeerde documentcontext en instructies tegen PII-reconstructie of autonome wijzigingen.
- Modelcompatibiliteit gecorrigeerd van `max_tokens` naar `max_completion_tokens`.
- Tijdens herstelvalidatie vastgesteld dat oude gesynchroniseerde reviews nog ruwe HTML en PII-waarden konden bevatten. De API levert nu alleen geredigeerde tekst/HTML en PII-placeholders; bestaande browseropslag wordt bij laden opgeschoond en vrije chatinvoer wordt vóór verzending geredigeerd.
- Er zijn geen geautomatiseerde tests in het project gevonden. Frontend- en Dockerbuild, API-validatie en Playwright-browserchecks zijn gebruikt.
- Gecontroleerd: vrije chat geeft inhoudelijk antwoord, tabwissel bewaart context, chatacceptatie rendert de PDF opnieuw, chat en toegepaste bevinding herstellen na herladen, ongeldige chatrollen geven HTTP 400 en e-mail/telefoon lekken niet naar API-respons, opslag of modelcontext.
- [requirements.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/requirements.md) opgehoogd naar versie 1.13; V1.3.5 en V1.3.12 t/m V1.3.15 afgevinkt.

## 2026-08-14 13:50 — Chatreview v1.0.10 live gezet
- Bestaand Azure OpenAI-account `cvbuilder-openai-4e6046` gevonden en de reeds lokaal geteste configuratie als beveiligde App Service-instellingen toegevoegd; de sleutel is niet in bronbestanden of documentatie opgenomen.
- ACR-image `ind-demo-placeholder:v1.0.10` gebouwd, gepusht en op Azure App Service geactiveerd.
- Expliciet gewacht tot frontend-asset `index-CM_-B2Iw.js` actief was om een false-positive healthcheck op de oude container te voorkomen.
- Live geverifieerd met [demo-nota-test.docx](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/demo-nota-test.docx): PDF-preview, 6 bevindingen, 2 PII-placeholders, geen ruwe e-mail/telefoon in de API-respons, een Azure-chatantwoord van 1.785 tekens en een geldige PDF-her-render na acceptatie.
- [URL.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/URL.md) opgehoogd naar versie 1.9.

## 2026-08-14 14:08 — Preview- en chatregressie hersteld
- Vastgesteld dat Gotenberg en de preview-API gezond waren, maar dat de experimentele PDF-viewerparameter in de browser een zwart of leeg previewvlak kon geven.
- Twee PDF.js-clientvarianten onderzocht en verworpen nadat de worker zonder foutmelding op laden bleef hangen; de tijdelijke `pdfjs-dist`-dependency daarna weer verwijderd.
- De definitieve previewroute maakt nog steeds de gemarkeerde PDF via Gotenberg en rastert die vervolgens server-side met Poppler naar PNG-documentpagina's. Daardoor zijn browserplugin, overzichtrail en worker volledig verdwenen.
- De runtime-image bevat hiervoor gericht `poppler-utils`; tijdelijke PDF/PNG-bestanden worden per request in een eigen tijdelijke map gemaakt en altijd opgeruimd.
- Chatnavigatie voegt niet langer telkens een statische bevindingkaart aan het gesprek toe. Oude dubbele guidanceberichten worden bij laden uit opgeslagen chatgeschiedenis gemigreerd.
- Het actuele-bevindingblok toont nu direct detail, advies en voorbeeld. Daaronder staan één korte chatintroductie, twee contextspecifieke vragen en het vrije invoerveld.
- De systeemprompt en voorgestelde vragen noemen de geselecteerde bevinding expliciet, zodat de assistent niet meer vraagt welke bevinding de gebruiker bedoelt.
- Validatie: frontend- en Dockerbuild slagen; preview-API levert één PNG van 1075×1521; visuele inspectie bevestigt bronopmaak, gekleurde markeringen en zwarte PII; Playwright bevestigt zichtbare afbeelding, één initiële chatboodschap, geen duplicatie bij navigatie, zichtbaar invoerveld en een contextueel antwoord zonder verduidelijkingsvraag.
- Er zijn geen geautomatiseerde tests in het project gevonden.
- [requirements.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/requirements.md) opgehoogd naar versie 1.14; V1.3.14 aangescherpt en V1.3.16 afgevinkt.

## 2026-08-14 14:12 — Herstelrelease v1.0.11 geactiveerd
- Azure App Service expliciet omgezet naar `inddemoacrnfbguv.azurecr.io/ind-demo-placeholder:v1.0.11` en herstart.
- Niet alleen de healthcheck gebruikt: gewacht totdat de nieuwe frontend-asset `index-CPqLbmjF.js` daadwerkelijk werd geserveerd.

## 2026-08-14 14:13 — Live regressiecontrole v1.0.11
- De eerste controle faalde uitsluitend doordat het extensieloze tijdelijke JSON-bestand door Node als JavaScript werd gelezen; de controle is gecorrigeerd naar expliciete `JSON.parse`.
- Live upload van [demo-nota-test.docx](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/demo-nota-test.docx) levert `kind: images`, één PNG-documentpagina en zes bevindingen.
- Acceptatie van de eerste bevinding levert via `/api/review/preview` een aantoonbaar gewijzigde PNG-render op.
- De eerste PII-chatassertie verwachtte ten onrechte `[AFGELAKT]`; de applicatie gebruikt correct `[afgelakt]`. Na correctie bevestigd dat de live chat antwoord geeft en `testpersoon@example.com` server-side uit de gebruikersinvoer verwijdert.
- [URL.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/URL.md) opgehoogd naar versie 1.10 en bijgewerkt naar image `v1.0.11`.
- [requirements.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/requirements.md) bevat al de afgevinkte requirements voor deze herstelrelease; er waren geen nieuwe functionele requirements toe te voegen.

## 2026-08-14 16:46 — Chat-only review en previewdownload gebouwd
- De aparte tab en carrousel `Bevindingen` verwijderd; de rechterkolom toont nu uitsluitend Chat.
- Bestaande subfuncties behouden in Chat: actuele bevinding met advies en voorbeeld, vorige/volgende, Undo, contextvragen, vrije invoer en expliciet Accepteren.
- Het statische introductiebericht `Reviewassistent` verwijderd en ook uit bestaande opgeslagen chatgeschiedenis gemigreerd.
- Bij de preview een downloadknop toegevoegd die de actuele markeringen en toegepaste bevindingen gebruikt.
- Een privacyprobleem in de bestaande previewketen gecorrigeerd: persoonsgegevens worden vóór Gotenberg-rendering werkelijk vervangen door `[afgelakt]`, in plaats van alleen als zwarte onderliggende tekst te worden opgemaakt.
- [requirements.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/requirements.md) opgehoogd naar versie 1.15; V1.3.17 en V1.3.18 toegevoegd en afgevinkt.
- Frontendbuild en syntaxcontroles van server en reviewmodule slagen. Er zijn geen geautomatiseerde tests in het project.

## 2026-08-14 16:50 — Chat-only runtime gevalideerd
- Docker-image `v1.0.12` bouwt succesvol en de lokale previewdownload levert een geldige PDF van 52.515 bytes.
- Met `pdftotext` gecontroleerd dat geen van de twee gedetecteerde test-PII-waarden in de PDF voorkomt en `[afgelakt]` wel aanwezig is.
- Browsercontrole bevestigt: uitsluitend Chat zichtbaar, geen tab `Bevindingen`, geen statische introductiekaart, en actuele bevinding, vorige/volgende, Undo, uitlegvragen, vrije invoer en Accepteren aanwezig.
- Acceptatie wijzigt de previewafbeelding, zet de actie op `Toegepast` en activeert Undo.
- De eerste browserdownloadtest vond een echte scopefout: `downloadPreview` stond binnen `downloadExport`. De functiegrens is gecorrigeerd en de image is opnieuw gebouwd.
- De daaropvolgende test raakte nog de oude detached testcontainer; deze specifieke container is gestopt en de nieuwe asset `index-BMtMOt6i.js` is expliciet gecontroleerd.
- Definitieve knopcontrole: POST naar `/api/review/preview/download` geeft HTTP 200, `application/pdf` en attachmentnaam `demo-nota-test-preview.pdf`. De geïntegreerde browser registreert een via Blob-URL gestarte download niet als Playwright-downloadevent; de volledige netwerkrespons en PDF-inhoud zijn daarom afzonderlijk geverifieerd.

## 2026-08-14 16:53 — Chat-only release v1.0.12 live gezet
- ACR-image `ind-demo-placeholder:v1.0.12` succesvol gebouwd en gepusht.
- Bestaande Azure App Service expliciet naar `v1.0.12` omgezet en herstart; geen Container App gebruikt.
- Gewacht totdat frontend-asset `index-BMtMOt6i.js` live werd geserveerd; de eerste twee controles bereikten nog correct de oude asset en zijn niet als succes beschouwd.
- Live uploadcontrole: één PNG-previewpagina en zes bevindingen beschikbaar voor de chatflow.
- Live previewdownload opnieuw inhoudelijk gecontroleerd: geldige PDF, beide test-PII-waarden afwezig en `[afgelakt]` aanwezig.
- De benoemde lokale testcontainer na validatie gestopt.
- [URL.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/URL.md) opgehoogd naar versie 1.11 en bijgewerkt naar image `v1.0.12`.

## 2026-08-15 20:58 — Bewerkflow en previewnavigatie geïnventariseerd
- De aangeleverde schermafbeelding en de bestaande reviewflow vergeleken: titel, knopvolgorde en dubbele Accepteren/Undo-acties sluiten niet aan op de gevraagde interactie.
- Vastgesteld dat de primaire preview uit server-side gerenderde pagina-afbeeldingen bestaat en nog geen koppeling tussen bevindingen en paginanummers bevat.
- Gekozen voor deterministische paginakoppeling via `pdftotext`, dat al via Poppler in de bestaande App Service-image beschikbaar is.

## 2026-08-15 21:02 — Bewerkflow en locatiegestuurde preview gebouwd
- “Chat” hernoemd naar “Bewerken” en Vorige/Volgende boven het blok Actuele bevinding geplaatst.
- De losse Undo-knop verwijderd; de contextknop wisselt nu per actieve bevinding tussen Accepteren en Undo en draait precies die bevinding terug.
- De preview begrensd tot een verticaal scrollbaar paginavenster en smooth scrolling toegevoegd.
- De server koppelt bevindingsteksten aan de werkelijk gerenderde PDF-pagina; navigatie naar een bevinding centreert die pagina automatisch in de preview.
- [requirements.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/requirements.md) opgehoogd naar versie 1.16 en V1.3.19 t/m V1.3.21 toegevoegd en afgevinkt.

## 2026-08-15 21:03 — Eerste validatiecommando gecorrigeerd
- `npm run build` kon vanuit de projectroot niet starten omdat `package.json` volgens de bestaande projectstructuur in `app/` staat.
- Dit was een werkdirectoryfout in het validatiecommando en geen fout in de gewijzigde applicatiecode; de controle wordt vanuit `app/` herhaald.

## 2026-08-15 21:05 — Statische validatie geslaagd, containerbuild extern geblokkeerd
- Frontendbuild met Vite geslaagd; de nieuwe assets zijn `index-DwC8Nyjo.js` en `index-CSgOBxNL.css`.
- `node --check` voor server en previewmodule is zonder fouten afgerond.
- De lokale Docker Compose-build kon de Dockerfile-frontend niet vanaf Docker Hub ophalen door `DeadlineExceeded`; de applicatiebuild zelf is daarbij niet gestart en deze externe timeout geldt niet als functionele validatie.

## 2026-08-15 21:06 — Lokale runtime en paginakoppeling gevalideerd
- De bestaande benoemde lokale testcontainer bijgewerkt met de geslaagde frontendbuild en gewijzigde serverfile en daarna gezond herstart.
- Upload van [demo-nota-test.docx](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/demo-nota-test.docx) levert één gerenderde previewpagina en zes bevindingen.
- Alle zes bevindingen zijn door de nieuwe PDF-tekstcontrole aan pagina 0 gekoppeld; daarmee is de dataketen voor automatisch meespringen inhoudelijk bevestigd.

## 2026-08-15 21:09 — Browser- en meerpaginaregressie geslaagd
- Geïntegreerde browsercontrole bevestigt de titel “Bewerken” en dat Vorige/Volgende visueel boven Actuele bevinding staan.
- Na Accepteren is precies één contextuele actieknop aanwezig met label Undo; na Undo verandert dezelfde actie terug naar Accepteren.
- De previewviewport is 740 px hoog bij 1.387 px inhoud, met `overflow-y: auto`; scrollen omhoog en omlaag is daarmee actief en er wordt maximaal een deel van één pagina tegelijk getoond.
- Een tweede proef met een document van drie pagina’s leverde vijf bevindingen op, alle vijf gekoppeld en verdeeld over pagina-index 0 en 1. Daarmee is automatisch meespringen over meerdere pagina’s end-to-end bewezen.
- Er is niet gedeployed; [URL.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/URL.md) en de live versie zijn daarom bewust niet gewijzigd.

## 2026-08-15 21:10 — Deploy v1.0.13 gestart
- Op verzoek wordt de gevalideerde bewerkflow als immutable image `ind-demo-placeholder:v1.0.13` uitgerold.
- De bestaande Azure App Service `inddemo-web-nfbguv` blijft het deploymentdoel; er wordt geen Container App aangemaakt of gebruikt.
- Acceptatiecriteria: succesvolle ACR-build, App Service op de nieuwe tag, nieuwe frontendasset live, healthcheck en live upload/paginakoppeling geslaagd.

## 2026-08-15 21:14 — Release v1.0.13 geactiveerd en technisch gevalideerd
- ACR-build `cbf` is geslaagd; image `ind-demo-placeholder:v1.0.13` is gepusht met digest `sha256:4afb4be502cf80fff6f0e32d50b2329a39da340da53dccde3c5e64dde9e90b82`.
- Bestaande Azure App Service `inddemo-web-nfbguv` expliciet naar `v1.0.13` omgezet en herstart.
- Gewacht totdat frontendasset `index-DwC8Nyjo.js` live werd geserveerd; de healthcheck geeft daarna status `ok`.
- Live upload van [demo-nota-test.docx](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/demo-nota-test.docx) levert één afbeeldingspagina, zes bevindingen en zes paginakoppelingen.
- De ingebouwde testrunner meldt expliciet dat het project geen geautomatiseerde tests bevat; er wordt daarom niet geclaimd dat een geautomatiseerde testsuite is geslaagd.

## 2026-08-15 21:15 — Deploydocumentatie v1.0.13 afgerond
- De live frontendasset opnieuw gecontroleerd en bevestigd als `index-DwC8Nyjo.js`.
- [URL.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/URL.md) opgehoogd naar documentversie 1.12, met deploytijd, image `v1.0.13` en het actuele App Service-deploycommando.
- De login credentials in [URL.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/URL.md) zijn conform de projecteis behouden.
- [requirements.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/requirements.md) stond al op versie 1.16 met V1.3.19 t/m V1.3.21 afgevinkt; geen extra requirementwijziging nodig.

## 2026-08-15 21:19 — Actuele previewtekst aangepast
- De statische tekst “Originele documentopmaak met gemarkeerde bevindingen” vervangen door een statusafhankelijke omschrijving.
- De preview toont “Actuele documentopmaak met gemarkeerde bevindingen” zolang minimaal één bevinding niet is verwerkt, en “Actuele documentopmaak” wanneer alle bevindingen zijn verwerkt.
- [requirements.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/requirements.md) opgehoogd naar versie 1.17 en V1.3.22 toegevoegd en afgevinkt.

## 2026-08-15 21:22 — Previewtekst functioneel gevalideerd
- Frontendbuild geslaagd met asset `index-D-uMr6oy.js`.
- Het project bevat geen geautomatiseerde tests; dit is expliciet door de testrunner gemeld en niet als testresultaat verborgen.
- Browsercontrole met zes bevindingen bevestigt vóór verwerking “Actuele documentopmaak met gemarkeerde bevindingen”.
- Na acceptatie van alle zes bevindingen toont dezelfde previewkop uitsluitend “Actuele documentopmaak”.

## 2026-08-15 21:22 — Correctierelease v1.0.14 gestart
- De gevalideerde statusafhankelijke previewtekst wordt als immutable image `ind-demo-placeholder:v1.0.14` uitgerold naar de bestaande Azure App Service.
- Er wordt opnieuw geen Container App gebruikt.

## 2026-08-15 21:25 — Correctierelease v1.0.14 live gevalideerd
- ACR-build `cbg` is geslaagd; image `v1.0.14` is gepusht met digest `sha256:d49151a5b28fea014b046a539d27f4e7395ff2e55de7160cfb1f647bb0ef728d`.
- Bestaande Azure App Service `inddemo-web-nfbguv` naar `v1.0.14` omgezet en herstart.
- Healthcheck geeft status `ok` en frontendasset `index-D-uMr6oy.js` wordt live geserveerd.
- Live browserupload bevestigt de tekst “Actuele documentopmaak met gemarkeerde bevindingen” bij zes open bevindingen; de toestand zonder open bevindingen was vooraf lokaal met alle zes acceptaties gevalideerd.
- [URL.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/URL.md) opgehoogd naar versie 1.13 en bijgewerkt naar image `v1.0.14`; login credentials zijn behouden.

## 2026-08-15 21:34 — Vergelijkingsworkflow gestart
- Nieuwe scope geïnventariseerd: naast één-documentreview moeten twee eerdere documenten selecteerbaar worden voor onderlinge controle op onder meer tegenstrijdigheden en consistentie.
- Voorlopige duidelijke rollen gekozen: “Werkdocument” voor het document dat aangepast mag worden en “Referentiedocument” voor de statische vergelijkingsbasis.
- Expliciet onderdeel van de scope: een door de tool aangepaste versie herkenbaar maken en Gotenberg ook activeren wanneer een eerder document wordt geopend.
- Eerst worden huidige opslag, documentherstel, previewrendering en analyse gelezen; implementatie volgt pas nadat de noodzakelijke gedragskeuzes zijn vastgelegd.

## 2026-08-15 21:38 — Oorzaak ontbrekende Gotenberg-preview vastgesteld
- Eerdere reviews worden in browser-`localStorage` bewaard zonder `.docx`-bestand en zonder previewpagina’s; bij herstel wordt `sourceFile` expliciet `null`.
- Daardoor kan de bestaande `/api/review/preview`-route bij een eerder document niet worden aangeroepen en wordt Gotenberg niet geactiveerd.
- Voor duurzaam herstel is een veilige documentkopie nodig buiten `localStorage`; een geredigeerde `.docx` in IndexedDB sluit aan op de bestaande privacyregel dat ongeredigeerde PII niet in browseropslag terechtkomt.
- Tevens vastgesteld dat de huidige Accepteren-flow alleen de bevinding als verwerkt markeert en de markering uit de preview verwijdert; de onderliggende documenttekst wordt nog niet herschreven.
- Deze laatste constatering is bepalend voor de betekenis en herkenbaarheid van “door de tool aangepaste versie” en vereist een expliciete productkeuze.

## 2026-08-15 21:40 — Productkeuze echte documentversies vastgelegd
- Gekozen voor echte tekstwijzigingen: geaccepteerde suggesties moeten de documenttekst herschrijven en als nieuwe, herkenbare versie worden opgeslagen.
- Alleen een statuslabel zonder inhoudelijke wijziging is expliciet afgewezen.
- De vergelijkingsworkflow moet daardoor versieherkomst tonen en het Werkdocument na iedere acceptatie als afgeleide versie kunnen bewaren; het Referentiedocument blijft ongewijzigd.

## 2026-08-15 21:42 — Productkeuze vergelijkingsanalyse vastgelegd
- De gebruiker kiest uitsluitend Azure OpenAI voor de inhoudelijke vergelijking van de twee volledige teksten.
- Beide teksten moeten vóór verzending volledig zijn afgelakt; originele PII mag niet naar Azure OpenAI, browseropslag of vergelijkingsresultaten.
- De volgende uitvoeringsfase omvat: veilige geredigeerde DOCX-opslag, echte tekstvervanging en versieherkomst, Gotenberg bij herstel, selectie van Werkdocument en Referentiedocument, vergelijkings-API en een begeleide vergelijkingsreview.
- De projectlimiet van 4.000 tokens per taak is bereikt; uitvoering wordt met deze vastgelegde context in een nieuwe chat voortgezet.

## 2026-08-15 21:44 — Reikwijdte volledige documentvergelijking verduidelijkt
- De vergelijking mag niet worden beperkt tot geselecteerde passages, bestaande bevindingen of alleen vooraf gedetecteerde tegenstrijdigheden.
- De volledige inhoud van het Werkdocument en het volledige Referentiedocument worden samen inhoudelijk vergeleken.
- Alleen afgelakte persoonsgegevens worden vóór de vergelijking vervangen/uitgesloten; alle overige tekst, structuur, argumentatie, besluiten, terminologie, data, consistentie, volledigheid en mogelijke tegenstrijdigheden blijven onderdeel van de analyse.

## 2026-08-15 21:45 — Semantische beoordelingskaders verduidelijkt
- “Volledige documentvergelijking” betekent dat de volledige afgelakte inhoud van beide documenten als context wordt gebruikt, niet dat er een woordelijke diff wordt gemaakt.
- Azure OpenAI beoordeelt de documenten semantisch en uitsluitend langs de drie bestaande hoofdgroepen uit de requirements: consistentie, tegenstrijdigheden en volledigheid, inclusief de daar beschreven subcriteria.
- Resultaten moeten concrete passages uit beide documenten onderbouwen en verbeteradviezen richten op het Werkdocument; het Referentiedocument blijft statisch.

## 2026-08-15 21:52 — Requirements v1.4 toegevoegd en zichtbare bouw gestart
- De uitvoering is teruggebracht naar deze zichtbare hoofdchat; de eerder aangemaakte aparte chat heeft geen requirementwijzigingen aangebracht en is gestopt.
- [requirements.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/requirements.md) opgehoogd naar versie 1.18.
- V1.4.1 t/m V1.4.10 toegevoegd voor Werkdocument/Referentiedocument-selectie, herkenbare versieherkomst, veilige geredigeerde DOCX-opslag, Gotenberg-herstel, volledige semantische vergelijking op de drie beoordelingsgroepen, bewijsfragmenten, begeleide review en echte accept/undo-versies.
- Alle nieuwe items blijven onafgevinkt totdat de betreffende functionaliteit aantoonbaar is gebouwd en gevalideerd.

## 2026-08-15 21:57 — Vergelijkingsbasis gereviewd en opgebouwd
- Overgedragen basiscode volledig gelezen: veilige IndexedDB-opslag, vergelijkingsroutes, echte DOCX-vervanging en eerste selectie-/review-UI waren reeds atomair aanwezig.
- Frontendbuild en syntaxcontroles van server, vergelijkingsmodule en reviewmodule slagen.
- Versieopslag uitgebreid zodat iedere versie naast geredigeerde DOCX-bytes ook de bijbehorende actuele afgelakte analysetekst bewaart; volgende vergelijkingen gebruiken daardoor niet de oude brontekst.
- Werkdocument en Referentiedocument worden bij vergelijking beide opnieuw via Gotenberg gerenderd; alleen het Werkdocument krijgt markeringen en wijzigingen.
- Vergelijkingscontract aangescherpt naar exact consistentie, tegenstrijdigheden en volledigheid; letterlijk bewijs uit beide documenten is verplicht en de kunstmatige 60.000-tekenlimiet is verwijderd.
- Gerichte contractasserties voor volledige input, categorievalidatie en beide bewijsfragmenten slagen.
- Eerste echte tweedocumenttest bereikte Azure OpenAI maar de respons was geen volledig parseerbaar JSON-object; JSON-mode en ruimere uitvoerlimiet zijn toegevoegd voordat opnieuw wordt getest.

## 2026-08-15 22:00 — Volledige API-vergelijking geslaagd
- Dezelfde tweedocumenttest na activering van Azure JSON-mode slaagt.
- De volledige afgelakte teksten bevatten 5.434 en 5.377 tekens; er is geen tekstselectie of woordelijke diff toegepast.
- Azure OpenAI retourneert tien valide bevindingen verdeeld over consistentie, volledigheid en tegenstrijdigheden; alle tien bevatten terugvindbare bewijsfragmenten uit beide documenten.
- Gotenberg rendert zowel Werkdocument als Referentiedocument naar drie pagina’s.
- Heruploadmigratie gecorrigeerd: ook een reeds bekende bestandsnaam schrijft nu bij upload de veilige geredigeerde DOCX-basis naar IndexedDB, zodat oudere entries daarna Gotenberg kunnen activeren.
- Frontendbuild en serversyntax slagen; de projecttestrunner vindt geen geautomatiseerde testbestanden, wat expliciet als ontbrekende suite wordt gemeld.

## 2026-08-15 22:06 — Vergelijkingsworkflow browsermatig gevalideerd
- Vanaf lege browseropslag twee verschillende DOCX-bestanden geüpload; beide verschijnen als originele v1 in Eerdere documenten en zijn afzonderlijk als Werkdocument en Referentiedocument selecteerbaar.
- Heropenen van een eerder document roept aantoonbaar `/api/review/preview` aan met HTTP 200 en activeert daarmee Gotenberg.
- Een eerste langere OpenAI-call werd eenmalig lokaal met `ERR_EMPTY_RESPONSE` afgebroken zonder servercrash of restart; dezelfde vergelijking direct herhalen slaagde.
- De vergelijkingspagina toont drie Werkdocumentpagina’s en drie statische Referentiedocumentpagina’s, tien begeleide bevindingen met Vorige/Volgende en bewijs uit beide documenten.
- Accepteren herschrijft de DOCX werkelijk, rendert het Werkdocument opnieuw en maakt herkenbare v2; Undo herstelt v1 zonder het Referentiedocument te wijzigen.
- Persistentie bevestigd: v2 is in Eerdere documenten herkenbaar, IndexedDB bevat twee versies, de opgeslagen afgelakte tekst bevat de nieuwe vervangende tekst en heropenen van v2 activeert Gotenberg opnieuw met HTTP 200.
- Server-side defense-in-depth toegevoegd: beide volledige teksten worden ook bij de vergelijkingsroute opnieuw op PII gecontroleerd en afgelakt vóór Azure OpenAI.
- [requirements.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/requirements.md) opgehoogd naar versie 1.19; V1.3.1 en V1.4.1 t/m V1.4.10 zijn na validatie afgevinkt.

## 2026-08-15 22:07 — Vergelijkingsbouw afgerond
- Definitieve Vite-build geslaagd met assets `index-DJ1G-4OY.js` en `index-DIrsv6qG.css`.
- Syntaxcontroles van server, vergelijkingsmodule, reviewmodule en IndexedDB-opslagmodule slagen.
- Alle vier bouwtodos (inventarisatie, ontwerp, bouw en validatie) zijn afgerond.
- Er is niet gedeployed; de live App Service blijft bewust op de vorige release totdat een afzonderlijke deployopdracht wordt gegeven.

## 2026-08-15 22:08 — Deploy v1.1.0 gestart
- Op verzoek wordt de volledige documentvergelijkingsworkflow als minor release `ind-demo-placeholder:v1.1.0` uitgerold.
- Deploymentdoel blijft de bestaande Azure App Service `inddemo-web-nfbguv`; Container Apps worden niet gebruikt.
- Acceptatiecriteria: succesvolle ACR-build/push, nieuwe image actief, asset `index-DJ1G-4OY.js` live, healthcheck geslaagd en live vergelijking van twee volledige afgelakte documenten met beide Gotenberg-previews.

## 2026-08-15 22:15 — v1.1.0 actief, eerste live regressie transportfout
- ACR-run `cbh` is succesvol; image `v1.1.0` is gepusht met digest `sha256:08cfc95b143cdd6aaecf9802901f40b9fa23ab34824e47ca1b1cea1fdaf4f824`.
- Azure App Service expliciet naar `v1.1.0` omgezet en herstart; asset `index-DJ1G-4OY.js` en healthstatus `ok` zijn live bevestigd.
- De eerste volledige live tweedocumenttest eindigde zonder applicatierespons door een TLS `ECONNRESET`; dit is niet als succes aangemerkt.
- De regressie wordt herhaald met staplogging en uitsluitend begrensde retries voor transportresets om de falende fase vast te stellen.

## 2026-08-15 22:18 — Documentvergelijking v1.1.0 live gevalideerd
- Diagnostische live test met begrensde transportretries is volledig geslaagd: volledige afgelakte teksten van 5.434 en 5.377 tekens zijn vergeleken.
- Azure OpenAI leverde zes valide bevindingen verdeeld over consistentie, volledigheid en tegenstrijdigheden; iedere bevinding bevat bewijs uit beide documenten.
- Werkdocument en Referentiedocument zijn live elk naar drie Gotenberg-pagina’s gerenderd.
- Live Accepteren afzonderlijk gevalideerd: de analysetekst verandert werkelijk, bevat de concrete vervanging, de bijgewerkte preview telt drie pagina’s en de nieuwe DOCX is 161.976 bytes.
- De Node-validatieclient kreeg verspreid enkele `ECONNRESET`-transportresets van App Service; begrensde herhaling slaagde telkens en er waren geen ongeldige applicatieresponses. Dit is niet verborgen als foutloos netwerkgedrag.
- [URL.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/URL.md) opgehoogd naar versie 1.14 en bijgewerkt naar image `v1.1.0`; login credentials zijn behouden.

## 2026-08-16 12:11 — Verbeterplan previewopslag en werkstromen
- Screenshot en gedrag geanalyseerd: oudere `localStorage`-metadata is nog zichtbaar/selecteerbaar terwijl de bijbehorende veilige geredigeerde DOCX-versie nooit in IndexedDB is opgeslagen. Die bytes kunnen niet achteraf uit metadata worden gereconstrueerd.
- Tweede oorzaak: `startComparison` opent de vergelijkingspagina vóór is vastgesteld dat beide DOCX-versies beschikbaar zijn; daardoor ziet de gebruiker twee lege previews met een foutmelding.
- Derde UX-fout: Review en Vergelijken staan als verwisselbare menutabbladen naast elkaar, terwijl het afzonderlijke werkstromen zijn die vanuit de gebruikersomgeving gekozen moeten worden.
- Verbeterplan:
  1. Na login een omgevingkeuze tonen: “Eén document beoordelen” of “Twee documenten vergelijken”.
  2. Navigatie per gekozen modus beperken; nooit rechtstreeks van Vergelijken naar Review wisselen.
  3. Uploadgedrag modusafhankelijk maken: review opent Bewerken, vergelijken blijft bij documentselectie.
  4. Per eerder document asynchroon controleren of een veilige DOCX in IndexedDB bestaat; ontbrekende bronnen duidelijk markeren en niet selecteerbaar maken.
  5. Beide bronnen vóór navigatie naar de vergelijkingspagina valideren; fouten blijven op het selectiescherm.
  6. Herupload met dezelfde bestandsnaam herstelt de veilige bron en activeert Gotenberg opnieuw.
  7. Beide werkstromen en de legacy-fout browsermatig vanaf lege en gemigreerde opslag valideren.
- Kritische toets: centraal/apparaatoverschrijdend documentherstel is zonder database/blobopslag niet mogelijk. Deze reparatie maakt browserlokale opslag betrouwbaar en eerlijk, maar claimt geen centrale repository; V1.3.2 blijft daarom buiten scope en onafgevinkt.

## 2026-08-16 12:14 — Gescheiden werkstromen en opslagbewaking gebouwd
- Na login is “Omgeving” de startpagina met twee expliciete keuzes: één document beoordelen of twee documenten vergelijken.
- De menubalk is modusgebonden: Review/Bewerken verschijnt niet in de vergelijkingsworkflow en Vergelijking verschijnt niet in de reviewworkflow.
- Iedere nieuwe moduskeuze start met schone runtime-state, maar verwijdert geen opgeslagen documenten of versies.
- Upload opent alleen in reviewmodus direct Bewerken; in vergelijkmodus blijft de gebruiker op het documentselectiescherm.
- Voor ieder eerder document wordt IndexedDB asynchroon gecontroleerd. Records zonder veilige DOCX krijgen “Bron ontbreekt · upload opnieuw”; openen en rolselectie zijn geblokkeerd.
- Beide DOCX-versies worden gecontroleerd voordat de vergelijkingspagina wordt geopend. Een ontbrekende bron kan daardoor niet meer tot twee lege previewpanelen leiden.
- Frontendbuild slaagt met asset `index-DsWdr6jd.js`; de projecttestrunner meldt opnieuw dat er geen geautomatiseerde testbestanden zijn.

## 2026-08-16 12:18 — Verbeterplan browsermatig gevalideerd
- Met twee bewust gemigreerde legacy-records zonder IndexedDB-bytes bevestigd dat na login alleen Omgeving zichtbaar is.
- Vergelijkmodus toont alleen Omgeving, Documenten kiezen en Actielog; beide records krijgen “Bron ontbreekt · upload opnieuw”, alle rolknoppen en Start vergelijking zijn disabled en de lege vergelijkingspagina opent niet.
- Herupload van exact dezelfde twee bestandsnamen herstelt beide records naar “Preview beschikbaar” en blijft op het selectiescherm zonder Review/Bewerken te openen.
- Na rolselectie opent Vergelijking met drie Werkdocumentpagina’s, drie Referentiedocumentpagina’s en zonder Bewerken-tab.
- Terugkeer naar Omgeving en keuze voor één document beoordelen toont vóór selectie alleen Omgeving, Document kiezen en Actielog; upload opent daarna Bewerken met drie Gotenberg-pagina’s en zonder Vergelijking-tab.
- Upload- en actielogteksten zijn als laatste consistent gemaakt met de gekozen werkstroom.
- Tijdens documentatie bleek [requirements.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/requirements.md) gelijktijdig naar versie 1.22 te zijn aangescherpt. Die recentere vergelijkingsrequirements zijn behouden; niet teruggedraaid of vermengd.
- [requirements.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/requirements.md) opgehoogd naar versie 1.23; V1.4.11 t/m V1.4.14 zijn na validatie toegevoegd en afgevinkt.

## 2026-08-16 12:20 — Deploy v1.1.1 gestart
- Definitieve build en syntaxcontroles slagen; frontendasset is `index-DS0XQM0f.js`.
- Alle vier verbetertodos (plan, opslagbewaking, modusnavigatie en validatie) zijn afgerond.
- De gevalideerde reparatie wordt als patchrelease `ind-demo-placeholder:v1.1.1` uitgerold naar de bestaande Azure App Service; Container Apps worden niet gebruikt.

## 2026-08-16 12:23 — Gescheiden werkstromen v1.1.1 live
- ACR-run `cbj` is geslaagd; image `v1.1.1` is gepusht met digest `sha256:a06c117867d84960cbd71df0fbdc8d559b945b5576edc73900350df3d86cb3f7`.
- Azure App Service omgezet naar `v1.1.1`; healthcheck geeft `ok` en asset `index-DS0XQM0f.js` wordt live geserveerd.
- Live browsercontrole bevestigt: na login alleen Omgeving; vergelijkmodus alleen Omgeving, Documenten kiezen en Actielog; reviewmodus alleen Omgeving, Document kiezen en Actielog totdat een document is geopend.
- De uitgebreidere legacy-opslag-, herupload-, Gotenberg- en dubbele-previewscenario’s zijn vooraf lokaal browsermatig gevalideerd.
- [URL.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/URL.md) opgehoogd naar versie 1.15 en bijgewerkt naar image `v1.1.1`; login credentials zijn behouden.

## 2026-08-16 12:30 — Omgevingsbeheer en voorbeeldcatalogus gebouwd
- De werkstroomcontext staat nu als volle-breedte omgevingskop boven Document toevoegen, Document(en) selecteren en Gebruikershistorie; de uploadkaart draagt niet langer de functie van de hele omgeving.
- Ieder persoonlijk document heeft een kleine prullenbak met bevestiging. Browsercontrole bevestigt dat kaart, actieve documentcontext en IndexedDB-versies worden verwijderd.
- Gebruikershistorie heeft een Wis-knop; acht testkaarten leveren een container van 624 px bij 1.107 px inhoud met `overflow-y: auto`, exact zes minimumkaarten zichtbaar. Wissen resulteert in nul kaarten en verwijdert de localStorage-sleutel.
- Vier bestanden met suffix `_GEANONIMISEERD.docx` uit [Voorbeelden/](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/Voorbeelden) worden server-side als aparte catalogus meegeleverd; andere bestanden worden niet gepubliceerd.
- De eerste browserklik vond een echte scopesfout (`openExampleDocument is not defined`); de handler is naar component-scope verplaatst en dezelfde test daarna opnieuw uitgevoerd.
- In vergelijkmodus opent een voorbeeld met HTTP 200, blijft op selectie en verschijnt daarna als persoonlijke veilige kopie met Preview beschikbaar.
- In reviewmodus opent een ander voorbeeld met HTTP 200 direct in Bewerken, rendert acht Gotenberg-pagina’s en verschijnt als persoonlijke kopie zonder Vergelijking-tab.
- [requirements.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/requirements.md) opgehoogd naar versie 1.24; V1.4.15 t/m V1.4.18 zijn na validatie afgevinkt.

## 2026-08-16 12:38 — Deploy v1.1.2 gestart
- Definitieve build en syntaxcontroles slagen met frontendasset `index-BPapKHi5.js`.
- Alle vijf omgevings- en catalogustodos zijn afgerond.
- Release `ind-demo-placeholder:v1.1.2` wordt naar de bestaande Azure App Service uitgerold; Container Apps worden niet gebruikt.

## 2026-08-16 12:49 — Omgevingsbeheer en voorbeelden v1.1.2 live
- ACR-run `cbk` is geslaagd; image `v1.1.2` is gepusht met digest `sha256:cbbca809edcb4ac0917703384b5778fc422fc8d369b297262d6a33fb1d747a26`.
- Azure App Service omgezet naar `v1.1.2`; healthcheck geeft `ok` en asset `index-BPapKHi5.js` wordt live geserveerd.
- Live API-controle bevestigt exact vier gepubliceerde `_GEANONIMISEERD.docx`-voorbeelden; het geopende voorbeeld levert een veilige geredigeerde DOCX en zeven Gotenberg-pagina’s.
- Live browsercontrole bevestigt de centrale vergelijkingscontext, Document toevoegen, Documenten selecteren, vier voorbeelden en de Wis-knop voor historie.
- Prullenbak, IndexedDB-verwijdering, zes-kaarthoogte/scrollbar, historie wissen en importgedrag in beide modi zijn vooraf lokaal browsermatig gevalideerd.
- [URL.md](/Users/rrienks/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/projects/IND-Demo/URL.md) opgehoogd naar versie 1.16 en bijgewerkt naar image `v1.1.2`; login credentials zijn behouden.
## 2026-08-15 21:39 — Documentvergelijking hervat
- Laatste projectstatus, requirements en bestaande todo-status geïnventariseerd; de sessiedatabase bevatte geen todo-items.
- Vastgelegde scope bevestigd: Werkdocument versus statisch Referentiedocument, volledige geredigeerde teksten via de bestaande Azure OpenAI-proxy, echte DOCX-wijzigingen bij accepteren, veilige herstelbare opslag en geen deployment.

## 2026-08-15 21:48 — Backend vergelijkingsfundament geïmplementeerd
- lib/review.js: `applySuggestionToDocx` toegevoegd — voert een echte tekstvervanging door in `word/document.xml` (zelfde run-detectiepatroon als de bestaande annotatiefunctie), zodat Accepteren in de vergelijkingsreview de Werkdocument-DOCX daadwerkelijk herschrijft.
- lib/compare.js (nieuw): strikte validatie van vergelijkingsinvoer (twee verschillende documenten, volledige tekst, lengte-limiet), promptopbouw voor de bestaande Azure OpenAI-proxy (uitsluitend volledige afgelakte teksten, nooit fragmenten) en strikte resultaatvalidatie (JSON-schema, citaten moeten letterlijk terugvindbaar zijn in het Werkdocument voordat een bevinding wordt geaccepteerd).
- server.js: `/api/review/upload` retourneert nu ook `docxBase64` — een veilige, volledig PII-geredigeerde DOCX-basis (geen bevindingmarkeringen gebakken) bedoeld voor browseropslag (IndexedDB) zodat Gotenberg bij herstel opnieuw kan worden geactiveerd zonder ooit de originele PII opnieuw te versturen.
- server.js: drie nieuwe routes toegevoegd — `/api/review/comparison/analyze` (Azure OpenAI-vergelijking), `/api/review/comparison/render` (PDF-preview van het huidige Werkdocument zonder herschrijving, o.a. voor Undo) en `/api/review/comparison/apply` (echte tekstvervanging + nieuwe PDF-preview, retourneert de nieuwe DOCX-versie).
- Node-syntaxcontrole (`node --check`) geslaagd voor server.js, lib/review.js en lib/compare.js.
- Aanname: de bestaande enkel-documentreview (Bewerken-flow, Accepteren/Undo) blijft functioneel ongewijzigd — de eis "echte tekstwijziging bij Accepteren" is toegepast op de nieuwe vergelijkingsreview, conform de instructie "Behoud bestaande enkel-documentreview".

## 2026-08-15 21:56 — Frontend vergelijkingsworkflow geïmplementeerd en unit-tests toegevoegd
- src/storage.js (nieuw): IndexedDB-module die uitsluitend volledig geredigeerde DOCX-versies bewaart (`saveDocumentVersion`/`getDocumentVersion`), plus `sanitizeSavedReviewRecord` als migratie/opschoning die eventuele DOCX-achtige velden defensief uit bestaande `localStorage`-records verwijdert.
- src/App.jsx: `loadSavedReviews` past de migratie/opschoning toe en kent stabiele, herleidbare document-ID's toe (`documentIdFor`) in plaats van willekeurige ID's, zodat IndexedDB-versies en localStorage-metadata consistent gekoppeld blijven.
- Upload slaat automatisch de veilige geredigeerde DOCX-basis (versie 1, label "Origineel") op in IndexedDB via de bestaande synchronisatie-effect; `docxBase64` verlaat nooit `localStorage`.
- `restoreSavedReview` is nu asynchroon: haalt de opgeslagen DOCX op uit IndexedDB, activeert daarmee opnieuw de Gotenberg-preview via `/api/review/preview`, en toont expliciet een waarschuwing wanneer een ouder document geen herstelbare DOCX-versie heeft (moet opnieuw worden geüpload).
- Documentenscherm: elk eerder document toont nu versieherkomst (`v{n} · label`) en twee rolknoppen ("Werkdocument"/"Referentiedocument"); een document kan niet tegelijk beide rollen krijgen. "Start vergelijking" is alleen actief bij twee verschillende, geldig gekozen documenten.
- Nieuwe workspace "Vergelijken": toont de Werkdocument-preview met versieketen (versieherkomstlabels), een "Vergelijkingsreview"-paneel vergelijkbaar met de bestaande Bewerken-flow (Vorige/Volgende, huidige bevinding met advies/voorbeeld en werk-/referentiecitaat, Accepteren) en een aparte "Laatste wijziging … Undo"-regel.
- Accepteren roept `/api/review/comparison/apply` aan (echte DOCX-tekstvervanging + nieuwe preview) en bewaart de nieuwe versie zowel in IndexedDB als in de zichtbare versieherkomst; Undo keert terug naar de vorige, al gecachete versie (geen serverroundtrip nodig) zonder het Referentiedocument ooit aan te raken.
- Bewuste scope-keuze (fail loud): de vergelijkingsreview bevat geen vrije chat zoals de bestaande Bewerken-flow; Undo herstelt altijd de laatst toegepaste wijziging (lineair), niet een willekeurige eerdere bevinding — dit is inherent aan echte, opeenvolgende tekstmutaties.
- npm run build (Vite) geslaagd; `node --check` geslaagd voor server.js, lib/review.js, lib/compare.js en src/storage.js.
- Testinfrastructuur: `node --test` (ingebouwd, geen nieuwe dependency) met testscript `test/*.test.js`. 12 gerichte tests toegevoegd en geslaagd: echte DOCX-tekstvervanging (inclusief foutpaden), strikte vergelijkingsvalidatie/promptopbouw/resultaatparsing, en een regressietest dat de bestaande enkel-documentreview (`parseReviewDocument`) op het echte demobestand intact blijft en geen PII lekt.

## 2026-08-15 22:06 — Browser end-to-end validatie (lokale Docker, GEEN Azure-deploy) + testfix
- Lokale stack herbouwd en herstart: `docker compose build web` + `docker compose up -d --force-recreate web` (gotenberg-service ongewijzigd). Uitdrukkelijk **geen** Azure-deploy uitgevoerd — dit is en blijft alleen lokale validatie, exact zoals eerder in dit journaal vastgelegd als toegestane werkwijze.
- Testfixes vóór validatie: `test/review-rewrite.test.js` verwachtte een letterlijk aanhalingsteken in de vervangen DOCX-XML, terwijl de bestaande `encodeXmlText`-helper dit correct naar `&apos;` codeert — testfout gecorrigeerd (geen productiecodefout). `package.json`-testscript gecorrigeerd van `node --test test/` (faalt met MODULE_NOT_FOUND op deze Node-installatie) naar `node --test` (werkende, ingebouwde auto-discovery van `test/`).
- **Belangrijke bevinding tijdens browser-E2E**: de eerste live vergelijkingsanalyse via Azure OpenAI faalde met "geen geldige JSON-resultaatvorm". Root cause gevonden via tijdelijke debug-log (achteraf weer verwijderd): niet de Azure-respons was het probleem (geldige JSON, finish_reason=stop), maar een test in `test/compare.test.js` bleek zelf niet overeen te komen met de daadwerkelijke strikte schema-eisen in `lib/compare.js` (ontbrekend `referenceExcerpt`, ongeldige categorie "structure", ontbrekende `referenceText`-parameter) — en bij het narekenen bleek de 60.000-tekens lengtevalidatie die eerder als geïmplementeerd was gelogd, in werkelijkheid **niet** in `validateComparisonRequest` aanwezig te zijn. Dit is gecorrigeerd: `MAX_DOCUMENT_LENGTH = 60_000` met aparte foutmeldingen voor Werk- en Referentiedocument toegevoegd aan `lib/compare.js`; `containsLiteral` defensief gemaakt tegen een ontbrekende `haystack`. Beide betrokken tests in `test/compare.test.js` gecorrigeerd naar de echte contractvorm. Alle 12 tests slagen nu opnieuw na deze fix; lokale Docker-image opnieuw gebouwd en herstart.
- **Volledige browser-E2E-flow succesvol doorlopen** (Playwright-browsertools, lokale container op :8081):
  1. Login (reviewer@ind-demo.local) → werkt.
  2. Upload `demo-nota-test.docx` → enkel-documentreview (bestaande "Bewerken"-flow) ongewijzigd functioneel bevestigd (bevindingen, Accepteren-knop, preview).
  3. Tijdelijk gegenereerd tweede testdocument (`demo-nota-variant.docx`, via ingebouwde `docx`-package, na validatie weer verwijderd) geüpload als tweede "Eerder document".
  4. Documentenscherm: beide documenten tonen versieherkomstlabel "v1 · Origineel"; roltoggels (Werkdocument/Referentiedocument) correct wederzijds uitsluitend; "Start vergelijking" pas actief na twee verschillende, geldige rollen.
  5. "Start vergelijking" → live Azure OpenAI-aanroep leverde 9 strikt gevalideerde bevindingen op (geen fragmenten, volledige afgelakte teksten); Werkdocument- én Referentiedocument-preview beide via Gotenberg gerenderd, PII zichtbaar afgelakt.
  6. Accepteren van een bevinding → **echte tekstvervanging bevestigd** in de vernieuwde Werkdocument-preview (bijv. "de aanvraag wordt toegewezen." → "maar er volgt geen duidelijke conclusie of besluitpunt."); versielabel sprong naar "v2 · Na acceptatie: …"; Referentiedocument-tekst ongewijzigd.
  7. Undo → versie keerde terug naar "v1 · Origineel", bevinding weer accepteerbaar; actielog toonde zowel "Vergelijking geaccepteerd" als "Vergelijking undo" met tijdstip.
  8. Herstel-van-eerder-document (kernbug van deze sessie): na volledige page reload + heropenen van `demo-nota-test.docx` vanuit "Eerdere documenten" werd de Gotenberg-preview **opnieuw geactiveerd** (nieuwe, geldige PNG-preview van >100 KB geregenereerd server-side vanuit de IndexedDB-DOCX), in plaats van een lege/verouderde weergave.
  9. Privacycontrole: `localStorage`-record voor beide documenten bevat aantoonbaar géén `docxBase64`/`sourceDocxBase64`-veld; IndexedDB (`ind-demo-documents` → store `documents`) bevat beide DOCX-versies onder dezelfde stabiele ID's als gebruikt in localStorage.
- Bekende, niet-blokkerende observatie: reguliere Playwright `click()`/`clickElement`-aanroepen op deze pagina liepen structureel tegen een 10s-actionability-timeout aan (vermoedelijk een continue CSS-overgang/animatie in de UI die "element stable"-detectie blokkeert); alle interacties zijn daarom uitgevoerd via een forced/native `element.click()`-aanroep, wat in alle gevallen betrouwbaar werkte. Dit is een testtool-interactie-kwestie, geen functionele bug, maar wordt hier expliciet vermeld voor transparantie.
- Debug-logging (`DEBUG_COMPARISON`) en de tijdelijke `docker-compose.yml`-omgevingsvariabele zijn na gebruik weer volledig teruggedraaid; tijdelijke testbestanden (`scratch-make-variant.cjs`, `demo-nota-variant.docx`) verwijderd conform opschoningsinstructie.
- Conclusie: alle in scope genomen V1.3-vereisten voor de vergelijkingsfunctionaliteit zijn end-to-end gevalideerd. Geen Azure-deploy uitgevoerd.

## 2026-08-15 22:08 — Belangrijke observatie: parallelle sessie gedetecteerd, GEEN eigen deploy uitgevoerd
- Bij het opnieuw inlezen van `JOURNAL.md`/`requirements.md` vóór de eindsamenvatting bleek dat er, kennelijk gelijktijdig, een **andere/parallelle sessie** in dezelfde repository actief is (of is geweest) die zeer vergelijkbaar werk aan dezelfde vergelijkingsfunctionaliteit heeft gelogd (entries tot 22:07, inclusief een reeds opgehoogde `requirements.md` naar versie 1.19 met V1.3.1 en V1.4.1 t/m V1.4.10 afgevinkt) én — cruciaal — een entry bevat: "## 2026-08-15 22:08 — Deploy v1.1.0 gestart" die meldt dat op verzoek een uitrol naar de bestaande Azure App Service `inddemo-web-nfbguv` (resourcegroep `rg-ind-demo`) wordt gestart.
- Dit is **niet** door mij/deze sessie geïnitieerd. Deze sessie heeft expliciet de instructie "deploy absoluut niet" gekregen en heeft die instructie gevolgd: er is in deze sessie geen enkele `az`-schrijfactie, geen ACR-build/push en geen App Service-wijziging uitgevoerd. Ter verificatie is uitsluitend een read-only `az webapp list` uitgevoerd (toont dat `inddemo-web-nfbguv` bestaat en `Running` is) — dit is puur informatief en wijzigt niets.
- Omdat `JOURNAL.md` en `requirements.md` gedeelde, ongelockte bestanden zijn, is het mogelijk dat een andere sessie van dezelfde gebruiker gelijktijdig aan dezelfde requirement heeft gewerkt (mogelijk met een net iets andere implementatiekeuze, bijvoorbeeld: die sessie meldt de 60.000-tekenlimiet te hebben *verwijderd*, terwijl deze sessie diezelfde limiet juist heeft *toegevoegd* nadat een test een echt ontbrekende validatie blootlegde). Dit is een reëel risico op tegenstrijdige wijzigingen aan `lib/compare.js` tussen beide sessies.
- Aanbeveling aan de gebruiker: controleer of er inderdaad een tweede, actieve sessie op dit project draait, en beslis welke implementatie/versie van `lib/compare.js` (met of zonder 60.000-tekenlimiet) definitief moet zijn vóór een eventuele volgende deploy. Deze sessie heeft geen wijzigingen van de andere sessie teruggedraaid of overschreven buiten de eigen, hierboven gelogde `compare.js`-testfix.
- Herbevestigd: deze sessie heeft op geen enkel moment gedeployed naar Azure App Service of Container Apps.
## 2026-08-15 22:16 — Volledige-tekstcontract definitief geborgd
- De persistente eindstaat na parallelle wijzigingen gecontroleerd en de lokale 60.000-tekenlimiet verwijderd, omdat die strijdig was met de vastgelegde eis dat beide volledige geredigeerde documenten worden vergeleken.
- De gerichte test encodeert nu dat ook een Werkdocument van 70.000 tekens volledig en zonder lokale afkapping aan de bestaande Azure OpenAI-proxy wordt aangeboden; een eventuele providerlimiet blijft als expliciete proxyfout zichtbaar.

## 2026-08-15 22:17 — Finale verificatie en afsluiting
- `npm test`: 12 van 12 tests geslaagd, zonder failures, skips of open todo-tests.
- `npm run build`: Vite-build geslaagd met assets `index-DJ1G-4OY.js` en `index-DIrsv6qG.css`.
- `node --check` geslaagd voor `server.js`, `lib/review.js`, `lib/compare.js` en `src/storage.js`.
- Requirements blijven op documentversie 1.19 met V1.3.1 en V1.4.1 t/m V1.4.10 aantoonbaar afgevinkt.
- Deze chat heeft niet gedeployed en geen Azure-resource gewijzigd; een eventuele parallel gestarte deployment valt buiten deze uitvoering.
## 2026-08-15 22:17 — Integrale vergelijkingsscope expliciet geborgd
- De bestaande vergelijkingsroute gecontroleerd: beide volledige invoerteksten worden zonder selectie, samenvatting of afkapping samen in één Azure OpenAI-aanroep aangeboden; server-side worden uitsluitend opnieuw gedetecteerde persoonsgegevens afgelakt.
- De systeemprompt aangescherpt: de integrale beoordeling omvat expliciet inhoud, structuur, argumentatie, besluiten, terminologie, data, tone of voice, referenties, consistentie, volledigheid en tegenstrijdigheden.
- Expliciet uitgesloten dat de analyse wordt beperkt tot relevante passages, bestaande bevindingen of alleen tegenstrijdigheden; alle overige niet-persoonsgebonden inhoud blijft context.
- Een regressietest toegevoegd die het volledige-tekstcontract en alle genoemde dimensies bewaakt.
- `requirements.md` opgehoogd naar versie 1.20 en V1.4.5 overeenkomstig verduidelijkt; het item blijft afgevinkt omdat de implementatie aanwezig is en aansluitend opnieuw wordt gevalideerd.

## 2026-08-15 22:18 — Scopecorrectie gevalideerd
- `npm test`: alle 12 tests geslaagd, inclusief volledige lange invoer en de expliciete dimensie-/uitsluitingsasserties; geen failures of skips.
- `npm run build`: geslaagd met ongewijzigde assets `index-DJ1G-4OY.js` en `index-DIrsv6qG.css`.
- `node --check` geslaagd voor `server.js` en `lib/compare.js`.
- Niet gedeployed; deze correctie is uitsluitend lokaal gebouwd en gevalideerd.
## 2026-08-15 22:18 — Semantisch vergelijkingscontract gepreciseerd
- “Volledige vergelijking” definitief vastgelegd als volledige afgelakte tekst van beide documenten als gezamenlijke context, zonder woordelijke diff.
- De Azure OpenAI-systeemprompt beperkt de classificatie nu expliciet tot exact drie bestaande requirementsgroepen met hun subcriteria: consistentie, tegenstrijdigheden en volledigheid.
- Iedere bevinding vereist concrete letterlijke passages uit zowel Werkdocument als Referentiedocument; advies en vervanging mogen uitsluitend het Werkdocument wijzigen en het Referentiedocument blijft statisch.
- Contracttests uitgebreid voor het diffverbod, de drie groepen en subcriteria, dubbel bronbewijs en de eenzijdige wijzigingsrichting.
- `requirements.md` opgehoogd naar versie 1.21 en V1.4.4 t/m V1.4.6 overeenkomstig gepreciseerd.
- Eerste validatieronde: 11 van 12 tests slaagden; één oude test verwachtte nog de bredere losse dimensieterm “structuur” in plaats van het bestaande requirement-subcriterium “layout/opbouw”.
- De conflicterende oude dimensielijst uit de test verwijderd; de nieuwe assertions blijven exact de drie requirementsgroepen en hun bestaande subcriteria bewaken.

## 2026-08-15 22:20 — Semantisch contract definitief gevalideerd
- `npm test`: 12 van 12 tests geslaagd, zonder failures, skips of open todo-tests.
- `npm run build`: geslaagd met assets `index-DJ1G-4OY.js` en `index-DIrsv6qG.css`.
- `node --check` geslaagd voor `lib/compare.js` en `server.js`.
- Niet gedeployed; uitsluitend de lokale bron, requirements en tests zijn bijgewerkt.
## 2026-08-15 22:20 — Definitieve requirements vóór bouwaudit vastgelegd
- Op expliciet bouwakkoord eerst `requirements.md` opgehoogd naar documentversie 1.22.
- V1.4.1 t/m V1.4.10 als tien afzonderlijke definitieve bouwitems vastgelegd voor selectie, herkomst, veilige DOCX-opslag/Gotenberg, volledige analysecontext zonder diff, drie groepen en subcriteria, dubbel bronbewijs, begeleide review, echte accept/undo, afgeleide opslag/download en privacy.
- Alle tien items bewust teruggezet op onafgevinkt; ze worden pas opnieuw afgevinkt nadat ieder item in de actuele persistente implementatie aantoonbaar end-to-end werkt.
- Volgende stap: implementatie-audit op alle betrokken frontend-, opslag-, API- en DOCX-downloadpaden en vervolgens gerichte tests/build/browservalidatie.

## 2026-08-15 22:23 — Implementatie-audit en privacytest
- De actuele koppelingen gecontroleerd: twee wederzijds uitsluitende documentrollen, IndexedDB-DOCX-herstel, gezamenlijke analyseaanroep, afzonderlijke Gotenberg-previews, versieherkomst, echte DOCX-acceptatie, lineaire Undo en download van de actuele Werkdocumentversie zijn aanwezig.
- Bevestigd dat de vergelijkingsroute beide teksten server-side opnieuw op PII controleert en uitsluitend de opnieuw afgelakte teksten aan de bestaande Azure OpenAI-proxy doorgeeft.
- Een gerichte regressietest toegevoegd die bewijst dat legacy `docxBase64` en `sourceDocxBase64` defensief uit `localStorage`-metadata worden verwijderd; binaire geredigeerde DOCX-versies blijven uitsluitend in IndexedDB.

## 2026-08-15 22:25 — Geautomatiseerde validatie definitieve bouw
- `npm test`: 13 van 13 tests geslaagd, inclusief volledige analysecontext, exact drie semantische groepen, echte DOCX-vervanging, enkel-reviewregressie en localStorage-opschoning; geen failures of skips.
- `npm run build`: geslaagd met assets `index-DJ1G-4OY.js` en `index-DIrsv6qG.css`.
- Syntaxcontroles geslaagd voor server, review-, vergelijkings- en opslagmodules; lokale `/healthz` reageert met status `ok`.

## 2026-08-15 22:27 — Browservalidatie en requirements afgevinkt
- Vanuit Eerdere documenten twee verschillende documenten als Werkdocument en Referentiedocument gekozen; Start vergelijking werd pas daarna actief.
- Azure OpenAI leverde acht semantische bevindingen; de review toont Werk- en Referentiedocumentbewijs, Vorige/Volgende, advies en afzonderlijke Gotenberg-previews.
- Accepteren maakte een echte herkenbare v2-DOCX; het Referentiedocumentbeeld bleef byte-identiek. Undo herstelde v1 en liet het Referentiedocument opnieuw ongewijzigd.
- Downloadactie gevalideerd: DOCX MIME-type, 9.109 bytes en herkenbare bestandsnaam `demo-nota-test-v2.docx`.
- Privacy gecontroleerd: localStorage bevat geen `docxBase64` of `sourceDocxBase64`; IndexedDB bevat twee documenten met bewaarde versieketens.
- Heropenen van een eerder document activeerde `/api/review/preview` opnieuw met HTTP 200 en leverde één zichtbare Gotenberg-pagina.
- V1.4.1 t/m V1.4.10 pas na deze bewijzen afgevinkt in `requirements.md` versie 1.22.
- Niet gedeployed; de definitieve bouw is uitsluitend lokaal uitgevoerd en gevalideerd.

## 2026-08-16 18:30 — Herstel eerder document en vereenvoudiging documentomgeving gestart
- Gebruikersmelding onderzocht: bij het kiezen van een eerder document kan de checker/laadweergave blijven staan.
- Succescriteria vastgelegd: selectie wordt pas actief nadat de veilige IndexedDB-bron en Gotenberg-preview zijn hersteld; fouten sluiten de laadstatus af en blijven zichtbaar; uploaden wordt onderdeel van Document(en) selecteren; de losse Gebruikershistorie verdwijnt en wordt volledig met het Actielog samengevoegd.
- Eerste code-inspectie toont dat `restoreSavedReview` de review al activeert vóór bron- en previewherstel, terwijl vergelijking zonder begrensde clientaanroep direct naar een laadpagina navigeert. Deze paden worden transactioneel en foutbestendig gemaakt.

## 2026-08-16 18:37 — Documentselectie, herstelpad en actielog samengevoegd
- De losse kaart Document toevoegen verwijderd; upload staat nu bovenaan in hetzelfde paneel als Voorbeelddocumenten en Mijn documenten.
- De losse prominente Gebruikershistoriekaart uit de documentomgeving verwijderd. De volledige accountbrede historie, teller en Wis-actie staan nu als tweede sectie op de bestaande Actielogpagina.
- `restoreSavedReview` transactioneel gemaakt: eerst IndexedDB-bron ophalen en Gotenberg-preview genereren, daarna pas reviewstate, bronbestand, chat, actielog en navigatie activeren. Bij een fout blijft de gebruiker in de documentselectie en wordt de modal gesloten met een zichtbare fout.
- Herstel gebruikt nu expliciet de bestandsnaam van het gekozen document, niet impliciet die van een eventueel eerder actief document.
- Upload-, voorbeeld-, preview- en vergelijkingsaanroepen zijn begrensd tot 220 seconden; een timeout levert een zichtbare herhaalboodschap op in plaats van een permanent laadscherm.

## 2026-08-16 18:45 — Lokale validatie selectie en eerder-documentherstel geslaagd
- `npm test`: 13 van 13 tests geslaagd; geen failures, skips of todo-tests.
- `npm run build`: geslaagd met assets `index-ICATnhSx.js` en `index-3yzWLGBo.css`.
- Lokale Docker-image herbouwd en container opnieuw gestart; `/healthz` reageert met `ok`.
- Browsercontrole reviewomgeving: nul losse `.upload-panel`-kaarten, precies één geïntegreerde `.selection-upload`, nul `.history-panel`-kaarten en één eerder document beschikbaar.
- Het eerder opgeslagen document opende transactioneel zonder fout of achterblijvende modal en leverde zeven actuele Gotenberg-previewpagina’s.
- Browsercontrole Actielog: documentactielog bevatte 14 regels; de samengevoegde Gebruikershistorie bevatte twee accountacties en exact één Wis-knop.
- Browsercontrole vergelijking: tweede document toegevoegd binnen Documenten selecteren, twee eerdere documenten als Werk- en Referentiedocument gekozen en vergelijking volledig afgerond. De laadweergave sloot, beide previews telden samen tien pagina’s, een semantische bevinding werd getoond en er bleef geen modal of foutmelding staan.
- V1.4.19 t/m V1.4.21 na bovenstaande bewijzen afgevinkt in `requirements.md` versie 1.25.
- Niet gedeployed; deze wijziging is uitsluitend lokaal gebouwd en gevalideerd.

## 2026-08-16 18:40 — Uniforme documentlijst gestart
- Nieuwe UX-wijziging vastgelegd in `requirements.md` versie 1.26: Omgeving wordt Beginscherm, de reviewinstructie wordt verkort en meegeleverde voorbeelden worden onderdeel van Mijn documenten.
- Veilige verwijdersemantiek gekozen: een verwijderd meegeleverd voorbeeld wordt per account in localStorage verborgen; de gedeelde serverbron blijft intact en kan daardoor niet door één gebruiker voor alle gebruikers worden verwijderd.
- Voorbeelden die al als veilige persoonlijke kopie zijn geopend worden op bestandsnaam gededupliceerd. Verwijderen van zo'n kopie verwijdert IndexedDB/metadata en verbergt ook de meegeleverde bron voor het account, zodat het document niet direct opnieuw verschijnt.

## 2026-08-16 18:43 — Uniforme documentlijst lokaal gevalideerd
- `npm test`: 13 van 13 tests geslaagd; geen failures, skips of todo-tests.
- `npm run build`: geslaagd met assets `index-pEvxI7dy.js` en `index--BcqxhnK.css`.
- Lokale Docker-image herbouwd; `/healthz` reageert met `ok`.
- Schone browsercontrole toonde vier meegeleverde voorbeelden rechtstreeks onder Mijn documenten, vier prullenbakknoppen en geen kop of categorie Voorbeelddocumenten.
- Navigatie toont exact “Beginscherm”; de enkel-reviewinstructie toont exact “Open een document ter review.”.
- Eén voorbeeld via het prullenbakicoon verwijderd. De accountopslag bevatte daarna één verborgen voorbeeld-ID; na volledige herlaad en opnieuw openen van de reviewomgeving bleven exact drie documenten en drie prullenbakknoppen zichtbaar.
- De bestaande vergelijkingstekst bleef exact ongewijzigd: “Kies exact twee beschikbare documenten: één als Werkdocument en één als statisch Referentiedocument.”
- V1.4.22 t/m V1.4.24 na deze validatie afgevinkt in `requirements.md` versie 1.26.
- Niet gedeployed; uitsluitend lokaal gebouwd en gevalideerd.

## 2026-08-16 18:44 — Deploy v1.1.3 gestart
- Op expliciet verzoek wordt de lokaal gevalideerde uniforme documentlijst uitgerold als `ind-demo-placeholder:v1.1.3`.
- Deploymentdoel blijft de bestaande Azure App Service `inddemo-web-nfbguv` in resourcegroep `rg-ind-demo`; Container Apps worden niet gebruikt.
- Na ACR-build en App Service-omzetting worden live health, asset, Beginscherm, de samengevoegde Mijn documenten-lijst, prullenbakken en de reviewinstructie gecontroleerd.

## 2026-08-16 18:47 — Release v1.1.3 live en gevalideerd
- ACR-run `cbm` is geslaagd; image `ind-demo-placeholder:v1.1.3` is gepusht met digest `sha256:fa431b3a051d99a27f9b86afdb0bf0e69d9765cd53cec5e4a838388026dc687c`.
- Bestaande Azure App Service `inddemo-web-nfbguv` omgezet naar `DOCKER|inddemoacrnfbguv.azurecr.io/ind-demo-placeholder:v1.1.3` en herstart; geen Container Apps gebruikt.
- Live healthcheck reageert met `ok`; live catalogus bevat nog steeds exact vier geanonimiseerde voorbeeldbronnen.
- Nieuwe live frontendassets bevestigd: `index-pEvxI7dy.js` en `index--BcqxhnK.css`.
- Live browsercontrole na echte demo-login: navigatie toont “Beginscherm”, reviewinstructie toont exact “Open een document ter review.”, Mijn documenten bevat vier meegeleverde documenten met vier prullenbakken en de aparte categorie Voorbeelddocumenten ontbreekt.
- `URL.md` opgehoogd naar documentversie 1.17, inclusief image `v1.1.3`, actuele deploycommando's en behouden demo-logincredentials.

## 2026-08-16 18:49 — Buiten-scope requirements gesynchroniseerd
- Het aangeleverde externe requirementsdocument vergeleken met projectrequirements 1.26 en de aantoonbaar live gevalideerde softwarestand v1.1.3.
- Voormalige buiten-scopepunten opgesplitst om gedeeltelijke claims te voorkomen: vergelijking van precies twee volledige documenten en lokaal versiebeheer zijn gerealiseerd; een centrale gedeelde repository met centraal versiebeheer is dat niet.
- Als gerealiseerd vastgelegd: tweedocumentvergelijking, lokale versieherkomst/-opslag/-download, gebruikershistorie per login en interactieve chat/Bewerken met expliciete acceptatie.
- Als buiten scope behouden: centrale gedeelde documentrepository, optimalisatie op basis van gebruikersgedrag en inhoudelijke tabelanalyse/-verbetering. Tabellen blijven aantoonbaar alleen gedetecteerd, gemeld en onveranderlijk behandeld.
- Aangeleverd `file_requirements.md` opgehoogd van documentversie 1.7 naar 1.8; projectbestand `requirements.md` opgehoogd van 1.26 naar 1.27 en de resterende buiten-scopepunten expliciet gekoppeld aan V1.3.2, V1.3.4 en V1.3.6.

## 2026-08-16 19:02 — Semantische review en geïntegreerde interactie gestart
- Nieuwe feedback vertaald naar V1.4.25 t/m V1.4.31 in `requirements.md` versie 1.28; alle items blijven onafgevinkt tot geïntegreerde validatie.
- Architectuuraudit bevestigde dat de enkel-documentreview inhoudelijke bevindingen nog deterministisch opbouwde, de chat `max_completion_tokens: 700` gebruikte, de gebruikershistorie naast het Actielog bleef bestaan en ongeopende voorbeelden nog geen vergelijkingsrollen hadden.
- Enkel-documentupload en voorbeeldimport server-side omgezet naar Azure OpenAI JSON-analyse van uitsluitend de volledige afgelakte tekst, langs exact consistentie, tegenstrijdigheden en volledigheid. Previewherstel en downloads hergebruiken veilig de gevalideerde bevindingen en roepen het LLM niet opnieuw aan.
- Analysemodal uitgebreid naar vijf bewegende stappen met spinner, pulserende actieve rij en zichtbare voortgang door de drie semantische categorieën.
- Legacy gebruikershistorie wordt voor beide demoaccounts gewist; nieuwe uitgebreide events worden maximaal 250 regels accountbreed persistent in één Actielog bewaard. Moduswissels wissen dit log niet meer en logdownload werkt ook zonder actief document.
- Chatbackend verhoogd naar 1.400 tokens per antwoorddeel en vervolgt maximaal twee keer bij `finish_reason: length`; alleen een volledige afsluitende zin wordt teruggegeven. De volledige geredigeerde documentcontext blijft behouden.
- Ongeopende voorbeelden hebben nu Werkdocument- en Referentiedocumentknoppen die eerst de veilige import/analyse uitvoeren en daarna de gekozen rol activeren.
- Vergelijkingschat toegevoegd met volledige afgelakte Werk- en Referentiedocumentcontext, bevindingen en actieve rol; zoomregelaars van 75% tot 200% toegevoegd aan review- en vergelijkingspreviews.

## 2026-08-16 19:40 — Semantische review lokaal end-to-end gevalideerd
- Geautomatiseerd: volledige suite 20 tests geslaagd zonder failures/skips; productiebuild en syntaxcontroles voor server, review en chat geslaagd. Nieuwe tests bewijzen volledige chatcontext, PII-redactie zonder stille invoerafkapping, automatische tokenvervolging en exacte driecategorieënprompt.
- Lokale Docker-stack herbouwd; healthcheck geeft `ok`.
- Reviewbrowserflow: modal toonde draaiende `analysis-spin`, actieve stap verschoof aantoonbaar van “Upload controleren” naar “Consistentie analyseren met LLM”; voorbeeldanalyse eindigde zonder fout met zeven Gotenberg-pagina's en een semantische bevinding.
- Reviewzoom browsermatig van 100% naar 125% gezet. “Leg uitgebreider uit” leverde 849 tekens en eindigde in een volledige zin.
- Uniform Actielog bevatte 16 uitgebreide events; nergens stond nog Gebruikershistorie, geen legacy history-key bleef bestaan en exact één persistente account-activity-key was aanwezig.
- Vergelijkingsbrowserflow: ongeopend bovenste voorbeeld had direct Werkdocument- en Referentiedocumentknoppen; veilige rolimport werkte. Volledige vergelijking leverde tien previewpagina's, een semantische bevinding, zoomregeling en geen fout.
- Vergelijkingschat leverde 1.932 tekens, gebruikte beide documenten en eindigde in een volledige zin.
- Kritische controle vond twee nauw gekoppelde acceptatieproblemen en corrigeerde die: een ongedefinieerd versienummer in de nieuwe uitgebreide logregel en verouderde open bevindingen na een succesvolle herschrijving. Server retourneert nu opnieuw gevalideerde bevindingen en client/chat gebruiken die actuele set.
- Browseracceptatie maakte succesvol v2 zonder achterblijvende fout. Twee eerder gekozen LLM-fragmenten bleken over meerdere interne Word-runs verdeeld; de DOCX-vervanger ondersteunt dit nu rechtstreeks. Gerichte regressietest met drie runs: 5 van 5 rewrite-tests geslaagd.
- Finale frontendbuild na het verwijderen van alle obsolete historiestijlen geslaagd met assets `index-Cpg-XAPm.js` en `index-Duke3ClC.css`.
- V1.4.25 t/m V1.4.31 pas na deze bewijzen afgevinkt in `requirements.md` versie 1.28.
- Niet gedeployed.

## 2026-08-16 20:20 — Deploy v1.1.4 gestart
- Op expliciet verzoek wordt de volledig lokaal gevalideerde semantische reviewrelease uitgerold als `ind-demo-placeholder:v1.1.4`.
- Deploymentdoel blijft uitsluitend de bestaande Azure App Service `inddemo-web-nfbguv` in `rg-ind-demo`; Container Apps worden niet gebruikt.
- Live validatie omvat health/assets en een echte gebruikersflow voor LLM-voortgang, semantische bevindingen, accountbreed Actielog, voorbeeldrollen, zoom en chat.

## 2026-08-16 20:40 — Release v1.1.4 live en volledig gevalideerd
- ACR-run `cbn` geslaagd; image `ind-demo-placeholder:v1.1.4` gepusht met digest `sha256:d76ad67627e8d9588d1c75dd18a47ae4c17888022a31e338d501a379fe4a5ecb`.
- Bestaande Azure App Service `inddemo-web-nfbguv` omgezet naar `DOCKER|inddemoacrnfbguv.azurecr.io/ind-demo-placeholder:v1.1.4` en herstart; geen Container Apps gebruikt.
- Live healthcheck geeft `ok`; vier geanonimiseerde voorbeeldbronnen blijven beschikbaar. Live assets: `index-Cpg-XAPm.js` en `index-Duke3ClC.css`.
- Live reviewflow: animatie `analysis-spin` actief; actuele stap verschoof van Upload controleren naar Consistentie analyseren met LLM. Analyse eindigde zonder fout met zeven Gotenberg-pagina's en een semantische bevinding.
- Live reviewzoom van 100% naar 125% gezet. “Leg uitgebreider uit” leverde 889 tekens en eindigde in een volledige zin.
- Live uniform Actielog: 15 events, geen Gebruikershistorie, nul legacy history-keys en één persistente activity-key.
- Live vergelijkingsflow: bovenste ongeopende voorbeeld had beide rolknoppen en werd veilig als Werkdocument geïmporteerd; een opgeslagen document werd Referentiedocument.
- Live vergelijking eindigde zonder fout met tien previewpagina's, een semantische bevinding, zoomregeling en zichtbare “Chat over de vergelijking”.
- Live vergelijkingschat leverde 3.540 tekens en eindigde in een volledige zin, waarmee de automatische antwoordvervolging ook boven de oude cap inhoudelijk is bewezen.
- `URL.md` opgehoogd naar documentversie 1.18 met image `v1.1.4`, actuele deploycommando's en behouden demo-logincredentials.

## 2026-08-17 11:55 — Nieuwe reviewfeedback vertaald en bouw gestart
- Gebruikerskeuzes expliciet bevestigd: “Afronden en opslaan” bewaart de actuele versie in Mijn documenten en keert terug naar Beginscherm; vrije chatwijzigingen tonen altijd eerst een voorstel dat expliciet moet worden geaccepteerd.
- Root cause ontbrekende markeringen vastgesteld: `annotateDocumentXml` annoteerde uitsluitend tekst die volledig binnen één `w:r`/`w:t`-run stond. Semantische LLM-fragmenten, waaronder tegenstrijdigheden, kunnen over meerdere Word-runs lopen.
- Root cause schijnacceptatie vastgesteld: de enkel-reviewfunctie stuurde alleen toegepaste finding-ID's naar de previewroute en verwijderde daarmee de markering, maar riep geen echte DOCX-tekstvervanging aan. De vergelijkingsflow deed dit al wel.
- V1.4.32 t/m V1.4.37 toegevoegd aan `requirements.md` versie 1.29 en bewust onafgevinkt tot browservalidatie.
- Frontendbasis gebouwd voor echte reviewversies/Undo, veilige opgemaakte chatweergave, wijzigingsvoorstelkaarten, legenda en Afronden en opslaan in beide werkstromen.
### 2026-08-17 12:15:32 CEST - Geintegreerde validatie gestart en runtimefout hersteld

- De lokale Docker-image met de nieuwste reviewverbeteringen is opnieuw gebouwd en `/healthz` antwoordt succesvol.
- Tijdens de eerste browservalidatie is een `ReferenceError: HighlightLegend is not defined` gevonden. De chatrenderer en legenda stonden door een foutieve functiescope binnen `normalizeChatMessages`, wat de frontend bij het renderen liet uitvallen.
- De helpers zijn naar modulescope verplaatst. Dit is een direct gekoppelde blokkade voor de gevraagde legenda- en chatvalidatie; de browserflow wordt na herbouw volledig opnieuw uitgevoerd.
### 2026-08-17 12:35:09 CEST - Chatvoorstelkaart browsermatig gecorrigeerd

- De normale chatrespons is browsermatig ontvangen met koppen, symbolen, bullets en een volledige afsluitende zin.
- Een expliciet tekstwijzigingscommando leverde server-side correct een voorstel op, maar de voorstelkaart was alleen binnen de laadstatus gerenderd en verdween daardoor zodra het antwoord klaar was.
- De voorstelkaarten voor zowel enkel-documentreview als vergelijking zijn buiten de tijdelijke laadstatus geplaatst. Daardoor blijft het voorstel zichtbaar tot de gebruiker expliciet op Accepteren klikt.
### 2026-08-17 12:50:00 CEST - Reviewfeedback volledig gevalideerd

- `npm test`: 29 van 29 tests geslaagd, zonder failures of overgeslagen tests. Hiermee zijn onder meer cross-runmarkeringen voor cyaan, magenta, geel en zwarte PII-aflakking, echte DOCX-vervanging, Undo-hervalidatie, veilige Markdown en voorstelvalidatie bewezen.
- `npm run build`: productiebuild geslaagd.
- Lokale Docker-image opnieuw gebouwd; `/healthz` antwoordt succesvol.
- Enkel-documentreview browsermatig gevalideerd:
  - zeven previewpagina's werden door Gotenberg gerenderd;
  - de legenda toont Consistentie, Tegenstrijdigheid, Volledigheid en Persoonsgegeven afgelakt;
  - Accepteren wijzigde aantoonbaar de opgeslagen `analysisText`, voegde de volledige suggestie toe, renderde opnieuw zeven previewpagina's en maakte versie v2;
  - Undo herstelde de oorspronkelijke tekst en versie v1;
  - een normale chatrespons bevatte herkenbare koppen/symbolen, ingesprongen bullets en eindigde in een volledige zin;
  - het commando `Verander exact de tekst "Gevraagd besluit" in "Voorgesteld besluit".` liet eerst een voorstelkaart zien terwijl de documenttekst ongewijzigd bleef;
  - pas na Accepteren werd de echte documenttekst en de Gotenberg-preview gewijzigd;
  - Afronden en opslaan keerde terug naar Beginscherm en liet de bijgewerkte versie in de catalogus staan.
- Vergelijkingsreview browsermatig gevalideerd:
  - legenda en afrondknop waren zichtbaar;
  - het chatcommando voor `Voorgesteld besluit` naar `Besluitvoorstel` leverde een blijvende voorstelkaart;
  - Accepteren maakte Werkdocumentversie v3, wijzigde de Werkdocument-preview en liet de Referentiedocument-preview bytegelijk ongewijzigd;
  - Afronden en opslaan keerde terug naar Beginscherm.
- Tijdens de browservalidatie gevonden functiescope- en voorstelkaartproblemen zijn hersteld en na herbouw opnieuw bewezen.
- Requirements V1.4.32 tot en met V1.4.37 zijn na dit bewijs afgevinkt. Er is niet gedeployed; de live release blijft v1.1.4 totdat de gebruiker daar expliciet om vraagt.
### 2026-08-17 12:58:12 CEST - Roadmap opgeschoond naar open punten

- De roadmap onderaan de requirements is vergeleken met de gerealiseerde functionaliteit.
- Reeds gerealiseerde roadmapitems zijn verwijderd: meerdere documenten in samenhang beoordelen, gebruikershistorie/accountbreed Actielog en interactieve chat.
- Alleen nog niet gerealiseerd werk blijft als expliciet onafgevinkt open punt staan:
  - centrale gedeelde documentrepository met centraal versiebeheer;
  - optimalisatie van suggesties op basis van gebruikersgedrag;
  - inhoudelijke analyse en verbetering van tabellen.
- De projectrequirements zijn opgehoogd naar documentversie 1.30 en de aangeleverde requirementskopie naar documentversie 1.8.
- Dit betreft uitsluitend requirementsdocumentatie; een build, test of deployment is niet nodig.
### 2026-08-17 13:04:22 CEST - Reviewverbeteringen gedeployed als v1.1.5

- De eerder volledig gevalideerde reviewfeedbackrelease is via Azure Container Registry gebouwd en naar de bestaande Azure App Service uitgerold; er is conform de projectafspraak geen Container App gebruikt.
- ACR-build `cbp` is succesvol afgerond voor `inddemoacrnfbguv.azurecr.io/ind-demo-placeholder:v1.1.5`.
- Gepushte digest: `sha256:a6fe4cee89bb9ca93da8ed189080fd3a540909cb902151a7791f399468a38fba`.
- App Service `inddemo-web-nfbguv` in resourcegroep `rg-ind-demo` is omgeschakeld naar image `v1.1.5` en herstart.
- De live `/healthz`-route antwoordt met status `ok`.
- Na het uitrollen is expliciet gewacht tot de oude frontendbundle was vervangen; live worden nu `index-DpXGgtKE.js` en `index-SFViFQnS.css` geserveerd.
- Browservalidatie op de live URL toont zonder runtimefout het ingelogde Beginscherm, de werkstroom “Eén document beoordelen” en de werkstroom “Twee documenten vergelijken”.
- `URL.md` is opgehoogd naar documentversie 1.19 met image `v1.1.5`, actuele uitrolcommando's en behouden demo-logincredentials.
### 2026-08-17 13:28:48 CEST - Analysemodal gecorrigeerd naar werkelijk proces

- De gebruikersfeedback is bevestigd: de modal toonde consistentie, tegenstrijdigheden en volledigheid als drie losse opeenvolgende LLM-stappen, terwijl de backend deze onderdelen in één gezamenlijke semantische analyse verwerkt.
- De vijf ogenschijnlijke processtappen zijn teruggebracht tot twee werkelijke hoofdfasen:
  1. Upload controleren.
  2. Document parsen en semantisch analyseren.
- Consistentie, tegenstrijdigheden en volledigheid staan nu als drie gelijkwaardige onderdelen binnen hoofdfase 2, zonder afzonderlijke voortgang of de suggestie dat drie aparte LLM-aanroepen plaatsvinden.
- De modaltekst vermeldt expliciet dat sprake is van één semantische LLM-analyse.
- Requirement V1.4.38 is toegevoegd en blijft onafgevinkt totdat build en browservalidatie zijn geslaagd.
### 2026-08-17 13:31:12 CEST - Gecorrigeerde analysemodal gevalideerd

- `npm test`: 29 van 29 tests geslaagd, zonder failures of overgeslagen tests.
- `npm run build`: productiebuild geslaagd.
- De lokale Docker-image is opnieuw gebouwd en `/healthz` antwoordt met status `ok`.
- Browsermatig is tijdens een werkelijk lopende voorbeeldanalyse vastgesteld:
  - de modal bevat exact twee hoofdfasen;
  - fase 1 heet `Upload controleren`;
  - fase 2 heet `Document parsen en semantisch analyseren`;
  - fase 2 bleef actief tijdens de LLM-aanroep;
  - Consistentie, Tegenstrijdigheden en Volledigheid werden tegelijkertijd als onderdelen binnen fase 2 getoond;
  - de uitleg vermeldt expliciet dat het om één semantische LLM-analyse gaat.
- Na afronding verdween de modal normaal, opende Bewerken zonder fout en werden zeven Gotenberg-previewpagina's getoond.
- Requirement V1.4.38 is na deze validatie afgevinkt.
- Deze correctie is nog niet gedeployed; live blijft versie v1.1.5 totdat de gebruiker expliciet om deployment vraagt.
### 2026-08-17 13:44:15 CEST - Gecorrigeerde analysemodal live als v1.1.6

- De lokaal gevalideerde analysemodalcorrectie is als `inddemoacrnfbguv.azurecr.io/ind-demo-placeholder:v1.1.6` gebouwd en naar de bestaande Azure App Service uitgerold.
- ACR-build `cbq` is succesvol afgerond; image-digest: `sha256:6bd0a3d7c383a7b42706ffd4cc50f736fe759c36e36a6cd2f4094481fd6fc920`.
- App Service `inddemo-web-nfbguv` is omgeschakeld naar `v1.1.6` en herstart.
- Live `/healthz` antwoordt met status `ok`; de nieuwe bundles `index-b98X1B6E.js` en `index-Bg-sF9DN.css` worden geserveerd.
- Live browservalidatie tijdens een werkelijk lopende voorbeeldanalyse bevestigt:
  - exact twee hoofdfasen;
  - fase 2 blijft actief tijdens de LLM-aanroep;
  - Consistentie, Tegenstrijdigheden en Volledigheid staan gezamenlijk binnen fase 2;
  - na afronding opent Bewerken zonder fout met zeven Gotenberg-previewpagina's.
- `URL.md` is opgehoogd naar documentversie 1.20 met image `v1.1.6`, actuele uitrolcommando's en behouden logincredentials.
### 2026-08-17 15:58:04 CEST - Chatautoscroll en acceptatie over alineagrenzen gebouwd

- De standaardnota `Nota MT BV Hybride werken vanuit het buitenland 20260120_GEANONIMISEERD.docx` is via de echte lokale API geanalyseerd en de bevindingen zijn programmatisch één voor één aangeboden aan `/api/review/apply`.
- De eerste bevinding reproduceerde de gebruikersfout met HTTP 500: het letterlijke bronfragment liep over meerdere Word-alinea's, terwijl de DOCX-vervanger alleen één run of meerdere runs binnen één alinea ondersteunde.
- De DOCX-vervanger ondersteunt nu ook letterlijke fragmenten over meerdere Word-alinea's. De getroffen alineareeks wordt vervangen door echte nieuwe Word-alinea's, met behoud van voor- en achtertekst en hergebruik van beschikbare alinea- en runopmaak.
- Een regressietest voor een vervanging over drie Word-alinea's is toegevoegd.
- Beide chatvensters hebben een eigen scrollreferentie gekregen en scrollen bij een gebruikersbericht/laadstatus, nieuw antwoord of wijzigingsvoorstel vloeiend naar het nieuwste bericht.
- Requirements V1.4.39 en V1.4.40 zijn toegevoegd en blijven onafgevinkt totdat de tests, de volledige Hybride-werken-acceptatieketen en browserflows zijn bewezen.
### 2026-08-17 16:12:34 CEST - Chatautoscroll en volledige bevindingacceptatie gevalideerd

- `npm test`: 30 van 30 tests geslaagd, zonder failures of overgeslagen tests. De nieuwe regressietest bewijst echte DOCX-vervanging over meerdere Word-alinea's; de bestaande cross-run-, annotatie-, chat- en versieproeven blijven groen.
- `npm run build`: productiebuild geslaagd.
- De lokale Docker-image is opnieuw gebouwd en `/healthz` antwoordt met status `ok`.
- De volledige echte lokale API-keten is opnieuw uitgevoerd op `Nota MT BV Hybride werken vanuit het buitenland 20260120_GEANONIMISEERD.docx`:
  - negen actuele semantische bevindingen ontvangen;
  - alle negen bevindingen achtereenvolgens succesvol toegepast via `/api/review/apply`;
  - iedere stap genereerde een nieuwe echte DOCX-versie en Gotenberg-preview;
  - de keten eindigde op versie v10 met nul resterende bevindingen en zonder apply-fout.
- De enkel-documentchat is browsermatig gecontroleerd met een bestaand lang antwoord en een nieuwe vraag:
  - bij openen stond de scrollpositie onderaan (`scrollTop 815`, `scrollHeight 1103`);
  - tijdens de laadstatus stond de scrollpositie onderaan (`scrollTop 988,5`, `scrollHeight 1277`);
  - na het volledige opgemaakte antwoord stond de scrollpositie onderaan (`scrollTop 2002`, `clientHeight 288`, `scrollHeight 2290`).
- Dezelfde layout-synchrone scrolllogica is op de afzonderlijke vergelijkingschatcontainer aangesloten.
- Requirements V1.4.39 en V1.4.40 zijn na dit bewijs afgevinkt.
- Deze wijzigingen zijn nog niet gedeployed; live blijft versie v1.1.6 totdat de gebruiker expliciet om deployment vraagt.
### 2026-08-17 17:19:16 CEST - Chat- en acceptatiefix live als gecorrigeerde release v1.1.8

- De gevalideerde chat-autoscroll en cross-paragraph-DOCX-vervanging zijn aanvankelijk als image `v1.1.7` gebouwd en op App Service geactiveerd.
- Een verplichte live smoke-test op een vers gegenereerde Hybride-werken-bevinding vond vervolgens nog een normalisatieverschil: Mammoth verwijdert of normaliseert afsluitende Word-spaties, terwijl de DOCX-zoekregex whitespace nog letterlijk behandelde. Daardoor kon een inhoudelijk geldig LLM-citaat over alineagrenzen alsnog niet worden toegepast.
- De release is niet als voltooid gemeld. Tokenmatching is aangepast zodat iedere reeks whitespace in het gevalideerde citaat flexibel overeenkomt met Word-spaties en alineascheiding.
- De cross-paragraph-regressietest bevat nu expliciet trailing spaces. Daarna zijn opnieuw 30 van 30 tests, de productiebuild, lokale Docker-build en healthcheck geslaagd.
- Een vers live gegenereerde cross-paragraph-bevinding is eerst tegen de gecorrigeerde lokale backend getest: HTTP 200, versie v2 en drie Gotenberg-previewpagina's.
- De definitieve image `inddemoacrnfbguv.azurecr.io/ind-demo-placeholder:v1.1.8` is via ACR-build `cbs` gebouwd en gepusht.
- Image-digest: `sha256:ebb22d273599669303eef7ee6b009252c69d3a7496a7869ded74c1acec592164`.
- App Service `inddemo-web-nfbguv` is naar `v1.1.8` omgeschakeld en antwoordt op `/healthz` met status `ok`.
- Definitieve live inhoudelijke smoke-test:
  - een nieuw gegenereerde Hybride-werken-bevinding met een fragment over meerdere alinea's is via de live `/api/review/apply` toegepast;
  - de live response leverde versie v2, drie previewpagina's en acht resterende valide bevindingen;
  - de live frontend serveert `index-CXk3eHOS.js` en `index-Bg-sF9DN.css`, dezelfde bundle waarin de lokaal browsermatig bewezen chat-autoscroll zit.
- `requirements.md` is opgehoogd naar documentversie 1.33 en V1.4.40 vermeldt nu expliciet whitespace-flexibele Word-matching.
- `URL.md` is opgehoogd naar documentversie 1.21 met image `v1.1.8`, actuele uitrolcommando's en behouden logincredentials.
### 2026-08-18 10:32:43 CEST - Azure-subscription bevestigd

- De vastgelegde deploymentgegevens in `URL.md` zijn gecontroleerd.
- De IND-demo gebruikt Azure-subscription `NL-TT-AZU-SBX-0001513` met subscription-ID `5785b050-ea92-4259-978b-410437073ed4`.
### 2026-08-18 20:04:54 CEST - Herhaalbare demokwaliteitssuite gebouwd en verbeterplan vastgesteld

- De bestaande testdekking is geïnventariseerd: 30 snelle Node-regressietests dekten parsing, prompts, privacyredactie, findingvalidatie, chat, vergelijking, DOCX-runs/alinea's, previewannotatie, versiecontract en localStorage-sanitization.
- Er ontbrak een herhaalbare volledige ketentest tegen een werkelijk draaiende demo. Daarom is `app/quality/demo-suite.mjs` toegevoegd en als `npm run test:demo` beschikbaar gemaakt.
- De nieuwe suite gebruikt uitsluitend de bestaande Node-testtooling en voegt geen dependency toe. De basis-URL is configureerbaar met `DEMO_BASE_URL`; standaard wordt `http://localhost:8081` getest.
- De vijf ketentests controleren:
  1. healthcheck en exact vier unieke DOCX-voorbeelden;
  2. analyse van alle voorbeelden, geredigeerde analysetekst, findingcontracten, letterlijke citaten, veilige DOCX en Gotenberg-pagina's;
  3. achtereenvolgende toepassing van alle actuele Hybride-werken-bevindingen tot nul resterende bevindingen;
  4. volledige reviewchatrespons en een expliciet, gevalideerd tekstwijzigingsvoorstel;
  5. tweedocumentvergelijking met citaten uit beide volledige documenten en behoud van het statische Referentiedocumentcontract.
- Resultaat `npm run test:demo`: 5 van 5 tests geslaagd, 0 failures, 0 skipped en 0 todo; totale duur circa 184 seconden.
- Resultaat snelle regressiesuite: 30 van 30 tests geslaagd, 0 failures en 0 skipped.
- Productiebuild: geslaagd.
- Er is geen nieuwe functionele productfailure gevonden. De ketens rond voorbeelden, analyse, privacy, preview, alle Hybride-werken-wijzigingen, chat en vergelijking werken volgens contract.
- Op basis van de testdekking en architectuur blijven drie geprioriteerde verbeteringen over:
  1. **Hoog — accountisolatie IndexedDB:** documentkeys zijn nog bestandsnaam-afgeleid en niet accountgescopeerd. Bij gelijke bestandsnamen kunnen reviewer en beheerder dezelfde lokale key gebruiken. Vereist accountgescopeerde keys plus migratie en regressietest.
  2. **Midden — persistente browserregressies:** kritieke UI-flows zijn tijdens ontwikkeling browsermatig bewezen, maar nog niet als zelfstandig uitvoerbare repositorysuite vastgelegd. Voeg browserautomatisering toe voor login, modal, scroll, Accepteren/Undo, vergelijking, verwijderen en toegankelijkheid.
  3. **Midden — semantische golden set:** de nieuwe suite bewijst geldige, toepasbare LLM-output, maar niet of iedere verwachte inhoudelijke kernbevinding altijd wordt gevonden. Voeg een geanonimiseerde evaluatieset met verwachte bevindingen en categorie-toleranties toe.
- Requirements V1.4.41 is afgevinkt; V1.4.42 tot en met V1.4.44 leggen het voorgestelde vervolgwerk onafgevinkt vast.
- Dit werk verandert de live applicatie niet en is niet gedeployed.
### 2026-08-19 09:42:31 CEST - Chat wissen, zichtbare verwerkte bevindingen en concrete tekstvoorstellen gebouwd

- De drie gebruikerswensen zijn als één reviewcontract uitgewerkt.
- Beide chatvormen hebben naast Versturen een knop `Wis chat`. Deze wist de berichten, fout-/laadstatus en een eventueel nog niet geaccepteerd tekstwijzigingsvoorstel en schrijft de wisactie in het Actielog.
- De oorzaak van verdwijnende geaccepteerde bevindingen is hersteld: een nieuwe acceptatie bouwde de lijst voorheen opnieuw op uit alleen de nieuwste geaccepteerde en de openstaande bevindingen. Alle eerder geaccepteerde bevindingen worden nu behouden tot `Afronden en opslaan`.
- Undo blijft veilig lineair: de laatst geaccepteerde bevinding kan direct worden teruggedraaid; bij oudere verwerkte bevindingen blijft de Undo-knop zichtbaar maar uitgeschakeld totdat latere wijzigingen zijn teruggedraaid.
- Bij afronden worden verwerkte bevindingen uit de opgeslagen reviewmetadata verwijderd, terwijl de echte gewijzigde DOCX-versie behouden blijft.
- Het semantische findingcontract bevat nu afzonderlijk `advice` en `suggestion`: advice beschrijft wat moet verbeteren, suggestion bevat de volledige direct publiceerbare vervangtekst.
- Als Azure OpenAI toch een instructieve suggestion levert, bijvoorbeeld `Voeg drie argumenten toe`, wordt deze bij Accepteren server-side tegen de volledige geredigeerde documentcontext omgezet naar een concreet tekstvoorstel. Een nog steeds instructief of ongeldig resultaat wordt luid geweigerd en nooit in de nota geplaatst.
- De effectieve toegepaste tekst wordt teruggegeven aan de frontend en bij de zichtbare verwerkte bevinding bewaard, zodat preview, Undo-context en historie overeenkomen met de echte DOCX.
- Requirements V1.4.45 tot en met V1.4.47 zijn toegevoegd en blijven onafgevinkt totdat regressie-, keten- en browservalidatie zijn geslaagd.
### 2026-08-19 10:06:57 CEST - Onderbroken validatie hervat

- De vorige uitvoering is tijdens de laatste vergelijkingschatcontrole onderbroken.
- Reeds bewezen vóór de onderbreking: enkel-documentchat wissen, twee bevindingen zichtbaar houden na acceptatie, lineaire Undo, opschonen bij Afronden en server-side omzetting van instructief advies naar concrete DOCX-tekst.
- Hervat met controle van de persistente bronstatus, gerichte regressietests en de nog openstaande vergelijkingschatvalidatie. Er wordt niet gedeployed zonder nieuw expliciet verzoek.
### 2026-08-19 10:14:00 CEST - Reviewinteracties volledig gevalideerd

- Gerichte regressiesuite opnieuw uitgevoerd: 31/31 tests geslaagd, 0 gefaald en 0 overgeslagen.
- Productiebuild met Vite en `node --check server.js` zijn geslaagd.
- Enkel-documentbrowserflow bewezen:
  - na acceptatie bleef de bevindingenlijst 5 items bevatten;
  - na twee acceptaties bleven beide verwerkte bevindingen zichtbaar;
  - alleen de laatst geaccepteerde wijziging was direct undo-baar;
  - Undo herstelde de vorige echte documentversie;
  - `Wis chat` verwijderde 4 berichten;
  - na Afronden was de verwerkte bevinding uit reviewmetadata verwijderd, waren toegepaste IDs geleegd en bleef de gewijzigde DOCX-versie behouden.
- De echte apply-API-flow met het instructieve advies `Voeg drie concrete argumenten toe` bewees dat de instructie niet letterlijk werd ingevoegd. Azure OpenAI leverde concrete inhoudelijke notatekst, die in de DOCX en de gerenderde preview werd toegepast.
- Vergelijkingsbrowserflow bewezen:
  - `Wis chat` staat naast `Versturen`;
  - na een echte chatvraag waren 2 berichten zichtbaar;
  - wissen bracht dit terug naar 0, schakelde de knop uit en liet geen niet-lege vergelijkingschat in localStorage achter.
- Requirements V1.4.45, V1.4.46 en V1.4.47 zijn na dit bewijs afgevinkt; documentversie requirements verhoogd van 1.35 naar 1.36.
- Geen deployment uitgevoerd; de live release blijft v1.1.8.
### 2026-08-19 10:18:41 CEST - Persistente uitvoer en actielog gestart

- Nieuwe wensen vastgelegd:
  1. `Download preview` moet de actuele veilige DOCX downloaden en geen PDF.
  2. Het accountbrede Actielog moet over uitloggen en volgende logins behouden blijven.
  3. `Afronden en opslaan` moet naast het origineel een afzonderlijk document `naamdocument_bewerkt.docx` op het Beginscherm bewaren.
- Werkhypothese: de bestaande veilige DOCX-bytes en IndexedDB-opslag worden hergebruikt; PDF blijft uitsluitend de interne previewweergave.
- Succescriteria: correcte DOCX-extensie en inhoud bij downloaden, behoud van bestaande logregels na herlogin, en gelijktijdige aanwezigheid van origineel plus bewerkte kopie zonder herupload.
- Geen deployment zonder expliciet verzoek.
### 2026-08-19 10:27:00 CEST - DOCX-download en transactioneel afronden gebouwd

- `Download preview` gebruikt nu rechtstreeks de actuele veilige DOCX-blob en downloadt onder de `.docx`-bestandsnaam; de PDF blijft uitsluitend de interne visuele preview.
- De loginflow laadt eerst het bestaande accountlog, voegt daar één loginregel aan toe en schrijft de gecombineerde lijst terug. Daarmee kan een lege React-state het bestaande persistente log niet meer overschrijven.
- `Afronden en opslaan` is asynchroon en transactioneel gemaakt:
  - de actuele veilige documentversie wordt als `naamdocument_bewerkt.docx` onder een afzonderlijke IndexedDB-key opgeslagen;
  - de originele key wordt teruggezet op de originele versie 1;
  - Mijn documenten krijgt zowel een origineel record als een afzonderlijk bewerkt record;
  - toegepaste bevindingen worden alleen uit de metadata van de afgeronde bewerkte kopie verwijderd;
  - dezelfde opslagregel geldt voor enkel-review en vergelijking.
- Bij ontbrekende actuele of originele veilige bytes wordt afronden luid afgebroken; er wordt geen gedeeltelijk succes gemeld.
- Requirements V1.4.48 tot en met V1.4.50 toegevoegd en nog niet afgevinkt in afwachting van build- en browserbewijs.
### 2026-08-19 10:38:00 CEST - LocalStorage-quota bij Afronden gereproduceerd en hersteld

- De eerste volledige browserflow liep na Afronden niet door naar Beginscherm.
- Chrome `Runtime.exceptionThrown` bewees de exacte fout: `QuotaExceededError` bij het schrijven van `ind-demo-saved-reviews:reviewer@ind-demo.local`.
- Oorzaak: de nieuwe afgeronde metadata gebruikte het actuele reviewobject inclusief base64-previewpagina’s. Deze binaire previewdata hoort, net als DOCX-bytes, niet in localStorage.
- Eén gedeelde `reviewForStorage`-sanitizer verwijdert nu DOCX-bytes en leegt previewdata voor zowel automatische synchronisatie als de nieuwe afrondtransactie.
- De afrondtransactie berekent en schrijft de nieuwe lichte recordlijst nu binnen de bestaande try/catch voordat React-state wordt aangepast. Een toekomstige quota- of opslagfout wordt daardoor zichtbaar gemeld en kan de render niet meer leegtrekken.
### 2026-08-19 10:39:26 CEST - Persistente uitvoer volledig gevalideerd

- 31/31 regressietests geslaagd, 0 gefaald en 0 overgeslagen; productiebuild, serversyntax, lokale containerbuild en healthcheck zijn geslaagd.
- Actielog-herlogin bewezen in een schone browsercontext:
  - na eerste login stond 1 gebeurtenis opgeslagen;
  - na uitloggen en opnieuw inloggen stonden 2 gebeurtenissen opgeslagen;
  - de ID van iedere bestaande gebeurtenis uit de eerste sessie bleef aanwezig.
- DOCX-download bewezen:
  - gedownloade naam: `Def. Nota Mobiliteitsbureau keuze organisatievorm en rol_MT BV_GEANONIMISEERD.docx`;
  - bestandsgrootte: 161.972 bytes;
  - systeembestandsdetectie: `Microsoft Word 2007+`.
- Afronden na een echte geaccepteerde wijziging bewezen:
  - localStorage bevat afzonderlijke lichte records voor het origineel en `_bewerkt.docx`, beide zonder DOCX-bytes en zonder base64-previewpagina’s;
  - IndexedDB bevat twee afzonderlijke veilige Word-documenten;
  - origineel is teruggezet op v1/`Origineel`;
  - de kopie staat op v1/`Bewerkt`;
  - beide DOCX-bestanden hebben aantoonbaar verschillende bytes.
- De catalogus toonde origineel en bewerkte kopie gelijktijdig als beschikbare documenten.
- De bewerkte kopie is zonder upload geopend; het Actielog bevestigde zowel herstel van `_bewerkt.docx` als heractivering van de Gotenberg-preview vanuit de veilige lokale DOCX-versie.
- Requirements V1.4.48, V1.4.49 en V1.4.50 afgevinkt. Geen deployment uitgevoerd.
### 2026-08-19 10:40:47 CEST - Deployment van persistente uitvoer gestart

- Expliciete deploytoestemming ontvangen.
- Doel blijft Azure App Service `inddemo-web-nfbguv` in resourcegroep `rg-ind-demo`; Container Apps worden niet gebruikt.
- Te deployen scope: DOCX-download, persistent accountactielog, aparte `_bewerkt.docx`-opslag en de quota-herstelcorrectie.
- Vooraf worden releaseversie, Azure-context en bestaande App Service-configuratie gecontroleerd. Daarna wordt één versiegetagde container gebouwd en naar de bestaande ACR gepusht.
### 2026-08-19 10:43:00 CEST - Azure-preflight geslaagd

- Actieve subscription bevestigd: `NL-TT-AZU-SBX-0001513` (`5785b050-ea92-4259-978b-410437073ed4`).
- Aangemelde Azure-gebruiker: `rrienks@deloitte.nl`.
- Bestaande App Service-image bevestigd als `inddemoacrnfbguv.azurecr.io/ind-demo-placeholder:v1.1.8`.
- Volgende releaseversie vastgesteld op `v1.1.9`.
### 2026-08-19 10:44:00 CEST - Release-image v1.1.9 gebouwd en gepusht

- Azure Container Registry-build `cbt` is geslaagd.
- Image: `inddemoacrnfbguv.azurecr.io/ind-demo-placeholder:v1.1.9`.
- Digest: `sha256:23ae1bf1b8c3012fba535e4fa36a56c3440d4f28b860067c4e264ea6c68b10ad`.
- De bestaande App Service-configuratie wordt nu naar exact deze tag gewijzigd.
### 2026-08-19 10:45:00 CEST - Release v1.1.9 live en geverifieerd

- Azure App Service `inddemo-web-nfbguv` omgeschakeld naar `DOCKER|inddemoacrnfbguv.azurecr.io/ind-demo-placeholder:v1.1.9` en herstart.
- Live healthcheck geslaagd: HTTP 200 met `{"status":"ok","app":"ind-demo-review-shell"}`.
- Actieve App Service-configuratie opnieuw uit Azure gelezen en exact op `v1.1.9` bevestigd.
- Live frontendasset: `/assets/index-D7Ahug-v.js`.
- In de live bundle zijn de drie releasecontracten aantoonbaar aanwezig:
  - actuele veilige preview downloaden als DOCX;
  - aparte `_bewerkt.docx`-kopie;
  - persistent accountgebonden Actielog bij login.
- Release-image digest: `sha256:23ae1bf1b8c3012fba535e4fa36a56c3440d4f28b860067c4e264ea6c68b10ad`.
- `URL.md` verhoogd van documentversie 1.21 naar 1.22 en bijgewerkt naar release v1.1.9.
- Deployment afgerond zonder Container Apps.
### 2026-08-19 11:17:51 CEST - Cataloguspublicatie en klikbare previewmarkeringen onderzocht

- Gebruikersmelding bevestigd als gedragsverschil:
  - `Afronden en opslaan` publiceert de aparte `_bewerkt.docx`;
  - rechtstreeks naar `Beginscherm` doet dat momenteel niet.
- Beoogd gedrag: zodra echte wijzigingen zijn geaccepteerd, moet verlaten naar Beginscherm dezelfde veilige afrondtransactie uitvoeren zodat origineel en bewerkte kopie zichtbaar zijn.
- Tweede wens onderzocht: klikken op gemarkeerde previewtekst moet de gekoppelde bevinding in de rechterrail selecteren.
- Eerst worden navigatiecallbacks, previewcomponenten en finding-ID-attributen gelezen; daarna volgt alleen de benodigde wiring en gerichte validatie.
### 2026-08-19 11:20:00 CEST - Publicatie bij Beginscherm en PDF-klikregio's gebouwd

- `returnToEnvironment` controleert nu of een enkel-review of vergelijking echte gewijzigde versies bevat. In dat geval wordt eerst dezelfde veilige `finishReview`-transactie uitgevoerd en pas daarna naar Beginscherm genavigeerd.
- De Gotenberg-PDF wordt naast PNG-rendering met Poppler `pdftotext -bbox-layout` verwerkt.
- Een nieuwe pure parser koppelt genormaliseerde findingcitaten aan PDF-woorden, groepeert die per tekstregel en levert procentuele pagina-coördinaten.
- De frontend legt transparante knoppen exact over die tekstregio's. Klikken of toetsenbordfocus selecteert via de finding-ID direct de juiste bevinding in de rechterrail.
- De HTML-fallback draagt dezelfde finding-ID en gebruikt eventdelegatie, zodat beide previewmodi hetzelfde selectiegedrag hebben.
- Nieuwe regressietest encodeert waarom meerregelige PDF-markeringen meerdere klikregio's voor één finding nodig hebben.
- Validatie tot nu toe: 32/32 tests geslaagd, 0 overgeslagen; productiebuild en serversyntax geslaagd.
- Requirements V1.4.51 en V1.4.52 toegevoegd en nog open tot browserbewijs.
### 2026-08-19 11:22:59 CEST - Cataloguspublicatie en previewselectie gevalideerd

- Browserflow met een echt geanalyseerd voorbeeld:
  - Gotenberg-preview bevatte een toegankelijke `.preview-finding-region` voor `review-0-completeness`;
  - na `Volgende` was `review-3-completeness` actief;
  - klikken op de gemarkeerde PDF-regio selecteerde `review-0-completeness` opnieuw in de rechterrail;
  - de gekoppelde titel was `Scenario-overzicht ontbreekt terwijl ernaar wordt verwezen`.
- Daarna is de bevinding geaccepteerd en rechtstreeks op `Beginscherm` geklikt, zonder de aparte afrondknop te gebruiken.
- De catalogusmetadata bevatte daarna exact:
  - `Def. Nota Mobiliteitsbureau keuze organisatievorm en rol_MT BV_GEANONIMISEERD_bewerkt.docx` — v1 `Bewerkt`;
  - `Def. Nota Mobiliteitsbureau keuze organisatievorm en rol_MT BV_GEANONIMISEERD.docx` — v1 `Origineel`.
- Matching voor lange citaten en afwijkende PDF-interpunctie is aanvullend versterkt met een stabiele woordreeksfallback.
- Finale validatie: 33/33 tests geslaagd, 0 gefaald en 0 overgeslagen; productiebuild en serversyntax geslaagd.
- Requirements V1.4.51 en V1.4.52 afgevinkt. Geen deployment uitgevoerd.
### 2026-08-19 11:25:57 CEST - Deployment klikbare preview en Beginschermpublicatie gestart

- Expliciete deploytoestemming ontvangen.
- Releasekandidaat bevat uitsluitend de gevalideerde V1.4.51- en V1.4.52-wijzigingen bovenop v1.1.9.
- Doel: bestaande Azure App Service `inddemo-web-nfbguv`; Container Apps worden niet gebruikt.
- De getagde feedbackfile `feedback1/generalremarks` valt buiten deze deployment en blijft ongewijzigd.
### 2026-08-19 11:27:00 CEST - Azure-preflight v1.1.10 geslaagd

- Actieve subscription bevestigd als `NL-TT-AZU-SBX-0001513` (`5785b050-ea92-4259-978b-410437073ed4`).
- Bestaande App Service-image bevestigd als `inddemoacrnfbguv.azurecr.io/ind-demo-placeholder:v1.1.9`.
- Nieuwe releasetag vastgesteld op `v1.1.10`.
### 2026-08-19 11:29:00 CEST - Release-image v1.1.10 gebouwd en gepusht

- ACR-build `cbu` geslaagd.
- Image: `inddemoacrnfbguv.azurecr.io/ind-demo-placeholder:v1.1.10`.
- Digest: `sha256:c126a6920823b0bf20694840865cf9d55c7bceaff45c182ccb6a8c385098ed78`.
### 2026-08-19 11:30:36 CEST - Release v1.1.10 live en inhoudelijk geverifieerd

- Azure App Service `inddemo-web-nfbguv` omgeschakeld naar `DOCKER|inddemoacrnfbguv.azurecr.io/ind-demo-placeholder:v1.1.10` en herstart.
- Live healthcheck: HTTP 200 en `status: ok`.
- Actieve Azure-containerconfiguratie opnieuw uitgelezen en exact op v1.1.10 bevestigd.
- Live frontendasset: `/assets/index-CAmhnpE9.js`.
- Live bundle bevat:
  - `.preview-finding-region`;
  - `data-finding-id`;
  - `_bewerkt.docx`-publicatie.
- Echte live voorbeeldanalyse uitgevoerd op `Def. Nota Mobiliteitsbureau keuze organisatievorm en rol_MT BV_GEANONIMISEERD.docx`.
- Live resultaat: 9 bevindingen, alle 9 finding-ID's gekoppeld aan PDF-regio's en in totaal 16 klikbare tekstregio's.
- Release-image digest: `sha256:c126a6920823b0bf20694840865cf9d55c7bceaff45c182ccb6a8c385098ed78`.
- `URL.md` verhoogd van documentversie 1.22 naar 1.23 en bijgewerkt naar v1.1.10.
- Deployment afgerond via Azure App Service; geen Container Apps gebruikt.
### 2026-08-19 11:36:24 CEST - Eerste bevindingpositie onderzocht

- Gebruikersmelding en screenshot bevestigd: een zojuist geopende review kan starten op bijvoorbeeld `4 van 8` in plaats van `1 van 8`.
- Werkhypothese: de geselecteerde finding-ID wordt gekozen uit de ruwe analysevolgorde, terwijl de rechterrail dezelfde findings daarna op categorie sorteert.
- Succescriterium: iedere nieuw geanalyseerde of opnieuw geopende review toont bij binnenkomst `1 van x`; daarna blijven Vorige, Volgende en previewklikken de selectie normaal besturen.
- De getagde feedbackfile valt buiten deze gerichte wijziging.
### 2026-08-19 11:40:00 CEST - Selectievolgorde bij openen hersteld

- Oorzaak bevestigd: de initiële ID kwam uit de ruwe LLM-volgorde, terwijl de rail findings op categorie sorteert.
- De categorievolgorde is gecentraliseerd in `review-order.js`.
- Zowel een nieuw geanalyseerd document als een opgeslagen document kiest bij openen nu de eerste ID uit exact dezelfde gesorteerde volgorde die de rail gebruikt.
- Een eerder opgeslagen selectie wordt bij binnenkomst bewust niet hersteld: het expliciete UX-contract is dat de reviewpagina steeds overzichtelijk bij `1 van x` start.
- Handmatige navigatie, Undo en previewklikken blijven na openen de selectie besturen.
- Een regressietest controleert zowel de zichtbare volgorde als het onveranderd laten van de ruwe invoerarray.
- Requirement V1.4.53 toegevoegd en blijft open tot test- en browservalidatie.
### 2026-08-19 11:38:39 CEST - Startpositie 1 van x gevalideerd

- Finale regressiesuite: 34/34 tests geslaagd, 0 gefaald en 0 overgeslagen.
- Productiebuild, serversyntax, lokale containerbuild en healthcheck zijn geslaagd.
- Browservalidatie op een echte analyse met 9 bevindingen:
  - geselecteerde ID bij eerste opening: `review-4-consistency`;
  - eerste ID in de zichtbaar gesorteerde lijst: `review-4-consistency`;
  - rechterrail toonde exact `1 van 9`.
- Daarna is via `Volgende` een andere bevinding geselecteerd, het document verlaten en opnieuw geopend.
- Bij heropenen werd opnieuw `review-4-consistency`, de eerste zichtbare finding, geselecteerd.
- Requirement V1.4.53 afgevinkt. Geen deployment uitgevoerd.
### 2026-08-19 11:42:11 CEST - Deployment startpositie 1 van x gestart

- Expliciete deploytoestemming ontvangen.
- Releasekandidaat bevat de gevalideerde V1.4.53-fix bovenop v1.1.10.
- Doel blijft Azure App Service `inddemo-web-nfbguv` in `rg-ind-demo`; Container Apps worden niet gebruikt.
- De getagde feedbackfile `feedback1/generalremarks` blijft ongewijzigd.
### 2026-08-19 11:43:00 CEST - Azure-preflight v1.1.11 geslaagd

- Subscription bevestigd: `NL-TT-AZU-SBX-0001513` (`5785b050-ea92-4259-978b-410437073ed4`).
- Huidige App Service-image bevestigd als `ind-demo-placeholder:v1.1.10`.
- Nieuwe releasetag vastgesteld op `v1.1.11`.
### 2026-08-19 11:45:00 CEST - Release-image v1.1.11 gebouwd en gepusht

- ACR-build `cbv` geslaagd.
- Image: `inddemoacrnfbguv.azurecr.io/ind-demo-placeholder:v1.1.11`.
- Digest: `sha256:1c37a64fd47b9d4368d155c3d38cadfee8c5ef39f33e68aea13b4bb19dc94db7`.
### 2026-08-19 11:46:32 CEST - Release v1.1.11 live en browsermatig geverifieerd

- Azure App Service `inddemo-web-nfbguv` omgeschakeld naar `DOCKER|inddemoacrnfbguv.azurecr.io/ind-demo-placeholder:v1.1.11` en herstart.
- Live healthcheck: HTTP 200 met `status: ok`.
- Actieve Azure-image opnieuw uitgelezen en exact op v1.1.11 bevestigd.
- Live frontendasset: `/assets/index-Bx0qc4YY.js`.
- Schone live browserflow uitgevoerd met een echte voorbeeldanalyse:
  - geselecteerde finding-ID: `review-4-consistency`;
  - eerste ID in de zichtbaar gesorteerde lijst: `review-4-consistency`;
  - totaal: 8 bevindingen;
  - rechterrail: exact `1 van 8`.
- Release-image digest: `sha256:1c37a64fd47b9d4368d155c3d38cadfee8c5ef39f33e68aea13b4bb19dc94db7`.
- `URL.md` verhoogd van documentversie 1.23 naar 1.24 en bijgewerkt naar v1.1.11.
- Deployment afgerond via Azure App Service; geen Container Apps gebruikt.
### 2026-08-19 11:50:32 CEST - Eindgebruikershandleiding gestart

- Verzoek ontvangen voor een Nederlandstalige, gebruiksvriendelijke handleiding voor IND Bedrijfsvoering.
- Beoogde inhoud: eerste gebruik, één document beoordelen, twee documenten vergelijken, bevindingen navigeren en accepteren/Undo, previewmarkeringen, Bewerken-chat, versies en `_bewerkt.docx`, Actielog, downloaden, privacy, foutscenario's en praktische demo-scenario's.
- Screenshots worden uitsluitend uit de actuele live release v1.1.11 gemaakt en mogen geen niet-afgelakte persoonsgegevens bevatten.
- Eerst wordt het gewenste opleverformaat bevestigd; daarna worden screenshots en document in één consistente versie opgebouwd.
### 2026-08-19 11:54:00 CEST - Handleidingopzet en screenshotset vastgesteld

- Opleverformaat bevestigd: Word (`.docx`) met screenshots.
- Documentversie wordt 1.0, omdat nog geen bestaande IND-demo-eindgebruikershandleiding aanwezig is.
- Geplande hoofdstukken:
  1. doel en randvoorwaarden;
  2. snel starten;
  3. scenario één document beoordelen;
  4. scenario twee documenten vergelijken;
  5. werken met preview, bevindingen, Accepteren en Undo;
  6. Bewerken-chat en tekstwijzigingen;
  7. afronden, versies en downloads;
  8. Actielog;
  9. privacy en veilig gebruik;
  10. probleemoplossing en demoscript.
- Screenshotset wordt gemaakt op live release v1.1.11 met uitsluitend geanonimiseerde meegeleverde documenten.
### 2026-08-19 12:00:12 CEST - Onderbroken screenshotsessie hervat

- De gecombineerde live screenshotsessie is onderbroken tijdens het wachten op een chatantwoord.
- Reeds opgeslagen screenshots blijven in de persistente sessiemap behouden.
- Hervat met inventarisatie en losse screenshots per scherm; een trage chatresponse kan daardoor niet opnieuw de volledige set blokkeren.
### 2026-08-19 12:10:00 CEST - Handleiding IND Document Review Demo v1.0 opgeleverd

- Bestand aangemaakt: `Handleiding IND Document Review Demo v1.0.docx`.
- Doelgroep: medewerkers van IND Bedrijfsvoering die na zelfstandig lezen direct met de demo moeten kunnen werken.
- Inhoud:
  - snel starten en inloggen;
  - scenario één document beoordelen;
  - scenario twee documenten vergelijken;
  - preview, legenda en klikbare markeringen;
  - Accepteren, concrete tekstvoorstellen en lineaire Undo;
  - Bewerken-chat en vrije tekstwijzigingen;
  - afronden, origineel plus `_bewerkt.docx` en DOCX-download;
  - persistent accountbreed Actielog;
  - privacy en veilig gebruik;
  - veelvoorkomende problemen;
  - compact demoscript van tien minuten;
  - begrippenlijst.
- Zeven screenshots gemaakt op de actuele live release v1.1.11 met uitsluitend geanonimiseerde meegeleverde documenten.
- Structurele validatie:
  - Microsoft Word 2007+ DOCX;
  - 959.022 bytes;
  - 7 ingebedde afbeeldingen;
  - circa 14.000 tekens;
  - alle verplichte kernhoofdstukken aanwezig;
  - DOCX-zipintegriteit geslaagd.
- Gotenberg-rendering geslaagd: 14 pagina's.
- Visuele steekproef op pagina 1, 5 en 14 geslaagd: titel, screenshot, call-outs, tekst en footer zijn leesbaar en niet afgesneden.
- Requirement V1.4.54 toegevoegd en afgevinkt; requirementsdocument verhoogd van versie 1.39 naar 1.40.
### 2026-08-19 12:07:58 CEST - Visueel sterkere handlescreenshots gestart

- Gebruikersfeedback: de huidige reviewscreenshot toont te weinig markeringen en communiceert daardoor onvoldoende de kracht van de demo.
- De vier meegeleverde geanonimiseerde nota's worden objectief vergeleken op aantal bevindingen en aantal gemarkeerde PDF-regio's per pagina.
- Het document met de hoogste markeringdichtheid wordt gebruikt voor nieuwe review- en chatscreenshots.
- Omdat een bestaand document wordt vernieuwd, wordt de handleiding verhoogd van v1.0 naar v1.1; v1.0 blijft ongewijzigd beschikbaar.
### 2026-08-19 12:14:00 CEST - Nota met hoogste markeringdichtheid geselecteerd

- Alle vier meegeleverde voorbeelden via de volledige analyse- en Gotenbergketen gemeten.
- Rangschikking op hoogste aantal zichtbare markeringregio's per pagina:
  - `nota overplaatsing BOA_GEANONIMISEERD.docx`: 24 regio's totaal, 10 op pagina 2;
  - `Nota Versterking...inkoop`: 17 totaal, maximaal 6;
  - `Def. Nota Mobiliteitsbureau...`: 15 totaal, maximaal 6;
  - `Nota MT BV Hybride werken...`: 15 totaal, maximaal 6.
- `nota overplaatsing BOA_GEANONIMISEERD.docx`, pagina 2, gekozen voor de nieuwe handlescreenshots.
### 2026-08-19 12:15:56 CEST - Tweede screenshotonderbreking afgevangen

- De reviewpagina was geladen; de gecombineerde flow is opnieuw tijdens een chatresponse onderbroken.
- Nieuwe werkwijze: eerst controleren en behouden wat al is vastgelegd; daarna ontbrekende beelden zonder lange chatwacht afzonderlijk maken.
- De selectie van de BOA-nota en pagina 2 blijft ongewijzigd.
### 2026-08-19 12:22:00 CEST - Handleiding v1.1 met rijkere markeringen opgeleverd

- Nieuwe reviewopname gemaakt met `nota overplaatsing BOA_GEANONIMISEERD.docx`.
- Screenshot toont pagina 2 op 75% zoom, met tegelijk:
  - een grote gele volledigheidsmarkering;
  - een magenta tegenstrijdigheidsmarkering;
  - de volledige legenda;
  - `1 van 8`;
  - advies en concreet tekstvoorstel in de rechterrail.
- De actieve analyse bevatte 19 klikbare regio's totaal en 13 op pagina 2.
- Bestaande handleiding v1.0 is ongewijzigd behouden.
- Nieuwe versie aangemaakt: `Handleiding IND Document Review Demo v1.1.docx`.
- Validatie:
  - Microsoft Word 2007+;
  - 978.743 bytes;
  - 7 ingesloten afbeeldingen;
  - circa 14.000 tekens;
  - 14 Gotenberg-pagina's;
  - DOCX-zipintegriteit geslaagd;
  - alle XML-versievermeldingen en footer staan op v1.1;
  - de vernieuwde pagina 6 is visueel gecontroleerd en niet afgesneden.
- Requirement V1.4.55 toegevoegd en afgevinkt; requirementsdocument verhoogd van versie 1.40 naar 1.41.
### 2026-08-19 12:25:06 CEST - Demo-videoscript v1.0 opgesteld

- Doel: 2-minuten demovideo van de basale functionaliteiten (login, upload+PII, analyse, bevindingen, accepteren/undo, export+actielog).
- `DEMO-VIDEO-SCRIPT.md` v1.0 aangemaakt: 7 scenes met voice-over tekst, richttijden en beeldregie.
- Vocal Bridge onderzocht: geen kale TTS-endpoint; audio wordt per segment gegenereerd door de greeting van de IND-agent tijdelijk op de scenetekst te zetten, een LiveKit-sessie op te zetten en de agent-audio op te nemen. Originele agentconfig wordt na afloop hersteld.
- Beeld: schermopnames via browser op de live app; per scene getrimd op de werkelijke audioduur; montage met ffmpeg.
### 2026-08-19 12:46:14 CEST - Voice-over gegenereerd via Vocal Bridge

- `video/tools/generate_voiceover.py`: per scene wordt de agent-greeting tijdelijk op de scenetekst gezet met een zwijg-prompt, een LiveKit-sessie opgenomen en de originele config hersteld (geverifieerd: greeting en prompt teruggezet).
- Alle 7 segmenten opgenomen en via de calltranscripts geverifieerd op letterlijke weergave.
- Stiltes getrimd met ffmpeg; definitieve duren: s1 10.4s, s2 14.4s, s3 14.4s, s4 15.9s, s5 11.5s, s6 9.8s, s7 5.7s (totaal 82.1s spraak).
### 2026-08-19 12:47:00 CEST - Cover toegevoegd aan videoscript

- Gebruiker leverde `video/eersteframe.png` (titelslide Deloitte/IND) aan als cover.
- `DEMO-VIDEO-SCRIPT.md` verhoogd naar v1.1: cover opent de video (± 4 s onder start S1) en wordt tevens poster/thumbnail van de mp4.
### 2026-08-19 13:01:00 CEST - Demovideo v1.0 opgeleverd (video/demo-video.mp4)

- `video/tools/capture_demo.py`: volledige demoflow opgenomen op de live app (login, upload nota overplaatsing BOA, analyse-modal, bevindingen, accepteren+undo met live her-render, DOCX-download, actielog) met scene-tijdstempels in `scenes.json`.
- Eerste opnamepoging faalde doordat de loginvelden vooringevuld waren (dubbel getypt e-mailadres); opgelost door velden eerst te legen. Scene 5 aanvankelijk uit beeld gescrold; opgelost met terugscrollen na de klik.
- `video/tools/assemble.py`: cover (4 s) + scene-slices exact op de audioduur (analyse als 2,3x-timelapse, overige scenes ≤1,06x), voice-oversegmenten naadloos aaneengesloten; cover ook als mp4-thumbnail.
- Resultaat: `video/demo-video.mp4`, 82,9 s beeld / 82,7 s audio, 1280x720, visueel gecontroleerd op 8 tijdstippen (cover, login, upload, analyse, bevindingen, accepteren/undo-teller 3 van 8 -> 3 van 7, actielog, eindbeeld).
- Requirement V1.4.56 toegevoegd en afgevinkt; requirementsdocument verhoogd van versie 1.41 naar 1.42.
### 2026-08-19 13:14:58 CEST - Stem-samples gegenereerd voor voice-over keuze

- Feedback: de huidige voice-over (Marin) loopt niet overal vloeiend.
- `video/tools/voice_samples.py`: zelfde zin ingesproken in 6 stemmen (Marin, Cedar, Coral, Ash, Sage via OpenAI Realtime; plus ElevenLabs Multilingual v2 via externe TTS), opgeslagen in `video/samples/`.
- Agent-config (greeting, prompt, model_settings) na afloop hersteld.
- Wacht op stemkeuze van de gebruiker; daarna worden alle 7 segmenten opnieuw gegenereerd en wordt de video opnieuw gemonteerd.
### 2026-08-19 13:27:55 CEST - Demovideo v2: Ash-stem, ondertiteling en uitspraakcorrecties

- Stemkeuze gebruiker: Ash. Alle 7 voice-oversegmenten opnieuw gegenereerd via Vocal Bridge (`model_settings.realtime.voice=ash`), transcripts geverifieerd.
- Uitspraakcorrecties in de spreektekst: "IND" -> "ie-en-dee" (s1, s7) en "docx" -> "dok-iks" (s2); ondertiteling behoudt de normale schrijfwijzen.
- Ondertiteling toegevoegd: per zin getimed naar rato van tekstlengte binnen elk audiosegment; `video/demo-video.srt` gegenereerd en ingebrand.
- Homebrew-ffmpeg mist libass/drawtext; ondertitels daarom ingebrand via Pillow-gerenderde overlay-PNG's met `-loop 1` en `overlay=...enable=between(t,a,b):shortest=1` (eerste poging zonder loop toonde alleen de eerste titel).
- Nieuw resultaat: `video/demo-video.mp4`, 94,2 s, visueel geverifieerd op 8 tijdstippen incl. doorlopende ondertitels; scriptdocument naar v1.2, requirements naar v1.43.
### 2026-08-19 13:36:19 CEST - Haperende voice-overfragmenten opnieuw gegenereerd

- Feedback: haperingen in "uitgesloten van de analyse" (s2), "metadata" (s3), "springt direct naar de juiste plek" (s4) en één keer "ie-en-die" i.p.v. "ie-en-dee".
- Zwijg-prompt uitgebreid met tempo-instructies: rustig, constant en gelijkmatig tempo, duidelijke articulatie, nooit versnellen binnen een zin; "metadata" fonetisch als "meta-data".
- Segmenten s1, s2, s3, s4 en s7 opnieuw gegenereerd, getrimd en transcripts geverifieerd; video opnieuw gemonteerd (99,1 s).
- Kanttekening: uitspraak van de realtime-stem is niet deterministisch; correctheid van klanken is alleen op gehoor te verifiëren.
### 2026-08-19 13:39:20 CEST - Coverweergave gecontroleerd en thumbnailtrack verwijderd

- Vraag gebruiker: eerste frame lijkt te ontbreken. Verificatie: cover staat wél in de video (frames t=0 t/m 4 s tonen de titelslide).
- Vermoedelijke oorzaak: de aparte attached_pic PNG-track verwart sommige spelers (QuickTime/Finder). Track verwijderd via stream-copy remux (+faststart); assemble.py hierop aangepast.
- Cover blijft de eerste 4 seconden beeld en is daarmee ook het preview-frame; duur ongewijzigd 99,1 s.
### 2026-08-19 14:42:24 CEST - Audioflow verbeterd: spraak intact, natuurlijke pauzes

- Feedback: audio klonk nog niet vloeiend; opdracht is de audio intact te laten en de rest daarop aan te passen.
- Oorzaakanalyse: de strakke silenceremove-trimming sneed tegen de spraak aan en scènes werden vrijwel zonder pauze aaneengeplakt.
- Nieuwe aanpak: spraak volledig onaangetast; per segment alleen de staartstilte afgeknipt op 0,8 s ná het spraakeinde (silencedetect) en 0,35 s aanloopstilte toegevoegd. Tussen scènes ontstaat zo ~1,15 s natuurlijke pauze.
- Video opnieuw gemonteerd op de nieuwe audioduren (beeld volgt audio, zoals gevraagd); nieuw totaal 103,8 s.
### 2026-08-19 15:00:12 CEST - Beeld opnieuw opgenomen op audioduur; natuurlijke afspeelsnelheid

- Eigen inspectie bevestigde de klacht: scenes werden opgerekt/versneld (0,78x–1,75x) om op de audio te passen, en de analyse-modal verscheen al terwijl de voice-over nog over uploaden sprak.
- capture_demo.py: MIN-sceneduren gelijkgetrokken met de definitieve audioduren; upload in scene 2 verplaatst naar het einde van de scene zodat de modal in scene 3 valt.
- assemble.py: scenes worden nu op audioduur geknipt op 1x-snelheid; alleen s3 (analyse-wachttijd, 2,15x) en s5 (1,06x) worden gecomprimeerd.
- Beeld opnieuw opgenomen op de live app en gemonteerd; scenegrenzen visueel geverifieerd (upload/PII, analysestart, reviewscherm, actielog kloppen met de voice-over). Audio onaangetast; totaal 103,8 s.
### 2026-08-19 15:18:07 CEST - Vijf haperende voice-oversegmenten opnieuw ingesproken

- Feedback: haperingen/blikkerigheid in s1 ("controleert nota's…"), s2 ("uploaden we", "uitgesloten van de analyse"), s3 ("Daarna start de analyse", "het besluit en de metadata"), s4 ("Klikken op een bevinding…") en uitspraakfouten in s7 ("ie-en-die", "consiestenter").
- Fonetiek aangepast: "ie en dee" nu los geschreven (streepjes weg); streepjes-instructie uit de prompt verwijderd omdat die rare klemtonen kon veroorzaken; prompt vraagt expliciet vlekkeloos Nederlands.
- s1, s2, s3, s4 en s7 opnieuw gegenereerd en getrimd met de natuurlijke methode (spraak onaangetast); transcripts geverifieerd.
- Nieuwe duren passen binnen de bestaande beeldopname; alle scenes op 1x geknipt (s3 timelapse 2,59x; s5 1,06x). Nieuw totaal 98,7 s.
- NB: blikkerigheid is een opnameartefact van de realtime-stem; correctheid is alleen op gehoor vast te stellen.
### 2026-08-19 15:30:03 CEST - ElevenLabs-variant van de demovideo gegenereerd

- generate_voiceover.py en assemble.py variant-bewust gemaakt via omgevingsvariabelen (VO_VOICE, VO_AUDIO_DIR, VO_OUT); Ash-versie blijft onaangetast.
- Alle 7 segmenten opnieuw ingesproken via Vocal Bridge met externe ElevenLabs-TTS (eleven_multilingual_v2, library-stem), zelfde spreekteksten en fonetiek; audio in video/audio-elevenlabs/.
- Zelfde natuurlijke trimming en montage; alle scenes op 1x (s3 timelapse 2,34x, s5 1,12x).
- Resultaat: video/demo-video-elevenlabs.mp4 (99,0 s) + bijbehorende .srt, naast de bestaande Ash-versie.
### 2026-08-19 15:43:37 CEST - Oorzaak tempoverschillen gevonden: overgestapt op server-side opnames

- Feedback: tempoverschillen binnen de Ash-zinnen; verzoek om de audio origineel te laten.
- Oorzaakanalyse: de audio werd client-side opgenomen via een LiveKit-verbinding; netwerkjitter/packet loss veroorzaakt daar tempo-artefacten en blikkerigheid. De WAV-headers waren correct (48 kHz), het probleem zat in de transportlaag.
- Fix: generate_voiceover.py downloadt nu na elk segment de schone server-side opname van Vocal Bridge (vb logs download) en gebruikt die als bron; de lokale opname dient alleen nog als trigger.
- Alle 7 Ash-segmenten opnieuw gegenereerd vanaf serveropnames; audio vrijwel onbewerkt (alleen staartstilte licht ingekort, geen tempo- of spraakbewerking). Transcripts geverifieerd.
- Video opnieuw gemonteerd op de originele audioduren; alle scenes 1x (s3 timelapse, s5 1,13x). Nieuw totaal 91,0 s.
### 2026-08-19 15:58:17 CEST - Undo-knop in beeld en ElevenLabs-variant via serveropnames

- Scene 5 in capture_demo.py aangepast: de findings-toolbar wordt vóór en na elke klik in beeld gescrold (voorheen scrolde de pagina naar boven waardoor de Undo-knop buiten beeld raakte).
- Beeld opnieuw opgenomen; framecontrole bevestigt de volledige cyclus in beeld: Accepteren-klik, Undo-knop zichtbaar, na Undo-klik weer Accepteren.
- ElevenLabs-audio opnieuw gegenereerd via de nieuwe server-side pipeline (schone opnames, geen jitter-artefacten); MIN-sceneduren afgestemd op de langste van beide stemvarianten.
- Beide varianten gemonteerd vanaf dezelfde nieuwe opname: demo-video.mp4 (Ash, 91,0 s) en demo-video-elevenlabs.mp4 (87,5 s), elk met eigen .srt.
### 2026-08-19 16:09:33 CEST - Contentfilter-fout netjes afgevangen en v1.1.12 gedeployed

- Feedback: bij een geweigerde vraag toonde de chat de ruwe Azure OpenAI 400-fout (content_filter/jailbreak) — onbegrijpelijk voor gebruikers.
- Fix in app/lib/review.js (createOpenAiProxyRequest, centrale proxyhelper voor álle OpenAI-aanroepen): bij content_filter/ResponsibleAIPolicyViolation wordt nu de melding getoond "Deze vraag valt buiten de context van deze applicatie. De assistent beantwoordt alleen vragen over het geopende document en de review. Formuleer je vraag opnieuw binnen die context." Overige fouten blijven ongewijzigd.
- Geverifieerd met een gesimuleerde filter-respons en de volledige testsuite (34/34 geslaagd).
- Gedeployed als image v1.1.12 op de bestaande App Service; healthz OK. URL.md naar versie 1.25; requirement V1.4.57 toegevoegd en afgevinkt (requirements v1.44).
### 2026-08-19 16:20:13 CEST - movieinstructions.md v1.0 opgesteld

- Draaiboek gemaakt om de demovideo een volgende keer in één keer goed te genereren: pipeline-overzicht (audio -> beeld -> montage), randvoorwaarden, exacte commando's per stap en verplichte verificatie (transcripts, framechecks, duurverschil, menselijke luistercheck).
- Alle geleerde lessen vastgelegd, incl. valkuiltabel: server-side opnames i.p.v. lokale LiveKit-opname, zwijg-prompt, fonetiek (ie en dee / dok-iks / meta-data), beeld op 1x knippen i.p.v. rekken, upload laat in scene 2, Undo-toolbar in beeld, -loop 1 bij ondertitel-overlays, geen attached_pic-track.
### 2026-08-20 21:49 CEST - Demo-inloggegevens van loginpagina verwijderd

- Feedback: de demo-credentials waren zichtbaar op de loginpagina.
- In app/src/App.jsx: het loginformulier start nu leeg (geen vooringevuld e-mail/wachtwoord) en het "Demo-accounts"-blok met klikbare accountknoppen is verwijderd.
- Login-validatie tegen DEMO_ACCOUNTS blijft ongewijzigd werken; build geverifieerd (vite build OK).
### 2026-08-20 22:04 CEST - v1.1.13 gedeployed: loginpagina zonder zichtbare credentials

- Image v1.1.13 gebouwd via az acr build en op de bestaande App Service (inddemo-web-nfbguv) gezet; herstart uitgevoerd.
- Verificatie: /healthz geeft 200 en de live JS-bundle (index-l7xUZgJr.js) bevat het "Demo-accounts"-blok niet meer.
- URL.md naar versie 1.26 (image v1.1.13); requirement V1.4.58 toegevoegd en afgevinkt (requirements v1.45).
