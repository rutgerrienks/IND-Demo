// Strikte vergelijkingslogica: Werkdocument (verbeterbaar) versus Referentiedocument (statisch).
// De inhoudelijke vergelijking loopt uitsluitend via de bestaande server-side Azure OpenAI-proxy
// en behandelt altijd de volledige afgelakte tekst van beide documenten, nooit een deelselectie.

const ALLOWED_CATEGORIES = ["consistency", "contradiction", "completeness"];

const CATEGORY_COLORS = {
  consistency: "blue",
  contradiction: "rose",
  completeness: "amber",
};

export function validateComparisonRequest(body) {
  const workDocument = body?.workDocument;
  const referenceDocument = body?.referenceDocument;

  if (!workDocument || typeof workDocument.text !== "string" || !workDocument.text.trim()) {
    return { error: "Werkdocument met volledige geredigeerde tekst is vereist." };
  }
  if (!referenceDocument || typeof referenceDocument.text !== "string" || !referenceDocument.text.trim()) {
    return { error: "Referentiedocument met volledige geredigeerde tekst is vereist." };
  }
  if (typeof workDocument.fileName !== "string" || !workDocument.fileName.trim()) {
    return { error: "Werkdocument mist een bestandsnaam." };
  }
  if (typeof referenceDocument.fileName !== "string" || !referenceDocument.fileName.trim()) {
    return { error: "Referentiedocument mist een bestandsnaam." };
  }
  if (workDocument.fileName === referenceDocument.fileName && workDocument.text === referenceDocument.text) {
    return { error: "Kies twee verschillende documenten om te vergelijken." };
  }
  return {
    workDocument: { fileName: workDocument.fileName, text: workDocument.text },
    referenceDocument: { fileName: referenceDocument.fileName, text: referenceDocument.text },
  };
}

export function buildComparisonMessages({ workDocument, referenceDocument }) {
  const systemMessage = [
    "Je bent een zorgvuldige Nederlandstalige reviewassistent die twee volledige IND-documenten inhoudelijk vergelijkt.",
    "Het Werkdocument mag worden aangepast; het Referentiedocument blijft statisch en dient alleen als vergelijkingsbasis.",
    "Voer geen woordelijke diff uit. Beoordeel de twee volledige documenten semantisch langs exact drie requirementsgroepen en hun subcriteria:",
    "1. consistentie: tone of voice, layout/opbouw, terminologie en schrijfwijze, referenties, data en tijdstippen, en de norm voor het documenttype (lengte, spelling/zinsbouw, inleiding of probleemstelling en conclusie);",
    "2. tegenstrijdigheden: inhoudelijke tegenspraak binnen of tussen de documenten en een onlogische opbouw;",
    "3. volledigheid: ontbrekende cruciale onderdelen in argumentatie, voorgesteld besluit of proces en metadata zoals afzender en datum.",
    "Beperk de beoordeling nooit tot relevante passages, bestaande bevindingen of alleen tegenstrijdigheden: gebruik alle niet-persoonsgebonden inhoud van beide complete teksten als context.",
    "Onderbouw iedere bevinding met een concreet letterlijk citaat uit zowel het Werkdocument als het Referentiedocument.",
    "Richt ieder verbeteradvies en iedere voorgestelde vervanging uitsluitend op het Werkdocument; stel nooit een wijziging aan het Referentiedocument voor.",
    "Alleen persoonsgegevens zijn afgelakt; herhaal of reconstrueer die nooit en laat '[afgelakt]' ongewijzigd staan. Sluit geen andere inhoud uit.",
    "Geef uitsluitend geldige JSON terug, zonder Markdown-opmaak of toelichting buiten de JSON.",
    "Het JSON-object heeft exact deze vorm: "
      + '{"findings":[{"category":"consistency|contradiction|completeness","title":"...","detail":"...","workExcerpt":"...","referenceExcerpt":"...","suggestion":"...","example":"..."}]}',
    "workExcerpt moet een letterlijk, ononderbroken en zo kort mogelijk (max 200 tekens) citaat uit het Werkdocument zijn dat exact zo in de tekst voorkomt, zodat het automatisch kan worden teruggevonden en vervangen.",
    "referenceExcerpt is verplicht en moet een letterlijk, ononderbroken en zo kort mogelijk (max 200 tekens) citaat uit het Referentiedocument zijn.",
    "suggestion moet de volledige concrete vervangende tekst voor workExcerpt zijn, passend in de omliggende tekst; geef geen instructie zoals 'pas aan' of 'voeg toe'.",
    "Geef maximaal 10 bevindingen, gesorteerd op belang.",
  ].join(" ");

  const userMessage = [
    `Werkdocument (${workDocument.fileName}):\n${workDocument.text}`,
    `Referentiedocument (${referenceDocument.fileName}):\n${referenceDocument.text}`,
  ].join("\n\n---\n\n");

  return [
    { role: "system", content: systemMessage },
    { role: "user", content: userMessage },
  ];
}

export function parseComparisonFindings(rawContent, { workText, referenceText }) {
  const parsed = extractJson(rawContent);
  if (!parsed || !Array.isArray(parsed.findings)) {
    throw new Error("De vergelijkingsanalyse leverde geen geldige JSON-resultaatvorm op.");
  }

  const validated = [];
  parsed.findings.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const category = ALLOWED_CATEGORIES.includes(item.category) ? item.category : null;
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const detail = typeof item.detail === "string" ? item.detail.trim() : "";
    const suggestion = typeof item.suggestion === "string" ? item.suggestion.trim() : "";
    const workExcerpt = typeof item.workExcerpt === "string" ? item.workExcerpt.trim() : "";
    const referenceExcerpt = typeof item.referenceExcerpt === "string" ? item.referenceExcerpt.trim() : "";
    const example = typeof item.example === "string" ? item.example.trim() : "";

    if (!category || !title || !detail || !suggestion || !workExcerpt || !referenceExcerpt) {
      return;
    }
    if (!containsLiteral(workText, workExcerpt)) {
      // Strikte resultaatvorm: een bevinding zonder terugvindbaar citaat kan niet
      // veilig tot een echte documentwijziging leiden en wordt daarom geweerd.
      return;
    }
    if (!containsLiteral(referenceText, referenceExcerpt)) {
      return;
    }

    validated.push({
      id: `cmp-${index}-${category}`,
      category,
      color: CATEGORY_COLORS[category] ?? "blue",
      title,
      detail,
      suggestion,
      example,
      matchTexts: [workExcerpt],
      referenceExcerpt,
    });
  });

  return validated;
}

function containsLiteral(haystack, needle) {
  if (!needle || typeof haystack !== "string") return false;
  return haystack.toLocaleLowerCase("nl-NL").includes(needle.toLocaleLowerCase("nl-NL"));
}

function extractJson(rawContent) {
  if (typeof rawContent !== "string" || !rawContent.trim()) return null;
  try {
    return JSON.parse(rawContent);
  } catch {
    const match = rawContent.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}
