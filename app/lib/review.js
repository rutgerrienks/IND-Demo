import mammoth from "mammoth";
import JSZip from "jszip";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  DeletedTextRun,
  InsertedTextRun,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

const REVIEW_CATEGORIES = ["consistency", "contradiction", "completeness"];

const REVIEW_CATEGORY_COLORS = {
  consistency: "blue",
  contradiction: "rose",
  completeness: "amber",
};

const TERMINOLOGY_FAMILIES = [
  {
    id: "document-type",
    label: "Documenttype",
    terms: ["nota", "beleidsnota", "beleidsstuk", "memorandum", "memo"],
    suggestion: "Kies één vaste term voor het documenttype en gebruik die consequent.",
  },
  {
    id: "decision",
    label: "Besluit",
    terms: ["besluit", "beslissing", "voorgenomen besluit"],
    suggestion: "Gebruik één vaste term voor het besluit en verwijs daar overal naar.",
  },
  {
    id: "process",
    label: "Proces",
    terms: ["proces", "werkwijze", "stappenplan"],
    suggestion: "Gebruik één vaste benaming voor het proces en herhaal die consistent.",
  },
];

const DATE_PATTERNS = [
  { id: "iso", regex: /\b\d{4}-\d{2}-\d{2}\b/g, label: "ISO-datum" },
  { id: "dmy-slash", regex: /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, label: "Numerieke datum" },
  { id: "long-nl", regex: /\b\d{1,2}\s+[A-Za-zÀ-ÿ]+\s+\d{4}\b/g, label: "Uitgeschreven datum" },
  { id: "dot", regex: /\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g, label: "Puntnotatie datum" },
];

const REFERENCE_PATTERNS = [
  { id: "bracket", regex: /\[[^\]]+\]/g, label: "Vierkante haakjes" },
  { id: "paren", regex: /\([^)]+\d{4}[^)]*\)/g, label: "Auteur-jaar tussen haakjes" },
  { id: "bron", regex: /\bBron\s*:/gi, label: "Bronvermelding" },
];

const FORMAL_WORDS = ["u", "uw", "uitleg", "verzoek", "vriendelijke", "graag"];
const INFORMAL_WORDS = ["je", "jij", "jou", "jullie", "even", "ff"];
const HEADING_HINTS = ["inleiding", "probleemstelling", "argumentatie", "conclusie", "samenvatting", "besluit"];

export async function parseReviewDocument(buffer, { findings = [] } = {}) {
  const [htmlResult, textResult] = await Promise.all([
    mammoth.convertToHtml({ buffer }),
    mammoth.extractRawText({ buffer }),
  ]);

  const html = htmlResult.value;
  const text = normalizeText(textResult.value);
  const piiMatches = detectPii(text);
  const analysisText = redactText(text, piiMatches);
  const paragraphs = splitParagraphs(analysisText);
  const tables = countTables(html);
  const normalizedFindings = sanitizePreviewFindings(findings, { text: analysisText });

  const summary = {
    wordCount: countWords(analysisText),
    paragraphCount: paragraphs.length,
    tableCount: tables,
    piiCount: piiMatches.length,
    findingCount: normalizedFindings.length,
  };

  return {
    html: redactText(html, piiMatches),
    text: analysisText,
    analysisText,
    paragraphs,
    tables,
    piiMatches,
    findings: normalizedFindings,
    summary,
    stages: [
      "Upload gecontroleerd",
      "Document geparsed",
      "Deterministische controles uitgevoerd",
    ],
  };
}

export function buildSemanticReviewMessages({ fileName, text, summary = {} }) {
  const systemMessage = [
    "Je bent een zorgvuldige Nederlandstalige reviewassistent voor IND-nota's.",
    "Voer één semantische documentreview uit op basis van uitsluitend de volledig geredigeerde documenttekst hieronder.",
    "Beoordeel het document uitsluitend langs exact drie categorieën: consistency, contradiction en completeness.",
    "Gebruik de volledige geredigeerde tekst als context; beperk je nooit tot een korte selectie of alleen opvallende zinnen.",
    "Persoonsgegevens zijn al afgelakt. Laat '[afgelakt]' onveranderd, reconstrueer niets en noem geen nieuwe persoonsgegevens.",
    "Deterministische metadata zoals woordaantal, alinea-aantal en aantal tabellen mag je meewegen, maar alle inhoudelijke bevindingen moeten uit jouw semantische beoordeling komen.",
    "Geef uitsluitend geldige JSON terug, zonder Markdown-opmaak of extra toelichting.",
    "Het JSON-object heeft exact deze vorm: "
      + '{"findings":[{"category":"consistency|contradiction|completeness","title":"...","detail":"...","advice":"...","suggestion":"...","example":"...","matchText":"..."}]}',
    "matchText is verplicht en moet een letterlijk, ononderbroken en zo kort mogelijk citaat uit de geredigeerde documenttekst zijn dat exact zo voorkomt, zodat preview en toepassen veilig blijven werken.",
    "advice beschrijft kort wat inhoudelijk moet verbeteren, bijvoorbeeld dat drie argumenten nodig zijn.",
    "suggestion is altijd de volledige, direct publiceerbare vervangende tekst voor matchText en voert advice inhoudelijk uit.",
    "Ook voor volledigheidsissues kies je een bestaand ankerfragment en schrijf je in suggestion zelf de ontbrekende argumenten, bronnen of besluitpunten uit.",
    "suggestion mag nooit een instructie zijn zoals 'voeg argumenten toe', 'werk dit uit' of 'pas dit aan'.",
    "Geef maximaal 10 bevindingen, gesorteerd op belang.",
  ].join(" ");

  const userMessage = [
    `Bestandsnaam: ${fileName}`,
    `Metadata: woorden=${summary.wordCount ?? 0}, alinea's=${summary.paragraphCount ?? 0}, tabellen=${summary.tableCount ?? 0}.`,
    `Volledige geredigeerde documenttekst:\n${text}`,
  ].join("\n\n");

  return [
    { role: "system", content: systemMessage },
    { role: "user", content: userMessage },
  ];
}

export function isInstructionalSuggestion(value) {
  return /^(voeg|werk|herschrijf|licht|noem|beschrijf|onderbouw|verduidelijk|pas|schrap|controleer|vul)\b/iu.test(
    String(value ?? "").trim(),
  );
}

export function buildConcreteReplacementMessages({ fileName, text, title, detail, advice, matchText }) {
  return [
    {
      role: "system",
      content: [
        "Je zet een inhoudelijk reviewadvies om in direct publiceerbare Nederlandstalige vervangtekst voor een IND-nota.",
        "Geef uitsluitend JSON terug als {\"suggestion\":\"...\"}.",
        "Schrijf de ontbrekende inhoud zelf uit. Gebruik nooit een instructie zoals 'voeg toe', 'werk uit' of 'herschrijf'.",
        "De suggestion vervangt het opgegeven matchText volledig, past bij de omliggende documentcontext en bevat geen nieuwe persoonsgegevens.",
        "Laat '[afgelakt]' onveranderd en verzin geen specifieke bronverwijzing als de documentcontext geen bron biedt.",
      ].join(" "),
    },
    {
      role: "user",
      content: [
        `Bestandsnaam: ${fileName}`,
        `Bevinding: ${title}`,
        `Toelichting: ${detail}`,
        `Advies: ${advice}`,
        `Te vervangen tekst:\n${matchText}`,
        `Volledige geredigeerde documenttekst:\n${text}`,
      ].join("\n\n"),
    },
  ];
}

export function parseConcreteReplacement(rawContent) {
  const parsed = extractJson(rawContent);
  const suggestion = typeof parsed?.suggestion === "string" ? parsed.suggestion.trim() : "";
  if (!suggestion || isInstructionalSuggestion(suggestion)) {
    throw new Error("Het tekstvoorstel kon niet als concrete vervangende notatekst worden opgesteld.");
  }
  return suggestion;
}

export function parseSemanticReviewFindings(rawContent, { text }) {
  const parsed = extractJson(rawContent);
  if (!parsed || !Array.isArray(parsed.findings)) {
    throw new Error("De documentanalyse leverde geen geldige JSON-resultaatvorm op.");
  }

  const findings = parsed.findings.flatMap((item, index) => {
    const normalized = normalizeFinding(item, index, { text, idPrefix: "review" });
    if (!normalized || !normalized.title || !normalized.detail || !normalized.suggestion) {
      return [];
    }
    return [normalized];
  });

  return findings.slice(0, 10);
}

export function sanitizePreviewFindings(findings, { text }) {
  if (!Array.isArray(findings)) {
    return [];
  }

  return findings.flatMap((item, index) => {
    const normalized = normalizeFinding(item, index, {
      text,
      idPrefix: typeof item?.id === "string" && item.id.trim() ? item.id.trim() : "preview",
      preserveId: true,
      requireCoreFields: false,
    });
    return normalized ? [normalized] : [];
  });
}

export async function convertDocxToPdf(buffer, fileName) {
  const gotenbergUrl = process.env.GOTENBERG_URL;
  if (!gotenbergUrl) {
    return null;
  }

  const formData = new FormData();
  formData.append("files", new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), fileName);

  const response = await fetch(`${gotenbergUrl.replace(/\/$/, "")}/forms/libreoffice/convert`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gotenberg preview conversion failed (${response.status}): ${message}`);
  }

  const contentType = response.headers.get("content-type") || "application/pdf";
  const pdfBuffer = Buffer.from(await response.arrayBuffer());
  return {
    buffer: pdfBuffer,
    mimeType: contentType,
    dataUrl: `data:${contentType};base64,${pdfBuffer.toString("base64")}`,
  };
}

export async function annotateDocxForPreview(buffer, { piiMatches = [], findings = [] }) {
  const zip = await JSZip.loadAsync(buffer);
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) {
    throw new Error("DOCX document.xml is missing.");
  }

  const tokens = buildAnnotationTokens(piiMatches, findings);
  if (tokens.length === 0) {
    return buffer;
  }

  const documentXml = await documentFile.async("string");
  zip.file("word/document.xml", annotateDocumentXml(documentXml, tokens));
  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
}

export async function applySuggestionToDocx(buffer, { matchText, suggestion }) {
  if (!matchText || !suggestion) {
    throw new Error("Tekstfragment en suggestie zijn beide vereist voor een echte documentwijziging.");
  }

  const zip = await JSZip.loadAsync(buffer);
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) {
    throw new Error("DOCX document.xml is missing.");
  }

  const documentXml = await documentFile.async("string");
  const { xml, replaced } = replaceDocxRunText(documentXml, matchText, suggestion);
  if (!replaced) {
    throw new Error("Het tekstfragment is niet (meer) letterlijk teruggevonden in het Werkdocument.");
  }

  zip.file("word/document.xml", xml);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

export async function rewriteDocxAndRevalidate(buffer, { matchText, suggestion, remainingFindings = [] }) {
  const updatedBuffer = await applySuggestionToDocx(buffer, { matchText, suggestion });
  const updatedReview = await parseReviewDocument(updatedBuffer);
  const safeDocxBuffer = updatedReview.piiMatches.length > 0
    ? await annotateDocxForPreview(updatedBuffer, { piiMatches: updatedReview.piiMatches, findings: [] })
    : updatedBuffer;

  return {
    safeDocxBuffer,
    analysisText: updatedReview.analysisText,
    findings: sanitizePreviewFindings(remainingFindings, { text: updatedReview.analysisText }),
    piiMatches: updatedReview.piiMatches,
  };
}

export function buildVersioningMetadata({
  currentVersion = 1,
  versionHistory = [],
  findingId = "",
  findingTitle = "",
  matchText = "",
  updatedAt = new Date().toISOString(),
} = {}) {
  const previousVersion = normalizePositiveInteger(currentVersion, 1);
  const nextVersion = previousVersion + 1;
  const safeFindingId = typeof findingId === "string" ? findingId.trim() : "";
  const safeFindingTitle = typeof findingTitle === "string" ? findingTitle.trim() : "";
  const fallbackLabelSource = typeof matchText === "string" ? matchText.trim() : "";
  const labelTail = safeFindingTitle || truncateText(fallbackLabelSource, 80) || "Documentwijziging";
  const label = `Na acceptatie: ${labelTail}`;
  const historyEntry = { version: nextVersion, label, at: updatedAt };
  const normalizedHistory = Array.isArray(versionHistory)
    ? versionHistory.flatMap((entry) => normalizeVersionHistoryEntry(entry))
    : [];
  const mergedHistory = [...normalizedHistory.filter((entry) => entry.version !== nextVersion), historyEntry]
    .sort((left, right) => left.version - right.version);

  return {
    previousVersion,
    nextVersion,
    label,
    updatedAt,
    appliedFindingId: safeFindingId || null,
    historyEntry,
    versionHistory: mergedHistory,
  };
}

function replaceDocxRunText(xml, matchText, replacementText) {
  let replaced = false;
  const regex = createTokenRegex(matchText);

  const nextXml = xml.replace(/<w:r(\s[^>]*)?>([\s\S]*?)<\/w:r>/g, (runXml, runAttributes = "", runInner) => {
    if (replaced) return runXml;

    const textMatches = [...runInner.matchAll(/<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g)];
    if (textMatches.length !== 1) {
      return runXml;
    }

    const textMatch = textMatches[0];
    const decodedText = decodeXmlText(textMatch[2]);
    regex.lastIndex = 0;
    if (!regex.test(decodedText)) {
      return runXml;
    }

    regex.lastIndex = 0;
    const updatedText = decodedText.replace(regex, () => replacementText);
    replaced = true;

    const textAttributes = textMatch[1] ?? "";
    const runPropertiesMatch = runInner.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
    const runProperties = runPropertiesMatch ? `<w:rPr>${runPropertiesMatch[1]}</w:rPr>` : "";

    return `<w:r${runAttributes}>${runProperties}<w:t${ensurePreserveSpace(textAttributes)}>${encodeXmlText(updatedText)}</w:t></w:r>`;
  });

  if (replaced) return { xml: nextXml, replaced };

  const paragraphXml = nextXml.replace(/<w:p(\s[^>]*)?>([\s\S]*?)<\/w:p>/g, (paragraph, _attributes, inner) => {
    if (replaced) return paragraph;
    const textNodes = [...inner.matchAll(/<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((match) => ({
      full: match[0],
      attributes: match[1] ?? "",
      text: decodeXmlText(match[2]),
    }));
    if (textNodes.length < 2) return paragraph;

    const combined = textNodes.map((node) => node.text).join("");
    regex.lastIndex = 0;
    const match = regex.exec(combined);
    if (!match) return paragraph;

    const start = match.index;
    const end = start + match[0].length;
    let cursor = 0;
    const replacements = textNodes.map((node) => {
      const nodeStart = cursor;
      const nodeEnd = cursor + node.text.length;
      cursor = nodeEnd;
      if (nodeEnd <= start || nodeStart >= end) return node.text;

      const prefix = start > nodeStart ? node.text.slice(0, start - nodeStart) : "";
      const suffix = end < nodeEnd ? node.text.slice(end - nodeStart) : "";
      const isFirstAffected = start >= nodeStart && start < nodeEnd;
      return `${prefix}${isFirstAffected ? replacementText : ""}${suffix}`;
    });

    let nodeIndex = 0;
    const updatedInner = inner.replace(/<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g, (_textNode, attributes = "") => {
      const value = replacements[nodeIndex];
      nodeIndex += 1;
      return `<w:t${ensurePreserveSpace(attributes)}>${encodeXmlText(value)}</w:t>`;
    });
    replaced = true;
    return paragraph.replace(inner, updatedInner);
  });

  if (replaced) return { xml: paragraphXml, replaced };
  return replaceAcrossDocxParagraphs(paragraphXml, regex, replacementText);
}

function replaceAcrossDocxParagraphs(xml, regex, replacementText) {
  const paragraphs = [...xml.matchAll(/<w:p(\s[^>]*)?>([\s\S]*?)<\/w:p>/g)].map((match) => ({
    xml: match[0],
    attributes: match[1] ?? "",
    inner: match[2],
    xmlStart: match.index,
    xmlEnd: match.index + match[0].length,
    text: [...match[2].matchAll(/<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
      .map((textMatch) => decodeXmlText(textMatch[2]))
      .join(""),
  }));
  if (paragraphs.length < 2) return { xml, replaced: false };

  let offset = 0;
  for (const paragraph of paragraphs) {
    paragraph.textStart = offset;
    paragraph.textEnd = offset + paragraph.text.length;
    offset = paragraph.textEnd + 2;
  }
  const combinedText = paragraphs.map((paragraph) => paragraph.text).join("\n\n");
  regex.lastIndex = 0;
  const match = regex.exec(combinedText);
  if (!match || !match[0].includes("\n")) return { xml, replaced: false };

  const matchStart = match.index;
  const matchEnd = matchStart + match[0].length;
  const firstIndex = paragraphs.findIndex((paragraph) => matchStart <= paragraph.textEnd);
  const lastIndex = paragraphs.findLastIndex((paragraph) => matchEnd >= paragraph.textStart);
  if (firstIndex < 0 || lastIndex <= firstIndex) return { xml, replaced: false };

  const affected = paragraphs.slice(firstIndex, lastIndex + 1);
  const prefix = affected[0].text.slice(0, Math.max(0, matchStart - affected[0].textStart));
  const suffix = affected.at(-1).text.slice(Math.max(0, matchEnd - affected.at(-1).textStart));
  const replacementParagraphs = replacementText.split(/\r?\n+/);
  replacementParagraphs[0] = `${prefix}${replacementParagraphs[0] ?? ""}`;
  replacementParagraphs[replacementParagraphs.length - 1] += suffix;

  const replacementXml = replacementParagraphs.map((text, index) => {
    const template = affected[Math.min(index, affected.length - 1)];
    const paragraphProperties = template.inner.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] ?? "";
    const runProperties = template.inner.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? "";
    return `<w:p${template.attributes}>${paragraphProperties}<w:r>${runProperties}<w:t xml:space="preserve">${encodeXmlText(text)}</w:t></w:r></w:p>`;
  }).join("");

  return {
    xml: `${xml.slice(0, affected[0].xmlStart)}${replacementXml}${xml.slice(affected.at(-1).xmlEnd)}`,
    replaced: true,
  };
}

export function buildActionLogEntries({ fileName, summary, tables, piiMatches, findings }) {
  const entries = [
    `Bestand geüpload: ${fileName}`,
    `Analyse gestart: ${summary.wordCount} woorden, ${summary.paragraphCount} alinea's`,
  ];

  if (tables > 0) {
    entries.push(`Tabel(len) gedetecteerd: ${tables} — onveranderlijk behandeld`);
  }

  if (piiMatches.length > 0) {
    entries.push(`Persoonsgegevens afgelakt: ${piiMatches.length} patronen`);
  }

  findings.forEach((finding) => {
    entries.push(`Bevinding: ${finding.title}`);
  });

  entries.push("Analyse afgerond");
  return entries;
}

export async function buildReviewExportDocx({ user, fileName, text, findings, logEntries, summary, appliedFindings = [], piiMatches = [] }) {
  const redactedText = redactText(text, piiMatches);
  return buildDocx([
    new Paragraph({
      text: "IND Demo — review resultaat",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: `Gebruiker: ${user.name} (${user.role})`,
      spacing: { after: 120 },
    }),
    new Paragraph({
      text: `Bestand: ${fileName}`,
      spacing: { after: 120 },
    }),
    new Paragraph({
      text: `Samenvatting: ${summary.wordCount} woorden, ${summary.paragraphCount} alinea's, ${summary.tableCount} tabel(len), ${summary.piiCount} PII-patro(o)n(en), ${summary.findingCount} bevindingen`,
      spacing: { after: 240 },
    }),
    new Paragraph({ text: "Voorgestelde wijzigingen", heading: HeadingLevel.HEADING_1 }),
    ...findings.map((finding) =>
      new Paragraph({
        children: [
          new TextRun({ text: `${finding.title}: `, bold: true }),
          new DeletedTextRun({ text: finding.matchTexts?.[0] || finding.detail }),
          new TextRun({ text: " → " }),
          new InsertedTextRun({ text: finding.suggestion }),
        ],
      }),
    ),
    ...findings.flatMap((finding) => [
      new Paragraph({ text: finding.title, heading: HeadingLevel.HEADING_1 }),
      new Paragraph({
        children: [new TextRun({ text: finding.detail, italics: true })],
      }),
      new Paragraph({
        children: [new TextRun({ text: "Suggestie: ", bold: true }), new TextRun(finding.suggestion)],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Status: ", bold: true }),
          new TextRun(appliedFindings.includes(finding.id) ? "toegepast" : "open"),
        ],
        spacing: { after: 120 },
      }),
    ]),
    new Paragraph({ text: "Actielog", heading: HeadingLevel.HEADING_1 }),
    ...logEntries.map((entry) => new Paragraph({ text: `• ${entry.message ?? entry}` })),
    new Paragraph({ text: "Documenttekst (extract)", heading: HeadingLevel.HEADING_1 }),
    ...redactedText.split(/\n+/).filter(Boolean).map((line) => new Paragraph({ text: line })),
  ]);
}

export async function buildActionLogDocx({ user, logEntries }) {
  return buildDocx([
    new Paragraph({
      text: "IND Demo — actielog",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: `Gebruiker: ${user.name} (${user.role})`,
      spacing: { after: 120 },
    }),
    new Paragraph({
      text: "Acties",
      heading: HeadingLevel.HEADING_1,
    }),
    ...logEntries.map((entry) => new Paragraph({ text: `• ${entry.message ?? entry}` })),
  ]);
}

export function analyzeConsistency(paragraphs, text) {
  const findings = [];
  const lowerText = text.toLowerCase();

  const formalCount = countWordsBySet(lowerText, FORMAL_WORDS);
  const informalCount = countWordsBySet(lowerText, INFORMAL_WORDS);
  if (formalCount > 0 && informalCount > 0) {
    findings.push({
      id: "tone-mixed",
      category: "consistency",
      group: "Tone of Voice",
      title: "Tone of voice is gemengd",
      detail: "De tekst gebruikt zowel formele als informele aanspreekvormen.",
      suggestion: "Kies consequent voor u/uw of je/jouw en voer dat overal door.",
      example: "Bijvoorbeeld: vervang alle informele aanspreekvormen door 'u' en 'uw'.",
      color: "blue",
      matchTexts: findFirstMatches(text, [...FORMAL_WORDS, ...INFORMAL_WORDS]),
    });
  }

  const headingHits = HEADING_HINTS.filter((hint) => lowerText.includes(hint));
  if (headingHits.length < 2 || !lowerText.includes("conclusie")) {
    findings.push({
      id: "layout-structure",
      category: "consistency",
      group: "Layout",
      title: "Structuur mist herkenbare onderdelen",
      detail: "De opbouw bevat onvoldoende vaste secties voor een leesbare beleidsnotitie.",
      suggestion: "Voeg kopjes toe in de volgorde: inleiding, kern en conclusie.",
      example: "Gebruik bijvoorbeeld de secties 'Inleiding', 'Analyse' en 'Conclusie'.",
      color: "amber",
      matchTexts: headingHits.slice(0, 3),
    });
  }

  const terminologyFinding = findTerminologyMismatch(lowerText);
  if (terminologyFinding) {
    findings.push(terminologyFinding);
  }

  const dateStyles = DATE_PATTERNS.filter((pattern) => hasPattern(lowerText, pattern.regex));
  if (dateStyles.length > 1) {
    findings.push({
      id: "dates-mixed",
      category: "consistency",
      group: "Datums",
      title: "Meerdere datumnotaties gebruikt",
      detail: `De tekst gebruikt ${dateStyles.map((style) => style.label.toLowerCase()).join(", ")}.`,
      suggestion: "Gebruik overal één datumstijl, bijvoorbeeld 13-08-2026.",
      example: "Herschrijf alle datums naar dezelfde notatie, bijvoorbeeld dd-mm-jjjj.",
      color: "rose",
      matchTexts: dateStyles.flatMap((pattern) => matchAll(lowerText, pattern.regex)).slice(0, 6),
    });
  }

  const referenceStyles = REFERENCE_PATTERNS.filter((pattern) => hasPattern(text, pattern.regex));
  if (referenceStyles.length > 1) {
    findings.push({
      id: "references-mixed",
      category: "consistency",
      group: "Referenties",
      title: "Referenties hebben geen uniforme stijl",
      detail: `Er worden meerdere referentiestijlen gebruikt: ${referenceStyles.map((style) => style.label).join(", ")}.`,
      suggestion: "Kies één referentiestijl, bijvoorbeeld auteur-jaar of voetnoot, en pas die overal toe.",
      example: "Bijvoorbeeld: gebruik overal de vorm '(Jansen, 2024)'.",
      color: "blue",
      matchTexts: referenceStyles.flatMap((pattern) => matchAll(text, pattern.regex)).slice(0, 6),
    });
  }

  const wordCount = countWords(text);
  if (wordCount > 120 && !lowerText.includes("inleiding")) {
    findings.push({
      id: "document-type-norm",
      category: "consistency",
      group: "Norm documenttype",
      title: "Opbouw voldoet niet aan de norm van het documenttype",
      detail: "Een langere notitie mist een herkenbare inleiding of probleemstelling.",
      suggestion: "Voeg een korte inleiding toe met context, doel en scope.",
      example: "Start met: 'Dit document beschrijft het doel, de context en de scope van het voorstel.'",
      color: "amber",
      matchTexts: findFirstSentences(paragraphs, 1),
    });
  }

  return findings;
}

export function analyzeContradictions(paragraphs, text) {
  const findings = [];
  const lowerText = text.toLowerCase();
  const contradictionParagraphs = paragraphs.filter((paragraph) => {
    const lower = paragraph.toLowerCase();
    return (lower.includes("wel") && lower.includes("niet")) || (lower.includes("enerzijds") && lower.includes("anderzijds")) || (lower.includes("maar") && lower.includes("toch"));
  });

  if (contradictionParagraphs.length > 0) {
    findings.push({
      id: "self-contradiction",
      category: "contradiction",
      group: "Zelf-tegenspraak",
      title: "De tekst bevat mogelijk tegenstrijdige formuleringen",
      detail: contradictionParagraphs[0],
      suggestion: "Herschrijf de passage tot één eenduidige lijn zonder 'wel/niet'-spanning.",
      example: "Laat alleen de gekozen lijn staan en schrap de tegenstrijdige nuance.",
      color: "rose",
      matchTexts: [contradictionParagraphs[0].slice(0, 120)],
    });
  }

  if (paragraphs.length > 2 && /(?:daarom|dus|concluderend|samenvattend)/i.test(text) === false) {
    findings.push({
      id: "logical-structure",
      category: "contradiction",
      group: "Logische opbouw",
      title: "De opbouw kan logischer",
      detail: "Er ontbreekt een expliciete overgang van argumentatie naar conclusie.",
      suggestion: "Sluit af met een expliciete conclusie of besluitpunt.",
      example: "Voeg bijvoorbeeld een slotalinea toe met: 'Concluderend adviseren wij ...'.",
      color: "amber",
      matchTexts: findFirstSentences(paragraphs, 2),
    });
  }

  return findings;
}

export function analyzeCompleteness(paragraphs, text) {
  const findings = [];
  const lowerText = text.toLowerCase();

  if (!/(afzender|van:|door:)/i.test(text) || !/(datum|d.d\.|opgesteld op)/i.test(text)) {
    findings.push({
      id: "metadata-missing",
      category: "completeness",
      group: "Metadata",
      title: "Metadata is niet volledig",
      detail: "Afzender en/of datum zijn niet expliciet benoemd.",
      suggestion: "Voeg bovenaan afzender, datum en onderwerp toe in een vaste kopregel.",
      example: "Bijvoorbeeld: 'Van: [naam] · Datum: [dd-mm-jjjj] · Onderwerp: [onderwerp]'.",
      color: "blue",
      matchTexts: findFirstParagraphs(paragraphs, 1),
    });
  }

  if (!lowerText.includes("besluit") && !lowerText.includes("proces") && !lowerText.includes("werkwijze")) {
    findings.push({
      id: "decision-process-missing",
      category: "completeness",
      group: "Besluit / proces",
      title: "Voorgesteld besluit of proces ontbreekt",
      detail: "De tekst beschrijft de context, maar het besluit of proces is niet duidelijk uitgewerkt.",
      suggestion: "Werk het voorgestelde besluit of de processtappen expliciet uit.",
      example: "Voeg bijvoorbeeld een alinea toe met 'Voorgesteld besluit:' of 'Processtappen: 1...'.",
      color: "rose",
      matchTexts: findFirstSentences(paragraphs, 1),
    });
  }

  if (!lowerText.includes("onderbouwing") && !lowerText.includes("argument") && !lowerText.includes("motivatie")) {
    findings.push({
      id: "argumentation-missing",
      category: "completeness",
      group: "Argumentatie",
      title: "Argumentatie mist diepgang",
      detail: "Cruciale onderbouwing voor de conclusie is beperkt aanwezig.",
      suggestion: "Voeg 2-3 concrete argumenten of bronnen toe die het standpunt ondersteunen.",
      example: "Werk bijvoorbeeld uit waarom dit voorstel beter past, wat het alternatief is en welke bron dit ondersteunt.",
      color: "amber",
      matchTexts: findFirstSentences(paragraphs, 2),
    });
  }

  return findings;
}

export function detectPii(text) {
  const matches = [];
  const patterns = [
    { type: "email", regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
    { type: "phone", regex: /\b(?:06|\+31\s?6)(?:[\s-]?\d){8}\b/g },
    { type: "bsn", regex: /\b\d{9}\b/g, validator: isValidBsn },
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern.regex)) {
      if (pattern.validator && !pattern.validator(match[0])) {
        continue;
      }
      matches.push({
        type: pattern.type,
        value: match[0],
      });
    }
  }

  return uniqueBy(matches, (item) => `${item.type}:${item.value}`);
}

export function countTables(html) {
  return (html.match(/<table[\s>]/gi) || []).length;
}

export async function createOpenAiProxyRequest({ endpoint, deployment, apiVersion, apiKey, body }) {
  const url = `${endpoint.replace(/\/$/, "")}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    if (errorBody.includes('"content_filter"') || errorBody.includes("ResponsibleAIPolicyViolation")) {
      throw new Error(
        "Deze vraag valt buiten de context van deze applicatie. De assistent beantwoordt alleen vragen over het geopende document en de review. Formuleer je vraag opnieuw binnen die context."
      );
    }
    throw new Error(`Azure OpenAI request failed (${response.status}): ${errorBody}`);
  }

  return response.json();
}

function findTerminologyMismatch(lowerText) {
  for (const family of TERMINOLOGY_FAMILIES) {
    const present = family.terms.filter((term) => new RegExp(`\\b${escapeRegex(term)}\\b`, "i").test(lowerText));
    if (present.length > 1) {
      return {
        id: `${family.id}-mixed`,
        category: "consistency",
        group: family.label,
        title: `${family.label} wordt niet consequent gebruikt`,
        detail: `De tekst gebruikt ${present.join(", ")} door elkaar.`,
        suggestion: family.suggestion,
        example: `Gebruik bijvoorbeeld "${present[0]}" als vaste term en vervang de andere varianten overal.`,
        color: "blue",
        matchTexts: present,
      };
    }
  }

  return null;
}

function buildAnnotationTokens(piiMatches, findings) {
      const tokens = [];
      const seen = new Set();

      for (const match of piiMatches) {
        addAnnotationToken(tokens, seen, {
          text: match.value,
          highlight: "black",
          redact: true,
          priority: 100,
        });
      }

      const highlightByColor = {
        blue: "cyan",
        amber: "yellow",
        rose: "magenta",
      };

      for (const finding of findings) {
        for (const text of finding.matchTexts ?? []) {
          addAnnotationToken(tokens, seen, {
            text,
            highlight: highlightByColor[finding.color] ?? "yellow",
            redact: false,
            priority: 10,
          });
        }
      }

      return tokens.sort((left, right) => right.priority - left.priority || right.text.length - left.text.length);
}

function addAnnotationToken(tokens, seen, token) {
      const text = String(token.text ?? "").trim();
      if (!text) return;
      const key = text.toLocaleLowerCase("nl-NL");
      if (seen.has(key)) return;
      seen.add(key);
      tokens.push({ ...token, text });
}

function annotateDocumentXml(xml, tokens) {
  return xml.replace(/<w:p(\s[^>]*)?>([\s\S]*?)<\/w:p>/g, (paragraphXml, paragraphAttributes = "", paragraphInner) => {
    const annotatedInner = annotateParagraphRuns(paragraphInner, tokens);
    return annotatedInner === paragraphInner ? paragraphXml : `<w:p${paragraphAttributes}>${annotatedInner}</w:p>`;
  });
}

function splitAnnotatedText(text, tokens) {
  const selectedMatches = selectTokenMatches(text, tokens);
  if (selectedMatches.length === 0) {
    return [{ text, token: null }];
  }

  const segments = [];
  let cursor = 0;
  for (const match of selectedMatches) {
    if (match.start > cursor) {
      segments.push({ text: text.slice(cursor, match.start), token: null });
    }
    segments.push({ text: text.slice(match.start, match.end), token: match.token });
    cursor = match.end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), token: null });
  }
  return segments;
}

function createTokenRegex(text) {
      const escaped = String(text)
        .trim()
        .split(/\s+/u)
        .map((part) => escapeRegex(part))
        .join("\\s+");
      const startsWithWord = /^[\p{L}\p{N}]/u.test(text);
      const endsWithWord = /[\p{L}\p{N}]$/u.test(text);
      return new RegExp(`${startsWithWord ? "(?<![\\p{L}\\p{N}])" : ""}${escaped}${endsWithWord ? "(?![\\p{L}\\p{N}])" : ""}`, "giu");
}

function ensurePreserveSpace(attributes) {
      return attributes.includes("xml:space=") ? attributes : `${attributes} xml:space="preserve"`;
}

function decodeXmlText(text) {
      return text
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, "&");
}

function encodeXmlText(text) {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function findFirstMatches(text, needles) {
  const results = [];
  for (const needle of needles) {
    const regex = new RegExp(`\\b${escapeRegex(needle)}\\b`, "gi");
    const match = regex.exec(text);
    if (match) {
      results.push(match[0]);
    }
  }
  return unique(results).slice(0, 5);
}

function findFirstSentences(paragraphs, limit) {
  return paragraphs.slice(0, limit).map((paragraph) => paragraph.slice(0, 180));
}

function findFirstParagraphs(paragraphs, limit) {
  return paragraphs.slice(0, limit);
}

function splitParagraphs(text) {
  return normalizeText(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeText(text) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function countWordsBySet(text, words) {
  return words.reduce((sum, word) => sum + (text.match(new RegExp(`\\b${escapeRegex(word)}\\b`, "gi"))?.length || 0), 0);
}

function isValidBsn(value) {
  const digits = value.split("").map((digit) => Number(digit));
  if (digits.length !== 9 || digits.some(Number.isNaN)) {
    return false;
  }
  const total = digits.slice(0, 8).reduce((sum, digit, index) => sum + digit * (9 - index), 0) - digits[8];
  return total % 11 === 0;
}

function unique(list) {
  return [...new Set(list)];
}

function uniqueBy(list, keyFn) {
  const seen = new Set();
  return list.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hasPattern(text, regex) {
  return new RegExp(regex.source, regex.flags).test(text);
}

function matchAll(text, regex) {
  return [...text.matchAll(new RegExp(regex.source, regex.flags))].map((match) => match[0]);
}

function buildDocx(children) {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

export function redactText(text, piiMatches) {
  return piiMatches.reduce((output, match) => output.replaceAll(match.value, "[afgelakt]"), text);
}

function normalizeFinding(item, index, { text, idPrefix, preserveId = false, requireCoreFields = true }) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const category = REVIEW_CATEGORIES.includes(item.category) ? item.category : null;
  if (!category) {
    return null;
  }

  const matchTexts = uniqueBy(
    [
      ...(Array.isArray(item.matchTexts) ? item.matchTexts : []),
      typeof item.matchText === "string" ? item.matchText : "",
      typeof item.workExcerpt === "string" ? item.workExcerpt : "",
    ]
      .map((value) => typeof value === "string" ? value.trim() : "")
      .filter(Boolean)
      .filter((value) => containsLiteral(text, value)),
    (value) => value.toLocaleLowerCase("nl-NL"),
  ).slice(0, 3);

  if (matchTexts.length === 0) {
    return null;
  }

  const title = typeof item.title === "string" ? item.title.trim() : "";
  const detail = typeof item.detail === "string" ? item.detail.trim() : "";
  const suggestion = typeof item.suggestion === "string" ? item.suggestion.trim() : "";
  const advice = typeof item.advice === "string" ? item.advice.trim() : "";
  const example = typeof item.example === "string" ? item.example.trim() : "";
  if (requireCoreFields && (!title || !detail || !suggestion)) {
    return null;
  }

  return {
    id: preserveId ? idPrefix : `${idPrefix}-${index}-${category}`,
    category,
    group: typeof item.group === "string" && item.group.trim() ? item.group.trim() : category,
    title,
    detail,
    advice,
    suggestion,
    example,
    color: REVIEW_CATEGORY_COLORS[category] ?? "blue",
    matchTexts,
    ...(typeof item.referenceExcerpt === "string" && item.referenceExcerpt.trim()
      ? { referenceExcerpt: item.referenceExcerpt.trim() }
      : {}),
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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function annotateParagraphRuns(paragraphInner, tokens) {
  const runs = extractParagraphRuns(paragraphInner);
  const textRuns = runs.filter((run) => run.text !== null);
  if (textRuns.length === 0) {
    return paragraphInner;
  }

  let cursor = 0;
  for (const run of textRuns) {
    run.start = cursor;
    run.end = cursor + run.text.length;
    cursor = run.end;
  }

  const combinedText = textRuns.map((run) => run.text).join("");
  const selectedMatches = selectTokenMatches(combinedText, tokens);
  if (selectedMatches.length === 0) {
    return paragraphInner;
  }

  const runPlans = new Map();
  for (const run of textRuns) {
    const segments = buildRunAnnotationSegments(run, selectedMatches);
    if (segments) {
      runPlans.set(run.index, { ...run, segments });
    }
  }

  if (runPlans.size === 0) {
    return paragraphInner;
  }

  let runIndex = 0;
  return paragraphInner.replace(/<w:r(\s[^>]*)?>([\s\S]*?)<\/w:r>/g, (runXml) => {
    const plan = runPlans.get(runIndex);
    runIndex += 1;
    return plan ? renderAnnotatedRun(plan) : runXml;
  });
}

function extractParagraphRuns(paragraphInner) {
  return [...paragraphInner.matchAll(/<w:r(\s[^>]*)?>([\s\S]*?)<\/w:r>/g)].map((match, index) => {
    const runAttributes = match[1] ?? "";
    const runInner = match[2];
    const textMatches = [...runInner.matchAll(/<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g)];
    if (textMatches.length !== 1) {
      return { index, text: null };
    }

    const textMatch = textMatches[0];
    return {
      index,
      runAttributes,
      baseProperties: runInner.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/)?.[1] ?? "",
      textAttributes: textMatch[1] ?? "",
      text: decodeXmlText(textMatch[2]),
    };
  });
}

function buildRunAnnotationSegments(run, selectedMatches) {
  const overlaps = selectedMatches.filter((match) => match.start < run.end && match.end > run.start);
  if (overlaps.length === 0) {
    return null;
  }

  const segments = [];
  let cursor = 0;
  for (const match of overlaps) {
    const localStart = Math.max(match.start - run.start, 0);
    const localEnd = Math.min(match.end - run.start, run.text.length);
    if (localStart > cursor) {
      segments.push({ text: run.text.slice(cursor, localStart), token: null });
    }

    if (match.token.redact) {
      if (match.start >= run.start && match.start < run.end) {
        segments.push({ text: "[afgelakt]", token: match.token });
      }
    } else {
      segments.push({
        text: run.text.slice(localStart, localEnd),
        token: match.token,
      });
    }
    cursor = localEnd;
  }

  if (cursor < run.text.length) {
    segments.push({ text: run.text.slice(cursor), token: null });
  }

  if (segments.length === 1 && !segments[0].token && segments[0].text === run.text) {
    return null;
  }

  return segments;
}

function renderAnnotatedRun(run) {
  return run.segments
    .map(({ text, token }) => {
      if (!text) return "";
      const properties = token
        ? `${run.baseProperties}${token.redact ? '<w:color w:val="000000"/>' : ""}<w:highlight w:val="${token.highlight}"/>`
        : run.baseProperties;
      const runProperties = properties ? `<w:rPr>${properties}</w:rPr>` : "";
      return `<w:r${run.runAttributes}>${runProperties}<w:t${ensurePreserveSpace(run.textAttributes)}>${encodeXmlText(text)}</w:t></w:r>`;
    })
    .join("");
}

function selectTokenMatches(text, tokens) {
  const matches = [];
  for (const token of tokens) {
    const regex = createTokenRegex(token.text);
    for (const match of text.matchAll(regex)) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        token,
      });
    }
  }

  const selected = [];
  let cursor = 0;
  for (const match of matches.sort((left, right) => left.start - right.start || right.token.priority - left.token.priority || right.end - left.end)) {
    if (match.start < cursor) continue;
    selected.push(match);
    cursor = match.end;
  }
  return selected;
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeVersionHistoryEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return [];
  }

  const version = normalizePositiveInteger(entry.version, null);
  const label = typeof entry.label === "string" ? entry.label.trim() : "";
  const at = typeof entry.at === "string" && entry.at.trim() ? entry.at.trim() : new Date().toISOString();
  if (!version || !label) {
    return [];
  }

  return [{ version, label, at }];
}

function truncateText(text, limit) {
  const trimmed = String(text ?? "").trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return "";
  }
  return trimmed.length > limit ? `${trimmed.slice(0, limit - 1).trimEnd()}…` : trimmed;
}
