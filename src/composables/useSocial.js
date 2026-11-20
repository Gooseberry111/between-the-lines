// Follows, margin notes (comments) and notifications.
// Tables come from supabase/sql/04_social.sql; until that's run, these
// functions return empty results and the related UI stays hidden.
import { ref } from "vue";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

// Shared so the header bell and the notifications page agree
const unreadCount = ref(0);
const socialAvailable = ref(true);

function unavailable(error) {
  // 42P01 = relation missing, PGRST205 = not in schema cache
  return ["42P01", "PGRST205", "PGRST200"].includes(error?.code);
}

export function useSocial() {
  const { user } = useAuth();

  // ---------------- Follows ----------------
  async function getFollowCounts(userId) {
    const [followers, following] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("followee_id", userId),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
    ]);
    if (followers.error) {
      if (unavailable(followers.error)) socialAvailable.value = false;
      return null;
    }
    return { followers: followers.count ?? 0, following: following.count ?? 0 };
  }

  async function isFollowing(userId) {
    if (!user.value) return false;
    const { data, error } = await supabase
      .from("follows")
      .select("followee_id")
      .eq("follower_id", user.value.id)
      .eq("followee_id", userId)
      .maybeSingle();
    if (error) return false;
    return !!data;
  }

  async function follow(userId) {
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: user.value.id, followee_id: userId });
    if (error) throw error;
  }

  async function unfollow(userId) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.value.id)
      .eq("followee_id", userId);
    if (error) throw error;
  }

  async function getFollowingIds() {
    if (!user.value) return [];
    const { data, error } = await supabase
      .from("follows")
      .select("followee_id")
      .eq("follower_id", user.value.id);
    if (error) return [];
    return data.map((row) => row.followee_id);
  }

  // ---------------- Margin notes ----------------
  async function getComments(poemId) {
    const { data, error } = await supabase
      .from("comments")
      .select("id, body, line_id, user_id, created_at, profiles ( username )")
      .eq("poem_id", poemId)
      .order("created_at", { ascending: true });
    if (error) {
      if (unavailable(error)) socialAvailable.value = false;
      return null;
    }
    return data;
  }

  async function addComment(poemId, body, lineId = null) {
    const { data, error } = await supabase
      .from("comments")
      .insert({ poem_id: poemId, user_id: user.value.id, body, line_id: lineId })
      .select("id, body, line_id, user_id, created_at, profiles ( username )")
      .single();
    if (error) throw error;
    return data;
  }

  async function deleteComment(commentId) {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) throw error;
  }

  // ---------------- Notifications ----------------
  async function refreshUnread() {
    if (!user.value) {
      unreadCount.value = 0;
      return;
    }
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.value.id)
      .is("read_at", null);
    if (error) {
      if (unavailable(error)) socialAvailable.value = false;
      return;
    }
    unreadCount.value = count ?? 0;
  }

  async function getNotifications() {
    const { data, error } = await supabase
      .from("notifications")
      .select(
        "id, type, poem_id, line_id, read_at, created_at, actor:profiles!notifications_actor_id_fkey ( id, username ), poems ( title ), poem_lines ( content )",
      )
      .eq("user_id", user.value.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      if (unavailable(error)) socialAvailable.value = false;
      throw error;
    }
    return data;
  }

  async function markAllRead() {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.value.id)
      .is("read_at", null);
    if (!error) unreadCount.value = 0;
  }

  return {
    socialAvailable,
    unreadCount,
    getFollowCounts,
    isFollowing,
    follow,
    unfollow,
    getFollowingIds,
    getComments,
    addComment,
    deleteComment,
    refreshUnread,
    getNotifications,
    markAllRead,
  };
}
