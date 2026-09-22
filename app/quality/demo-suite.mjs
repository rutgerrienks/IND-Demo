import test from "node:test";
import assert from "node:assert/strict";

const baseUrl = (process.env.DEMO_BASE_URL || "http://localhost:8081").replace(/\/$/, "");
const requestTimeout = Number(process.env.DEMO_TEST_TIMEOUT_MS || 600_000);
const openedDocuments = new Map();

async function request(path, options = {}) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        signal: AbortSignal.timeout(requestTimeout),
      });
      if (response.status >= 500 && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 2_000));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  }
  throw lastError;
}

async function jsonRequest(path, options = {}) {
  const response = await request(path, options);
  const text = await response.text();
  assert.equal(response.ok, true, `${path} gaf HTTP ${response.status}: ${text.slice(0, 500)}`);
  return JSON.parse(text);
}

function normalizeWhitespace(value) {
  return String(value).trim().replace(/\s+/gu, " ");
}

function assertFindingContract(finding, analysisText) {
  assert.match(finding.id, /\S/);
  assert.ok(["consistency", "contradiction", "completeness"].includes(finding.category));
  assert.match(finding.title, /\S/);
  assert.match(finding.detail, /\S/);
  assert.match(finding.suggestion, /\S/);
  assert.ok(Array.isArray(finding.matchTexts) && finding.matchTexts.length > 0);
  for (const matchText of finding.matchTexts) {
    assert.ok(
      normalizeWhitespace(analysisText).includes(normalizeWhitespace(matchText)),
      `Niet-terugvindbaar citaat in bevinding "${finding.title}"`,
    );
  }
}

test("omgeving is gezond en publiceert vier unieke DOCX-voorbeelden", { timeout: requestTimeout }, async () => {
  const health = await jsonRequest("/healthz");
  assert.equal(health.status, "ok");

  const catalog = await jsonRequest("/api/examples");
  assert.equal(catalog.documents.length, 4);
  assert.equal(new Set(catalog.documents.map(({ fileName }) => fileName)).size, 4);
  assert.ok(catalog.documents.every(({ fileName }) => fileName.endsWith(".docx")));
});

test("alle voorbeelden doorlopen analyse, privacycontract en Gotenberg-preview", { timeout: requestTimeout * 4 }, async () => {
  const { documents } = await jsonRequest("/api/examples");
  for (const { fileName } of documents) {
    const payload = await jsonRequest("/api/examples/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName }),
    });
    assert.equal(payload.fileName, fileName);
    assert.ok(payload.analysisText.length > 200);
    assert.ok(payload.docxBase64.length > 1_000);
    assert.ok(payload.preview.pages.length > 0);
    assert.equal(new Set(payload.findings.map(({ id }) => id)).size, payload.findings.length);
    payload.findings.forEach((finding) => assertFindingContract(finding, payload.analysisText));
    openedDocuments.set(fileName, payload);
  }
});

test("alle bevindingen van Hybride werken zijn achtereenvolgens toepasbaar", { timeout: requestTimeout * 12 }, async () => {
  const [fileName, initial] = [...openedDocuments.entries()]
    .find(([name]) => name.includes("Hybride werken")) ?? [];
  assert.ok(initial, "Hybride-werken-voorbeeld ontbreekt.");

  let docxBase64 = initial.docxBase64;
  let findings = initial.findings;
  let version = 1;
  let versionHistory = [];
  const initialCount = findings.length;

  while (findings.length > 0) {
    const finding = findings[0];
    const form = new FormData();
    form.append("file", new Blob([Buffer.from(docxBase64, "base64")]), fileName);
    form.append("matchText", finding.matchTexts[0]);
    form.append("suggestion", finding.suggestion);
    form.append("remainingFindings", JSON.stringify(findings.slice(1)));
    form.append("currentVersion", String(version));
    form.append("versionHistory", JSON.stringify(versionHistory));
    form.append("findingId", finding.id);
    form.append("findingTitle", finding.title);

    const applied = await jsonRequest("/api/review/apply", { method: "POST", body: form });
    assert.equal(applied.versioning.nextVersion, version + 1);
    assert.ok(applied.preview.pages.length > 0);
    assert.ok(normalizeWhitespace(applied.analysisText).includes(normalizeWhitespace(finding.suggestion)));
    docxBase64 = applied.docxBase64;
    findings = applied.findings;
    version = applied.versioning.nextVersion;
    versionHistory = applied.versioning.versionHistory;
  }

  assert.ok(initialCount > 0);
  assert.equal(version, initialCount + 1);
  assert.equal(findings.length, 0);
});

test("reviewchat levert een volledig antwoord en een veilig expliciet wijzigingsvoorstel", { timeout: requestTimeout * 2 }, async () => {
  const [fileName, document] = [...openedDocuments.entries()][0];
  const question = await jsonRequest("/api/review/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Vat de belangrijkste bevinding samen in drie concrete bullets." }],
      document: {
        fileName,
        analysisText: document.analysisText,
        selectedFindingId: document.findings[0]?.id,
        appliedFindingIds: [],
        findings: document.findings,
      },
    }),
  });
  assert.equal(question.intent, "question");
  assert.equal(question.proposal, null);
  assert.ok(question.answer.length > 100);
  assert.match(question.answer.trim(), /[.!?]$/u);

  const matchText = document.analysisText.split(/\n+/u).map((part) => part.trim()).find((part) => part.length >= 20);
  const proposal = await jsonRequest("/api/review/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: `Verander exact de tekst "${matchText}" in "${matchText} Aangepast".` }],
      document: {
        fileName,
        analysisText: document.analysisText,
        selectedFindingId: document.findings[0]?.id,
        appliedFindingIds: [],
        findings: document.findings,
      },
    }),
  });
  assert.equal(proposal.intent, "edit");
  assert.equal(proposal.proposal.targetDocument, "document");
  assert.ok(normalizeWhitespace(document.analysisText).includes(normalizeWhitespace(proposal.proposal.matchText)));
  assert.notEqual(proposal.proposal.matchText, proposal.proposal.suggestion);
});

test("tweedocumentvergelijking gebruikt beide documenten en wijzigt alleen het Werkdocument", { timeout: requestTimeout * 3 }, async () => {
  const [[workFileName, work], [referenceFileName, reference]] = [...openedDocuments.entries()];
  const comparison = await jsonRequest("/api/review/comparison/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workDocument: { fileName: workFileName, text: work.analysisText },
      referenceDocument: { fileName: referenceFileName, text: reference.analysisText },
    }),
  });
  assert.equal(comparison.workFileName, workFileName);
  assert.equal(comparison.referenceFileName, referenceFileName);
  assert.ok(Array.isArray(comparison.findings));
  comparison.findings.forEach((finding) => {
    assertFindingContract(finding, work.analysisText);
    assert.match(finding.referenceExcerpt, /\S/);
    assert.ok(normalizeWhitespace(reference.analysisText).includes(normalizeWhitespace(finding.referenceExcerpt)));
  });
});
