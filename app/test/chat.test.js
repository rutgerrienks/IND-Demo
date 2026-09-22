import test from "node:test";
import assert from "node:assert/strict";
import {
  buildComparisonChatMessages,
  buildComparisonEditProposalMessages,
  buildSingleReviewEditProposalMessages,
  buildSingleReviewChatMessages,
  collectChatAnswer,
  detectEditCommandIntent,
  parseEditProposalResponse,
  sanitizeMarkdownAnswer,
  sanitizeChatMessages,
} from "../lib/chat.js";

test("sanitizeChatMessages redigeert PII zonder berichtinhoud stil af te kappen", () => {
  const longContent = `Bereik mij op persoon@example.com. ${"x".repeat(5_000)}`;
  const messages = sanitizeChatMessages([
    { role: "user", content: longContent },
  ]);

  assert.equal(messages[0].content.includes("persoon@example.com"), false);
  assert.equal(messages[0].content.includes("[afgelakt]"), true);
  assert.equal(messages[0].content.endsWith("x".repeat(5_000)), true);
});

test("buildSingleReviewChatMessages gebruikt de volledige geredigeerde documenttekst en findingcontext", () => {
  const promptMessages = buildSingleReviewChatMessages({
    messages: [{ role: "user", content: "Wat moet ik aanpassen?" }],
    document: {
      analysisText: "Volledige [afgelakt] documenttekst.",
      selectedFindingId: "review-0-consistency",
      appliedFindingIds: [],
      findings: [
        {
          id: "review-0-consistency",
          title: "Terminologie wisselt",
          detail: "Besluit en beslissing lopen door elkaar.",
          suggestion: "Gebruik overal besluit.",
        },
      ],
    },
  });

  assert.equal(promptMessages[0].role, "system");
  assert.match(promptMessages[0].content, /Volledige geredigeerde documenttekst:\nVolledige \[afgelakt\] documenttekst\./);
  assert.match(promptMessages[0].content, /Actuele bevinding: Terminologie wisselt/i);
  assert.match(promptMessages[0].content, /veilige lichte Markdown-subset/i);
});

test("buildComparisonChatMessages gebruikt beide volledige geredigeerde documenten en vergelijkingsbevindingen", () => {
  const promptMessages = buildComparisonChatMessages({
    messages: [{ role: "user", content: "Wat wijkt af?" }],
    comparison: {
      selectedFindingId: "cmp-0-consistency",
      appliedFindingIds: [],
      findings: [
        {
          id: "cmp-0-consistency",
          category: "consistency",
          title: "Terminologie wisselt",
          detail: "Werkdocument gebruikt een andere term.",
          suggestion: "Gebruik overal besluit.",
          matchTexts: ["beslissing"],
          referenceExcerpt: "besluit",
        },
      ],
      workDocument: { fileName: "werk.docx", text: "Volledige werktekst met [afgelakt]." },
      referenceDocument: { fileName: "referentie.docx", text: "Volledige referentietekst met [afgelakt]." },
    },
  });

  assert.match(promptMessages[0].content, /Werkdocument \(werk\.docx\):\nVolledige werktekst met \[afgelakt\]\./);
  assert.match(promptMessages[0].content, /Referentiedocument \(referentie\.docx\):\nVolledige referentietekst met \[afgelakt\]\./);
  assert.match(promptMessages[0].content, /Referentiefragment: besluit/);
  assert.match(promptMessages[0].content, /veilige lichte Markdown-subset/i);
});

test("detectEditCommandIntent routeert expliciete bewerkingscommando's deterministisch", () => {
  assert.equal(detectEditCommandIntent("Wijzig deze zin naar actief taalgebruik."), true);
  assert.equal(detectEditCommandIntent("Kun je dit herschrijven?"), true);
  assert.equal(detectEditCommandIntent("Wat betekent deze bevinding precies?"), false);
});

test("buildSingleReviewEditProposalMessages vraagt JSON met exact documentfragment en volledige vervanging", () => {
  const messages = buildSingleReviewEditProposalMessages({
    messages: [{ role: "user", content: "Herschrijf de conclusie." }],
    document: {
      analysisText: "Conclusie: het besluit blijft staan.",
      selectedFindingId: "review-0-contradiction",
      findings: [
        {
          id: "review-0-contradiction",
          title: "Conclusie aanscherpen",
          detail: "De conclusie kan concreter.",
          suggestion: "Conclusie: het besluit wordt bevestigd.",
          matchTexts: ["Conclusie: het besluit blijft staan."],
        },
      ],
    },
  });

  assert.match(messages[0].content, /"targetDocument":"document"/);
  assert.match(messages[0].content, /matchText moet een exact letterlijk, ononderbroken citaat/i);
  assert.match(messages[0].content, /Je past niets automatisch toe/i);
});

test("buildComparisonEditProposalMessages beperkt voorstellen expliciet tot het Werkdocument", () => {
  const messages = buildComparisonEditProposalMessages({
    messages: [{ role: "user", content: "Verander dit volgens de referentie." }],
    comparison: {
      workDocument: { fileName: "werk.docx", text: "Werktekst." },
      referenceDocument: { fileName: "ref.docx", text: "Referentietekst." },
      findings: [],
    },
  });

  assert.match(messages[0].content, /"targetDocument":"workDocument"/);
  assert.match(messages[0].content, /Referentiedocument blijft statisch/i);
});

test("collectChatAnswer vraagt veilig vervolg op als Azure op lengte stopt en levert een volledige zin terug", async () => {
  const calls = [];
  const result = await collectChatAnswer({
    messages: [{ role: "system", content: "Context" }, { role: "user", content: "Vraag" }],
    requestCompletion: async (body) => {
      calls.push(body);
      if (calls.length === 1) {
        return {
          choices: [
            {
              finish_reason: "length",
              message: { content: "Dit is een lang antwoord dat" },
            },
          ],
        };
      }
      return {
        choices: [
          {
            finish_reason: "stop",
            message: { content: "verdergaat en netjes eindigt." },
          },
        ],
      };
    },
  });

  assert.equal(result.answer, "Dit is een lang antwoord dat verdergaat en netjes eindigt.");
  assert.equal(calls.length, 2);
  assert.match(calls[1].messages.at(-1).content, /Je vorige antwoord werd afgebroken/);
});

test("parseEditProposalResponse behoudt alleen veilig gevalideerde voorstelcitaten", () => {
  const response = parseEditProposalResponse(JSON.stringify({
    answer: "## Voorstel\n- **Actie:** vervang de passage hieronder.",
    proposal: {
      targetDocument: "document",
      matchText: "besluit blijft staan",
      suggestion: "besluit wordt bevestigd",
      rationale: "Actiever geformuleerd.",
    },
  }), {
    editableText: "Conclusie: het besluit blijft staan.",
    targetDocument: "document",
  });

  assert.equal(response.proposal?.matchText, "besluit blijft staan");
  assert.equal(response.proposal?.suggestion, "besluit wordt bevestigd");
});

test("parseEditProposalResponse verwerpt voorstellen zonder letterlijk terugvindbaar citaat", () => {
  const response = parseEditProposalResponse(JSON.stringify({
    answer: "## Geen veilig voorstel\n- **Actie:** licht eerst de gewenste passage toe.",
    proposal: {
      targetDocument: "document",
      matchText: "niet aanwezig",
      suggestion: "iets anders",
    },
  }), {
    editableText: "Conclusie: het besluit blijft staan.",
    targetDocument: "document",
  });

  assert.equal(response.proposal, null);
});

test("sanitizeMarkdownAnswer verwijdert onveilige HTML maar laat de veilige Markdown-subset staan", () => {
  const sanitized = sanitizeMarkdownAnswer("<div>## Advies</div>\n1. **Actie:** pas dit aan.<script>alert(1)</script>");
  assert.equal(sanitized.includes("<div>"), false);
  assert.equal(sanitized.includes("<script>"), false);
  assert.match(sanitized, /## Advies/);
  assert.match(sanitized, /- \*\*Actie:\*\* pas dit aan\./);
});
