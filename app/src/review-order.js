const CATEGORY_ORDER = { consistency: 0, contradiction: 1, completeness: 2 };

export function sortReviewFindings(findings = []) {
  return [...findings].sort(
    (left, right) => (CATEGORY_ORDER[left.category] ?? 99) - (CATEGORY_ORDER[right.category] ?? 99),
  );
}

export function firstReviewFindingId(findings = []) {
  return sortReviewFindings(findings)[0]?.id ?? null;
}
