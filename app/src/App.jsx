import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { decoratePreviewHtml } from "./preview";
import { firstReviewFindingId, sortReviewFindings } from "./review-order";
import {
  base64ToBlob,
  deleteDocumentVersion,
  getDocumentVersion,
  saveDocumentVersion,
  sanitizeSavedReviewRecord,
} from "./storage";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const DEMO_ACCOUNTS = [
  {
    email: "reviewer@ind-demo.local",
    password: "demo123",
    name: "Inspecteur Noord",
    role: "reviewer",
    environment: "Review omgeving",
  },
  {
    email: "admin@ind-demo.local",
    password: "demo123",
    name: "Beheerder Zuid",
    role: "beheerder",
    environment: "Beheer omgeving",
  },
];

const STEP_LABELS = [
  "Upload controleren",
  "Document parsen en semantisch analyseren",
];

const SEMANTIC_ANALYSIS_PARTS = [
  "Consistentie",
  "Tegenstrijdigheden",
  "Volledigheid",
];

const STORAGE_KEY = "ind-demo-auth";
const REQUEST_TIMEOUT_MS = 220_000;

const EMPTY_PREVIEW = `
  <div class="page placeholder-page">
    <p class="muted">Nog geen document geladen</p>
    <h3>Upload een .docx om de review te starten</h3>
    <p>De preview en bevindingen verschijnen zodra een document is geanalyseerd.</p>
  </div>
`;

function loadAuth() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function makeId(prefix = "log") {
  return `${prefix}-${Math.random().toString(16).slice(2, 10)}`;
}

function nowLabel() {
  return new Date().toLocaleString("nl-NL", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("De verwerking duurt te lang. Probeer het opnieuw.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function sortFindings(findings) {
  return sortReviewFindings(findings);
}

function savedReviewsKey(email) {
  return `ind-demo-saved-reviews:${email}`;
}

function documentIdFor(fileName) {
  const slug = String(fileName || "document")
    .toLocaleLowerCase("nl-NL")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `doc-${slug || "document"}`;
}

function editedDocumentFileName(fileName) {
  const name = String(fileName || "document.docx");
  return /_bewerkt\.docx$/i.test(name)
    ? name
    : `${name.replace(/\.docx$/i, "")}_bewerkt.docx`;
}

function reviewForStorage(reviewValue) {
  if (!reviewValue) return reviewValue;
  const { docxBase64: _docxBase64, ...reviewWithoutDocx } = reviewValue;
  return {
    ...reviewWithoutDocx,
    preview: reviewValue.preview ? { ...reviewValue.preview, dataUrl: null, pages: [] } : null,
  };
}

function historyKey(email) {
  return `ind-demo-history:${email}`;
}

function activityKey(email) {
  return `ind-demo-activity:${email}`;
}

function loadActivity(email) {
  if (!email) return [];
  try {
    return JSON.parse(localStorage.getItem(activityKey(email)) || "[]");
  } catch {
    return [];
  }
}

function hiddenExamplesKey(email) {
  return `ind-demo-hidden-examples:${email}`;
}

function loadHiddenExamples(email) {
  if (!email) return [];
  try {
    return JSON.parse(localStorage.getItem(hiddenExamplesKey(email)) || "[]");
  } catch {
    return [];
  }
}

function loadSavedReviews(email) {
  if (!email) return [];
  try {
    const stored = JSON.parse(localStorage.getItem(savedReviewsKey(email)) || "[]");
    const sanitized = stored.map((rawItem) => {
      // Migratie/opschoning: eerdere localStorage-records mochten nooit DOCX-bytes
      // bevatten. Verwijder defensief elk zulk veld voordat verder wordt verwerkt.
      const item = sanitizeSavedReviewRecord(rawItem);
      const piiMatches = item.review?.piiMatches ?? [];
      const redact = (value) => piiMatches.reduce(
        (output, match) => typeof match.value === "string" ? output.replaceAll(match.value, "[afgelakt]") : output,
        value ?? null,
      );
      return {
        ...item,
        id: item.id ?? documentIdFor(item.fileName),
        version: item.version ?? 1,
        versionHistory: item.versionHistory ?? [{ version: 1, label: "Origineel", at: item.savedAt }],
        chatMessages: normalizeChatMessages(item.chatMessages),
        review: item.review
          ? sanitizeSavedReviewRecord({
              ...item.review,
              html: redact(item.review.html),
              text: redact(item.review.text),
              analysisText: redact(item.review.analysisText),
              piiMatches: piiMatches.map((match) => ({ type: match.type, value: "[afgelakt]" })),
            })
          : item.review,
      };
    });
    localStorage.setItem(savedReviewsKey(email), JSON.stringify(sanitized));
    return sanitized;
  } catch {
    return [];
  }
}

function normalizeChatMessages(messages = []) {
  const normalized = [];
  for (const message of messages) {
    const isRemovedIntroduction =
      message.role === "assistant"
      && message.content === "Ik begeleid je door de bevindingen en beantwoord vrije vragen over de nota. Kies een voorgestelde vraag of typ hieronder je eigen vraag.";
    const isLegacyGuidance =
      message.role === "assistant"
      && /^Bevinding \d+ van \d+:/.test(message.content)
      && message.content.includes("\n\nAdvies:");
    if (isRemovedIntroduction || isLegacyGuidance) continue;
    const previous = normalized[normalized.length - 1];
    if (previous?.role === message.role && previous.content === message.content) continue;
    normalized.push(message);
  }
  return normalized;
}

function renderInlineChatText(text) {
  return String(text).split(/(\*\*[^*]+\*\*)/g).map((part, index) => (
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
      : part
  ));
}

function renderChatContent(content) {
  const headingIcons = { advies: "💡", actie: "✅", voorstel: "✍", effect: "🎯", toelichting: "🔎" };
  const lines = String(content).split(/\r?\n/);
  return (
    <div className="chat-content">
      {lines.map((line, index) => {
        const heading = line.match(/^#{1,3}\s+(.+)$/);
        if (heading) {
          const label = heading[1];
          const icon = Object.entries(headingIcons).find(([key]) => label.toLocaleLowerCase("nl-NL").includes(key))?.[1] ?? "◆";
          return <h4 key={`${line}-${index}`}><span aria-hidden="true">{icon}</span> {renderInlineChatText(label)}</h4>;
        }

        const bullet = line.match(/^\s*[-*•]\s+(.+)$/);
        if (bullet) return <div className="chat-bullet" key={`${line}-${index}`}>• <span>{renderInlineChatText(bullet[1])}</span></div>;
        if (!line.trim()) return <div className="chat-spacer" key={`space-${index}`} />;
        return <p key={`${line}-${index}`}>{renderInlineChatText(line)}</p>;
      })}
    </div>
  );
}

function HighlightLegend() {
  return (
    <div className="highlight-legend" aria-label="Betekenis van documentmarkeringen">
      <strong>Markeringen</strong>
      <span><i className="legend-swatch consistency" /> Consistentie</span>
      <span><i className="legend-swatch contradiction" /> Tegenstrijdigheid</span>
      <span><i className="legend-swatch completeness" /> Volledigheid</span>
      <span><i className="legend-swatch pii" /> Persoonsgegeven afgelakt</span>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState(loadAuth);
  const [workspace, setWorkspace] = useState("home");
  const [mode, setMode] = useState(null);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [review, setReview] = useState(null);
  const [sourceFile, setSourceFile] = useState(null);
  const [savedReviews, setSavedReviews] = useState([]);
  const [exampleDocuments, setExampleDocuments] = useState([]);
  const [hiddenExampleIds, setHiddenExampleIds] = useState([]);
  const [exampleError, setExampleError] = useState("");
  const [selectedFindingId, setSelectedFindingId] = useState(null);
  const [appliedFindingIds, setAppliedFindingIds] = useState([]);
  const [appliedStack, setAppliedStack] = useState([]);
  const [reviewUndoStack, setReviewUndoStack] = useState([]);
  const [reviewVersion, setReviewVersion] = useState(1);
  const [reviewVersionHistory, setReviewVersionHistory] = useState([]);
  const [activity, setActivity] = useState([]);
  const [status, setStatus] = useState({ loading: false, step: 0, error: "" });
  const [previewStatus, setPreviewStatus] = useState({ loading: false, error: "" });
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatStatus, setChatStatus] = useState({ loading: false, error: "", pending: "" });
  const [pendingChatEdit, setPendingChatEdit] = useState(null);
  const [compareChatMessages, setCompareChatMessages] = useState([]);
  const [compareChatInput, setCompareChatInput] = useState("");
  const [compareChatStatus, setCompareChatStatus] = useState({ loading: false, error: "", pending: "" });
  const [pendingCompareChatEdit, setPendingCompareChatEdit] = useState(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [comparisonZoom, setComparisonZoom] = useState(1);
  const [documentRoles, setDocumentRoles] = useState({ workId: null, referenceId: null });
  const [documentAvailability, setDocumentAvailability] = useState({});
  const [comparisonSelectionError, setComparisonSelectionError] = useState("");
  const [compareState, setCompareState] = useState(null);
  const previewContainerRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const compareChatMessagesRef = useRef(null);

  useEffect(() => {
    if (auth) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
      setSavedReviews(loadSavedReviews(auth.email));
      setActivity(loadActivity(auth.email));
      setHiddenExampleIds(loadHiddenExamples(auth.email));
      DEMO_ACCOUNTS.forEach((account) => localStorage.removeItem(historyKey(account.email)));
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setSavedReviews([]);
      setActivity([]);
      setHiddenExampleIds([]);
    }
  }, [auth]);

  useEffect(() => {
    if (!auth) {
      setExampleDocuments([]);
      setExampleError("");
      return;
    }
    fetch("/api/examples")
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || "Voorbeelddocumenten laden mislukt.");
        }
        return response.json();
      })
      .then((data) => {
        setExampleDocuments(data.documents ?? []);
        setExampleError("");
      })
      .catch((error) => setExampleError(error.message || "Voorbeelddocumenten laden mislukt."));
  }, [auth]);

  useEffect(() => {
    let cancelled = false;
    setDocumentAvailability({});
    Promise.all(savedReviews.map(async (item) => {
      const stored = await getDocumentVersion(item.id).catch(() => null);
      return [item.id, Boolean(stored?.docxBase64)];
    })).then((entries) => {
      if (!cancelled) setDocumentAvailability(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [savedReviews]);

  const findings = useMemo(() => sortFindings(review?.findings ?? []), [review]);
  const visibleExampleDocuments = useMemo(
    () => exampleDocuments.filter(
      (example) => !hiddenExampleIds.includes(example.id)
        && !savedReviews.some((item) => item.fileName === example.fileName),
    ),
    [exampleDocuments, hiddenExampleIds, savedReviews],
  );

  useEffect(() => {
    if (!selectedFindingId && findings.length > 0) {
      setSelectedFindingId(findings[0].id);
    }
  }, [findings, selectedFindingId]);

  const previewHtml = useMemo(() => {
    if (!review?.html) {
      return EMPTY_PREVIEW;
    }

    return decoratePreviewHtml(review.html, {
      piiMatches: review.piiMatches,
      findings,
      appliedFindingIds,
      selectedFindingId,
    });
  }, [review, findings, appliedFindingIds, selectedFindingId]);

  const previewPages = review?.preview?.pages ?? [];
  const previewSavePayload = useMemo(() => {
    if (!review) return null;

    return {
      id: documentIdFor(review.fileName),
      fileName: review.fileName,
      savedAt: new Date().toISOString(),
      authEmail: auth.email,
      summary: review.summary,
      findings: review.findings,
      appliedFindingIds,
      selectedFindingId,
      activity,
      chatMessages,
      version: reviewVersion,
      versionHistory: reviewVersionHistory,
      review: reviewForStorage(review),
    };
  }, [review, appliedFindingIds, selectedFindingId, activity, chatMessages, reviewVersion, reviewVersionHistory, auth?.email]);

  useEffect(() => {
    if (!auth || !previewSavePayload) return;

    setSavedReviews((current) => {
      const existing = current.find((item) => item.fileName === previewSavePayload.fileName);
      const synchronizedReview = {
        ...previewSavePayload,
        id: existing?.id ?? previewSavePayload.id,
        version: previewSavePayload.version ?? existing?.version ?? 1,
        versionHistory: previewSavePayload.versionHistory?.length
          ? previewSavePayload.versionHistory
          : existing?.versionHistory ?? [{ version: 1, label: "Origineel", at: previewSavePayload.savedAt }],
      };
      const next = [
        synchronizedReview,
        ...current.filter((item) => item.fileName !== previewSavePayload.fileName),
      ];
      localStorage.setItem(savedReviewsKey(auth.email), JSON.stringify(next));

      return next;
    });
  }, [auth, previewSavePayload]);

  const activeWorkspace =
    workspace === "review" && !review
      ? "documents"
      : workspace === "compare" && !compareState
        ? "documents"
        : workspace;

  const activeSectionId = activeWorkspace;
  const activeFinding = findings.find((finding) => finding.id === selectedFindingId) ?? findings[0] ?? null;
  const compareFinding = compareState
    ? compareState.findings.find((finding) => finding.id === compareState.selectedFindingId) ?? compareState.findings[0] ?? null
    : null;
  const compareCurrentVersion = compareState?.versions[compareState.currentVersionIndex] ?? null;
  const compareCanUndo = Boolean(compareState && compareState.currentVersionIndex > 0 && !compareState.status.loading);
  const compareLastAppliedFinding = compareState
    ? compareState.findings.find((finding) => finding.id === compareState.appliedFindingIds[compareState.appliedFindingIds.length - 1])
    : null;

  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container || !activeFinding) return;

    const pageIndex = review?.preview?.findingPages?.[activeFinding.id];
    const target = Number.isInteger(pageIndex)
      ? container.querySelector(`[data-preview-page="${pageIndex}"]`)
      : container.querySelector(".preview-highlight.selected");
    if (!target) return;

    container.scrollTo({
      top: Math.max(0, target.offsetTop - (container.clientHeight - target.clientHeight) / 2),
      behavior: "smooth",
    });
  }, [activeFinding, review?.preview]);

  useLayoutEffect(() => {
    const container = chatMessagesRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
    const frame = window.requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chatMessages, chatStatus.loading, pendingChatEdit]);

  useLayoutEffect(() => {
    const container = compareChatMessagesRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
    const frame = window.requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [compareChatMessages, compareChatStatus.loading, pendingCompareChatEdit]);

  async function handleLogin(event) {
    event.preventDefault();
    const account = DEMO_ACCOUNTS.find(
      (candidate) => candidate.email === login.email && candidate.password === login.password,
    );

    if (!account) {
      setLoginError("Ongeldige demo-inloggegevens.");
      return;
    }

    setLoginError("");
    const nextActivity = [...loadActivity(account.email), {
      id: makeId(),
      at: nowLabel(),
      message: `Ingelogd als ${account.name} met rol ${account.role}.`,
    }].slice(-250);
    localStorage.setItem(activityKey(account.email), JSON.stringify(nextActivity));
    setActivity(nextActivity);
    setAuth({
      email: account.email,
      name: account.name,
      role: account.role,
      environment: account.environment,
    });
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".docx")) {
      setStatus({ loading: false, step: 0, error: "Alleen .docx-bestanden zijn toegestaan." });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setStatus({ loading: false, step: 0, error: "Bestand is groter dan 10 MB." });
      return;
    }

    setStatus({ loading: true, step: 0, error: "" });
    const timer = window.setInterval(() => {
      setStatus((current) => ({
        ...current,
        step: Math.min(current.step + 1, STEP_LABELS.length - 1),
      }));
    }, 1_400);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetchWithTimeout("/api/review/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Upload mislukt.");
      }

      const data = await response.json();
      await activateLoadedDocument(data, {
        action: "Upload",
        activityMessage: mode === "compare"
          ? `Document "${data.fileName}" toegevoegd aan de vergelijkingsomgeving`
          : `Document "${data.fileName}" geladen in de review-omgeving`,
      });
      setStatus({ loading: false, step: STEP_LABELS.length - 1, error: "" });
    } catch (error) {
      setStatus({ loading: false, step: 0, error: error.message || "Upload mislukt." });
    } finally {
      window.clearInterval(timer);
      event.target.value = "";
    }
  }

  async function activateLoadedDocument(data, { activityMessage }) {
      const documentId = documentIdFor(data.fileName);
      await saveDocumentVersion(documentId, {
        fileName: data.fileName,
        docxBase64: data.docxBase64,
        analysisText: data.analysisText,
        version: 1,
        label: "Origineel",
        versionHistory: [{ version: 1, label: "Origineel", at: new Date().toISOString() }],
      });
      setReview(data);
      setSourceFile(base64ToBlob(data.docxBase64, DOCX_MIME));
      setAppliedFindingIds([]);
      setAppliedStack([]);
      setReviewUndoStack([]);
      setReviewVersion(1);
      setReviewVersionHistory([{ version: 1, label: "Origineel", at: new Date().toISOString() }]);
      setSelectedFindingId(firstReviewFindingId(data.findings));
      setChatMessages([]);
      setChatStatus({ loading: false, error: "", pending: "" });
      setPendingChatEdit(null);
      setWorkspace(mode === "compare" ? "documents" : "review");
      data.logEntries.forEach((message) => appendActivity(`${data.fileName}: ${message}`));
      appendActivity(activityMessage);
      return documentId;
    }

  async function openExampleDocument(example, role = null) {
      setStatus({ loading: true, step: 0, error: "" });
      const timer = window.setInterval(() => {
        setStatus((current) => ({
          ...current,
          step: Math.min(current.step + 1, STEP_LABELS.length - 1),
        }));
      }, 1_400);
      try {
        const response = await fetchWithTimeout("/api/examples/open", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: example.fileName }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || "Voorbeelddocument openen mislukt.");
        }
        const data = await response.json();
        const documentId = await activateLoadedDocument(data, {
          activityMessage: `Meegeleverd voorbeelddocument "${data.fileName}" als persoonlijke veilige kopie geopend`,
        });
        if (role) {
          setDocumentRoles((current) => ({
            ...current,
            [role === "work" ? "workId" : "referenceId"]: documentId,
            [role === "work" ? "referenceId" : "workId"]:
              current[role === "work" ? "referenceId" : "workId"] === documentId
                ? null
                : current[role === "work" ? "referenceId" : "workId"],
          }));
          appendActivity(`Voorbeelddocument "${data.fileName}" geselecteerd als ${role === "work" ? "Werkdocument" : "Referentiedocument"}.`);
        }
        setStatus({ loading: false, step: STEP_LABELS.length - 1, error: "" });
      } catch (error) {
        setStatus({ loading: false, step: 0, error: error.message || "Voorbeelddocument openen mislukt." });
      } finally {
        window.clearInterval(timer);
    }
  }

  function appendActivity(message, email = auth?.email) {
    setActivity((current) => {
      const existing = email && email !== auth?.email ? loadActivity(email) : current;
      const next = [...existing, {
        id: makeId(),
        at: nowLabel(),
        message,
      }].slice(-250);
      if (email) localStorage.setItem(activityKey(email), JSON.stringify(next));
      return next;
    });
  }

  function moveFinding(direction) {
    if (findings.length === 0) return;
    const currentIndex = Math.max(findings.findIndex((item) => item.id === selectedFindingId), 0);
    const nextIndex = (currentIndex + direction + findings.length) % findings.length;
    setSelectedFindingId(findings[nextIndex].id);
    return findings[nextIndex];
  }

  function moveChatFinding(direction) {
    moveFinding(direction);
  }

  async function requestUpdatedPreview(nextAppliedFindingIds, fileOverride, fileNameOverride, findingsOverride) {
    const file = fileOverride ?? sourceFile;
    if (!file) {
      throw new Error("Upload het brondocument opnieuw om de preview bij te werken.");
    }

    const formData = new FormData();
    formData.append("file", file, fileNameOverride ?? review?.fileName ?? "document.docx");
    formData.append("appliedFindingIds", JSON.stringify(nextAppliedFindingIds));
    formData.append("findings", JSON.stringify(findingsOverride ?? review?.findings ?? []));
    const response = await fetchWithTimeout("/api/review/preview", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Preview bijwerken mislukt.");
    }

    const data = await response.json();
    return data.preview;
  }

  async function applyFinding(findingId) {
    if (appliedFindingIds.includes(findingId) || previewStatus.loading) return false;
    const finding = findings.find((item) => item.id === findingId);
    if (!finding) return false;
    return applyReviewEdit({
      id: finding.id,
      title: finding.title,
      matchText: finding.matchTexts?.[0] ?? "",
      suggestion: finding.suggestion,
      finding,
    });
  }

  async function applyReviewEdit(edit) {
    if (!review || !sourceFile || previewStatus.loading || !edit.matchText || !edit.suggestion) return false;
    const findingId = edit.id ?? makeId("chat-edit");
    const nextAppliedFindingIds = [...appliedFindingIds, findingId];
    const remainingFindings = findings.filter(
      (item) => item.id !== findingId && !appliedFindingIds.includes(item.id),
    );
    setPreviewStatus({ loading: true, error: "" });
    try {
      const formData = new FormData();
      formData.append("file", sourceFile, review.fileName);
      formData.append("matchText", edit.matchText);
      formData.append("suggestion", edit.suggestion);
      formData.append("remainingFindings", JSON.stringify(remainingFindings));
      formData.append("currentVersion", String(reviewVersion));
      formData.append("versionHistory", JSON.stringify(reviewVersionHistory));
      formData.append("findingId", findingId);
      formData.append("findingTitle", edit.title ?? "Wijziging vanuit chat");
      formData.append("findingDetail", edit.detail ?? edit.finding?.detail ?? "");
      formData.append("findingAdvice", edit.advice ?? edit.finding?.advice ?? "");
      const response = await fetchWithTimeout("/api/review/apply", { method: "POST", body: formData });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "De tekstwijziging kon niet worden toegepast.");
      }
      const data = await response.json();
      const nextVersion = data.versioning?.nextVersion ?? reviewVersion + 1;
      const label = data.versioning?.label ?? `Na wijziging: ${edit.title ?? "chatopdracht"}`;
      const nextVersionHistory = data.versioning?.versionHistory ?? [
        ...reviewVersionHistory.slice(0, reviewVersion),
        { version: nextVersion, label, at: new Date().toISOString() },
      ];
      const appliedSuggestion = data.appliedSuggestion ?? edit.suggestion;
      const updatedFinding = edit.finding ? { ...edit.finding, suggestion: appliedSuggestion } : {
        id: findingId,
        category: "consistency",
        color: "blue",
        title: edit.title ?? "Wijziging vanuit chat",
        detail: "Door de gebruiker via de chat voorgestelde wijziging.",
        suggestion: appliedSuggestion,
        matchTexts: [edit.matchText],
      };
      const retainedAppliedFindings = findings.filter(
        (item) => appliedFindingIds.includes(item.id) && item.id !== findingId,
      );
      const nextReview = {
        ...review,
        analysisText: data.analysisText,
        text: data.analysisText,
        findings: [...retainedAppliedFindings, updatedFinding, ...(data.findings ?? remainingFindings)],
        preview: data.preview,
        summary: data.summary ?? review.summary,
      };
      const updatedBlob = base64ToBlob(data.docxBase64, DOCX_MIME);
      setReviewUndoStack((current) => [...current, {
        review,
        sourceFile,
        appliedFindingIds,
        appliedStack,
        reviewVersion,
        reviewVersionHistory,
      }]);
      setReview(nextReview);
      setSourceFile(updatedBlob);
      setAppliedFindingIds(nextAppliedFindingIds);
      setAppliedStack((current) => [...current, findingId]);
      setReviewVersion(nextVersion);
      setReviewVersionHistory(nextVersionHistory);
      setSelectedFindingId(findingId);
      setPendingChatEdit(null);
      await saveDocumentVersion(documentIdFor(review.fileName), {
        fileName: review.fileName,
        docxBase64: data.docxBase64,
        analysisText: data.analysisText,
        version: nextVersion,
        label,
        versionHistory: nextVersionHistory,
      });
      persistWorkItemVersion(documentIdFor(review.fileName), nextVersion, nextVersionHistory);
      appendActivity(`Tekst daadwerkelijk gewijzigd in "${review.fileName}": ${edit.title ?? "chatopdracht"}. Versie v${nextVersion} opgeslagen en preview opnieuw gerenderd.`);
    } catch (error) {
      setPreviewStatus({ loading: false, error: error.message || "Tekstwijziging mislukt." });
      return false;
    }
    setPreviewStatus({ loading: false, error: "" });
    return true;
  }

  async function applyFindingFromChat(findingId) {
    const applied = await applyFinding(findingId);
    if (!applied) return;
    const finding = findings.find((item) => item.id === findingId);
    setChatMessages((current) => [
      ...current,
      {
        id: makeId("chat"),
        role: "assistant",
        content: `"${finding?.title ?? "De bevinding"}" is verwerkt. De preview is bijgewerkt. Je kunt doorgaan naar de volgende bevinding of een vrije vervolgvraag stellen.`,
      },
    ]);
  }

  async function sendChatMessage(event, suggestedMessage) {
    event?.preventDefault();
    const content = (suggestedMessage ?? chatInput).trim();
    if (!content || !review || chatStatus.loading) return;

    const userMessage = { id: makeId("chat"), role: "user", content };
    const requestMessages = [...chatMessages, userMessage];
    setChatInput("");
    setChatStatus({ loading: true, error: "", pending: content });

    try {
      const response = await fetch("/api/review/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: requestMessages.map(({ role, content: messageContent }) => ({ role, content: messageContent })),
          document: {
            fileName: review.fileName,
            analysisText: review.analysisText,
            selectedFindingId,
            appliedFindingIds,
            findings: review.findings.map(({ id, title, detail, suggestion }) => ({ id, title, detail, suggestion })),
          },
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "De chat kon geen antwoord ophalen.");
      }
      const data = await response.json();
      setChatMessages((current) => [
        ...current,
        { ...userMessage, content: data.userMessage || "[afgelakt]" },
        { id: makeId("chat"), role: "assistant", content: data.answer },
      ]);
      setPendingChatEdit(data.proposal ?? null);
      appendActivity("Vrije vraag over de nota beantwoord in de chat");
    } catch (error) {
      setChatInput(content);
      setChatStatus({ loading: false, error: error.message || "De chat kon geen antwoord ophalen.", pending: "" });
      return;
    }
    setChatStatus({ loading: false, error: "", pending: "" });
  }

  async function sendComparisonChatMessage(event, suggestedMessage) {
    event?.preventDefault();
    const content = (suggestedMessage ?? compareChatInput).trim();
    if (!content || !compareState || compareChatStatus.loading) return;

    const userMessage = { id: makeId("compare-chat"), role: "user", content };
    const requestMessages = [...compareChatMessages, userMessage];
    setCompareChatInput("");
    setCompareChatStatus({ loading: true, error: "", pending: content });
    try {
      const response = await fetchWithTimeout("/api/review/comparison/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: requestMessages.map(({ role, content: messageContent }) => ({ role, content: messageContent })),
          comparison: {
            workDocument: {
              fileName: compareState.workItem.fileName,
              analysisText: compareCurrentVersion?.analysisText ?? "",
            },
            referenceDocument: {
              fileName: compareState.referenceItem.fileName,
              analysisText: compareState.referenceAnalysisText ?? "",
            },
            selectedFindingId: compareState.selectedFindingId,
            appliedFindingIds: compareState.appliedFindingIds,
            findings: compareState.findings,
          },
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "De vergelijkingschat kon geen antwoord ophalen.");
      }
      const data = await response.json();
      setCompareChatMessages((current) => [
        ...current,
        { ...userMessage, content: data.userMessage || "[afgelakt]" },
        { id: makeId("compare-chat"), role: "assistant", content: data.answer },
      ]);
      setPendingCompareChatEdit(data.proposal ?? null);
      appendActivity(`Vrije vraag over de vergelijking tussen "${compareState.workItem.fileName}" en "${compareState.referenceItem.fileName}" beantwoord.`);
    } catch (error) {
      setCompareChatInput(content);
      setCompareChatStatus({ loading: false, error: error.message || "De vergelijkingschat kon geen antwoord ophalen.", pending: "" });
      return;
    }
    setCompareChatStatus({ loading: false, error: "", pending: "" });
  }

  function clearChat() {
    setChatMessages([]);
    setPendingChatEdit(null);
    setChatStatus({ loading: false, error: "", pending: "" });
    appendActivity(`Chat bij "${review?.fileName ?? "document"}" gewist.`);
  }

  function clearComparisonChat() {
    setCompareChatMessages([]);
    setPendingCompareChatEdit(null);
    setCompareChatStatus({ loading: false, error: "", pending: "" });
    appendActivity(`Vergelijkingschat tussen "${compareState?.workItem.fileName ?? "Werkdocument"}" en "${compareState?.referenceItem.fileName ?? "Referentiedocument"}" gewist.`);
  }

  async function undoFinding(findingId) {
    if (
      !appliedFindingIds.includes(findingId)
      || appliedStack.at(-1) !== findingId
      || previewStatus.loading
      || reviewUndoStack.length === 0
    ) return;
    const snapshot = reviewUndoStack[reviewUndoStack.length - 1];
    setPreviewStatus({ loading: true, error: "" });
    try {
      const stored = await getDocumentVersion(documentIdFor(review.fileName), snapshot.reviewVersion);
      if (!stored?.docxBase64) throw new Error("De vorige veilige documentversie ontbreekt.");
      setReview(snapshot.review);
      setSourceFile(base64ToBlob(stored.docxBase64, DOCX_MIME));
      setAppliedFindingIds(snapshot.appliedFindingIds);
      setAppliedStack(snapshot.appliedStack);
      setReviewVersion(snapshot.reviewVersion);
      setReviewVersionHistory(snapshot.reviewVersionHistory);
      setReviewUndoStack((current) => current.slice(0, -1));
      setPendingChatEdit(null);
      await saveDocumentVersion(documentIdFor(review.fileName), {
        fileName: review.fileName,
        docxBase64: stored.docxBase64,
        analysisText: stored.analysisText,
        version: snapshot.reviewVersion,
        label: snapshot.reviewVersionHistory.at(-1)?.label ?? "Origineel",
        versionHistory: snapshot.reviewVersionHistory,
      });
      persistWorkItemVersion(documentIdFor(review.fileName), snapshot.reviewVersion, snapshot.reviewVersionHistory);
      const finding = findings.find((item) => item.id === findingId);
      appendActivity(`Undo uitgevoerd: echte tekstwijziging teruggedraaid${finding ? ` voor "${finding.title}"` : ""}; versie v${snapshot.reviewVersion} hersteld.`);
    } catch (error) {
      setPreviewStatus({ loading: false, error: error.message || "Preview bijwerken mislukt." });
      return;
    }
    setPreviewStatus({ loading: false, error: "" });
  }

  async function downloadExport(kind) {
    if (!auth || (kind !== "log" && !review)) return;

    const response = await fetch("/api/review/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        user: auth,
        fileName: review?.fileName ?? "account-actielog.docx",
        text: review?.text ?? "",
        findings: review?.findings ?? [],
        logEntries: activity,
        summary: review?.summary ?? {},
        appliedFindings: appliedFindingIds,
        piiMatches: review?.piiMatches ?? [],
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Export mislukt.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = kind === "log" ? "actie-log.docx" : "review-resultaat.docx";
    anchor.click();
    URL.revokeObjectURL(url);
    appendActivity(kind === "log" ? "Actielog gedownload" : "Reviewresultaat gedownload");
  }

  async function downloadPreview() {
    if (!sourceFile || !review) return;

    const url = URL.createObjectURL(sourceFile);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = review.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    appendActivity(`Actuele veilige DOCX "${review.fileName}" gedownload.`);
  }

  async function restoreSavedReview(savedItem) {
    if (mode !== "review") return;
    setStatus({ loading: true, step: 1, error: "" });
    try {
      const stored = await getDocumentVersion(savedItem.id);
      if (!stored?.docxBase64) {
        throw new Error("De veilige lokale DOCX-versie ontbreekt. Upload het document opnieuw.");
      }

      const blob = base64ToBlob(stored.docxBase64, DOCX_MIME);
      const preview = await requestUpdatedPreview(
        savedItem.appliedFindingIds ?? [],
        blob,
        savedItem.fileName,
        savedItem.review.findings ?? [],
      );
      const versionLabel = savedItem.versionHistory?.[savedItem.versionHistory.length - 1]?.label ?? "Origineel";
      setReview({ ...savedItem.review, preview });
      setSourceFile(blob);
      setAppliedFindingIds(savedItem.appliedFindingIds ?? []);
      setSelectedFindingId(firstReviewFindingId(savedItem.review.findings));
      setAppliedStack(savedItem.appliedFindingIds ?? []);
      setReviewUndoStack([]);
      setReviewVersion(savedItem.version ?? 1);
      setReviewVersionHistory(savedItem.versionHistory ?? [{ version: 1, label: "Origineel", at: savedItem.savedAt }]);
      setChatMessages(normalizeChatMessages(savedItem.chatMessages));
      setPendingChatEdit(null);
      appendActivity(`Gesynchroniseerd document geopend: ${savedItem.fileName} (versie ${savedItem.version ?? 1} — ${versionLabel}).`);
      appendActivity(`${savedItem.fileName}: Gotenberg-preview opnieuw geactiveerd vanuit de veilige lokale DOCX-versie.`);
      setWorkspace("review");
      setPreviewStatus({ loading: false, error: "" });
    } catch (error) {
      setStatus({ loading: false, step: 0, error: error.message || "Document herstellen mislukt." });
      return;
    }
    setStatus({ loading: false, step: STEP_LABELS.length - 1, error: "" });
  }

  function logout() {
    setAuth(null);
    setReview(null);
    setSourceFile(null);
    setAppliedFindingIds([]);
    setAppliedStack([]);
    setReviewUndoStack([]);
    setSelectedFindingId(null);
    setChatMessages([]);
    setChatInput("");
    setChatStatus({ loading: false, error: "", pending: "" });
    setPendingChatEdit(null);
    setStatus({ loading: false, step: 0, error: "" });
    setLoginError("");
    setWorkspace("home");
    setMode(null);
    setDocumentRoles({ workId: null, referenceId: null });
    setComparisonSelectionError("");
    setCompareState(null);
  }

  function chooseMode(nextMode) {
    setMode(nextMode);
    setWorkspace("documents");
    setReview(null);
    setSourceFile(null);
    setSelectedFindingId(null);
    setAppliedFindingIds([]);
    setAppliedStack([]);
    setReviewUndoStack([]);
    setChatMessages([]);
    setChatInput("");
    setChatStatus({ loading: false, error: "", pending: "" });
    setPendingChatEdit(null);
    setCompareState(null);
    setCompareChatMessages([]);
    setCompareChatInput("");
    setCompareChatStatus({ loading: false, error: "", pending: "" });
    setPendingCompareChatEdit(null);
    setDocumentRoles({ workId: null, referenceId: null });
    setComparisonSelectionError("");
  }

  async function returnToEnvironment() {
    if (mode === "review" && review && reviewVersion > 1) {
      await finishReview("review");
      return;
    }
    if (mode === "compare" && compareState && compareState.currentVersionIndex > 0) {
      await finishReview("compare");
      return;
    }
    setMode(null);
    setWorkspace("home");
    setDocumentRoles({ workId: null, referenceId: null });
    setComparisonSelectionError("");
  }

  async function finishReview(kind) {
    const isComparison = kind === "compare";
    const fileName = isComparison ? compareState?.workItem.fileName : review?.fileName;
    const version = isComparison ? compareCurrentVersion?.version : reviewVersion;
    if (!auth || !fileName || !version) return;

    try {
      const originalId = isComparison ? compareState.workItem.id : documentIdFor(fileName);
      const [currentDocument, originalDocument] = await Promise.all([
        getDocumentVersion(originalId),
        getDocumentVersion(originalId, 1),
      ]);
      if (!currentDocument?.docxBase64 || !originalDocument?.docxBase64) {
        throw new Error("De veilige actuele of originele DOCX-versie ontbreekt.");
      }

      function selectFindingFromPreview(event) {
        const findingId = event.target.closest("[data-finding-id]")?.dataset.findingId;
        if (!findingId || !findings.some((finding) => finding.id === findingId)) return;
        setSelectedFindingId(findingId);
      }

      const editedFileName = editedDocumentFileName(fileName);
      const editedId = documentIdFor(editedFileName);
      const finishedAt = new Date().toISOString();
      const editedReview = isComparison
        ? {
          ...compareState.workItem.review,
          fileName: editedFileName,
          analysisText: compareCurrentVersion.analysisText,
          text: compareCurrentVersion.analysisText,
          findings: compareState.findings.filter((finding) => !compareState.appliedFindingIds.includes(finding.id)),
        }
        : {
          ...review,
          fileName: editedFileName,
          findings: findings.filter((finding) => !appliedFindingIds.includes(finding.id)),
        };
      const originalSnapshot = isComparison
        ? compareState.workItem
        : reviewUndoStack[0]?.review
          ? {
            ...savedReviews.find((item) => item.id === originalId),
            review: reviewUndoStack[0].review,
            findings: reviewUndoStack[0].review.findings,
          }
          : savedReviews.find((item) => item.id === originalId);
      const originalHistory = [{ version: 1, label: "Origineel", at: originalDocument.at ?? finishedAt }];
      const editedHistory = [{ version: 1, label: "Bewerkt", at: finishedAt }];

      await Promise.all([
        saveDocumentVersion(originalId, {
          fileName,
          docxBase64: originalDocument.docxBase64,
          analysisText: originalDocument.analysisText,
          version: 1,
          label: "Origineel",
          versionHistory: originalHistory,
        }),
        saveDocumentVersion(editedId, {
          fileName: editedFileName,
          docxBase64: currentDocument.docxBase64,
          analysisText: currentDocument.analysisText,
          version: 1,
          label: "Bewerkt",
          versionHistory: editedHistory,
        }),
      ]);

      const editedItem = {
        ...(isComparison ? compareState.workItem : savedReviews.find((item) => item.id === originalId)),
        id: editedId,
        fileName: editedFileName,
        savedAt: finishedAt,
        findings: editedReview.findings,
        appliedFindingIds: [],
        selectedFindingId: editedReview.findings[0]?.id ?? null,
        chatMessages: isComparison ? compareChatMessages : chatMessages,
        version: 1,
        versionHistory: editedHistory,
        review: reviewForStorage(editedReview),
      };
      const originalItem = {
        ...(originalSnapshot ?? savedReviews.find((item) => item.id === originalId)),
        id: originalId,
        fileName,
        appliedFindingIds: [],
        version: 1,
        versionHistory: originalHistory,
        review: reviewForStorage(originalSnapshot?.review),
      };
      const next = [
        editedItem,
        originalItem,
        ...savedReviews.filter((item) => item.id !== originalId && item.id !== editedId),
      ];
      localStorage.setItem(savedReviewsKey(auth.email), JSON.stringify(next));
      setSavedReviews(next);
      appendActivity(`${isComparison ? "Vergelijkingsreview" : "Documentreview"} afgerond. Origineel "${fileName}" behouden en bewerkte DOCX als "${editedFileName}" in Mijn documenten opgeslagen.`);
    } catch (error) {
      setStatus({ loading: false, step: 0, error: error.message || "Bewerkt document opslaan mislukt." });
      return;
    }
    setReview(null);
    setSourceFile(null);
    setCompareState(null);
    setMode(null);
    setWorkspace("home");
    setDocumentRoles({ workId: null, referenceId: null });
    setPendingChatEdit(null);
    setPendingCompareChatEdit(null);
  }

  async function deleteSavedDocument(item) {
    if (!window.confirm(`Weet je zeker dat je "${item.fileName}" en alle lokale versies wilt verwijderen?`)) return;

    await deleteDocumentVersion(item.id);
    setSavedReviews((current) => {
      const next = current.filter((savedItem) => savedItem.id !== item.id);
      localStorage.setItem(savedReviewsKey(auth.email), JSON.stringify(next));
      return next;
    });
    setDocumentAvailability((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    setDocumentRoles((current) => ({
      workId: current.workId === item.id ? null : current.workId,
      referenceId: current.referenceId === item.id ? null : current.referenceId,
    }));
    if (review?.fileName === item.fileName) {
      setReview(null);
      setSourceFile(null);
      setWorkspace("documents");
    }
    if (compareState?.workItem.id === item.id || compareState?.referenceItem.id === item.id) {
      setCompareState(null);
      setWorkspace("documents");
    }
    const bundledExample = exampleDocuments.find((example) => example.fileName === item.fileName);
    if (bundledExample) hideExampleDocument(bundledExample);
    appendActivity(`Document "${item.fileName}" verwijderd, inclusief metadata, actieve selecties en alle veilige lokale versies.`);
  }

  function hideExampleDocument(example) {
    setHiddenExampleIds((current) => {
      const next = current.includes(example.id) ? current : [...current, example.id];
      localStorage.setItem(hiddenExamplesKey(auth.email), JSON.stringify(next));
      return next;
    });
  }

  function deleteExampleDocument(example) {
    if (!window.confirm(`Weet je zeker dat je "${example.fileName}" uit Mijn documenten wilt verwijderen?`)) return;
    hideExampleDocument(example);
    appendActivity(`Meegeleverd voorbeeld "${example.fileName}" verwijderd uit Mijn documenten voor dit account.`);
  }

  function persistWorkItemVersion(id, version, versionHistory) {
    if (!auth) return;
    setSavedReviews((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, version, versionHistory } : item));
      localStorage.setItem(savedReviewsKey(auth.email), JSON.stringify(next));
      return next;
    });
  }

  function moveCompareFinding(direction) {
    setCompareState((current) => {
      if (!current || current.findings.length === 0) return current;
      const currentIndex = Math.max(current.findings.findIndex((item) => item.id === current.selectedFindingId), 0);
      const nextIndex = (currentIndex + direction + current.findings.length) % current.findings.length;
      return { ...current, selectedFindingId: current.findings[nextIndex].id };
    });
  }

  async function startComparison() {
    const workItem = savedReviews.find((item) => item.id === documentRoles.workId);
    const referenceItem = savedReviews.find((item) => item.id === documentRoles.referenceId);
    if (!workItem || !referenceItem || workItem.id === referenceItem.id) return;

    setComparisonSelectionError("");
    setCompareChatMessages([]);
    setCompareChatInput("");
    setCompareChatStatus({ loading: false, error: "", pending: "" });

    const [storedWorkDoc, storedReferenceDoc] = await Promise.all([
      getDocumentVersion(workItem.id).catch(() => null),
      getDocumentVersion(referenceItem.id).catch(() => null),
    ]);
    if (!storedWorkDoc?.docxBase64 || !storedReferenceDoc?.docxBase64) {
      setComparisonSelectionError(
        "Voor minimaal één gekozen document ontbreekt de veilige lokale DOCX-versie. Upload dat document opnieuw voordat je de vergelijking start.",
      );
      return;
    }

    setCompareState({
      workItem,
      referenceItem,
      versions: [],
      currentVersionIndex: -1,
      findings: [],
      appliedFindingIds: [],
      selectedFindingId: null,
      status: { loading: true, error: "" },
    });
    setWorkspace("compare");

    try {
      const analyzeResponse = await fetchWithTimeout("/api/review/comparison/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workDocument: { fileName: workItem.fileName, text: storedWorkDoc.analysisText ?? workItem.review?.analysisText ?? "" },
          referenceDocument: { fileName: referenceItem.fileName, text: storedReferenceDoc.analysisText ?? referenceItem.review?.analysisText ?? "" },
        }),
      });
      if (!analyzeResponse.ok) {
        const payload = await analyzeResponse.json().catch(() => ({}));
        throw new Error(payload.error || "Vergelijkingsanalyse mislukt.");
      }
      const analyzeData = await analyzeResponse.json();
      const findings = analyzeData.findings ?? [];

      const blob = base64ToBlob(storedWorkDoc.docxBase64, DOCX_MIME);
      const renderFormData = new FormData();
      renderFormData.append("file", blob, workItem.fileName);
      renderFormData.append("remainingFindings", JSON.stringify(findings));
      const referenceFormData = new FormData();
      referenceFormData.append("file", base64ToBlob(storedReferenceDoc.docxBase64, DOCX_MIME), referenceItem.fileName);
      referenceFormData.append("remainingFindings", "[]");
      const [renderResponse, referenceRenderResponse] = await Promise.all([
        fetchWithTimeout("/api/review/comparison/render", { method: "POST", body: renderFormData }),
        fetchWithTimeout("/api/review/comparison/render", { method: "POST", body: referenceFormData }),
      ]);
      if (!renderResponse.ok || !referenceRenderResponse.ok) {
        const failedResponse = !renderResponse.ok ? renderResponse : referenceRenderResponse;
        const payload = await failedResponse.json().catch(() => ({}));
        throw new Error(payload.error || "Preview van het Werkdocument mislukt.");
      }
      const [renderData, referenceRenderData] = await Promise.all([
        renderResponse.json(),
        referenceRenderResponse.json(),
      ]);

      const initialVersion = {
        version: storedWorkDoc.version ?? 1,
        label: storedWorkDoc.label ?? "Origineel",
        docxBase64: storedWorkDoc.docxBase64,
        preview: renderData.preview,
        analysisText: storedWorkDoc.analysisText ?? workItem.review?.analysisText ?? "",
      };

      setCompareState({
        workItem,
        referenceItem,
        versions: [initialVersion],
        currentVersionIndex: 0,
        findings,
        appliedFindingIds: [],
        selectedFindingId: findings[0]?.id ?? null,
        status: { loading: false, error: "" },
        referencePreview: referenceRenderData.preview,
        referenceAnalysisText: storedReferenceDoc.analysisText ?? referenceItem.review?.analysisText ?? "",
      });
      appendActivity(`Vergelijking gestart: Werkdocument "${workItem.fileName}" versus Referentiedocument "${referenceItem.fileName}"`);
      appendActivity(`Semantische vergelijking gestart: Werkdocument "${workItem.fileName}" tegenover Referentiedocument "${referenceItem.fileName}".`);
    } catch (error) {
      setCompareState((current) => current && {
        ...current,
        status: { loading: false, error: error.message || "Vergelijkingsanalyse mislukt." },
      });
    }
  }

  async function applyComparisonFinding(findingId, findingOverride = null) {
    if (!compareState || compareState.status.loading) return;
    const finding = findingOverride ?? compareState.findings.find((item) => item.id === findingId);
    if (!finding || compareState.appliedFindingIds.includes(findingId)) return;

    const currentVersion = compareState.versions[compareState.currentVersionIndex];
    const remainingFindings = compareState.findings.filter(
      (item) => item.id !== findingId && !compareState.appliedFindingIds.includes(item.id),
    );

    setCompareState((current) => ({ ...current, status: { loading: true, error: "" } }));
    try {
      const formData = new FormData();
      formData.append("file", base64ToBlob(currentVersion.docxBase64, DOCX_MIME), compareState.workItem.fileName);
      formData.append("matchText", finding.matchTexts?.[0] ?? "");
      formData.append("suggestion", finding.suggestion);
      formData.append("findingTitle", finding.title ?? "");
      formData.append("findingDetail", finding.detail ?? "");
      formData.append("findingAdvice", finding.advice ?? "");
      formData.append("remainingFindings", JSON.stringify(remainingFindings));

      const response = await fetch("/api/review/comparison/apply", { method: "POST", body: formData });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Accepteren van de vergelijkingssuggestie is mislukt.");
      }
      const data = await response.json();

      const appliedFinding = { ...finding, suggestion: data.appliedSuggestion ?? finding.suggestion };
      const newVersion = {
        version: currentVersion.version + 1,
        label: `Na acceptatie: ${finding.title}`,
        docxBase64: data.docxBase64,
        preview: data.preview,
        analysisText: data.analysisText,
      };
      const nextVersions = [...compareState.versions.slice(0, compareState.currentVersionIndex + 1), newVersion];
      const nextAppliedIds = [...compareState.appliedFindingIds, findingId];
      const nextVersionHistory = nextVersions.map((version) => ({ version: version.version, label: version.label, at: nowLabel() }));
      const retainedAppliedFindings = [appliedFinding, ...compareState.findings.filter(
        (item) => nextAppliedIds.includes(item.id),
      ).filter((item) => item.id !== finding.id)];
      const nextFindings = [...retainedAppliedFindings, ...(data.findings ?? remainingFindings)];

      setCompareState({
        ...compareState,
        versions: nextVersions,
        currentVersionIndex: nextVersions.length - 1,
        findings: nextFindings,
        appliedFindingIds: nextAppliedIds,
        selectedFindingId: data.findings?.[0]?.id ?? null,
        status: { loading: false, error: "" },
      });

      await saveDocumentVersion(compareState.workItem.id, {
        fileName: compareState.workItem.fileName,
        docxBase64: newVersion.docxBase64,
        analysisText: newVersion.analysisText,
        version: newVersion.version,
        label: newVersion.label,
        versionHistory: nextVersionHistory,
      });
      persistWorkItemVersion(compareState.workItem.id, newVersion.version, nextVersionHistory);
      setPendingCompareChatEdit(null);

      appendActivity(`Vergelijkingsbevinding geaccepteerd in Werkdocument "${compareState.workItem.fileName}": ${finding.title}. Nieuwe versie v${newVersion.version} opgeslagen en openstaande bevindingen opnieuw gevalideerd.`);
    } catch (error) {
      setCompareState((current) => ({ ...current, status: { loading: false, error: error.message || "Accepteren is mislukt." } }));
    }
  }

  function applyComparisonChatEdit() {
    if (!pendingCompareChatEdit) return;
    const proposalFinding = {
      id: makeId("compare-chat-edit"),
      category: "consistency",
      color: "blue",
      title: pendingCompareChatEdit.title ?? "Wijziging vanuit vergelijkingschat",
      detail: pendingCompareChatEdit.explanation ?? "Door de gebruiker via de chat voorgestelde wijziging.",
      suggestion: pendingCompareChatEdit.suggestion,
      matchTexts: [pendingCompareChatEdit.matchText],
      referenceExcerpt: compareFinding?.referenceExcerpt ?? "",
    };
    applyComparisonFinding(proposalFinding.id, proposalFinding);
  }

  function undoComparisonFinding() {
    if (!compareState || compareState.status.loading || compareState.currentVersionIndex <= 0) return;

    const undoneFindingId = compareState.appliedFindingIds[compareState.appliedFindingIds.length - 1];
    const undoneFinding = compareState.findings.find((item) => item.id === undoneFindingId);
    const previousIndex = compareState.currentVersionIndex - 1;
    const previousVersion = compareState.versions[previousIndex];
    const nextVersions = compareState.versions.slice(0, previousIndex + 1);
    const nextAppliedIds = compareState.appliedFindingIds.slice(0, -1);
    const nextVersionHistory = nextVersions.map((version) => ({ version: version.version, label: version.label, at: nowLabel() }));

    setCompareState({
      ...compareState,
      versions: nextVersions,
      currentVersionIndex: previousIndex,
      appliedFindingIds: nextAppliedIds,
      selectedFindingId: undoneFindingId ?? compareState.selectedFindingId,
    });

    saveDocumentVersion(compareState.workItem.id, {
      fileName: compareState.workItem.fileName,
      docxBase64: previousVersion.docxBase64,
      analysisText: previousVersion.analysisText,
      version: previousVersion.version,
      label: previousVersion.label,
      versionHistory: nextVersionHistory,
    }).catch((error) => console.warn("Kon Undo niet opslaan in IndexedDB:", error));
    persistWorkItemVersion(compareState.workItem.id, previousVersion.version, nextVersionHistory);

    appendActivity(`Undo uitgevoerd op vergelijkingswijziging${undoneFinding ? `: ${undoneFinding.title}` : ""}`);
    appendActivity(`Undo uitgevoerd in Werkdocument "${compareState.workItem.fileName}"${undoneFinding ? ` voor bevinding "${undoneFinding.title}"` : ""}; vorige versie hersteld.`);
  }

  function downloadComparisonVersion() {
    if (!compareCurrentVersion) return;
    const url = URL.createObjectURL(base64ToBlob(compareCurrentVersion.docxBase64, DOCX_MIME));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${compareState.workItem.fileName.replace(/\.docx$/i, "")}-v${compareCurrentVersion.version}.docx`;
    anchor.click();
    URL.revokeObjectURL(url);
    appendActivity(`Werkdocument versie v${compareCurrentVersion.version} gedownload`);
  }

  if (!auth) {
    return (
      <div className="app-shell auth-shell">
        <section className="panel auth-card">
          <div className="brand auth-brand">
            <img src="/ind-logo-mark.svg" alt="IND" className="brand-logo" />
            <div>
              <p className="eyebrow">Demo login</p>
              <h1>IND document review</h1>
            </div>
          </div>

          <p className="hero-copy">
            Log in met een demo-account om naar je omgeving te routeren.
          </p>

          <form className="login-form" onSubmit={handleLogin}>
            <label>
              E-mail
              <input
                type="email"
                value={login.email}
                onChange={(event) => setLogin((current) => ({ ...current, email: event.target.value }))}
              />
            </label>
            <label>
              Wachtwoord
              <input
                type="password"
                value={login.password}
                onChange={(event) => setLogin((current) => ({ ...current, password: event.target.value }))}
              />
            </label>
            <button type="submit">Inloggen</button>
          </form>

          {loginError ? <p className="error-banner">{loginError}</p> : null}
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/ind-logo-mark.svg" alt="IND" className="brand-logo" />
          <div>
            <p className="eyebrow">IND document review demo</p>
            <h1>Consistentie, tegenstrijdigheden en volledigheid</h1>
            <p className="subline">Geautomatiseerde review van notities en beleidsstukken</p>
          </div>
        </div>
        <nav className="topbar-nav" aria-label="Sectienavigatie">
          {[
            { id: "home", label: "Beginscherm" },
            ...(mode ? [{ id: "documents", label: mode === "review" ? "Document kiezen" : "Documenten kiezen" }] : []),
            ...(mode === "review" && review ? [{ id: "review", label: "Bewerken" }] : []),
            ...(mode === "compare" && compareState ? [{ id: "compare", label: "Vergelijking" }] : []),
            ...(mode ? [{ id: "activity", label: "Actielog" }] : []),
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-chip ${activeSectionId === item.id ? "active" : ""}`}
              aria-current={activeSectionId === item.id ? "page" : undefined}
              onClick={() => (item.id === "home" ? returnToEnvironment() : setWorkspace(item.id))}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="topbar-actions">
          <div className="topbar-pill">
            {auth.name} · {auth.role}
          </div>
          <button type="button" className="ghost-button" onClick={logout}>
            Uitloggen
          </button>
        </div>
      </header>

      <main className="layout">
        {activeWorkspace === "home" ? (
          <section className="stage mode-selection">
            <div className="panel mode-selection-intro">
              <p className="eyebrow">Kies een werkstroom</p>
              <h2>Wat wil je doen?</h2>
              <p>Beoordeel één document op zichzelf, of vergelijk twee volledige documenten met elkaar.</p>
            </div>
            <div className="mode-card-grid">
              <button type="button" className="panel mode-card" onClick={() => chooseMode("review")}>
                <span className="mode-card-number">1</span>
                <strong>Eén document beoordelen</strong>
                <p>Upload of open een eerder document en doorloop de bevindingen in Bewerken.</p>
                <span>Start documentreview</span>
              </button>
              <button type="button" className="panel mode-card" onClick={() => chooseMode("compare")}>
                <span className="mode-card-number">2</span>
                <strong>Twee documenten vergelijken</strong>
                <p>Kies een verbeterbaar Werkdocument en een statisch Referentiedocument.</p>
                <span>Start documentvergelijking</span>
              </button>
            </div>
          </section>
        ) : activeWorkspace === "documents" ? (
          <section className="stage stage-documents">
            <div className="panel workflow-context">
              <div>
                <p className="eyebrow">{mode === "compare" ? "Vergelijkingsomgeving" : "Reviewomgeving"}</p>
                <h2>{mode === "compare" ? "Twee documenten vergelijken" : "Eén document beoordelen"}</h2>
                <p>
                  {mode === "compare"
                    ? "Voeg documenten toe of selecteer twee beschikbare documenten. Het Werkdocument kan worden verbeterd; het Referentiedocument blijft statisch."
                    : "Voeg een document toe of open een eerder document om het te beoordelen en te verbeteren."}
                </p>
              </div>
              <button type="button" className="ghost-button small" onClick={returnToEnvironment}>
                Andere werkstroom kiezen
              </button>
            </div>
            <aside className="panel saved-results">
              <div className="panel-header">
                <h2>{mode === "compare" ? "Documenten selecteren" : "Document selecteren"}</h2>
                <span>Catalogus</span>
              </div>
              <p className="inline-note">
                {mode === "compare"
                  ? "Kies exact twee beschikbare documenten: één als Werkdocument en één als statisch Referentiedocument."
                  : "Open een document ter review."}
              </p>
              <div className="selection-upload">
                <div>
                  <strong>Nieuw document toevoegen</strong>
                  <p>Upload een .docx; tabellen blijven onveranderlijk.</p>
                </div>
                <label className="file-button">
                  Kies bestand
                  <input type="file" accept=".docx" onChange={handleUpload} />
                </label>
              </div>
              <div className="subsection-header personal-documents-header">
                <strong>Mijn documenten</strong>
                <span>{savedReviews.length + visibleExampleDocuments.length}</span>
              </div>
              <div className="saved-list">
                {savedReviews.length === 0 && visibleExampleDocuments.length === 0 ? (
                  <div className="empty-state">Nog geen documenten.</div>
                ) : (
                  <>
                    {visibleExampleDocuments.map((example) => (
                      <div key={example.id} className="saved-item">
                        <div className="saved-item-header">
                          <button
                            type="button"
                            className="saved-item-open"
                            onClick={() => openExampleDocument(example)}
                            disabled={status.loading}
                          >
                            <strong>{example.fileName}</strong>
                            <span className="version-badge">Meegeleverd · geanonimiseerd</span>
                            <span className="storage-badge available">Openen activeert de veilige preview</span>
                          </button>
                          <button
                            type="button"
                            className="document-delete-button"
                            aria-label={`Verwijder ${example.fileName}`}
                            title="Document verwijderen"
                            onClick={() => deleteExampleDocument(example)}
                          >
                            🗑
                          </button>
                        </div>
                        {mode === "compare" ? (
                          <div className="role-toggle-group">
                            <button
                              type="button"
                              className="role-badge work"
                              onClick={() => openExampleDocument(example, "work")}
                              disabled={status.loading}
                            >
                              Werkdocument
                            </button>
                            <button
                              type="button"
                              className="role-badge reference"
                              onClick={() => openExampleDocument(example, "reference")}
                              disabled={status.loading}
                            >
                              Referentiedocument
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {savedReviews.map((item) => (
                      <div key={item.id} className={`saved-item ${documentAvailability[item.id] === false ? "unavailable" : ""}`}>
                      <div className="saved-item-header">
                        <button
                          type="button"
                          className="saved-item-open"
                          onClick={() => restoreSavedReview(item)}
                          disabled={mode !== "review" || documentAvailability[item.id] !== true}
                        >
                          <strong>{item.fileName}</strong>
                          <span>{new Date(item.savedAt).toLocaleString("nl-NL")}</span>
                          <span className="version-badge" title="Versieherkomst">
                            v{item.version ?? 1} · {item.versionHistory?.[item.versionHistory.length - 1]?.label ?? "Origineel"}
                          </span>
                          <span className={`storage-badge ${documentAvailability[item.id] === true ? "available" : ""}`}>
                            {documentAvailability[item.id] === undefined
                              ? "Opslag controleren…"
                              : documentAvailability[item.id]
                                ? "Preview beschikbaar"
                                : "Bron ontbreekt · upload opnieuw"}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="document-delete-button"
                          aria-label={`Verwijder ${item.fileName}`}
                          title="Document verwijderen"
                          onClick={() => deleteSavedDocument(item)}
                        >
                          🗑
                        </button>
                      </div>
                      {mode === "compare" ? <div className="role-toggle-group">
                        <button
                          type="button"
                          className={`role-badge work ${documentRoles.workId === item.id ? "active" : ""}`}
                          onClick={() => setDocumentRoles((current) => ({
                            workId: current.workId === item.id ? null : item.id,
                            referenceId: current.referenceId === item.id ? null : current.referenceId,
                          }))}
                          disabled={documentAvailability[item.id] !== true}
                        >
                          Werkdocument
                        </button>
                        <button
                          type="button"
                          className={`role-badge reference ${documentRoles.referenceId === item.id ? "active" : ""}`}
                          onClick={() => setDocumentRoles((current) => ({
                            referenceId: current.referenceId === item.id ? null : item.id,
                            workId: current.workId === item.id ? null : current.workId,
                          }))}
                          disabled={documentAvailability[item.id] !== true}
                        >
                          Referentiedocument
                        </button>
                      </div> : null}
                    </div>
                    ))}
                  </>
                )}
              </div>
              {exampleError ? <p className="error-message">{exampleError}</p> : null}
              {mode === "compare" ? (
                <>
                  <button
                    type="button"
                    className="primary-button"
                    disabled={
                      !documentRoles.workId
                      || !documentRoles.referenceId
                      || documentRoles.workId === documentRoles.referenceId
                      || documentAvailability[documentRoles.workId] !== true
                      || documentAvailability[documentRoles.referenceId] !== true
                    }
                    onClick={startComparison}
                  >
                    Start vergelijking
                  </button>
                  {comparisonSelectionError ? <p className="error-message">{comparisonSelectionError}</p> : null}
                </>
              ) : null}
            </aside>

          </section>
        ) : activeWorkspace === "compare" && compareState ? (
          <section className="stage stage-review stage-compare">
            <div className="panel preview-panel">
              <div className="panel-header">
                <div>
                  <h2>Werkdocument</h2>
                  <span>{compareState.workItem.fileName} · versie v{compareCurrentVersion?.version ?? 1} ({compareCurrentVersion?.label ?? "Origineel"})</span>
                </div>
                <div className="panel-header-actions">
                  <div className="zoom-controls" aria-label="Zoom documentpreviews">
                    <button type="button" onClick={() => setComparisonZoom((value) => Math.max(0.75, value - 0.25))} disabled={comparisonZoom <= 0.75}>−</button>
                    <span>{Math.round(comparisonZoom * 100)}%</span>
                    <button type="button" onClick={() => setComparisonZoom((value) => Math.min(2, value + 0.25))} disabled={comparisonZoom >= 2}>+</button>
                  </div>
                  <button type="button" className="ghost-button small" onClick={downloadComparisonVersion} disabled={!compareCurrentVersion}>
                    Download versie
                  </button>
                </div>
              </div>
              <div className="version-chain" aria-label="Versieherkomst Werkdocument">
                {compareState.versions.map((version, index) => (
                  <span
                    key={version.version}
                    className={`version-chip ${index === compareState.currentVersionIndex ? "active" : ""}`}
                  >
                    v{version.version} · {version.label}
                  </span>
                ))}
              </div>
              <HighlightLegend />
              <div className="comparison-previews">
                <div>
                  <strong>Werkdocument · verbeterbaar</strong>
                  <div className="document-preview">
                    {compareState.status.loading ? (
                      <div className="preview-processing" role="status" aria-live="polite">
                        <strong>Vergelijking verwerken</strong>
                        <span className="processing-dots" aria-hidden="true"><i /><i /><i /></span>
                        <small>Analyse en documentweergave worden bijgewerkt.</small>
                      </div>
                    ) : compareCurrentVersion?.preview?.pages?.length > 0 ? (
                      <div className="pdf-pages" style={{ width: `${comparisonZoom * 100}%` }}>
                        {compareCurrentVersion.preview.pages.map((page, index) => (
                          <img key={`compare-page-${index + 1}`} src={page} alt={`Werkdocument pagina ${index + 1}`} />
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">Geen preview beschikbaar.</div>
                    )}
                  </div>
                </div>
                <div>
                  <strong>Referentiedocument · statisch</strong>
                  <div className="document-preview reference-preview">
                    {compareState.referencePreview?.pages?.length > 0 ? (
                      <div className="pdf-pages" style={{ width: `${comparisonZoom * 100}%` }}>
                        {compareState.referencePreview.pages.map((page, index) => (
                          <img key={`reference-page-${index + 1}`} src={page} alt={`Referentiedocument pagina ${index + 1}`} />
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">Geen referentiepreview beschikbaar.</div>
                    )}
                  </div>
                </div>
              </div>
              {compareState.status.error ? <p className="error-message preview-error">{compareState.status.error}</p> : null}
            </div>

            <aside className="panel findings-panel">
              <div className="panel-header">
                <h2>Vergelijkingsreview</h2>
                <span>
                  {compareState.findings.length
                    ? `${compareState.findings.findIndex((item) => item.id === compareFinding?.id) + 1} van ${compareState.findings.length}`
                    : "0 bevindingen"}
                </span>
              </div>
              <div className="inline-note">Referentiedocument (statisch): {compareState.referenceItem.fileName}</div>
              <div className="chat-review">
                <div className="finding-navigation">
                  <button type="button" className="ghost-button small" onClick={() => moveCompareFinding(-1)} disabled={compareState.findings.length === 0}>
                    Vorige
                  </button>
                  <button type="button" className="ghost-button small" onClick={() => moveCompareFinding(1)} disabled={compareState.findings.length === 0}>
                    Volgende
                  </button>
                </div>
                <div className="chat-finding-context">
                  <span>Actuele bevinding</span>
                  <strong>{compareFinding?.title ?? (compareState.status.loading ? "Analyse loopt…" : "Geen openstaande bevinding")}</strong>
                  {compareFinding ? (
                    <>
                      <p>{compareFinding.detail}</p>
                      <div className="chat-finding-advice">
                        <strong>Advies</strong>
                        <span>{compareFinding.suggestion}</span>
                        {compareFinding.example ? <small>{compareFinding.example}</small> : null}
                      </div>
                      <div className="excerpt-pair">
                        <div>
                          <span>Werkdocument</span>
                          <p>{compareFinding.matchTexts?.[0]}</p>
                        </div>
                        {compareFinding.referenceExcerpt ? (
                          <div>
                            <span>Referentiedocument</span>
                            <p>{compareFinding.referenceExcerpt}</p>
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                  <div className="finding-toolbar">
                    <button
                      type="button"
                      className="ghost-button small"
                      onClick={() => applyComparisonFinding(compareFinding?.id)}
                      disabled={!compareFinding || compareState.status.loading}
                    >
                      Accepteren
                    </button>
                  </div>
                </div>
                {compareState.appliedFindingIds.length > 0 ? (
                  <div className="last-change-row">
                    <span>Laatste wijziging: {compareLastAppliedFinding?.title ?? "onbekend"}</span>
                    <button type="button" className="ghost-button small" onClick={undoComparisonFinding} disabled={!compareCanUndo}>
                      Undo
                    </button>
                  </div>
                ) : null}
                <div className="comparison-chat">
                  <div className="subsection-header">
                    <strong>Chat over de vergelijking</strong>
                    <button
                      type="button"
                      className="ghost-button small"
                      onClick={() => sendComparisonChatMessage(null, "Leg de actuele vergelijkingsbevinding uitgebreider uit en geef een concreet herschrijfvoorbeeld voor het Werkdocument.")}
                      disabled={!compareFinding || compareChatStatus.loading}
                    >
                      Leg uitgebreider uit
                    </button>
                  </div>
                  <div className="chat-messages" aria-live="polite" ref={compareChatMessagesRef}>
                    {compareChatMessages.map((message) => (
                      <div key={message.id} className={`chat-message ${message.role}`}>
                        <strong>{message.role === "assistant" ? "Vergelijkingsassistent" : auth.name}</strong>
                        {renderChatContent(message.content)}
                      </div>
                    ))}
                    {compareChatStatus.loading ? (
                      <>
                        <div className="chat-message user"><strong>{auth.name}</strong><p>{compareChatStatus.pending}</p></div>
                        <div className="chat-message assistant typing">
                          <strong>Vergelijkingsassistent</strong>
                          <span className="processing-dots" aria-label="Antwoord wordt opgesteld"><i /><i /><i /></span>
                        </div>
                      </>
                    ) : null}
                    {pendingCompareChatEdit ? (
                      <div className="chat-edit-proposal">
                        <strong>✍ Voorgestelde tekstwijziging</strong>
                        <div><span>Huidige tekst</span><p>{pendingCompareChatEdit.matchText}</p></div>
                        <div><span>Nieuwe tekst</span><p>{pendingCompareChatEdit.suggestion}</p></div>
                        <button type="button" onClick={applyComparisonChatEdit} disabled={compareState.status.loading}>Accepteren</button>
                      </div>
                    ) : null}
                  </div>
                  {compareChatStatus.error ? <p className="error-message">{compareChatStatus.error}</p> : null}
                  <form className="chat-form" onSubmit={sendComparisonChatMessage}>
                    <label htmlFor="compare-chat-input">Stel een vrije vraag over deze vergelijking</label>
                    <textarea
                      id="compare-chat-input"
                      value={compareChatInput}
                      onChange={(event) => setCompareChatInput(event.target.value)}
                      placeholder="Bijvoorbeeld: waarom spreken deze passages elkaar tegen?"
                      rows={3}
                      maxLength={2_000}
                    />
                    <div className="chat-form-actions">
                      <button
                        type="button"
                        className="ghost-button small"
                        onClick={clearComparisonChat}
                        disabled={compareChatStatus.loading || (compareChatMessages.length === 0 && !pendingCompareChatEdit)}
                      >
                        Wis chat
                      </button>
                      <button type="submit" disabled={!compareChatInput.trim() || compareChatStatus.loading}>Versturen</button>
                    </div>
                  </form>
                </div>
              </div>
              <p className="sync-note">Accepteren herschrijft de Werkdocument-DOCX en bewaart een nieuwe herkenbare versie. Het Referentiedocument verandert nooit.</p>
              <button type="button" className="finish-button" onClick={() => finishReview("compare")} disabled={compareState.status.loading}>
                Afronden en opslaan
              </button>
            </aside>
          </section>
        ) : activeWorkspace === "activity" ? (
          <section className="stage stage-activity">
            <div className="panel activity-page">
              <div className="panel-header">
                <div>
                  <h2>Actielog</h2>
                  <span>{review?.fileName ?? "Geen document geselecteerd"}</span>
                </div>
                <button
                  type="button"
                  className="ghost-button small"
                  onClick={() => downloadExport("log").catch((error) => setStatus({ loading: false, step: 0, error: error.message }))}
                >
                  Download actielog
                </button>
              </div>
              <p className="sync-note">Alle acties binnen reviews en vergelijkingen worden uitgebreid per account vastgelegd en automatisch gesynchroniseerd.</p>
              <div className="log-list">
                {activity.length === 0 ? (
                  <div className="empty-state">Nog geen acties voor dit account.</div>
                ) : (
                  [...activity].reverse().map((entry) => (
                    <div key={entry.id} className="log-entry">
                      <time>{entry.at}</time>
                      <span>{entry.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="stage stage-review">
            <div className="panel preview-panel">
              <div className="panel-header">
                <div>
                  <h2>Preview</h2>
                  <span>
                    Actuele documentopmaak
                    {findings.some((finding) => !appliedFindingIds.includes(finding.id))
                      ? " met gemarkeerde bevindingen"
                      : ""}
                  </span>
                </div>
                <div className="panel-header-actions">
                  <div className="zoom-controls" aria-label="Zoom documentpreview">
                    <button type="button" onClick={() => setPreviewZoom((value) => Math.max(0.75, value - 0.25))} disabled={previewZoom <= 0.75}>−</button>
                    <span>{Math.round(previewZoom * 100)}%</span>
                    <button type="button" onClick={() => setPreviewZoom((value) => Math.min(2, value + 0.25))} disabled={previewZoom >= 2}>+</button>
                  </div>
                  <button
                    type="button"
                    className="ghost-button small"
                    onClick={() => downloadPreview().catch((error) => setPreviewStatus({ loading: false, error: error.message }))}
                    disabled={!sourceFile || previewStatus.loading}
                    title={sourceFile ? "Download de actuele veilige documentversie als DOCX" : "Upload het brondocument opnieuw om de DOCX te downloaden"}
                  >
                    Download preview
                  </button>
                </div>
              </div>
              <HighlightLegend />
              <div className="document-preview" ref={previewContainerRef}>
                {previewPages.length > 0 ? (
                  <div className="pdf-pages" style={{ width: `${previewZoom * 100}%` }}>
                    {previewPages.map((page, index) => (
                      <div className="pdf-page" key={`${review.fileName}-page-${index + 1}`} data-preview-page={index}>
                        <img src={page} alt={`Documentpagina ${index + 1}`} />
                        {Object.entries(review.preview?.findingRegions ?? {}).flatMap(([findingId, regions]) => (
                          regions.filter((region) => region.page === index).map((region, regionIndex) => (
                            <button
                              key={`${findingId}-${regionIndex}`}
                              type="button"
                              className="preview-finding-region"
                              data-finding-id={findingId}
                              style={{
                                left: `${region.x}%`,
                                top: `${region.y}%`,
                                width: `${region.width}%`,
                                height: `${region.height}%`,
                              }}
                              aria-label={`Toon bevinding: ${findings.find((finding) => finding.id === findingId)?.title ?? findingId}`}
                              onClick={() => setSelectedFindingId(findingId)}
                            />
                          ))
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="preview-body" onClick={selectFindingFromPreview} dangerouslySetInnerHTML={{ __html: previewHtml }} />
                )}
                {previewStatus.loading ? (
                  <div className="preview-processing" role="status" aria-live="polite">
                    <strong>Preview verwerken</strong>
                    <span className="processing-dots" aria-hidden="true"><i /><i /><i /></span>
                    <small>De nieuwe documentweergave wordt gerenderd.</small>
                  </div>
                ) : null}
              </div>
              {previewStatus.error ? <p className="error-message preview-error">{previewStatus.error}</p> : null}
            </div>

            <aside className="panel findings-panel">
              <div className="panel-header">
                <h2>Bewerken</h2>
                <span>{findings.length ? `${findings.findIndex((item) => item.id === activeFinding?.id) + 1} van ${findings.length}` : "0 bevindingen"}</span>
              </div>
                <div className="chat-review">
                  <div className="finding-navigation">
                    <button type="button" className="ghost-button small" onClick={() => moveChatFinding(-1)} disabled={findings.length === 0}>
                      Vorige
                    </button>
                    <button type="button" className="ghost-button small" onClick={() => moveChatFinding(1)} disabled={findings.length === 0}>
                      Volgende
                    </button>
                  </div>
                  <div className="chat-finding-context">
                    <span>Actuele bevinding</span>
                    <strong>{activeFinding?.title ?? "Geen openstaande bevinding"}</strong>
                    {activeFinding ? (
                      <>
                        <p>{activeFinding.detail}</p>
                        <div className="chat-finding-advice">
                          <strong>Advies</strong>
                          <span>{activeFinding.advice || activeFinding.detail}</span>
                          <strong>Tekstvoorstel</strong>
                          <span>{activeFinding.suggestion}</span>
                          {activeFinding.example ? <small>{activeFinding.example}</small> : null}
                        </div>
                      </>
                    ) : null}
                    <div className="finding-toolbar">
                      <button
                        type="button"
                        className="ghost-button small"
                        onClick={() => sendChatMessage(null, "Leg de actuele bevinding uitgebreider uit en geef een concreet herschrijfvoorbeeld.")}
                        disabled={!activeFinding || chatStatus.loading}
                      >
                        Leg uitgebreider uit
                      </button>
                      <button
                        type="button"
                        className="ghost-button small"
                        onClick={() => (
                          appliedFindingIds.includes(activeFinding?.id)
                            ? undoFinding(activeFinding.id)
                            : applyFindingFromChat(activeFinding?.id)
                        )}
                        disabled={
                          !activeFinding
                          || previewStatus.loading
                          || (
                            appliedFindingIds.includes(activeFinding.id)
                            && appliedStack.at(-1) !== activeFinding.id
                          )
                        }
                        title={
                          activeFinding
                          && appliedFindingIds.includes(activeFinding.id)
                          && appliedStack.at(-1) !== activeFinding.id
                            ? "Maak eerst de later geaccepteerde wijzigingen ongedaan."
                            : undefined
                        }
                      >
                        {activeFinding && appliedFindingIds.includes(activeFinding.id) ? "Undo" : "Accepteren"}
                      </button>
                    </div>
                  </div>
                  <div className="chat-prompts" aria-label="Voorgestelde vragen">
                    <button
                      type="button"
                      className="ghost-button small"
                      onClick={() => sendChatMessage(null, `Waarom is de bevinding "${activeFinding?.title}" belangrijk voor de kwaliteit van de nota?`)}
                      disabled={!activeFinding || chatStatus.loading}
                    >
                      Waarom is dit belangrijk?
                    </button>
                    <button
                      type="button"
                      className="ghost-button small"
                      onClick={() => sendChatMessage(null, `Geef een concreet herschrijfvoorbeeld voor de bevinding "${activeFinding?.title}".`)}
                      disabled={!activeFinding || chatStatus.loading}
                    >
                      Geef een herschrijfvoorbeeld
                    </button>
                  </div>
                  <div className="chat-messages" aria-live="polite" ref={chatMessagesRef}>
                    {chatMessages.map((message) => (
                      <div key={message.id} className={`chat-message ${message.role}`}>
                        <strong>{message.role === "assistant" ? "Reviewassistent" : auth.name}</strong>
                        {renderChatContent(message.content)}
                      </div>
                    ))}
                    {chatStatus.loading ? (
                      <>
                        <div className="chat-message user">
                          <strong>{auth.name}</strong>
                          <p>{chatStatus.pending}</p>
                        </div>
                        <div className="chat-message assistant typing">
                          <strong>Reviewassistent</strong>
                          <span className="processing-dots" aria-label="Antwoord wordt opgesteld"><i /><i /><i /></span>
                        </div>
                      </>
                    ) : null}
                    {pendingChatEdit ? (
                      <div className="chat-edit-proposal">
                        <strong>✍ Voorgestelde tekstwijziging</strong>
                        <div><span>Huidige tekst</span><p>{pendingChatEdit.matchText}</p></div>
                        <div><span>Nieuwe tekst</span><p>{pendingChatEdit.suggestion}</p></div>
                        <button
                          type="button"
                          onClick={() => applyReviewEdit({
                            id: makeId("chat-edit"),
                            title: pendingChatEdit.title ?? "Wijziging vanuit chat",
                            matchText: pendingChatEdit.matchText,
                            suggestion: pendingChatEdit.suggestion,
                          })}
                          disabled={previewStatus.loading}
                        >
                          Accepteren
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {chatStatus.error ? <p className="error-message">{chatStatus.error}</p> : null}
                  <form className="chat-form" onSubmit={sendChatMessage}>
                    <label htmlFor="chat-input">Stel een vrije vraag over deze nota</label>
                    <textarea
                      id="chat-input"
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      placeholder="Bijvoorbeeld: waarom is deze formulering tegenstrijdig?"
                      rows={3}
                      maxLength={2_000}
                    />
                    <div className="chat-form-actions">
                      <button
                        type="button"
                        className="ghost-button small"
                        onClick={clearChat}
                        disabled={chatStatus.loading || (chatMessages.length === 0 && !pendingChatEdit)}
                      >
                        Wis chat
                      </button>
                      <button type="submit" disabled={!chatInput.trim() || chatStatus.loading}>Versturen</button>
                    </div>
                  </form>
                </div>
              <p className="sync-note">Chat en wijzigingen worden automatisch gesynchroniseerd.</p>
              <button type="button" className="finish-button" onClick={() => finishReview("review")} disabled={previewStatus.loading}>
                Afronden en opslaan
              </button>
            </aside>
          </section>
        )}
      </main>

      {status.loading ? (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="analysis-heading">
              <span className="analysis-spinner" aria-hidden="true" />
              <div>
                <h2>Documentanalyse loopt</h2>
                <p>Na de uploadcontrole wordt het document verwerkt en in één semantische LLM-analyse beoordeeld.</p>
              </div>
            </div>
            <div className="stepper">
              {STEP_LABELS.map((label, index) => (
                <div key={label} className={`step ${index < status.step ? "complete" : ""} ${index === status.step ? "active current" : ""}`}>
                  <span className="step-number">{index + 1}</span>
                  <div className="step-content">
                    <strong>{label}</strong>
                    {index === 1 ? (
                      <div className="analysis-substeps" aria-label="Onderdelen van de semantische analyse">
                        <small>De LLM beoordeelt deze onderdelen gezamenlijk:</small>
                        <ul>
                          {SEMANTIC_ANALYSIS_PARTS.map((part) => <li key={part}>{part}</li>)}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                  {index === status.step ? <span className="processing-dots" aria-label="Wordt uitgevoerd"><i /><i /><i /></span> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {status.error ? <div className="error-banner fixed">{status.error}</div> : null}
    </div>
  );
}
