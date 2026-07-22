import { ref } from "vue";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export function useReactions() {
  const { user } = useAuth();

  // counts: { lineId: number }, userReactedLineIds: Set of line ids the current user has reacted to
  const counts = ref({});
  const userReactedLineIds = ref(new Set());

  async function loadReactions(lineIds) {
    if (lineIds.length === 0) return;

    const { data, error } = await supabase
      .from("line_reactions")
      .select("line_id, user_id")
      .in("line_id", lineIds);

    if (error) throw error;

    const newCounts = {};
    const newUserReacted = new Set();

    data.forEach((reaction) => {
      newCounts[reaction.line_id] = (newCounts[reaction.line_id] || 0) + 1;
      if (user.value && reaction.user_id === user.value.id) {
        newUserReacted.add(reaction.line_id);
      }
    });

    counts.value = newCounts;
    userReactedLineIds.value = newUserReacted;
  }

  async function toggleReaction(lineId) {
    if (!user.value) return; // caller should prevent this, but guard just in case

    const alreadyReacted = userReactedLineIds.value.has(lineId);

    if (alreadyReacted) {
      await supabase
        .from("line_reactions")
        .delete()
        .eq("line_id", lineId)
        .eq("user_id", user.value.id);

      userReactedLineIds.value.delete(lineId);
      counts.value[lineId] = Math.max((counts.value[lineId] || 1) - 1, 0);
    } else {
      await supabase
        .from("line_reactions")
        .insert({ line_id: lineId, user_id: user.value.id });

      userReactedLineIds.value.add(lineId);
      counts.value[lineId] = (counts.value[lineId] || 0) + 1;
    }
  }

  return { counts, userReactedLineIds, loadReactions, toggleReaction };
}
