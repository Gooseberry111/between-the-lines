import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

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
  async function createPoem(title, bodyText, status, category = null) {
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

    if (status === "published") {
      await matchInstrumental(poem.id, title, bodyText);
    }

    return poem;
  }

  // =========================
  // Get all published poems
  // =========================
  async function getAllPoems() {
    const { data, error } = await supabase
      .from("poems")
      .select(
        `
        *,
        profiles(username),
        poem_lines(content,line_number)
      `,
      )
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map((poem) => ({
      ...poem,
      preview:
        poem.poem_lines?.sort((a, b) => a.line_number - b.line_number)[0]
          ?.content ?? "",
    }));
  }

  // =========================
  // Latest published poems
  // =========================
  async function getRecentPoems(limit = 6) {
    const poems = await getAllPoems();
    return poems.slice(0, limit);
  }

  // =========================
  // Featured poems
  // =========================
  async function getFeaturedPoems(limit = 3) {
    const poems = await getAllPoems();
    return poems.slice(0, limit);
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

    return data;
  }

  // =========================
  // Single poem
  // =========================
  async function getPoemWithLines(poemId) {
    const { data: poem, error: poemError } = await supabase
      .from("poems")
      .select(
        `
        *,
        profiles(username),
        instrumentals(title,mood)
      `,
      )
      .eq("id", poemId)
      .single();

    if (poemError) throw poemError;

    const { data: lines, error: linesError } = await supabase
      .from("poem_lines")
      .select("*")
      .eq("poem_id", poemId)
      .order("line_number", { ascending: true });

    if (linesError) throw linesError;

    return {
      ...poem,
      lines,
    };
  }

  // =========================
  // Search
  // =========================
  async function searchPoems(query) {
    if (!query.trim()) return getAllPoems();

    const { data, error } = await supabase
      .from("poems")
      .select(
        `
        *,
        profiles(username),
        poem_lines(content,line_number)
      `,
      )
      .eq("status", "published")
      .or(`title.ilike.%${query}%,body.ilike.%${query}%`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map((poem) => ({
      ...poem,
      preview:
        poem.poem_lines?.sort((a, b) => a.line_number - b.line_number)[0]
          ?.content ?? "",
    }));
  }

  // =========================
  // Categories
  // =========================
  async function getCategories() {
    const { data, error } = await supabase
      .from("poems")
      .select("category")
      .eq("status", "published")
      .not("category", "is", null);

    if (error) throw error;

    return [...new Set(data.map((item) => item.category))].filter(Boolean);
  }

  // =========================
  // Poems by category
  // =========================
  async function getPoemsByCategory(category) {
    const { data, error } = await supabase
      .from("poems")
      .select(
        `
        *,
        profiles(username),
        poem_lines(content,line_number)
      `,
      )
      .eq("status", "published")
      .eq("category", category)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map((poem) => ({
      ...poem,
      preview:
        poem.poem_lines?.sort((a, b) => a.line_number - b.line_number)[0]
          ?.content ?? "",
    }));
  }

  // =========================
  // Feed
  // =========================
  async function getPublishedFeed() {
    return getAllPoems();
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

    const { error: deleteError } = await supabase
      .from("poem_lines")
      .delete()
      .eq("poem_id", poemId);

    if (deleteError) throw deleteError;

    const lines = bodyText
      .split("\n")
      .map((content, index) => ({
        poem_id: poemId,
        line_number: index,
        content,
      }))
      .filter((line) => line.content.trim() !== "");

    if (lines.length) {
      const { error: insertError } = await supabase
        .from("poem_lines")
        .insert(lines);

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
    getAllPoems,
    getRecentPoems,
    getFeaturedPoems,
    getMyPoems,
    getPoemWithLines,
    searchPoems,
    getCategories,
    getPoemsByCategory,
    getPublishedFeed,
    updatePoemStatus,
    updatePoem,
    deletePoem,
  };
}
