// Editing a poem must keep each line's row (and so its hearts) wherever
// the text survives, even when lines move. Runs against an in-memory fake
// of the bits of supabase-js that updatePoem uses, including a unique
// (poem_id, line_number) constraint and RLS silently blocking updates.
import { describe, it, expect, beforeEach, vi } from "vitest";

const db = { poems: [], poem_lines: [], allowUpdate: true, nextId: 1 };

function query(table) {
  let op = "select";
  let vals = null;
  const filters = [];
  const api = {
    select: () => api,
    update: (v) => ((op = "update"), (vals = v), api),
    delete: () => ((op = "delete"), api),
    insert: (v) => ((op = "insert"), (vals = v), api),
    eq: (c, v) => (filters.push((r) => r[c] === v), api),
    in: (c, v) => (filters.push((r) => v.includes(r[c])), api),
    order: () => api,
    then: (resolve, reject) => {
      try {
        resolve(run());
      } catch (e) {
        reject(e);
      }
    },
  };
  const rows = () => db[table].filter((r) => filters.every((f) => f(r)));
  const unique = () => {
    if (table !== "poem_lines") return null;
    const seen = new Set();
    for (const r of db.poem_lines) {
      const key = `${r.poem_id}:${r.line_number}`;
      if (seen.has(key)) return new Error(`unique violation ${key}`);
      seen.add(key);
    }
    return null;
  };
  function run() {
    if (op === "select")
      return { data: rows().map((r) => ({ ...r })).sort((a, b) => a.line_number - b.line_number), error: null };
    if (op === "delete") {
      const hit = new Set(rows());
      db[table] = db[table].filter((r) => !hit.has(r));
      return { error: null };
    }
    if (op === "insert") {
      for (const v of [].concat(vals)) db[table].push({ id: `L${db.nextId++}`, ...v });
      return { error: unique() };
    }
    if (table === "poem_lines" && !db.allowUpdate) return { data: [], error: null };
    const hit = rows();
    for (const r of hit) Object.assign(r, vals);
    return { data: hit.map((r) => ({ id: r.id })), error: unique() };
  }
  return api;
}

vi.mock("../../src/lib/supabase", () => ({
  supabase: { from: query, functions: { invoke: async () => ({}) } },
}));

const { usePoems } = await import("../../src/composables/usePoems");
const { updatePoem } = usePoems();

function seed(body) {
  db.poems = [{ id: "p1" }];
  db.poem_lines = [];
  db.nextId = 1;
  db.allowUpdate = true;
  body.split("\n").forEach((content, i) => {
    if (content.trim()) db.poem_lines.push({ id: `L${db.nextId++}`, poem_id: "p1", line_number: i, content });
  });
}
const idOf = (content) => db.poem_lines.find((r) => r.content === content)?.id;
const layout = () =>
  db.poem_lines
    .slice()
    .sort((a, b) => a.line_number - b.line_number)
    .map((r) => `${r.line_number}:${r.content}`);

describe("updatePoem keeps line rows (and their hearts)", () => {
  beforeEach(() => seed("A\nB\nC"));

  it("inserting a line at the top keeps every existing row", async () => {
    const before = ["A", "B", "C"].map(idOf);
    await updatePoem("p1", "t", "X\nA\nB\nC");
    expect(["A", "B", "C"].map(idOf)).toEqual(before);
    expect(layout()).toEqual(["0:X", "1:A", "2:B", "3:C"]);
  });

  it("an edited line reuses its row", async () => {
    const b = idOf("B");
    await updatePoem("p1", "t", "A\nB, revised\nC");
    expect(idOf("B, revised")).toBe(b);
  });

  it("reordering works despite the unique line_number constraint", async () => {
    const a = idOf("A");
    const c = idOf("C");
    await updatePoem("p1", "t", "C\nB\nA");
    expect(idOf("A")).toBe(a);
    expect(idOf("C")).toBe(c);
    expect(layout()).toEqual(["0:C", "1:B", "2:A"]);
  });

  it("removes deleted lines and keeps stanza gaps in numbering", async () => {
    seed("A\nB\n\nC\nD");
    await updatePoem("p1", "t", "A\n\nD");
    expect(layout()).toEqual(["0:A", "2:D"]);
  });

  it("falls back to replacing lines when RLS blocks updates", async () => {
    db.allowUpdate = false;
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await updatePoem("p1", "t", "B\nA\nZ");
    expect(layout()).toEqual(["0:B", "1:A", "2:Z"]);
  });
});
