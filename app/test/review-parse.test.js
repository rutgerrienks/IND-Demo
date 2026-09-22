import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  buildConcreteReplacementMessages,
  buildSemanticReviewMessages,
  isInstructionalSuggestion,
  parseConcreteReplacement,
  parseReviewDocument,
  parseSemanticReviewFindings,
} from "../lib/review.js";

const demoDocxPath = fileURLToPath(new URL("../../demo-nota-test.docx", import.meta.url));

test("parseReviewDocument levert geredigeerde tekst en deterministische metadata op zonder extra semantische findings", async () => {
  const buffer = await readFile(demoDocxPath);
  const review = await parseReviewDocument(buffer);

  assert.equal(typeof review.analysisText, "string");
  assert.ok(review.analysisText.length > 0);
  assert.ok(Array.isArray(review.findings));
  assert.equal(review.findings.length, 0);
  assert.ok(review.summary.wordCount > 0);

  // Eventuele gedetecteerde PII mag nooit onherleidbaar in de geredigeerde tekst voorkomen.
  for (const match of review.piiMatches) {
    assert.equal(review.analysisText.includes(match.value), false);
  }
});

test("buildSemanticReviewMessages instrueert exact de drie semantische reviewcategorieën op volledige geredigeerde tekst", () => {
  const messages = buildSemanticReviewMessages({
    fileName: "nota.docx",
    text: "Volledige [afgelakt] documenttekst met context.",
    summary: { wordCount: 123, paragraphCount: 4, tableCount: 1 },
  });

  assert.equal(messages.length, 2);
  assert.equal(messages[0].role, "system");
  assert.equal(messages[1].role, "user");
  assert.match(messages[0].content, /exact drie categorieën: consistency, contradiction en completeness/i);
  assert.match(messages[0].content, /alle inhoudelijke bevindingen moeten uit jouw semantische beoordeling komen/i);
  assert.match(messages[0].content, /matchText is verplicht/i);
  assert.match(messages[1].content, /Volledige geredigeerde documenttekst:\nVolledige \[afgelakt\] documenttekst met context\./);
  assert.doesNotMatch(messages[1].content, /[^[]afgelakt/i);
});

test("concreet tekstvoorstel onderscheidt advies van direct publiceerbare vervangtekst", () => {
  assert.equal(isInstructionalSuggestion("Voeg drie argumenten toe."), true);
  assert.equal(isInstructionalSuggestion("De IND kiest hiervoor omdat dit uitvoerbaar, controleerbaar en proportioneel is."), false);

  const messages = buildConcreteReplacementMessages({
    fileName: "nota.docx",
    text: "Volledige geredigeerde tekst.",
    title: "Argumentatie mist diepgang",
    detail: "De conclusie is beperkt onderbouwd.",
    advice: "Voeg drie argumenten toe.",
    matchText: "De voorgestelde aanpak past beter.",
  });
  assert.match(messages[0].content, /direct publiceerbare/i);
  assert.match(messages[0].content, /nooit een instructie/i);
  assert.match(messages[1].content, /Voeg drie argumenten toe/);

  assert.equal(
    parseConcreteReplacement('{"suggestion":"De aanpak past beter omdat deze uitvoerbaar, controleerbaar en proportioneel is."}'),
    "De aanpak past beter omdat deze uitvoerbaar, controleerbaar en proportioneel is.",
  );
  assert.throws(
    () => parseConcreteReplacement('{"suggestion":"Voeg drie argumenten toe."}'),
    /concrete vervangende notatekst/i,
  );
});

test("parseSemanticReviewFindings behoudt alleen geldige, letterlijk terugvindbare fragmentsuggesties", () => {
  const text = "De nota gebruikt zowel besluit als beslissing door elkaar.";
  const rawContent = JSON.stringify({
    findings: [
      {
        category: "consistency",
        title: "Terminologie wisselt",
        detail: "Besluit en beslissing worden door elkaar gebruikt.",
        suggestion: "De nota gebruikt overal besluit consequent.",
        example: "Gebruik besluit consequent.",
        matchText: "besluit als beslissing",
      },
      {
        category: "completeness",
        title: "Niet letterlijk",
        detail: "Dit fragment staat niet in de tekst.",
        suggestion: "Onbruikbaar.",
        matchText: "bestaat niet",
      },
      {
        category: "anders",
        title: "Ongeldige categorie",
        detail: "Moet eruit.",
        suggestion: "Onbruikbaar.",
        matchText: "besluit",
      },
    ],
  });

  const findings = parseSemanticReviewFindings(rawContent, { text });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].category, "consistency");
  assert.equal(findings[0].matchTexts[0], "besluit als beslissing");
  assert.ok(findings[0].id.startsWith("review-"));
});
