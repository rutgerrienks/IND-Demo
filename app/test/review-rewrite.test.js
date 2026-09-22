import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import {
  annotateDocxForPreview,
  applySuggestionToDocx,
  buildVersioningMetadata,
  rewriteDocxAndRevalidate,
} from "../lib/review.js";

// Minimale, geldige .docx-structuur met één run die de doeltekst bevat,
// zodat de echte tekstvervanging getest kan worden zonder een groot voorbeeldbestand.
async function buildFakeDocx(paragraphText) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
      + "</Types>",
  );
  zip.file(
    "_rels/.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
      + "</Relationships>",
  );
  zip.file(
    "word/document.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
      + "<w:body><w:p><w:r><w:t xml:space=\"preserve\">"
      + paragraphText
      + "</w:t></w:r></w:p></w:body></w:document>",
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

async function readDocumentXml(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  return zip.file("word/document.xml").async("string");
}

async function splitTextAcrossRuns(buffer, parts) {
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml").async("string");
  zip.file(
    "word/document.xml",
    xml.replace(
      /<w:r><w:t xml:space="preserve">[\s\S]*?<\/w:t><\/w:r>/,
      parts.map((part) => `<w:r><w:t xml:space="preserve">${part}</w:t></w:r>`).join(""),
    ),
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

async function splitTextAcrossParagraphs(buffer, paragraphs) {
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml").async("string");
  zip.file(
    "word/document.xml",
    xml.replace(
      /<w:p><w:r><w:t xml:space="preserve">[\s\S]*?<\/w:t><\/w:r><\/w:p>/,
      paragraphs.map((paragraph) => `<w:p><w:r><w:t xml:space="preserve">${paragraph}</w:t></w:r></w:p>`).join(""),
    ),
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

test("applySuggestionToDocx voert een echte tekstvervanging door in document.xml", async () => {
  const buffer = await buildFakeDocx("De nota gebruikt zowel u als je door elkaar.");
  const updated = await applySuggestionToDocx(buffer, {
    matchText: "zowel u als je",
    suggestion: "consequent u",
  });

  const xml = await readDocumentXml(updated);
  assert.match(xml, /consequent u/);
  assert.doesNotMatch(xml, /zowel u als je/);
});

test("applySuggestionToDocx laat andere tekst in het document ongemoeid", async () => {
  const buffer = await buildFakeDocx("Inleiding. Kernpunt A. Conclusie: besluit genomen.");
  const updated = await applySuggestionToDocx(buffer, {
    matchText: "Kernpunt A",
    suggestion: "Kernpunt B",
  });

  const xml = await readDocumentXml(updated);
  assert.match(xml, /Kernpunt B/);
  assert.match(xml, /Inleiding\./);
  assert.match(xml, /Conclusie: besluit genomen\./);
});

test("applySuggestionToDocx vervangt een letterlijk fragment dat over meerdere Word-runs is verdeeld", async () => {
  const base = await buildFakeDocx("placeholder");
  const buffer = await splitTextAcrossRuns(base, ["Het MT wordt gevraagd om: ", "kennis te nemen", " van het voorstel."]);
  const updated = await applySuggestionToDocx(buffer, {
    matchText: "MT wordt gevraagd om: kennis te nemen",
    suggestion: "MT wordt gevraagd om in te stemmen",
  });

  const xml = await readDocumentXml(updated);
  assert.match(xml, /MT wordt gevraagd om in te stemmen/);
  assert.doesNotMatch(xml, /kennis te nemen/);
  assert.match(xml, /van het voorstel/);
});

test("applySuggestionToDocx vervangt een letterlijk fragment over meerdere Word-alinea's", async () => {
  const base = await buildFakeDocx("placeholder");
  const buffer = await splitTextAcrossParagraphs(base, [
    "Consequenties  ",
    "Politieke contextgeen ",
    "Financiële paragraafEr zijn geen financiële consequenties",
  ]);
  const updated = await applySuggestionToDocx(buffer, {
    matchText: "Consequenties\n\nPolitieke contextgeen\n\nFinanciële paragraafEr zijn geen financiële consequenties",
    suggestion: "Consequenties\n\nPolitieke context\nEr zijn geen politieke consequenties.\n\nFinanciële paragraaf\nEr zijn geen financiële consequenties.",
  });

  const xml = await readDocumentXml(updated);
  assert.match(xml, /Politieke context/);
  assert.match(xml, /Er zijn geen politieke consequenties\./);
  assert.doesNotMatch(xml, /contextgeen/);
  assert.doesNotMatch(xml, /paragraafEr/);
});

test("applySuggestionToDocx geeft een duidelijke fout als het fragment niet wordt teruggevonden", async () => {
  const buffer = await buildFakeDocx("Een andere zin zonder het gezochte fragment.");
  await assert.rejects(
    () => applySuggestionToDocx(buffer, { matchText: "niet aanwezig fragment", suggestion: "iets anders" }),
    /niet.*teruggevonden/i,
  );
});

test("applySuggestionToDocx vereist zowel matchText als suggestion", async () => {
  const buffer = await buildFakeDocx("Tekst.");
  await assert.rejects(() => applySuggestionToDocx(buffer, { matchText: "", suggestion: "iets" }));
  await assert.rejects(() => applySuggestionToDocx(buffer, { matchText: "Tekst", suggestion: "" }));
});

test("annotateDocxForPreview annoteert PII en alle reviewkleuren ook over meerdere runs heen", async () => {
  const base = await buildFakeDocx("placeholder");
  const buffer = await splitTextAcrossRuns(base, [
    "Mail ",
    "persoon@",
    "example.com ",
    "en gebruik ",
    "u en ",
    "je. Het is ",
    "wel ",
    "en niet logisch. Voeg ",
    "afzender ",
    "en datum",
    " toe.",
  ]);

  const annotated = await annotateDocxForPreview(buffer, {
    piiMatches: [{ type: "email", value: "persoon@example.com" }],
    findings: [
      { color: "blue", matchTexts: ["u en je"] },
      { color: "rose", matchTexts: ["wel en niet"] },
      { color: "amber", matchTexts: ["afzender en datum"] },
    ],
  });

  const xml = await readDocumentXml(annotated);
  assert.doesNotMatch(xml, /persoon@example\.com/);
  assert.match(xml, /\[afgelakt]/);
  assert.match(xml, /w:highlight w:val="black"/);
  assert.match(xml, /w:highlight w:val="cyan"/);
  assert.match(xml, /w:highlight w:val="magenta"/);
  assert.match(xml, /w:highlight w:val="yellow"/);
});

test("rewriteDocxAndRevalidate past een wijziging toe en verwijdert verouderde findings zonder nieuw LLM-resultaat", async () => {
  const buffer = await buildFakeDocx("Gebruik besluit. Voeg datum toe.");
  const result = await rewriteDocxAndRevalidate(buffer, {
    matchText: "besluit",
    suggestion: "beslissing",
    remainingFindings: [
      {
        id: "keep-date",
        category: "completeness",
        title: "Datum expliciteren",
        detail: "Datum blijft relevant.",
        suggestion: "Voeg datum toe.",
        matchTexts: ["datum"],
      },
      {
        id: "drop-old",
        category: "consistency",
        title: "Oude term",
        detail: "Besluit staat er nog.",
        suggestion: "Gebruik beslissing.",
        matchTexts: ["besluit"],
      },
    ],
  });

  const xml = await readDocumentXml(result.safeDocxBuffer);
  assert.match(xml, /beslissing/);
  assert.doesNotMatch(xml, />besluit</);
  assert.equal(result.analysisText.includes("beslissing"), true);
  assert.deepEqual(result.findings.map((finding) => finding.id), ["keep-date"]);
});

test("buildVersioningMetadata levert frontend-klare versiemetadata", () => {
  const metadata = buildVersioningMetadata({
    currentVersion: "2",
    findingId: "review-1-contradiction",
    findingTitle: "Formulering aanscherpen",
    versionHistory: [{ version: 1, label: "Origineel", at: "2026-08-17T09:00:00.000Z" }],
    updatedAt: "2026-08-17T10:00:00.000Z",
  });

  assert.equal(metadata.previousVersion, 2);
  assert.equal(metadata.nextVersion, 3);
  assert.equal(metadata.appliedFindingId, "review-1-contradiction");
  assert.equal(metadata.label, "Na acceptatie: Formulering aanscherpen");
  assert.deepEqual(metadata.versionHistory.at(-1), {
    version: 3,
    label: "Na acceptatie: Formulering aanscherpen",
    at: "2026-08-17T10:00:00.000Z",
  });
});
