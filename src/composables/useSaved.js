import { ref } from "vue";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import { decorate } from "../lib/poemText";

// Shared across the app so a bookmark toggled on one page shows everywhere.
const savedIds = ref(new Set());
const isAvailable = ref(true); // false if the saved_poems table isn't set up
let loadedFor = null;

export function useSaved() {
  const { user } = useAuth();

  async function loadSavedIds(force = false) {
    if (!user.value) return;
    if (!force && loadedFor === user.value.id) return;

    const { data, error } = await supabase
      .from("saved_poems")
      .select("poem_id")
      .eq("user_id", user.value.id);

    if (error) {
      console.warn("Saved poems unavailable:", error.message);
      isAvailable.value = false;
      return;
    }

    isAvailable.value = true;
    savedIds.value = new Set(data.map((row) => row.poem_id));
    loadedFor = user.value.id;
  }

  function isSaved(poemId) {
    return savedIds.value.has(poemId);
  }

  /** Returns the new saved state. */
  async function toggleSaved(poemId) {
    if (!user.value) return false;

    if (isSaved(poemId)) {
      const { error } = await supabase
        .from("saved_poems")
        .delete()
        .eq("user_id", user.value.id)
        .eq("poem_id", poemId);
      if (error) throw error;
      savedIds.value.delete(poemId);
      return false;
    }

    const { error } = await supabase
      .from("saved_poems")
      .insert({ user_id: user.value.id, poem_id: poemId });
    if (error) throw error;
    savedIds.value.add(poemId);
    return true;
  }

  async function getSavedPoems() {
    const { data, error } = await supabase
      .from("saved_poems")
      .select("created_at, poems ( *, profiles ( username ) )")
      .eq("user_id", user.value.id)
      .order("created_at", { ascending: false });

    if (error) {
      isAvailable.value = false;
      throw error;
    }

    return data
      .filter((row) => row.poems) // poem deleted or hidden
      .map((row) => ({ ...decorate(row.poems), savedAt: row.created_at }));
  }

  function reset() {
    savedIds.value = new Set();
    loadedFor = null;
  }

  return {
    savedIds,
    isAvailable,
    loadSavedIds,
    isSaved,
    toggleSaved,
    getSavedPoems,
    reset,
  };
}
