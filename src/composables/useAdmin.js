// Admin tools: who's an admin, site settings (poem of the day, editor's
// picks), reports and moderation. Tables come from supabase/sql/06_admin.sql;
// everything returns safe empty values until that's been run.
import { ref } from "vue";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import { decorate } from "../lib/poemText";

const isAdmin = ref(false);
const openReports = ref(0);
let checkedFor = null;

export function useAdmin() {
  const { user } = useAuth();

  /** Works out whether the signed-in user is an admin (cached per user). */
  async function loadAdmin(force = false) {
    if (!user.value) {
      isAdmin.value = false;
      checkedFor = null;
      return false;
    }
    if (!force && checkedFor === user.value.id) return isAdmin.value;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.value.id)
      .maybeSingle();
    isAdmin.value = !error && data?.is_admin === true;
    checkedFor = user.value.id;
    if (isAdmin.value) refreshOpenReports();
    return isAdmin.value;
  }

  async function refreshOpenReports() {
    const { count, error } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "open");
    openReports.value = error ? 0 : count ?? 0;
  }

  // ---------------- Site settings ----------------
  async function getSetting(key) {
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) return undefined; // table not set up
    return data ? data.value : null; // null = never set
  }

  async function setSetting(key, value) {
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
  }

  /** poemId = null means "use the daily rotation". */
  const setPoemOfTheDay = (poemId) => setSetting("poem_of_the_day", { poem_id: poemId });
  const setEditorsPicks = (poemIds) => setSetting("editors_picks", { poem_ids: poemIds });

  async function getPoemsByIds(ids) {
    if (!ids?.length) return [];
    const { data, error } = await supabase
      .from("poems")
      .select("*, profiles(username)")
      .in("id", ids)
      .eq("status", "published");
    if (error) return [];
    // Keep the chosen order
    const byId = new Map(data.map((p) => [String(p.id), decorate(p)]));
    return ids.map((id) => byId.get(String(id))).filter(Boolean);
  }

  async function getEditorsPicks() {
    const value = await getSetting("editors_picks");
    return getPoemsByIds(value?.poem_ids ?? []);
  }

  // ---------------- Reports ----------------
  /** target: { type: "comment", commentId, poemId } | { type: "poem", poemId } */
  async function report(target, reason) {
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.value.id,
      target_type: target.type,
      comment_id: target.commentId ?? null,
      poem_id: target.poemId ?? null,
      reason,
    });
    // Already reported this one: treat as success
    if (error && error.code !== "23505") throw error;
  }

  async function getReports(status = "open") {
    const { data, error } = await supabase
      .from("reports")
      .select(
        `id, target_type, reason, status, created_at, comment_id, poem_id,
         reporter:profiles!reports_reporter_id_fkey ( username ),
         comments ( id, body, user_id, profiles ( username ) ),
         poems ( id, title, status, author_id, profiles ( username ) )`,
      )
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data;
  }

  async function setReportStatus(reportId, status) {
    const { error } = await supabase
      .from("reports")
      .update({ status, resolved_at: status === "open" ? null : new Date().toISOString() })
      .eq("id", reportId);
    if (error) throw error;
    refreshOpenReports();
  }

  async function deleteComment(commentId) {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) throw error;
  }

  async function deletePoem(poemId) {
    const { data, error } = await supabase.from("poems").delete().eq("id", poemId).select("id");
    if (error) throw error;
    // RLS without the admin delete policy silently deletes nothing
    if (!data?.length) throw new Error("Not allowed — re-run supabase/sql/06_admin.sql");
  }

  async function unpublishPoem(poemId) {
    const { error } = await supabase.from("poems").update({ status: "draft" }).eq("id", poemId);
    if (error) throw error;
  }

  function reset() {
    isAdmin.value = false;
    openReports.value = 0;
    checkedFor = null;
  }

  return {
    isAdmin,
    openReports,
    loadAdmin,
    refreshOpenReports,
    getSetting,
    setPoemOfTheDay,
    setEditorsPicks,
    getPoemsByIds,
    getEditorsPicks,
    report,
    getReports,
    setReportStatus,
    deleteComment,
    deletePoem,
    unpublishPoem,
    reset,
  };
}
