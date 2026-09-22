import assert from "node:assert/strict";
import test from "node:test";
import { firstReviewFindingId, sortReviewFindings } from "../src/review-order.js";

test("een geopende review start bij de eerste finding in de zichtbare categorievolgorde", () => {
  const rawFindings = [
    { id: "completeness-1", category: "completeness" },
    { id: "contradiction-1", category: "contradiction" },
    { id: "consistency-1", category: "consistency" },
  ];

  assert.deepEqual(
    sortReviewFindings(rawFindings).map((finding) => finding.id),
    ["consistency-1", "contradiction-1", "completeness-1"],
  );
  assert.equal(firstReviewFindingId(rawFindings), "consistency-1");
  assert.deepEqual(rawFindings.map((finding) => finding.id), [
    "completeness-1",
    "contradiction-1",
    "consistency-1",
  ]);
});
