import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeSavedReviewRecord } from "../src/storage.js";

test("sanitizeSavedReviewRecord verwijdert DOCX-bytes uit localStorage-metadata", () => {
  const sanitized = sanitizeSavedReviewRecord({
    id: "document-1",
    fileName: "werkdocument.docx",
    docxBase64: "gevoelige-binaire-inhoud",
    sourceDocxBase64: "ongererdigeerde-bron",
    version: 2,
  });

  assert.deepEqual(sanitized, {
    id: "document-1",
    fileName: "werkdocument.docx",
    version: 2,
  });
});
