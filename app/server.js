import express from "express";
import multer from "multer";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  annotateDocxForPreview,
  buildVersioningMetadata,
  buildActionLogEntries,
  buildActionLogDocx,
  buildConcreteReplacementMessages,
  buildSemanticReviewMessages,
  buildReviewExportDocx,
  convertDocxToPdf,
  createOpenAiProxyRequest,
  detectPii,
  isInstructionalSuggestion,
  parseConcreteReplacement,
  parseSemanticReviewFindings,
  parseReviewDocument,
  redactText,
  rewriteDocxAndRevalidate,
  sanitizePreviewFindings,
} from "./lib/review.js";
import { buildFindingRegionsFromBboxHtml } from "./lib/preview-regions.js";
import {
  buildComparisonMessages,
  parseComparisonFindings,
  validateComparisonRequest,
} from "./lib/compare.js";
import {
  buildComparisonEditProposalMessages,
  buildComparisonChatMessages,
  buildSingleReviewEditProposalMessages,
  buildSingleReviewChatMessages,
  collectChatAnswer,
  detectEditCommandIntent,
  parseEditProposalResponse,
  sanitizeChatMessages,
} from "./lib/chat.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "dist");
const examplesDir = join(__dirname, "examples");
const execFileAsync = promisify(execFile);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const app = express();
const PORT = process.env.PORT || 80;

app.use(express.json({ limit: "2mb" }));

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", app: "ind-demo-review-shell", time: new Date().toISOString() });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "ind-demo-api" });
});

app.get("/api/examples", async (_req, res, next) => {
  try {
    const fileNames = await listExampleDocuments();
    res.json({
      documents: fileNames.map((fileName) => ({ id: fileName, fileName })),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/examples/open", async (req, res, next) => {
  try {
    const azure = getAzureOpenAiConfig();
    if (!azure) {
      return res.status(503).json({ error: "Azure OpenAI is niet geconfigureerd." });
    }
    const fileName = req.body?.fileName;
    const fileNames = await listExampleDocuments();
    if (typeof fileName !== "string" || !fileNames.includes(fileName)) {
      return res.status(404).json({ error: "Voorbeelddocument niet gevonden." });
    }
    const buffer = await readFile(join(examplesDir, fileName));
    res.json(await buildReviewPayload(buffer, fileName, azure));
  } catch (error) {
    next(error);
  }
});

app.post("/api/review/upload", upload.single("file"), async (req, res, next) => {
  try {
    const azure = getAzureOpenAiConfig();
    if (!azure) {
      return res.status(503).json({ error: "Azure OpenAI is niet geconfigureerd." });
    }
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    if (!file.originalname.toLowerCase().endsWith(".docx")) {
      return res.status(400).json({ error: "Only .docx files are supported." });
    }

    res.json(await buildReviewPayload(file.buffer, file.originalname, azure));
  } catch (error) {
    next(error);
  }
});

app.post("/api/review/preview", upload.single("file"), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    if (!file.originalname.toLowerCase().endsWith(".docx")) {
      return res.status(400).json({ error: "Only .docx files are supported." });
    }

    let appliedFindingIds;
    try {
      appliedFindingIds = JSON.parse(req.body.appliedFindingIds ?? "[]");
    } catch {
      return res.status(400).json({ error: "Applied findings must be valid JSON." });
    }

    if (!Array.isArray(appliedFindingIds) || appliedFindingIds.some((id) => typeof id !== "string")) {
      return res.status(400).json({ error: "Applied findings must be an array of IDs." });
    }

    const review = await parseReviewDocument(file.buffer);
    const findings = parseFindingsFromBody(req.body?.findings, { text: review.analysisText });
    const appliedIds = new Set(appliedFindingIds);
    const annotatedBuffer = await annotateDocxForPreview(file.buffer, {
      piiMatches: review.piiMatches,
      findings: findings.filter((finding) => !appliedIds.has(finding.id)),
    });
    const preview = await renderPreview(annotatedBuffer, file.originalname, findings);
    res.json({ preview });
  } catch (error) {
    next(error);
  }
});

app.post("/api/review/preview/download", upload.single("file"), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded." });
    }
    if (!file.originalname.toLowerCase().endsWith(".docx")) {
      return res.status(400).json({ error: "Only .docx files are supported." });
    }

    let appliedFindingIds;
    try {
      appliedFindingIds = JSON.parse(req.body.appliedFindingIds ?? "[]");
    } catch {
      return res.status(400).json({ error: "Applied findings must be valid JSON." });
    }
    if (!Array.isArray(appliedFindingIds) || appliedFindingIds.some((id) => typeof id !== "string")) {
      return res.status(400).json({ error: "Applied findings must be an array of IDs." });
    }

    const review = await parseReviewDocument(file.buffer);
    const findings = parseFindingsFromBody(req.body?.findings, { text: review.analysisText });
    const appliedIds = new Set(appliedFindingIds);
    const annotatedBuffer = await annotateDocxForPreview(file.buffer, {
      piiMatches: review.piiMatches,
      findings: findings.filter((finding) => !appliedIds.has(finding.id)),
    });
    const preview = await convertDocxToPdf(annotatedBuffer, file.originalname);
    if (!preview) {
      return res.status(502).json({ error: "De PDF-preview kon niet worden gegenereerd." });
    }

    const fileName = `${sanitizeFileName(stripDocxExtension(file.originalname))}-preview.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(preview.buffer);
  } catch (error) {
    next(error);
  }
});

app.post("/api/review/apply", upload.single("file"), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "Geen document ontvangen." });
    }
    if (!file.originalname.toLowerCase().endsWith(".docx")) {
      return res.status(400).json({ error: "Only .docx files are supported." });
    }

    const { matchText, suggestion } = req.body ?? {};
    if (typeof matchText !== "string" || !matchText.trim() || typeof suggestion !== "string" || !suggestion.trim()) {
      return res.status(400).json({ error: "Tekstfragment en suggestie zijn beide vereist." });
    }

    const remainingFindings = parseArrayBody(req.body?.remainingFindings, {
      errorMessage: "Openstaande bevindingen moeten geldige JSON zijn.",
      arrayMessage: "Openstaande bevindingen moeten een array zijn.",
    });
    const versionHistory = parseArrayBody(req.body?.versionHistory, {
      errorMessage: "Versiegeschiedenis moet geldige JSON zijn.",
      arrayMessage: "Versiegeschiedenis moet een array zijn.",
      allowEmptyString: true,
    });

    const effectiveSuggestion = await resolveConcreteSuggestion({
      file,
      matchText,
      suggestion,
      findingTitle: req.body?.findingTitle,
      findingDetail: req.body?.findingDetail,
      findingAdvice: req.body?.findingAdvice,
    });
    const updatedAt = new Date().toISOString();
    const result = await rewriteDocxAndRevalidate(file.buffer, {
      matchText,
      suggestion: effectiveSuggestion,
      remainingFindings,
    });
    const previewBuffer = await annotateDocxForPreview(result.safeDocxBuffer, {
      piiMatches: [],
      findings: result.findings,
    });
    const preview = await renderPreview(previewBuffer, file.originalname, result.findings);
    const versioning = buildVersioningMetadata({
      currentVersion: req.body?.currentVersion,
      versionHistory,
      findingId: req.body?.findingId,
      findingTitle: req.body?.findingTitle,
      matchText,
      updatedAt,
    });

    res.json({
      docxBase64: result.safeDocxBuffer.toString("base64"),
      analysisText: result.analysisText,
      findings: result.findings,
      preview,
      versioning,
      appliedSuggestion: effectiveSuggestion,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/review/export", async (req, res, next) => {
  try {
    const { kind = "review", user, fileName, text, findings = [], logEntries = [], summary = {}, appliedFindings = [], piiMatches = [] } = req.body ?? {};
    const baseUser = user ?? { name: "Onbekend", role: "reviewer" };
    const buffer =
      kind === "log"
        ? await buildActionLogDocx({ user: baseUser, logEntries })
        : await buildReviewExportDocx({
            user: baseUser,
            fileName: fileName ?? "document.docx",
            text: text ?? "",
            findings,
            logEntries,
            summary: {
              wordCount: summary.wordCount ?? 0,
              paragraphCount: summary.paragraphCount ?? 0,
              tableCount: summary.tableCount ?? 0,
              piiCount: summary.piiCount ?? 0,
              findingCount: summary.findingCount ?? findings.length,
            },
            appliedFindings,
            piiMatches,
          });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    const downloadName =
      kind === "log"
        ? "actie-log.docx"
        : `${sanitizeFileName(stripDocxExtension(fileName ?? "review-resultaat"))}.docx`;
    res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

app.post("/api/openai/chat", async (req, res, next) => {
  try {
    const { AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT, AZURE_OPENAI_API_VERSION, AZURE_OPENAI_KEY } = process.env;
    if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT || !AZURE_OPENAI_API_VERSION || !AZURE_OPENAI_KEY) {
      return res.status(503).json({ error: "Azure OpenAI is not configured." });
    }

    const data = await createOpenAiProxyRequest({
      endpoint: AZURE_OPENAI_ENDPOINT,
      deployment: AZURE_OPENAI_DEPLOYMENT,
      apiVersion: AZURE_OPENAI_API_VERSION,
      apiKey: AZURE_OPENAI_KEY,
      body: req.body,
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.post("/api/review/chat", async (req, res, next) => {
  try {
    const azure = getAzureOpenAiConfig();
    if (!azure) {
      return res.status(503).json({ error: "De documentchat is nog niet geconfigureerd." });
    }

    const chatRequest = buildChatRequest(req.body);
    const lastUserMessage = chatRequest.lastUserMessage?.content ?? "";
    if (detectEditCommandIntent(lastUserMessage)) {
      const proposalResult = await requestEditProposal({
        azure,
        messages: buildSingleReviewEditProposalMessages({
          messages: chatRequest.safeMessages,
          document: chatRequest.document,
        }),
        editableText: chatRequest.document.analysisText,
        targetDocument: "document",
      });
      return res.json({ answer: proposalResult.answer, userMessage: lastUserMessage, proposal: proposalResult.proposal, intent: "edit" });
    }

    const { answer } = await collectChatAnswer({
      messages: chatRequest.promptMessages,
      maxCompletionTokens: 1_400,
      maxContinuations: 2,
      requestCompletion: async (body) => createOpenAiProxyRequest({
        endpoint: azure.endpoint,
        deployment: azure.deployment,
        apiVersion: azure.apiVersion,
        apiKey: azure.apiKey,
        body,
      }),
    });
    res.json({ answer, userMessage: lastUserMessage, proposal: null, intent: "question" });
  } catch (error) {
    next(error);
  }
});

app.post("/api/review/comparison/chat", async (req, res, next) => {
  try {
    const azure = getAzureOpenAiConfig();
    if (!azure) {
      return res.status(503).json({ error: "De vergelijkingschat is nog niet geconfigureerd." });
    }

    const chatRequest = buildChatRequest({
      ...req.body,
      mode: "comparison",
    });
    const lastUserMessage = chatRequest.lastUserMessage?.content ?? "";
    if (detectEditCommandIntent(lastUserMessage)) {
      const proposalResult = await requestEditProposal({
        azure,
        messages: buildComparisonEditProposalMessages({
          messages: chatRequest.safeMessages,
          comparison: chatRequest.comparison,
        }),
        editableText: chatRequest.comparison.workDocument.text,
        targetDocument: "workDocument",
      });
      return res.json({ answer: proposalResult.answer, userMessage: lastUserMessage, proposal: proposalResult.proposal, intent: "edit" });
    }

    const { answer } = await collectChatAnswer({
      messages: chatRequest.promptMessages,
      maxCompletionTokens: 1_400,
      maxContinuations: 2,
      requestCompletion: async (body) => createOpenAiProxyRequest({
        endpoint: azure.endpoint,
        deployment: azure.deployment,
        apiVersion: azure.apiVersion,
        apiKey: azure.apiKey,
        body,
      }),
    });
    res.json({ answer, userMessage: lastUserMessage, proposal: null, intent: "question" });
  } catch (error) {
    next(error);
  }
});

app.post("/api/review/comparison/analyze", async (req, res, next) => {
  try {
    const { AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT, AZURE_OPENAI_API_VERSION, AZURE_OPENAI_KEY } = process.env;
    if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT || !AZURE_OPENAI_API_VERSION || !AZURE_OPENAI_KEY) {
      return res.status(503).json({ error: "Azure OpenAI is niet geconfigureerd." });
    }

    const validated = validateComparisonRequest(req.body);
    if (validated.error) {
      return res.status(400).json({ error: validated.error });
    }

    const workDocument = {
      ...validated.workDocument,
      text: redactText(validated.workDocument.text, detectPii(validated.workDocument.text)),
    };
    const referenceDocument = {
      ...validated.referenceDocument,
      text: redactText(validated.referenceDocument.text, detectPii(validated.referenceDocument.text)),
    };
    const messages = buildComparisonMessages({ workDocument, referenceDocument });
    const data = await createOpenAiProxyRequest({
      endpoint: AZURE_OPENAI_ENDPOINT,
      deployment: AZURE_OPENAI_DEPLOYMENT,
      apiVersion: AZURE_OPENAI_API_VERSION,
      apiKey: AZURE_OPENAI_KEY,
      body: {
        messages,
        max_completion_tokens: 4_000,
        response_format: { type: "json_object" },
      },
    });

    const rawContent = data.choices?.[0]?.message?.content;
    const findings = parseComparisonFindings(rawContent, {
      workText: workDocument.text,
      referenceText: referenceDocument.text,
    });

    res.json({
      workFileName: workDocument.fileName,
      referenceFileName: referenceDocument.fileName,
      findings,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/review/comparison/render", upload.single("file"), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "Geen Werkdocument ontvangen." });
    }

    let remainingFindings;
    try {
      remainingFindings = JSON.parse(req.body.remainingFindings ?? "[]");
    } catch {
      return res.status(400).json({ error: "Openstaande bevindingen moeten geldige JSON zijn." });
    }
    if (!Array.isArray(remainingFindings)) {
      return res.status(400).json({ error: "Openstaande bevindingen moeten een array zijn." });
    }

    const review = await parseReviewDocument(file.buffer);
    const safeFindings = sanitizePreviewFindings(remainingFindings, { text: review.analysisText });

    const annotatedBuffer = await annotateDocxForPreview(file.buffer, {
      piiMatches: [],
      findings: safeFindings,
    });
    const preview = await renderPreview(annotatedBuffer, file.originalname, safeFindings);
    res.json({ preview });
  } catch (error) {
    next(error);
  }
});

app.post("/api/review/comparison/apply", upload.single("file"), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "Geen Werkdocument ontvangen." });
    }

    const { matchText, suggestion } = req.body ?? {};
    if (typeof matchText !== "string" || !matchText.trim() || typeof suggestion !== "string" || !suggestion.trim()) {
      return res.status(400).json({ error: "Tekstfragment en suggestie zijn beide vereist." });
    }

    const remainingFindings = parseArrayBody(req.body?.remainingFindings, {
      errorMessage: "Openstaande bevindingen moeten geldige JSON zijn.",
      arrayMessage: "Openstaande bevindingen moeten een array zijn.",
    });
    const versionHistory = parseArrayBody(req.body?.versionHistory, {
      errorMessage: "Versiegeschiedenis moet geldige JSON zijn.",
      arrayMessage: "Versiegeschiedenis moet een array zijn.",
      allowEmptyString: true,
    });

    const effectiveSuggestion = await resolveConcreteSuggestion({
      file,
      matchText,
      suggestion,
      findingTitle: req.body?.findingTitle,
      findingDetail: req.body?.findingDetail,
      findingAdvice: req.body?.findingAdvice,
    });
    const updatedAt = new Date().toISOString();
    const result = await rewriteDocxAndRevalidate(file.buffer, {
      matchText,
      suggestion: effectiveSuggestion,
      remainingFindings,
    });
    const annotatedBuffer = await annotateDocxForPreview(result.safeDocxBuffer, {
      piiMatches: [],
      findings: result.findings,
    });
    const preview = await renderPreview(annotatedBuffer, file.originalname, result.findings);
    const versioning = buildVersioningMetadata({
      currentVersion: req.body?.currentVersion,
      versionHistory,
      findingId: req.body?.findingId,
      findingTitle: req.body?.findingTitle,
      matchText,
      updatedAt,
    });

    res.json({
      docxBase64: result.safeDocxBuffer.toString("base64"),
      analysisText: result.analysisText,
      findings: result.findings,
      preview,
      versioning,
      appliedSuggestion: effectiveSuggestion,
    });
  } catch (error) {
    next(error);
  }
});

app.use(express.static(distDir));

app.get("*", (_req, res) => {
  res.sendFile(join(distDir, "index.html"));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.statusCode || 500).json({ error: error.message || "Unexpected server error." });
});

app.listen(PORT, () => {
  console.log(`ind-demo-review-shell listening on port ${PORT}`);
});

function sanitizeFileName(name) {
  return String(name)
    .replace(/[^\w.-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120) || "review-resultaat";
}

async function listExampleDocuments() {
  return (await readdir(examplesDir))
    .filter((fileName) => /_GEANONIMISEERD\.docx$/i.test(fileName))
    .sort((left, right) => left.localeCompare(right, "nl"));
}

function getAzureOpenAiConfig() {
  const { AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT, AZURE_OPENAI_API_VERSION, AZURE_OPENAI_KEY } = process.env;
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT || !AZURE_OPENAI_API_VERSION || !AZURE_OPENAI_KEY) {
    return null;
  }

  return {
    endpoint: AZURE_OPENAI_ENDPOINT,
    deployment: AZURE_OPENAI_DEPLOYMENT,
    apiVersion: AZURE_OPENAI_API_VERSION,
    apiKey: AZURE_OPENAI_KEY,
  };
}

async function resolveConcreteSuggestion({
  file,
  matchText,
  suggestion,
  findingTitle = "",
  findingDetail = "",
  findingAdvice = "",
}) {
  if (!isInstructionalSuggestion(suggestion)) {
    return suggestion;
  }

  const azure = getAzureOpenAiConfig();
  if (!azure) {
    const error = new Error("Het advies bevat nog geen concreet tekstvoorstel en Azure OpenAI is niet beschikbaar om dit veilig op te stellen.");
    error.statusCode = 503;
    throw error;
  }

  const review = await parseReviewDocument(file.buffer);
  const data = await createOpenAiProxyRequest({
    endpoint: azure.endpoint,
    deployment: azure.deployment,
    apiVersion: azure.apiVersion,
    apiKey: azure.apiKey,
    body: {
      messages: buildConcreteReplacementMessages({
        fileName: file.originalname,
        text: review.analysisText,
        title: findingTitle,
        detail: findingDetail,
        advice: findingAdvice || suggestion,
        matchText,
      }),
      max_completion_tokens: 2_000,
      response_format: { type: "json_object" },
    },
  });

  return parseConcreteReplacement(data.choices?.[0]?.message?.content);
}

async function buildReviewPayload(buffer, fileName, azure) {
  const parsedReview = await parseReviewDocument(buffer);
  const semanticMessages = buildSemanticReviewMessages({
    fileName,
    text: parsedReview.analysisText,
    summary: parsedReview.summary,
  });
  const semanticResponse = await createOpenAiProxyRequest({
    endpoint: azure.endpoint,
    deployment: azure.deployment,
    apiVersion: azure.apiVersion,
    apiKey: azure.apiKey,
    body: {
      messages: semanticMessages,
      max_completion_tokens: 4_000,
      response_format: { type: "json_object" },
    },
  });
  const semanticFindings = parseSemanticReviewFindings(
    semanticResponse.choices?.[0]?.message?.content,
    { text: parsedReview.analysisText },
  );
  const review = {
    ...parsedReview,
    findings: semanticFindings,
    summary: {
      ...parsedReview.summary,
      findingCount: semanticFindings.length,
    },
    stages: [
      "Upload gecontroleerd",
      "Document geparsed en persoonsgegevens afgelakt",
      "Consistentie semantisch geanalyseerd met LLM",
      "Tegenstrijdigheden semantisch geanalyseerd met LLM",
      "Volledigheid semantisch geanalyseerd met LLM",
    ],
  };
  const annotatedBuffer = await annotateDocxForPreview(buffer, {
    piiMatches: review.piiMatches,
    findings: review.findings,
  });
  const preview = await renderPreview(annotatedBuffer, fileName, review.findings);
  const logEntries = buildActionLogEntries({
    fileName,
    summary: review.summary,
    tables: review.tables,
    piiMatches: review.piiMatches,
    findings: review.findings,
  });
  const redactedBaseBuffer = await annotateDocxForPreview(buffer, {
    piiMatches: review.piiMatches,
    findings: [],
  });

  return {
    fileName,
    size: buffer.length,
    html: review.html,
    text: review.text,
    analysisText: review.analysisText,
    summary: review.summary,
    tables: review.tables,
    piiMatches: review.piiMatches.map((match) => ({ type: match.type, value: "[afgelakt]" })),
    findings: review.findings,
    stages: review.stages,
    logEntries,
    preview,
    docxBase64: redactedBaseBuffer.toString("base64"),
  };
}

function parseFindingsFromBody(rawFindings, { text }) {
  if (rawFindings == null || rawFindings === "") {
    return [];
  }

  let parsedFindings = rawFindings;
  if (typeof rawFindings === "string") {
    try {
      parsedFindings = JSON.parse(rawFindings);
    } catch {
      const error = new Error("Findings must be valid JSON.");
      error.statusCode = 400;
      throw error;
    }
  }

  if (!Array.isArray(parsedFindings)) {
    const error = new Error("Findings must be an array.");
    error.statusCode = 400;
    throw error;
  }

  return sanitizePreviewFindings(parsedFindings, { text });
}

function buildChatRequest(body) {
  try {
    const safeMessages = sanitizeChatMessages(body?.messages);
    const lastUserMessage = [...safeMessages].reverse().find((message) => message.role === "user") ?? null;

    if (body?.mode === "comparison" || body?.comparison || body?.workDocument || body?.referenceDocument) {
      const comparison = normalizeComparisonChatPayload(body);
      return {
        mode: "comparison",
        safeMessages,
        lastUserMessage,
        comparison,
        promptMessages: buildComparisonChatMessages({ messages: safeMessages, comparison }),
      };
    }

    const rawText = typeof body?.document?.analysisText === "string" ? body.document.analysisText : "";
    const analysisText = redactText(rawText, detectPii(rawText));
    const findings = normalizeChatFindings(body?.document?.findings, { text: analysisText });
    const document = {
      ...body.document,
      analysisText,
      findings,
    };

    return {
      mode: "single",
      safeMessages,
      lastUserMessage,
      document,
      promptMessages: buildSingleReviewChatMessages({ messages: safeMessages, document }),
    };
  } catch (error) {
    error.statusCode = error.statusCode || 400;
    throw error;
  }
}

function normalizeComparisonChatPayload(body) {
  const comparison = body?.comparison ?? body ?? {};
  const workText = typeof comparison?.workDocument?.text === "string"
    ? comparison.workDocument.text
    : typeof comparison?.workDocument?.analysisText === "string"
      ? comparison.workDocument.analysisText
      : "";
  const referenceText = typeof comparison?.referenceDocument?.text === "string"
    ? comparison.referenceDocument.text
    : typeof comparison?.referenceDocument?.analysisText === "string"
      ? comparison.referenceDocument.analysisText
      : "";
  const redactedWorkText = redactText(workText, detectPii(workText));
  const redactedReferenceText = redactText(referenceText, detectPii(referenceText));

  return {
    ...comparison,
    workDocument: {
      ...comparison.workDocument,
      text: redactedWorkText,
    },
    referenceDocument: {
      ...comparison.referenceDocument,
      text: redactedReferenceText,
    },
    findings: sanitizePreviewFindings(comparison.findings, { text: redactedWorkText }),
  };
}

function stripDocxExtension(name) {
  return String(name).replace(/\.docx$/i, "");
}

async function renderPreview(buffer, fileName, findings = []) {
  try {
    const preview = await convertDocxToPdf(buffer, fileName);
    if (!preview) {
      return { kind: "html", dataUrl: null };
    }

    const { pages, findingPages, findingRegions } = await renderPdfPages(preview.buffer, findings);
    return { kind: "images", pages, findingPages, findingRegions, annotated: true };
  } catch (error) {
    console.warn("Preview rendering failed, falling back to HTML preview:", error.message);
    return { kind: "html", dataUrl: null };
  }
}

async function requestEditProposal({ azure, messages, editableText, targetDocument }) {
  const data = await createOpenAiProxyRequest({
    endpoint: azure.endpoint,
    deployment: azure.deployment,
    apiVersion: azure.apiVersion,
    apiKey: azure.apiKey,
    body: {
      messages,
      max_completion_tokens: 1_200,
      response_format: { type: "json_object" },
    },
  });

  return parseEditProposalResponse(data.choices?.[0]?.message?.content, {
    editableText,
    targetDocument,
  });
}

function parseArrayBody(rawValue, { errorMessage, arrayMessage, allowEmptyString = false }) {
  if (rawValue == null || (allowEmptyString && rawValue === "")) {
    return [];
  }

  let parsed = rawValue;
  if (typeof rawValue === "string") {
    try {
      parsed = JSON.parse(rawValue);
    } catch {
      const error = new Error(errorMessage);
      error.statusCode = 400;
      throw error;
    }
  }

  if (!Array.isArray(parsed)) {
    const error = new Error(arrayMessage);
    error.statusCode = 400;
    throw error;
  }

  return parsed;
}

function normalizeChatFindings(findings, { text }) {
  if (!Array.isArray(findings)) {
    return [];
  }

  return findings.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const detail = typeof item.detail === "string" ? item.detail.trim() : "";
    const suggestion = typeof item.suggestion === "string" ? item.suggestion.trim() : "";
    if (!id || !title || !detail || !suggestion) {
      return [];
    }

    const sanitized = sanitizePreviewFindings([item], { text })[0];
    return [{
      id,
      title,
      detail,
      suggestion,
      ...(sanitized?.matchTexts?.length ? { matchTexts: sanitized.matchTexts } : {}),
    }];
  });
}

async function renderPdfPages(pdfBuffer, findings) {
  const directory = await mkdtemp(join(tmpdir(), "ind-preview-"));
  const inputPath = join(directory, "document.pdf");
  const outputPrefix = join(directory, "page");
  const bboxPath = join(directory, "document-bbox.html");

  try {
    await writeFile(inputPath, pdfBuffer);
    await Promise.all([
      execFileAsync("pdftoppm", ["-png", "-r", "130", inputPath, outputPrefix]),
      execFileAsync("pdftotext", ["-bbox-layout", inputPath, bboxPath]),
    ]);
    const pageFiles = (await readdir(directory))
      .filter((name) => /^page-\d+\.png$/.test(name))
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
    if (pageFiles.length === 0) {
      throw new Error("De PDF bevat geen renderbare pagina's.");
    }
    const pages = await Promise.all(pageFiles.map(async (name) => {
      const image = await readFile(join(directory, name));
      return `data:image/png;base64,${image.toString("base64")}`;
    }));
    const findingRegions = buildFindingRegionsFromBboxHtml(await readFile(bboxPath, "utf8"), findings);
    const findingPages = Object.fromEntries(
      Object.entries(findingRegions).flatMap(([findingId, regions]) => (
        regions[0] ? [[findingId, regions[0].page]] : []
      )),
    );
    return { pages, findingPages, findingRegions };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
