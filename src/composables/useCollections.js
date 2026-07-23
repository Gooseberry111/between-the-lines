import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export function useCollections() {
  const { user } = useAuth();

  async function createCollection(title, description) {
    const { data, error } = await supabase
      .from("collections")
      .insert({ author_id: user.value.id, title, description })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function getMyCollections() {
    const { data, error } = await supabase
      .from("collections")
      .select("*")
      .eq("author_id", user.value.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  async function getCollectionWithPoems(collectionId) {
    const { data: collection, error: collectionError } = await supabase
      .from("collections")
      .select("*, profiles ( username )")
      .eq("id", collectionId)
      .single();

    if (collectionError) throw collectionError;

    const { data: poems, error: poemsError } = await supabase
      .from("collection_poems")
      .select("position, poems ( id, title, status )")
      .eq("collection_id", collectionId)
      .order("position", { ascending: true });

    if (poemsError) throw poemsError;

    return { ...collection, poems: poems.map((p) => p.poems) };
  }

  async function getMyPoemsNotInCollection(collectionId) {
    const { data: allPoems, error: poemsError } = await supabase
      .from("poems")
      .select("id, title")
      .eq("author_id", user.value.id);

    if (poemsError) throw poemsError;

    const { data: existing, error: existingError } = await supabase
      .from("collection_poems")
      .select("poem_id")
      .eq("collection_id", collectionId);

    if (existingError) throw existingError;

    const existingIds = new Set(existing.map((e) => e.poem_id));
    return allPoems.filter((poem) => !existingIds.has(poem.id));
  }

  async function addPoemToCollection(collectionId, poemId, position = 0) {
    const { error } = await supabase
      .from("collection_poems")
      .insert({ collection_id: collectionId, poem_id: poemId, position });

    if (error) throw error;
  }

  async function removePoemFromCollection(collectionId, poemId) {
    const { error } = await supabase
      .from("collection_poems")
      .delete()
      .eq("collection_id", collectionId)
      .eq("poem_id", poemId);

    if (error) throw error;
  }
  async function getMyPoems() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
      .from("poems")
      .select("id, title")
      .eq("author_id", user.id);

    if (error) {
      console.error(error);
      return [];
    }

    return data || [];
  }
  async function deleteCollection(collectionId) {
    // First remove all poem relationships
    const { error: relationError } = await supabase
      .from("collection_poems")
      .delete()
      .eq("collection_id", collectionId);

    if (relationError) throw relationError;

    // Then delete the collection
    const { error } = await supabase
      .from("collections")
      .delete()
      .eq("id", collectionId);

    if (error) throw error;
  }

  return {
    // (leftover placeholder, ignore — just make sure this line isn't actually here)
    createCollection,
    getMyCollections,
    getCollectionWithPoems,
    addPoemToCollection,
    removePoemFromCollection,
    getMyPoemsNotInCollection,
    getMyPoems,
    deleteCollection,
  };
}
