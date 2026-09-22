import { detectPii, redactText } from "./review.js";

const MAX_CHAT_HISTORY = 20;
const EDIT_COMMAND_REGEX = /\b(verander(?:en|d|t)?|wijzig(?:en|d|t)?|hernoem(?:en|d|t)?|herschrijf|herschrijven|vervang(?:en|d|t)?)\b/i;
const CONTINUATION_PROMPT = [
  "Je vorige antwoord werd afgebroken door de lengtebeperking.",
  "Ga exact verder waar je bent gebleven, zonder herhaling of nieuwe inleiding.",
  "Maak het antwoord af en eindig met een volledige laatste zin.",
].join(" ");
const SAFE_MARKDOWN_INSTRUCTION = [
  "Gebruik uitsluitend een veilige lichte Markdown-subset:",
  "korte koppen met # of ##, bullets met -, en **vet** voor concrete actiepunten.",
  "Gebruik geen HTML, tabellen, links, codeblokken of andere Markdown-constructies.",
  "Eindig altijd met een volledige laatste zin.",
].join(" ");

export function sanitizeChatMessages(messages, { maxHistory = MAX_CHAT_HISTORY } = {}) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("Minimaal één chatbericht is vereist.");
  }

  if (messages.some((message) => !["user", "assistant"].includes(message?.role) || typeof message.content !== "string")) {
    throw new Error("Chatberichten moeten een geldige rol en tekst bevatten.");
  }

  return messages.slice(-maxHistory).map((message) => ({
    role: message.role,
    content: redactChatContent(message.content),
  }));
}

export function buildSingleReviewChatMessages({ messages, document }) {
  if (!document || typeof document.analysisText !== "string" || !document.analysisText.trim()) {
    throw new Error("Geredigeerde documentcontext ontbreekt.");
  }

  const findings = Array.isArray(document.findings) ? document.findings.slice(0, 40) : [];
  const appliedIds = new Set(Array.isArray(document.appliedFindingIds) ? document.appliedFindingIds : []);
  const selectedFinding = findings.find((finding) => finding.id === document.selectedFindingId) ?? null;
  const findingContext = findings
    .map((finding, index) => {
      const status = appliedIds.has(finding.id) ? "verwerkt" : "open";
      return `${index + 1}. [${status}] ${finding.title}: ${finding.detail} Suggestie: ${finding.suggestion}`;
    })
    .join("\n");

  const systemMessage = [
    "Je bent een zorgvuldige Nederlandstalige reviewassistent voor IND-nota's.",
    "Beantwoord vrije vragen uitsluitend op basis van de volledige geredigeerde documenttekst en de onderstaande bevindingen.",
    "Verzin geen feiten en benoem onzekerheid expliciet.",
    "Noem of reconstrueer nooit persoonsgegevens; [afgelakt] blijft ongewijzigd.",
    "Geef waar nuttig een concrete toelichting, herschrijfvoorbeeld en het effect van de wijziging.",
    SAFE_MARKDOWN_INSTRUCTION,
    "Met 'deze' of 'actuele bevinding' bedoelt de gebruiker altijd de hieronder genoemde actuele bevinding; vraag daar niet opnieuw naar.",
    "Noem geen interne finding-ID's.",
    "Je kunt geen wijziging zelf doorvoeren. Verwijs bij toepassen altijd naar de knop Accepteren.",
    `Actuele bevinding: ${selectedFinding ? `${selectedFinding.title}: ${selectedFinding.detail}` : "geen"}.`,
    `Bevindingen:\n${findingContext || "Geen bevindingen."}`,
    `Volledige geredigeerde documenttekst:\n${document.analysisText}`,
  ].join("\n\n");

  return [{ role: "system", content: systemMessage }, ...messages];
}

export function buildComparisonChatMessages({ messages, comparison }) {
  const workDocument = normalizeComparisonDocument(comparison?.workDocument, "Werkdocument");
  const referenceDocument = normalizeComparisonDocument(comparison?.referenceDocument, "Referentiedocument");
  const findings = Array.isArray(comparison?.findings) ? comparison.findings.slice(0, 40) : [];
  const appliedIds = new Set(Array.isArray(comparison?.appliedFindingIds) ? comparison.appliedFindingIds : []);
  const selectedFinding = findings.find((finding) => finding.id === comparison?.selectedFindingId) ?? null;
  const findingContext = findings
    .map((finding, index) => {
      const status = appliedIds.has(finding.id) ? "verwerkt" : "open";
      const workExcerpt = finding.matchTexts?.[0] ?? "";
      const referenceExcerpt = typeof finding.referenceExcerpt === "string" ? finding.referenceExcerpt : "";
      return [
        `${index + 1}. [${status}] ${finding.title}`,
        `Categorie: ${finding.category}`,
        `Detail: ${finding.detail}`,
        `Werkfragment: ${workExcerpt || "n.v.t."}`,
        `Referentiefragment: ${referenceExcerpt || "n.v.t."}`,
        `Suggestie voor Werkdocument: ${finding.suggestion}`,
      ].join("\n");
    })
    .join("\n\n");

  const systemMessage = [
    "Je bent een zorgvuldige Nederlandstalige vergelijkingsassistent voor IND-documenten.",
    "Baseer elk antwoord uitsluitend op de volledige geredigeerde teksten van het Werkdocument en het Referentiedocument, plus de onderstaande vergelijkingsbevindingen.",
    "Het Referentiedocument is alleen vergelijkingsbasis en blijft inhoudelijk ongewijzigd; adviezen gaan uitsluitend over het Werkdocument.",
    "Verzin geen feiten en benoem onzekerheid expliciet.",
    "Noem of reconstrueer nooit persoonsgegevens; [afgelakt] blijft ongewijzigd.",
    SAFE_MARKDOWN_INSTRUCTION,
    "Met 'deze' of 'actuele bevinding' bedoelt de gebruiker altijd de hieronder genoemde actuele bevinding; vraag daar niet opnieuw naar.",
    "Je kunt geen wijziging zelf doorvoeren. Verwijs bij toepassen altijd naar de knop Accepteren.",
    `Actuele bevinding: ${selectedFinding ? `${selectedFinding.title}: ${selectedFinding.detail}` : "geen"}.`,
    `Vergelijkingsbevindingen:\n${findingContext || "Geen bevindingen."}`,
    `Werkdocument (${workDocument.fileName}):\n${workDocument.text}`,
    `Referentiedocument (${referenceDocument.fileName}):\n${referenceDocument.text}`,
  ].join("\n\n");

  return [{ role: "system", content: systemMessage }, ...messages];
}

export function detectEditCommandIntent(message) {
  return EDIT_COMMAND_REGEX.test(String(message ?? "").trim());
}

export function buildSingleReviewEditProposalMessages({ messages, document }) {
  if (!document || typeof document.analysisText !== "string" || !document.analysisText.trim()) {
    throw new Error("Geredigeerde documentcontext ontbreekt.");
  }

  const findings = Array.isArray(document.findings) ? document.findings.slice(0, 40) : [];
  const selectedFinding = findings.find((finding) => finding.id === document.selectedFindingId) ?? null;
  const findingContext = findings
    .map((finding, index) => [
      `${index + 1}. ${finding.title}`,
      `Detail: ${finding.detail}`,
      `Huidige suggestie: ${finding.suggestion}`,
      `Letterlijk fragment: ${finding.matchTexts?.[0] ?? "n.v.t."}`,
    ].join("\n"))
    .join("\n\n");

  const systemMessage = [
    "Je bent een zorgvuldige Nederlandstalige reviewassistent voor IND-nota's.",
    "De gebruiker vraagt expliciet om een tekstwijziging in één bewerkbaar document.",
    "Geef uitsluitend geldige JSON terug zonder code fences of extra tekst buiten de JSON.",
    'Gebruik exact dit schema: {"answer":"...","proposal":{"targetDocument":"document","matchText":"...","suggestion":"...","rationale":"..."}|null}.',
    "answer is een leesbaar antwoord in de veilige lichte Markdown-subset met alleen #/##, - bullets en **vet** voor concrete actiepunten; gebruik nooit HTML.",
    "proposal is alleen toegestaan als je een exact letterlijk citaat uit de geredigeerde documenttekst kunt kiezen dat volledig kan worden vervangen.",
    "matchText moet een exact letterlijk, ononderbroken citaat uit de geredigeerde documenttekst zijn.",
    "suggestion moet de volledige vervangende tekst voor matchText zijn, niet alleen instructies of een gedeeltelijke diff.",
    "Behoud [afgelakt] letterlijk als dat in het citaat of de vervanging voorkomt en reconstrueer nooit persoonsgegevens.",
    "Als je geen veilig exact citaat kunt onderbouwen, zet proposal op null en leg dat kort uit in answer.",
    "Je past niets automatisch toe; je doet alleen een voorstel.",
    `Actuele bevinding: ${selectedFinding ? `${selectedFinding.title}: ${selectedFinding.detail}` : "geen"}.`,
    `Bevindingen:\n${findingContext || "Geen bevindingen."}`,
    `Volledige geredigeerde documenttekst:\n${document.analysisText}`,
  ].join("\n\n");

  return [{ role: "system", content: systemMessage }, ...messages];
}

export function buildComparisonEditProposalMessages({ messages, comparison }) {
  const workDocument = normalizeComparisonDocument(comparison?.workDocument, "Werkdocument");
  const referenceDocument = normalizeComparisonDocument(comparison?.referenceDocument, "Referentiedocument");
  const findings = Array.isArray(comparison?.findings) ? comparison.findings.slice(0, 40) : [];
  const selectedFinding = findings.find((finding) => finding.id === comparison?.selectedFindingId) ?? null;
  const findingContext = findings
    .map((finding, index) => [
      `${index + 1}. ${finding.title}`,
      `Categorie: ${finding.category}`,
      `Detail: ${finding.detail}`,
      `Werkfragment: ${finding.matchTexts?.[0] ?? "n.v.t."}`,
      `Referentiefragment: ${finding.referenceExcerpt ?? "n.v.t."}`,
      `Huidige suggestie: ${finding.suggestion}`,
    ].join("\n"))
    .join("\n\n");

  const systemMessage = [
    "Je bent een zorgvuldige Nederlandstalige vergelijkingsassistent voor IND-documenten.",
    "De gebruiker vraagt expliciet om een tekstwijziging, maar je mag alleen een voorstel doen voor het Werkdocument.",
    "Het Referentiedocument blijft statisch en mag nooit het target van een voorstel zijn.",
    "Geef uitsluitend geldige JSON terug zonder code fences of extra tekst buiten de JSON.",
    'Gebruik exact dit schema: {"answer":"...","proposal":{"targetDocument":"workDocument","matchText":"...","suggestion":"...","rationale":"..."}|null}.',
    "answer is een leesbaar antwoord in de veilige lichte Markdown-subset met alleen #/##, - bullets en **vet** voor concrete actiepunten; gebruik nooit HTML.",
    "proposal is alleen toegestaan als matchText een exact letterlijk, ononderbroken citaat uit het Werkdocument is.",
    "suggestion moet de volledige concrete vervanging voor matchText zijn en mag nooit het Referentiedocument wijzigen.",
    "Gebruik het Referentiedocument alleen als inhoudelijke referentie voor de herschrijving van het Werkdocument.",
    "Behoud [afgelakt] letterlijk als dat in het citaat of de vervanging voorkomt en reconstrueer nooit persoonsgegevens.",
    "Als je geen veilig exact citaat kunt onderbouwen, zet proposal op null en leg dat kort uit in answer.",
    "Je past niets automatisch toe; je doet alleen een voorstel voor het Werkdocument.",
    `Actuele bevinding: ${selectedFinding ? `${selectedFinding.title}: ${selectedFinding.detail}` : "geen"}.`,
    `Vergelijkingsbevindingen:\n${findingContext || "Geen bevindingen."}`,
    `Werkdocument (${workDocument.fileName}):\n${workDocument.text}`,
    `Referentiedocument (${referenceDocument.fileName}):\n${referenceDocument.text}`,
  ].join("\n\n");

  return [{ role: "system", content: systemMessage }, ...messages];
}

export function parseEditProposalResponse(rawContent, { editableText, targetDocument }) {
  const parsed = extractJson(rawContent);
  if (!parsed || typeof parsed.answer !== "string" || !parsed.answer.trim()) {
    throw new Error("De editvoorstel-chat leverde geen geldige JSON-respons op.");
  }

  const answer = finalizeChatAnswer(parsed.answer);
  const proposal = validateEditProposal(parsed.proposal, { editableText, targetDocument });
  return { answer, proposal };
}

export async function collectChatAnswer({
  requestCompletion,
  messages,
  maxCompletionTokens = 1_400,
  maxContinuations = 2,
}) {
  let compiledAnswer = "";
  let continuationMessages = [...messages];
  let lastFinishReason = null;

  for (let continuation = 0; continuation <= maxContinuations; continuation += 1) {
    const data = await requestCompletion({
      messages: continuationMessages,
      max_completion_tokens: maxCompletionTokens,
    });
    const choice = data?.choices?.[0];
    const chunk = typeof choice?.message?.content === "string" ? choice.message.content : "";
    if (!chunk.trim()) {
      throw new Error("Azure OpenAI returned no chat response.");
    }

    compiledAnswer = appendChatChunk(compiledAnswer, chunk);
    lastFinishReason = choice?.finish_reason ?? null;

    if (lastFinishReason !== "length") {
      return {
        answer: finalizeChatAnswer(compiledAnswer),
        finishReason: lastFinishReason,
        continuations: continuation,
      };
    }

    continuationMessages = [
      ...continuationMessages,
      { role: "assistant", content: compiledAnswer },
      { role: "user", content: CONTINUATION_PROMPT },
    ];
  }

  return {
    answer: finalizeChatAnswer(compiledAnswer),
    finishReason: lastFinishReason,
    continuations: maxContinuations,
  };
}

export function finalizeChatAnswer(answer) {
  const trimmed = sanitizeMarkdownAnswer(answer);
  if (!trimmed) {
    throw new Error("Azure OpenAI returned no chat response.");
  }
  if (/[.!?](?:["'”’)\]]+)?\s*$/u.test(trimmed)) {
    return trimmed;
  }

  const lastBoundary = findLastSentenceBoundary(trimmed);
  if (lastBoundary > 0) {
    return trimmed.slice(0, lastBoundary).trim();
  }

  throw new Error("Azure OpenAI leverde geen volledig chatantwoord op binnen de veilige vervolglimiet.");
}

function redactChatContent(content) {
  return redactText(content, detectPii(content));
}

export function sanitizeMarkdownAnswer(answer) {
  const strippedHtml = String(answer ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?[^>]+>/g, "");

  return strippedHtml
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)]\((?:https?:\/\/|mailto:)[^)]+\)/g, "$1")
    .replace(/```/g, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\d+\.\s+/, "- ").replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeComparisonDocument(document, label) {
  const rawText = typeof document?.text === "string"
    ? document.text
    : typeof document?.analysisText === "string"
      ? document.analysisText
      : "";
  const text = redactChatContent(rawText);
  const fileName = typeof document?.fileName === "string" ? document.fileName.trim() : "";

  if (!fileName || !text.trim()) {
    throw new Error(`${label} met volledige geredigeerde tekst is vereist.`);
  }

  return { fileName, text };
}

function appendChatChunk(answer, chunk) {
  const normalizedChunk = String(chunk).trim();
  if (!answer) {
    return normalizedChunk;
  }
  if (!normalizedChunk) {
    return answer;
  }
  return `${answer}${/\s$/.test(answer) || /^[,.;:!?)]/.test(normalizedChunk) ? "" : " "}${normalizedChunk}`;
}

function findLastSentenceBoundary(text) {
  for (let index = text.length - 1; index >= 0; index -= 1) {
    if ([".", "!", "?"].includes(text[index])) {
      return index + 1;
    }
  }
  return -1;
}

function validateEditProposal(proposal, { editableText, targetDocument }) {
  if (!proposal || typeof proposal !== "object") {
    return null;
  }

  const normalizedTarget = typeof proposal.targetDocument === "string" ? proposal.targetDocument.trim() : "";
  const matchText = typeof proposal.matchText === "string" ? proposal.matchText.trim() : "";
  const suggestion = typeof proposal.suggestion === "string" ? proposal.suggestion.trim() : "";
  const rationale = typeof proposal.rationale === "string" ? proposal.rationale.trim() : "";
  if (normalizedTarget !== targetDocument || !matchText || !suggestion || matchText === suggestion) {
    return null;
  }
  if (!containsLiteral(editableText, matchText)) {
    return null;
  }

  return {
    targetDocument,
    matchText,
    suggestion,
    ...(rationale ? { rationale } : {}),
  };
}

function extractJson(rawContent) {
  if (typeof rawContent !== "string" || !rawContent.trim()) {
    return null;
  }

  try {
    return JSON.parse(rawContent);
  } catch {
    const match = rawContent.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function containsLiteral(haystack, needle) {
  if (!needle || typeof haystack !== "string") {
    return false;
  }
  return haystack.toLocaleLowerCase("nl-NL").includes(needle.toLocaleLowerCase("nl-NL"));
}
