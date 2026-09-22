const DEFAULT_MARK_CLASS = "preview-highlight";

export function decoratePreviewHtml(html, { piiMatches = [], findings = [], appliedFindingIds = [], selectedFindingId = null }) {
  if (!html) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const tokens = buildTokens(piiMatches, findings, appliedFindingIds, selectedFindingId);
  if (tokens.length === 0) return doc.body.innerHTML;

  const textNodes = [];
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node?.nodeValue?.trim()) continue;
    if (node.parentElement && ["SCRIPT", "STYLE", "TEXTAREA"].includes(node.parentElement.tagName)) continue;
    textNodes.push(node);
  }

  for (const node of textNodes) {
    const replacement = decorateTextNode(doc, node, tokens);
    if (replacement) {
      node.parentNode.replaceChild(replacement, node);
    }
  }

  return doc.body.innerHTML;
}

function buildTokens(piiMatches, findings, appliedFindingIds, selectedFindingId) {
  const tokens = [];
  const seen = new Set();

  for (const match of piiMatches) {
    const key = `pii:${match.value.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    tokens.push({
      text: match.value,
      className: "preview-highlight pii",
      title: `Persoonsgegeven: ${match.type}`,
      findingId: null,
    });
  }

  for (const finding of findings) {
    const baseClass = `preview-highlight finding-${finding.color || "blue"}`;
    const applied = appliedFindingIds.includes(finding.id);
    const selected = selectedFindingId === finding.id;
    for (const text of finding.matchTexts || []) {
      const normalized = text.trim().toLowerCase();
      if (!normalized) continue;
      const key = `${finding.id}:${normalized}`;
      if (seen.has(key)) continue;
      seen.add(key);
      tokens.push({
        text,
        className: [
          baseClass,
          applied ? "applied" : "",
          selected ? "selected" : "",
        ]
          .filter(Boolean)
          .join(" "),
        title: finding.title,
        findingId: finding.id,
      });
    }
  }

  return tokens.sort((a, b) => b.text.length - a.text.length);
}

function decorateTextNode(doc, node, tokens) {
  const text = node.nodeValue;
  const lower = text.toLowerCase();
  const matches = [];

  for (const token of tokens) {
    const needle = token.text.toLowerCase();
    let start = 0;
    while (start < lower.length) {
      const index = lower.indexOf(needle, start);
      if (index === -1) break;
      matches.push({ start: index, end: index + needle.length, token });
      start = index + needle.length;
    }
  }

  if (matches.length === 0) {
    return null;
  }

  const merged = resolveOverlaps(matches);
  const fragment = doc.createDocumentFragment();
  let cursor = 0;

  for (const match of merged) {
    if (match.start > cursor) {
      fragment.appendChild(doc.createTextNode(text.slice(cursor, match.start)));
    }
    const mark = doc.createElement("span");
    mark.className = `${DEFAULT_MARK_CLASS} ${match.token.className}`;
    mark.title = match.token.title;
    if (match.token.findingId) mark.dataset.findingId = match.token.findingId;
    mark.textContent = text.slice(match.start, match.end);
    fragment.appendChild(mark);
    cursor = match.end;
  }

  if (cursor < text.length) {
    fragment.appendChild(doc.createTextNode(text.slice(cursor)));
  }

  return fragment;
}

function resolveOverlaps(matches) {
  const sorted = matches.sort((a, b) => a.start - b.start || b.end - a.end);
  const resolved = [];
  let cursor = -1;

  for (const match of sorted) {
    if (match.start < cursor) continue;
    resolved.push(match);
    cursor = match.end;
  }

  return resolved;
}
