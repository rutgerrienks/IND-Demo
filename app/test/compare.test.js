import test from "node:test";
import assert from "node:assert/strict";
import {
  buildComparisonMessages,
  parseComparisonFindings,
  validateComparisonRequest,
} from "../lib/compare.js";

test("validateComparisonRequest wijst ontbrekende documenten af", () => {
  assert.match(validateComparisonRequest({}).error, /Werkdocument/);
  assert.match(
    validateComparisonRequest({ workDocument: { fileName: "a.docx", text: "tekst" } }).error,
    /Referentiedocument/,
  );
});

test("validateComparisonRequest wijst twee identieke documenten af", () => {
  const body = {
    workDocument: { fileName: "nota.docx", text: "Dezelfde inhoud." },
    referenceDocument: { fileName: "nota.docx", text: "Dezelfde inhoud." },
  };
  assert.match(validateComparisonRequest(body).error, /twee verschillende documenten/i);
});

test("validateComparisonRequest behoudt langere documenten volledig voor de proxy", () => {
  const body = {
    workDocument: { fileName: "werk.docx", text: "a".repeat(70_000) },
    referenceDocument: { fileName: "ref.docx", text: "korte tekst" },
  };
  const result = validateComparisonRequest(body);
  assert.equal(result.error, undefined);
  assert.equal(result.workDocument.text.length, 70_000);
});

test("validateComparisonRequest accepteert twee verschillende, geldige documenten", () => {
  const body = {
    workDocument: { fileName: "werk.docx", text: "Inhoud van het werkdocument." },
    referenceDocument: { fileName: "referentie.docx", text: "Inhoud van het referentiedocument." },
  };
  const result = validateComparisonRequest(body);
  assert.equal(result.error, undefined);
  assert.equal(result.workDocument.fileName, "werk.docx");
  assert.equal(result.referenceDocument.fileName, "referentie.docx");
});

test("buildComparisonMessages stuurt de volledige teksten van beide documenten mee, geen fragmenten", () => {
  const workDocument = { fileName: "werk.docx", text: "Volledige werkdocumenttekst met details." };
  const referenceDocument = { fileName: "referentie.docx", text: "Volledige referentietekst met andere details." };
  const messages = buildComparisonMessages({ workDocument, referenceDocument });

  assert.equal(messages[0].role, "system");
  assert.equal(messages[1].role, "user");
  assert.match(messages[1].content, /Volledige werkdocumenttekst met details\./);
  assert.match(messages[1].content, /Volledige referentietekst met andere details\./);
  assert.match(messages[0].content, /statisch/i);
  assert.match(messages[0].content, /nooit tot relevante passages, bestaande bevindingen of alleen tegenstrijdigheden/i);
  assert.match(messages[0].content, /Sluit geen andere inhoud uit/i);
  assert.match(messages[0].content, /geen woordelijke diff/i);
  assert.match(messages[0].content, /exact drie requirementsgroepen/i);
  assert.match(messages[0].content, /tone of voice, layout\/opbouw, terminologie en schrijfwijze, referenties, data en tijdstippen/i);
  assert.match(messages[0].content, /inhoudelijke tegenspraak binnen of tussen de documenten en een onlogische opbouw/i);
  assert.match(messages[0].content, /argumentatie, voorgesteld besluit of proces en metadata/i);
  assert.match(messages[0].content, /citaat uit zowel het Werkdocument als het Referentiedocument/i);
  assert.match(messages[0].content, /uitsluitend op het Werkdocument/i);
  assert.match(messages[0].content, /Referentiedocument blijft statisch/i);
});

test("parseComparisonFindings accepteert geldige JSON en behoudt alleen terugvindbare citaten", () => {
  const workText = "De nota noemt zowel 'besluit' als 'beslissing' door elkaar in de tekst.";
  const referenceText = "De referentie gebruikt beslissing consequent door het hele document.";
  const rawContent = JSON.stringify({
    findings: [
      {
        category: "consistency",
        title: "Terminologie wisselt",
        detail: "Besluit en beslissing worden beide gebruikt.",
        workExcerpt: "zowel 'besluit' als 'beslissing'",
        referenceExcerpt: "gebruikt beslissing consequent",
        suggestion: "Gebruik overal 'besluit'.",
        example: "Vervang 'beslissing' door 'besluit'.",
      },
      {
        category: "consistency",
        title: "Niet terugvindbaar fragment",
        detail: "Dit citaat staat niet in de tekst.",
        workExcerpt: "fragment dat nergens voorkomt",
        referenceExcerpt: "gebruikt beslissing consequent",
        suggestion: "Irrelevant.",
      },
      {
        category: "unknown-category",
        title: "Ongeldige categorie",
        detail: "Moet worden geweerd.",
        workExcerpt: "besluit",
        referenceExcerpt: "gebruikt beslissing consequent",
        suggestion: "Irrelevant.",
      },
    ],
  });

  const findings = parseComparisonFindings(rawContent, { workText, referenceText });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].title, "Terminologie wisselt");
  assert.equal(findings[0].matchTexts[0], "zowel 'besluit' als 'beslissing'");
  assert.equal(findings[0].category, "consistency");
  assert.ok(findings[0].id.startsWith("cmp-"));
});

test("parseComparisonFindings herstelt JSON uit omringende tekst en faalt op onbruikbare inhoud", () => {
  const workText = "Kernpunt A staat hier.";
  const referenceText = "Kernpunt A ontbreekt in de referentie.";
  const wrapped = `Hier is het resultaat:\n${JSON.stringify({
    findings: [
      {
        category: "completeness",
        title: "Opbouw",
        detail: "Detail.",
        workExcerpt: "Kernpunt A",
        referenceExcerpt: "Kernpunt A ontbreekt",
        suggestion: "Herschrijf.",
      },
    ],
  })}\nEinde.`;

  const findings = parseComparisonFindings(wrapped, { workText, referenceText });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].category, "completeness");

  assert.throws(() => parseComparisonFindings("geen geldige json", { workText, referenceText }), /geldige JSON/);
});
