# movieinstructions.md — Demovideo in één keer goed genereren

**Versie:** 1.0 — 2026-08-19
**Doel:** reproduceerbaar een demovideo (± 1:30) maken van de IND Document Review Demo met Vocal Bridge voice-over, ingebrande ondertiteling en beeld op natuurlijke snelheid. Dit document bevat alle geleerde lessen zodat het de volgende keer in één keer goed gaat.

---

## 1. Pipeline-overzicht

```
docs/DEMO-VIDEO-SCRIPT.md   (script: scenes, voice-over teksten, beeldregie)
        │
        ▼
video/tools/generate_voiceover.py   → audio per scene (s1..s7) via Vocal Bridge
        │                              LET OP: gebruikt de SERVER-SIDE opname als bron
        ▼
[trimstap]                          → sX_trim.wav (spraak onaangetast, alleen staartstilte kort)
        │
video/tools/capture_demo.py         → capture/capture.webm + scenes.json (Playwright, live app)
        │
        ▼
video/tools/assemble.py             → demo-video.mp4 + demo-video.srt
```

Volgorde is belangrijk: **eerst audio, dan beeld, dan montage.** Het beeld wordt op de audioduur opgenomen zodat er niets opgerekt of versneld hoeft te worden.

## 2. Randvoorwaarden

- `.env` bevat `VOCAL_BRIDGE_API_KEY` en `VB_AGENT_ID_IND` (IND-agent).
- Python-venv: `video/.venv` met `livekit`, `requests`, `playwright` (+ Chromium via `playwright install chromium`) en `pillow`.
- `vb` CLI geïnstalleerd (`pip install vocal-bridge`, staat in `~/Library/Python/3.14/bin/vb`) en de IND-agent geselecteerd: `vb agent use <VB_AGENT_ID_IND>`.
- `ffmpeg` (Homebrew). **Let op:** deze build heeft géén `subtitles`/`drawtext`-filter — ondertitels gaan via overlay-PNG's (zit al in `assemble.py`).
- Live app bereikbaar: https://inddemo-web-nfbguv.azurewebsites.net (credentials in `URL.md`).
- Cover: `video/eersteframe.png` (opent de video, eerste 4 s).

## 3. Stappen

### Stap 1 — Audio genereren (Ash, standaard)

```bash
cd <projectroot>
set -a; source .env; set +a
video/.venv/bin/python video/tools/generate_voiceover.py          # alle segmenten
video/.venv/bin/python video/tools/generate_voiceover.py s3 s7    # of alleen specifieke
```

ElevenLabs-variant: zelfde commando met `VO_VOICE=elevenlabs VO_AUDIO_DIR="$PWD/video/audio-elevenlabs"`.

**Cruciale lessen (zitten al in het script, niet weghalen):**
- **Gebruik de server-side opname als audiobron** (`vb logs download`, gebeurt automatisch in het script). De lokale LiveKit-opname bevat netwerkjitter → tempo-schommelingen en blikkerig geluid.
- De agent-greeting wordt tijdelijk op de scenetekst gezet met een **zwijg-prompt** (anders praat de interviewagent door na de greeting). Originele greeting/prompt/model_settings worden na afloop hersteld — controleer dit in de output ("originele config hersteld").
- **Fonetiek in de spreektekst** (ondertiteling houdt de normale schrijfwijze):
  - "IND" → `ie en dee` (los, zonder streepjes; met streepjes werd het "ie-en-die")
  - "docx" → `dok-iks`
  - "metadata" → `meta-data`
- Geen instructies over lettergrepen/streepjes in de prompt zetten: dat veroorzaakt juist rare klemtonen.
- De realtime-stem is **niet deterministisch**: verifieer per segment het transcript (`vb logs show <id>`) en laat het eindresultaat altijd door een mens beluisteren. Eén segment opnieuw genereren kan gericht: `generate_voiceover.py s4`.

### Stap 2 — Audio trimmen (spraak intact laten!)

**Nooit** de spraak zelf bewerken (geen tempo, geen strakke silenceremove). Alleen de staartstilte inkorten tot ~0,8 s na het spraakeinde. Serveropnames beginnen vrijwel direct met spraak; niets aan de kop knippen.

```bash
cd video/audio   # of video/audio-elevenlabs
for s in s1 s2 s3 s4 s5 s6 s7; do
  end=$(ffmpeg -hide_banner -i $s.wav -af silencedetect=noise=-35dB:d=0.4 -f null - 2>&1 | grep silence_start | tail -1 | sed 's/.*silence_start: //')
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $s.wav)
  cut=$(python3 -c "print(min($dur, ${end:-$dur} + 0.8))")
  ffmpeg -loglevel error -y -i $s.wav -af "atrim=0:$cut" ${s}_trim.wav
done
```

**Valkuil:** als een opname géén trailing stilte heeft, geeft `silencedetect` een tussenstilte als laatste event — knip dan niet (gebruik de volledige duur). De laatste stilte-start mag alleen als knippunt dienen als er daarna geen spraak meer komt.

### Stap 3 — MIN-duren zetten en beeld opnemen

Open `capture_demo.py` en zet `MIN` per scene op **de duur van het (langste) getrimde audiosegment + ~0,7 s marge** (s1: audioduur − 4 s cover; s7: audioduur + 0,6 s staart). Bij twee stemvarianten: neem per scene het maximum, dan is één opname genoeg voor beide montages.

```bash
video/.venv/bin/python video/tools/capture_demo.py
```

**Cruciale lessen (zitten al in het script):**
- Loginvelden eerst **leegmaken** vóór het typen (ze zijn vooringevuld → anders dubbel getypt e-mailadres).
- Upload pas **laat in scene 2** starten, zodat de analyse-modal in scene 3 valt (audio s2 gaat over uploaden/PII; audio s3 begint met "Daarna start de analyse").
- Scene 5: de findings-toolbar **in beeld scrollen vóór en na elke klik** — anders is de Undo-knop niet zichtbaar. De kijker moet zien: Accepteren → Undo → weer Accepteren.
- Viewport en opname op 1280×720.

### Stap 4 — Monteren

```bash
video/.venv/bin/python video/tools/assemble.py                                       # Ash
VO_AUDIO_DIR="$PWD/video/audio-elevenlabs" VO_OUT="$PWD/video/demo-video-elevenlabs.mp4" \
  video/.venv/bin/python video/tools/assemble.py                                     # ElevenLabs
```

**Cruciale lessen (zitten al in het script):**
- **Beeld volgt audio, nooit andersom.** Scenes worden op de audioduur **geknipt op 1x-snelheid**; alleen s3 (analyse-wachttijd) en zo nodig s5 (render-wachttijd) worden gecomprimeerd (timelapse van statisch beeld valt niet op). **Nooit vertragen** — slow-motion cursors zien er slecht uit.
- Cover = eerste 4 s beeld, onder het begin van S1-audio. **Geen aparte attached_pic/thumbnailtrack toevoegen** — dat verwart QuickTime/Finder.
- Ondertitels: per zin, ingebrand via Pillow-overlay-PNG's met `-loop 1` op elke afbeelding en `overlay=...:enable='between(t,a,b)':shortest=1`. Zonder `-loop 1` verschijnt alleen de eerste titel. Los `.srt`-bestand wordt ernaast gezet.
- Audiosegmenten worden 1-op-1 achter elkaar geplakt; de natuurlijke staartjes van ~0,8 s vormen de pauzes tussen de zinnen.

## 4. Verifiëren vóór oplevering (verplicht)

1. **Transcripts:** laatste 7 sessies checken op letterlijke weergave: `vb logs --limit 7` + `vb logs show <id>`.
2. **Frames:** haal frames op t=1 (cover), per scenegrens en midden in s5 (Undo-knop zichtbaar?) en controleer beeld-bij-tekst:
   ```bash
   ffmpeg -y -ss <t> -i video/demo-video.mp4 -frames:v 1 /tmp/f<t>.png
   ```
   Scenegrens = cumulatieve som van de getrimde audioduren (s1 begint op 0, cover overlapt de eerste 4 s).
3. **Duur:** beeld- en audioduur moeten <0,3 s verschillen (staat in de assemble-output).
4. **Menselijke luistercheck:** uitspraak ("ie en dee", "dok-iks"), vloeiendheid en tempo zijn alleen op gehoor te beoordelen. Plan één luisterronde in; gericht één segment opnieuw genereren is goedkoop.

## 5. Bekende valkuilen (samenvatting)

| Symptoom | Oorzaak | Oplossing |
|---|---|---|
| Blikkerig geluid / tempo-schommelingen | Lokale LiveKit-opname (jitter) | Server-side opname gebruiken (zit in script) |
| Agent praat door na de tekst | Interviewprompt actief | Zwijg-prompt (zit in script) |
| "ie-en-die", "consiestenter" | Niet-deterministische stem + streepjes | "ie en dee" los schrijven; segment opnieuw; luistercheck |
| Slow-motion / gejaagd beeld | Beeld opgerekt naar audioduur | Beeld opnemen op audioduur, knippen op 1x |
| Modal te vroeg in beeld | Upload te vroeg in scene 2 | Upload aan het einde van scene 2 (zit in script) |
| Undo-knop niet zichtbaar | Pagina scrolde naar boven | Toolbar in beeld scrollen (zit in script) |
| Alleen eerste ondertitel zichtbaar | PNG-input eindigt op t=0 | `-loop 1` + `shortest=1` (zit in script) |
| `subtitles`-filter faalt | Homebrew-ffmpeg zonder libass | Overlay-PNG's (zit in script) |
| Dubbel e-mailadres bij login | Vooringevulde velden | Veld leegmaken vóór typen (zit in script) |
| Cover "ontbreekt" in preview-widget | Viewer kiest eigen posterframe | Geen attached_pic; cover is gewoon het eerste beeld |
| Bestand heet "demo-video 1.mp4" | Kopie bij slepen/delen | Altijd `video/demo-video.mp4` uit de projectmap gebruiken |
