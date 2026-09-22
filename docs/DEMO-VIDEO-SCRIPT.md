# Demo-videoscript — IND Document Review Demo

**Versie:** 1.2 — 2026-08-19 (stem: Ash; ondertiteling; uitspraak "IND" → "ie-en-dee", "docx" → "dok-iks")
**Duur:** ± 2:00 minuten
**Doel:** korte uitleg van de meest basale functionaliteiten (login, upload, analyse, review, accepteren/undo, export).
**Audio:** voice-over per scene gegenereerd via Vocal Bridge (stem: Ash). In de spreektekst wordt "IND" fonetisch geschreven als "ie-en-dee" en "docx" als "dok-iks"; in de ondertiteling blijven de normale schrijfwijzen staan.
**Ondertiteling:** Nederlandse ondertitels worden per zin ingebrand en zijn ook los beschikbaar als `video/demo-video.srt`.
**Beeld:** schermopnames van de live app (https://inddemo-web-nfbguv.azurewebsites.net) met het demo-account en de geanonimiseerde nota `nota overplaatsing BOA_GEANONIMISEERD.docx`.

Uitlijning: elke scene heeft één audiosegment (S1–S7). De beeldduur per scene volgt de werkelijke lengte van het audiosegment; de tijden hieronder zijn richttijden.

---

## Scene 1 — Intro & inloggen (0:00 – 0:12)

**Beeld:** cover (`video/eersteframe.png`) de eerste ± 4 seconden in beeld; daarna loginpagina; e-mail en wachtwoord worden ingevuld; klik op inloggen; dashboard verschijnt. Het cover is tevens de poster/thumbnail van de video.

**Voice-over (S1):**
> Welkom bij de IND Document Review Demo. Deze applicatie controleert nota's en beleidsstukken automatisch op consistentie, tegenstrijdigheden en volledigheid. We loggen in met een demo-account.

## Scene 2 — Document uploaden & PII-check (0:12 – 0:32)

**Beeld:** via de menubalk naar uploaden; docx-bestand selecteren; uploadmelding met PII-detectie; preview toont afgelakte persoonsgegevens.

**Voice-over (S2):**
> Via een nieuwe review uploaden we een Word-document. De demo accepteert docx-bestanden tot tien megabyte. Tijdens het uploaden controleert de tool direct op persoonsgegevens: die worden automatisch afgelakt en uitgesloten van de analyse.

## Scene 3 — Automatische analyse (0:32 – 0:52)

**Beeld:** analyse-modal doorloopt zichtbaar de drie stappen (consistentie, tegenstrijdigheden, volledigheid) met voortgang.

**Voice-over (S3):**
> Daarna start de analyse. Een voortgangsvenster doorloopt drie stappen: consistentie, zoals terminologie en schrijfwijze; tegenstrijdigheden binnen het document; en volledigheid van de argumentatie, het besluit en de metadata.

## Scene 4 — Bevindingen & preview (0:52 – 1:16)

**Beeld:** reviewscherm met PDF-preview links (gemarkeerde fragmenten in drie kleuren) en findings-paneel rechts; klik op een bevinding, preview springt naar het fragment; toelichting en tekstvoorstel in beeld.

**Voice-over (S4):**
> De resultaten verschijnen in het reviewscherm. Links de documentpreview met gemarkeerde fragmenten in drie kleuren, rechts het bevindingenpaneel. Elke bevinding heeft een toelichting en een concreet tekstvoorstel. Klikken op een bevinding springt direct naar de juiste plek in het document.

## Scene 5 — Suggestie accepteren & undo (1:16 – 1:38)

**Beeld:** klik op Accepteren bij een bevinding; preview wordt live bijgewerkt; daarna klik op Undo; wijziging wordt teruggedraaid; doorklikken naar volgende bevinding.

**Voice-over (S5):**
> Een verbetersuggestie passen we met één klik toe: de preview wordt direct bijgewerkt. Met de undo-knop draaien we een wijziging net zo eenvoudig weer terug. Zo werk je snel en gecontroleerd door alle bevindingen heen.

## Scene 6 — Export & actielog (1:38 – 1:55)

**Beeld:** klik op downloaden; docx met track changes wordt opgehaald; daarna kort het actielog in beeld.

**Voice-over (S6):**
> Het resultaat downloaden we als Word-bestand met track changes, zodat alle wijzigingen zichtbaar blijven. Alle acties worden bovendien automatisch vastgelegd in het actielog.

## Scene 7 — Afsluiting (1:55 – 2:00)

**Beeld:** dashboard of reviewscherm met logo; rustig eindbeeld.

**Voice-over (S7):**
> Zo maakt de IND Document Review Demo documentcontrole sneller, consistenter en transparanter.

---

## Productie-aanpak (audio/beeld-uitlijning)

1. **Audio eerst:** per scene één WAV-segment (S1–S7) genereren via Vocal Bridge; werkelijke duur per segment meten.
2. **Cover:** `video/eersteframe.png` opent de video (± 4 s onder het begin van S1) en wordt als poster/thumbnail in de mp4 gezet.
2. **Beeld daarna:** per scene een schermopname maken die minimaal zo lang is als het audiosegment; opnames worden per scene op de audioduur getrimd (laatste frame bevriezen indien korter).
3. **Montage:** scenes achter elkaar plakken met ffmpeg; audiosegmenten één-op-één onder de bijbehorende scene.
