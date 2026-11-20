import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import { decorate } from "../lib/poemText";

class LineUpdateBlockedError extends Error {}

export function usePoems() {
  const { user } = useAuth();

  // =========================
  // Ask the AI to match & attach an instrumental
  // (best-effort: failure here should never block publishing)
  // =========================
  async function matchInstrumental(poemId, title, bodyText) {
    try {
      const { error } = await supabase.functions.invoke("match-instrumental", {
        body: { poemId, title, body: bodyText },
      });
      if (error) console.warn("Instrumental matching failed:", error);
    } catch (err) {
      console.warn("Instrumental matching failed:", err);
    }
  }

  // =========================
  // Create a new poem
  // =========================
  async function createPoem(title, bodyText, status, category = null, { instrumental = null } = {}) {
    const { data: poem, error: poemError } = await supabase
      .from("poems")
      .insert({
        author_id: user.value.id,
        title,
        body: bodyText,
        status,
        category,
      })
      .select()
      .single();

    if (poemError) throw poemError;

    const lines = bodyText
      .split("\n")
      .map((content, index) => ({
        poem_id: poem.id,
        line_number: index,
        content,
      }))
      .filter((line) => line.content.trim() !== "");

    if (lines.length) {
      const { error: linesError } = await supabase
        .from("poem_lines")
        .insert(lines);

      if (linesError) throw linesError;
    }

    if (instrumental) {
      // The author picked a track themselves
      await setInstrumental(poem.id, instrumental);
    } else if (status === "published") {
      await matchInstrumental(poem.id, title, bodyText);
    }

    return poem;
  }

  // =========================
  // Published poems, a page at a time
  // =========================
  const LIST_SELECT = "*, profiles(username)";

  // Commas/parentheses break PostgREST's .or() syntax, and %/_ are
  // ilike wildcards — strip them so any user input is safe to search.
  function sanitize(query) {
    return (query ?? "").replace(/[,()%_*\\"]/g, " ").trim();
  }

  /** Returns { poems, hasMore }. Fetches one extra row to know if there's more. */
  async function listPoems({
    query = "",
    category = null,
    authorIds = null,
    ascending = false,
    offset = 0,
    limit = 24,
  } = {}) {
    let req = supabase.from("poems").select(LIST_SELECT).eq("status", "published");

    const safe = sanitize(query);
    if (safe) req = req.or(`title.ilike.%${safe}%,body.ilike.%${safe}%`);
    if (category) req = req.eq("category", category);
    if (authorIds) req = req.in("author_id", authorIds);

    const { data, error } = await req
      .order("created_at", { ascending })
      .range(offset, offset + limit);

    if (error) throw error;
    return { poems: data.slice(0, limit).map(decorate), hasMore: data.length > limit };
  }

  /** Same poem for everyone all day, without downloading every poem. */
  async function getPoemOfTheDay() {
    const { count, error } = await supabase
      .from("poems")
      .select("id", { count: "exact", head: true })
      .eq("status", "published");

    if (error) throw error;
    if (!count) return null;

    const d = new Date();
    const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const offset = seed % count;

    const { data, error: pickError } = await supabase
      .from("poems")
      .select(LIST_SELECT)
      .eq("status", "published")
      .order("created_at", { ascending: true })
      .range(offset, offset);

    if (pickError) throw pickError;
    return data[0] ? decorate(data[0]) : null;
  }

  // =========================
  // My poems
  // =========================
  async function getMyPoems() {
    const { data, error } = await supabase
      .from("poems")
      .select("*")
      .eq("author_id", user.value.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map(decorate);
  }

  // =========================
  // Single poem
  // =========================
  async function getPoemWithLines(poemId) {
    const { data: poem, error: poemError } = await supabase
      .from("poems")
      .select("*, profiles(username), instrumentals(title,mood)")
      .eq("id", poemId)
      .single();

    if (poemError) throw poemError;

    const { data: lines, error: linesError } = await supabase
      .from("poem_lines")
      .select("*")
      .eq("poem_id", poemId)
      .order("line_number", { ascending: true });

    if (linesError) throw linesError;

    return { ...poem, lines };
  }

  // =========================
  // Poet pages
  // =========================
  async function getProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  }

  async function getPoemsByAuthor(authorId) {
    const { data, error } = await supabase
      .from("poems")
      .select(LIST_SELECT)
      .eq("status", "published")
      .eq("author_id", authorId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data.map(decorate);
  }

  // =========================
  // Most-loved lines (view from supabase/sql/04_social.sql)
  // =========================
  async function getTopLines({ authorId = null, limit = 6 } = {}) {
    let req = supabase
      .from("line_heart_counts")
      .select("*")
      .order("hearts", { ascending: false })
      .limit(limit);
    if (authorId) req = req.eq("author_id", authorId);

    const { data, error } = await req;
    if (error) {
      console.warn("Most-loved lines unavailable:", error.message);
      return [];
    }
    return data;
  }

  // =========================
  // Instrumentals
  // =========================
  async function getInstrumentals() {
    const { data, error } = await supabase
      .from("instrumentals")
      .select("id, title, mood, file_url")
      .order("mood")
      .order("title");

    if (error) {
      console.warn("Instrumentals unavailable:", error.message);
      return [];
    }
    return data;
  }

  /** Attach a specific track chosen by the author (instead of the AI's pick). */
  async function setInstrumental(poemId, instrumental) {
    const { error } = await supabase
      .from("poems")
      .update({ instrumental_id: instrumental.id, audio_url: instrumental.file_url })
      .eq("id", poemId);
    if (error) throw error;
  }

  // =========================
  // Draft history (supabase/sql/05_poem_versions.sql)
  // Returns null when the history table isn't set up.
  // =========================
  async function getVersions(poemId) {
    const { data, error } = await supabase
      .from("poem_versions")
      .select("*")
      .eq("poem_id", poemId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.warn("Version history unavailable:", error.message);
      return null;
    }
    return data;
  }

  // =========================
  // Update status
  // =========================
  async function updatePoemStatus(poemId, status) {
    const { data: poem, error } = await supabase
      .from("poems")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", poemId)
      .select()
      .single();

    if (error) throw error;

    // Publishing from the drafts list (My Poems) also needs a match,
    // unless this poem already has one from a previous publish.
    if (status === "published" && !poem.instrumental_id) {
      await matchInstrumental(poem.id, poem.title, poem.body);
    }
  }

  // =========================
  // Update poem
  // =========================
  async function updatePoem(poemId, title, bodyText, category = null) {
    const { error: poemError } = await supabase
      .from("poems")
      .update({
        title,
        body: bodyText,
        category,
        updated_at: new Date().toISOString(),
      })
      .eq("id", poemId);

    if (poemError) throw poemError;

    const newLines = bodyText
      .split("\n")
      .map((content, index) => ({ line_number: index, content }))
      .filter((line) => line.content.trim() !== "");

    const { data: oldLines, error: fetchError } = await supabase
      .from("poem_lines")
      .select("id, line_number, content")
      .eq("poem_id", poemId)
      .order("line_number", { ascending: true });

    if (fetchError) throw fetchError;

    try {
      await syncLinesInPlace(poemId, oldLines, newLines);
    } catch (err) {
      if (!(err instanceof LineUpdateBlockedError)) throw err;
      // The database doesn't allow updating poem_lines (no RLS UPDATE
      // policy), so fall back to replacing them. Reactions are lost.
      console.warn(err.message);
      await replaceAllLines(poemId, newLines);
    }
  }

  // Keep existing poem_lines rows (and so their reactions) wherever possible:
  //  1. a line whose text is unchanged keeps its row, even if it moved
  //  2. remaining rows are reused in order for edited lines
  //  3. only truly extra lines are inserted / removed
  async function syncLinesInPlace(poemId, oldLines, newLines) {
    const unused = [...oldLines];
    const plan = newLines.map((line) => {
      const i = unused.findIndex((old) => old.content === line.content);
      return i === -1 ? { line, old: null } : { line, old: unused.splice(i, 1)[0] };
    });
    for (const step of plan) {
      if (!step.old && unused.length) step.old = unused.shift();
    }

    const toDelete = unused.map((old) => old.id);
    const toUpdate = plan.filter(
      (s) =>
        s.old &&
        (s.old.line_number !== s.line.line_number ||
          s.old.content !== s.line.content),
    );
    const toInsert = plan.filter((s) => !s.old).map((s) => s.line);

    if (toDelete.length) {
      const { error } = await supabase
        .from("poem_lines")
        .delete()
        .in("id", toDelete);
      if (error) throw error;
    }

    // Move changed rows to temporary numbers first so that swapping two
    // lines can't trip a unique (poem_id, line_number) constraint.
    const TEMP_OFFSET = 1_000_000;
    await updateLineRows(
      toUpdate.map((s) => ({
        id: s.old.id,
        values: { line_number: s.line.line_number + TEMP_OFFSET },
      })),
    );
    await updateLineRows(
      toUpdate.map((s) => ({
        id: s.old.id,
        values: { line_number: s.line.line_number, content: s.line.content },
      })),
    );

    if (toInsert.length) {
      const { error } = await supabase
        .from("poem_lines")
        .insert(toInsert.map((line) => ({ poem_id: poemId, ...line })));
      if (error) throw error;
    }
  }

  async function updateLineRows(updates) {
    const results = await Promise.all(
      updates.map(({ id, values }) =>
        supabase.from("poem_lines").update(values).eq("id", id).select("id"),
      ),
    );
    for (const { data, error } of results) {
      if (error) throw error;
      // RLS without an UPDATE policy silently matches zero rows
      if (!data?.length) {
        throw new LineUpdateBlockedError(
          "poem_lines can't be updated (missing RLS UPDATE policy); " +
            "replacing lines instead, which clears their reactions.",
        );
      }
    }
  }

  async function replaceAllLines(poemId, newLines) {
    const { error: deleteError } = await supabase
      .from("poem_lines")
      .delete()
      .eq("poem_id", poemId);
    if (deleteError) throw deleteError;

    if (newLines.length) {
      const { error: insertError } = await supabase
        .from("poem_lines")
        .insert(newLines.map((line) => ({ poem_id: poemId, ...line })));
      if (insertError) throw insertError;
    }
  }

  // =========================
  // Delete poem
  // =========================
  async function deletePoem(poemId) {
    const { error } = await supabase.from("poems").delete().eq("id", poemId);

    if (error) throw error;
  }

  return {
    createPoem,
    listPoems,
    getPoemOfTheDay,
    getMyPoems,
    getPoemWithLines,
    getProfile,
    getPoemsByAuthor,
    getTopLines,
    getInstrumentals,
    setInstrumental,
    getVersions,
    updatePoemStatus,
    updatePoem,
    deletePoem,
  };
}
