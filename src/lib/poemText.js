// Helpers for turning a poem's raw body text into display-ready pieces.

export const CATEGORIES = [
  "Love",
  "Lust",
  "Heartbreak",
  "Loss",
  "Joy",
  "Hope",
  "Nature",
  "Melancholy",
  "Identity",
  "Other",
];

/** Split a body into stanzas (arrays of non-empty lines). */
export function stanzas(body = "") {
  return body
    .split(/\n\s*\n/)
    .map((block) => block.split("\n").filter((line) => line.trim() !== ""))
    .filter((block) => block.length > 0);
}

/** The opening lines of the first stanza, for previews. */
export function excerptLines(body = "", max = 4) {
  return (stanzas(body)[0] ?? []).slice(0, max);
}

export function wordCount(body = "") {
  return body.split(/\s+/).filter(Boolean).length;
}

export function lineCount(body = "") {
  return body.split("\n").filter((line) => line.trim() !== "").length;
}

/** Poetry is read slowly — assume ~120 words a minute. */
export function readMinutes(body = "") {
  return Math.max(1, Math.round(wordCount(body) / 120));
}

/** Add the derived fields every list view needs. */
export function decorate(poem) {
  const body = poem.body ?? "";
  return {
    ...poem,
    excerpt: excerptLines(body),
    preview: excerptLines(body, 1)[0] ?? "",
    readMinutes: readMinutes(body),
  };
}

export function formatDate(iso, opts = { month: "short", day: "numeric", year: "numeric" }) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, opts);
}
