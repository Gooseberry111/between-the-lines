import { ref } from "vue";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export function usePoems() {
  const { user } = useAuth();
  async function createPoem(
    title,
    bodyText,
    status = "draft",
    audioFile = null,
  ) {
    let audioUrl = null;

    if (audioFile) {
      const filePath = `${user.value.id}/${Date.now()}-${audioFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("poem-audio")
        .upload(filePath, audioFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("poem-audio")
        .getPublicUrl(filePath);

      audioUrl = urlData.publicUrl;
    }

    const { data: poem, error: poemError } = await supabase
      .from("poems")
      .insert({
        author_id: user.value.id,
        title,
        body: bodyText,
        status,
        audio_url: audioUrl,
      })
      .select()
      .single();

    if (poemError) throw poemError;

    const lines = bodyText
      .split("\n")
      .map((content, i) => ({ poem_id: poem.id, line_number: i, content }))
      .filter((line) => line.content.trim() !== "");

    if (lines.length > 0) {
      const { error: linesError } = await supabase
        .from("poem_lines")
        .insert(lines);
      if (linesError) throw linesError;
    }

    return poem;
  }
  async function getMyPoems() {
    const { data, error } = await supabase
      .from("poems")
      .select("*")
      .eq("author_id", user.value.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  async function getPoemWithLines(poemId) {
    const { data: poem, error: poemError } = await supabase
      .from("poems")
      .select("*, profiles ( username )")
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

  async function updatePoemStatus(poemId, status) {
    const { error } = await supabase
      .from("poems")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", poemId);

    if (error) throw error;
  }

  async function searchPoems(query) {
    if (!query.trim()) return [];

    const { data, error } = await supabase
      .from("poems")
      .select("id, title, created_at, profiles ( username )")
      .eq("status", "published")
      .textSearch("search_vector", query, {
        type: "websearch",
        config: "english",
      })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  async function getPublishedFeed() {
    const { data, error } = await supabase
      .from("poems")
      .select(
        `
      id,
      title,
      created_at,
      profiles ( username ),
      poem_lines ( content, line_number )
    `,
      )
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // grab just the first line of each poem as a preview,
    // so the feed shows a taste of the poem, not the whole thing
    return data.map((poem) => ({
      ...poem,
      firstLine:
        poem.poem_lines.sort((a, b) => a.line_number - b.line_number)[0]
          ?.content ?? "",
    }));
  }
  return {
    createPoem,
    getMyPoems,
    getPoemWithLines,
    updatePoemStatus,
    getPublishedFeed,
    searchPoems,
  };
}
