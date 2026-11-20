// supabase/functions/delete-account/index.ts
//
// Permanently deletes the signed-in user's account and everything they own.
// The user is identified from their own JWT, so nobody can delete someone
// else's account by passing an id.
//
// Deploy with:
//   supabase functions deploy delete-account
// (SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are
// provided to edge functions automatically.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Who is asking? Verify using the caller's own token.
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) return json({ error: "Not signed in" }, 401);

    // 2. Admin client for the actual deletion (bypasses RLS)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const check = (label: string, error: { message: string } | null) => {
      if (error) throw new Error(`${label}: ${error.message}`);
    };

    // Gather what the user owns
    const { data: poems, error: poemsError } = await admin
      .from("poems")
      .select("id")
      .eq("author_id", user.id);
    check("load poems", poemsError);
    const poemIds = (poems ?? []).map((p) => p.id);

    const { data: collections, error: collectionsError } = await admin
      .from("collections")
      .select("id")
      .eq("author_id", user.id);
    check("load collections", collectionsError);
    const collectionIds = (collections ?? []).map((c) => c.id);

    let lineIds: string[] = [];
    if (poemIds.length) {
      const { data: lines, error } = await admin
        .from("poem_lines")
        .select("id")
        .in("poem_id", poemIds);
      check("load lines", error);
      lineIds = (lines ?? []).map((l) => l.id);
    }

    // Delete children before parents, so this works whether or not the
    // foreign keys are set to cascade.

    // saved_poems is optional (supabase/sql/saved_poems.sql); skip if absent
    const tolerateMissing = (error: { code?: string; message: string } | null) =>
      error && !["42P01", "PGRST205"].includes(error.code ?? "") ? error : null;
    check(
      "delete saved poems",
      tolerateMissing(
        (await admin.from("saved_poems").delete().eq("user_id", user.id)).error,
      ),
    );
    if (poemIds.length) {
      check(
        "delete saves of own poems",
        tolerateMissing(
          (await admin.from("saved_poems").delete().in("poem_id", poemIds))
            .error,
        ),
      );
    }

    check(
      "delete own reactions",
      (await admin.from("line_reactions").delete().eq("user_id", user.id))
        .error,
    );
    if (lineIds.length) {
      check(
        "delete reactions on own lines",
        (await admin.from("line_reactions").delete().in("line_id", lineIds))
          .error,
      );
    }
    if (collectionIds.length) {
      check(
        "empty own collections",
        (
          await admin
            .from("collection_poems")
            .delete()
            .in("collection_id", collectionIds)
        ).error,
      );
    }
    if (poemIds.length) {
      check(
        "remove poems from other collections",
        (await admin.from("collection_poems").delete().in("poem_id", poemIds))
          .error,
      );
      check(
        "delete lines",
        (await admin.from("poem_lines").delete().in("poem_id", poemIds)).error,
      );
    }
    check(
      "delete collections",
      (await admin.from("collections").delete().eq("author_id", user.id))
        .error,
    );
    check(
      "delete poems",
      (await admin.from("poems").delete().eq("author_id", user.id)).error,
    );
    check(
      "delete profile",
      (await admin.from("profiles").delete().eq("id", user.id)).error,
    );

    // 3. Finally remove the auth user itself
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(
      user.id,
    );
    check("delete user", deleteUserError);

    return json({ deleted: true });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
