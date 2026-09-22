function decodeXmlText(value) {
  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function normalizeText(value) {
  return String(value).toLocaleLowerCase("nl-NL").replace(/\s+/g, " ").trim();
}

function tokenize(value) {
  return normalizeText(value).match(/[\p{L}\p{N}]+/gu) ?? [];
}

function findMatchingWords(words, rawMatch) {
  const exactText = normalizeText(rawMatch);
  const joined = words.map((word) => word.text).join(" ");
  const offsets = [];
  let cursor = 0;
  for (const word of words) {
    offsets.push({ start: cursor, end: cursor + word.text.length, word });
    cursor += word.text.length + 1;
  }
  const exactStart = joined.indexOf(exactText);
  if (exactStart >= 0) {
    const exactEnd = exactStart + exactText.length;
    return offsets.filter((item) => item.end > exactStart && item.start < exactEnd).map((item) => item.word);
  }

  const pageTokens = words.flatMap((word) => tokenize(word.text).map((text) => ({ text, word })));
  const matchTokens = tokenize(rawMatch);
  for (let length = Math.min(12, matchTokens.length); length >= Math.min(5, matchTokens.length); length -= 1) {
    for (let matchStart = 0; matchStart <= matchTokens.length - length; matchStart += 1) {
      const needle = matchTokens.slice(matchStart, matchStart + length);
      const pageStart = pageTokens.findIndex((_, index) => (
        needle.every((token, offset) => pageTokens[index + offset]?.text === token)
      ));
      if (pageStart >= 0) {
        return [...new Set(pageTokens.slice(pageStart, pageStart + length).map((item) => item.word))];
      }
    }
  }
  return [];
}

export function buildFindingRegionsFromBboxHtml(html, findings) {
  const pages = [...String(html).matchAll(/<page[^>]*width="([^"]+)"[^>]*height="([^"]+)"[^>]*>([\s\S]*?)<\/page>/g)];
  const regions = {};

  pages.forEach((pageMatch, pageIndex) => {
    const width = Number(pageMatch[1]);
    const height = Number(pageMatch[2]);
    if (!width || !height) return;
    const words = [...pageMatch[3].matchAll(
      /<word[^>]*xMin="([^"]+)"[^>]*yMin="([^"]+)"[^>]*xMax="([^"]+)"[^>]*yMax="([^"]+)"[^>]*>([\s\S]*?)<\/word>/g,
    )].map((match) => ({
      xMin: Number(match[1]),
      yMin: Number(match[2]),
      xMax: Number(match[3]),
      yMax: Number(match[4]),
      text: normalizeText(decodeXmlText(match[5].replace(/<[^>]+>/g, ""))),
    })).filter((word) => word.text);
    for (const finding of findings) {
      for (const rawMatch of finding.matchTexts ?? []) {
        const matchingWords = findMatchingWords(words, rawMatch);
        if (matchingWords.length === 0) continue;
        const lines = [];
        for (const word of matchingWords) {
          const line = lines.find((candidate) => Math.abs(candidate.yMin - word.yMin) <= 2);
          if (line) {
            line.xMin = Math.min(line.xMin, word.xMin);
            line.yMin = Math.min(line.yMin, word.yMin);
            line.xMax = Math.max(line.xMax, word.xMax);
            line.yMax = Math.max(line.yMax, word.yMax);
          } else {
            lines.push({ ...word });
          }
        }
        regions[finding.id] = lines.map((line) => ({
          page: pageIndex,
          x: line.xMin / width * 100,
          y: line.yMin / height * 100,
          width: (line.xMax - line.xMin) / width * 100,
          height: (line.yMax - line.yMin) / height * 100,
        }));
        break;
      }
    }
  });

  return regions;
}
