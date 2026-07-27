// supabase/functions/match-instrumental/index.ts
//
// Deploy with:
//   supabase functions deploy match-instrumental
// Set the Gemini key as a secret (never exposed to the browser):
//   supabase secrets set GEMINI_API_KEY=your_key_here

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { poemId, title, body } = await req.json();

    if (!poemId || !body) {
      return new Response(
        JSON.stringify({ error: "poemId and body are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Act as the requesting user so RLS still applies (they must own the poem
    // to update it — same rule your app already relies on elsewhere).
    const authHeader = req.headers.get("Authorization");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader ?? "" } } },
    );

    // 1. What moods do we actually have tracks for?
    const { data: moodRows, error: moodError } = await supabaseClient
      .from("instrumentals")
      .select("mood");

    if (moodError) throw moodError;

    const availableMoods = [...new Set(moodRows.map((r) => r.mood))];
    if (availableMoods.length === 0) {
      throw new Error("No instrumentals in the library yet.");
    }

    // 2. Ask Gemini which mood best fits this poem
    const prompt = `You are matching a poem to a background instrumental track.
Pick exactly ONE mood from this list that best fits the poem's tone: ${availableMoods.join(", ")}.

Poem title: ${title ?? "Untitled"}
Poem:
${body}

Respond with ONLY the single mood word from the list above, nothing else.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${Deno.env.get(
        "GEMINI_API_KEY",
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 10 },
        }),
      },
    );

    if (!geminiRes.ok) {
      throw new Error(`Gemini request failed: ${await geminiRes.text()}`);
    }

    const geminiData = await geminiRes.json();
    const rawMood = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
      ?.trim()
      ?.toLowerCase()
      ?.replace(/[^a-z]/g, "");

    const matchedMood =
      availableMoods.find((m) => m.toLowerCase() === rawMood) ??
      availableMoods[Math.floor(Math.random() * availableMoods.length)];

    // 3. Pick a track with that mood (random if there's more than one)
    const { data: tracks, error: trackError } = await supabaseClient
      .from("instrumentals")
      .select("*")
      .eq("mood", matchedMood);

    if (trackError) throw trackError;
    if (!tracks || tracks.length === 0) {
      throw new Error(`No tracks found for mood: ${matchedMood}`);
    }

    const chosenTrack = tracks[Math.floor(Math.random() * tracks.length)];

    // 4. Attach it to the poem
    const { error: updateError } = await supabaseClient
      .from("poems")
      .update({
        instrumental_id: chosenTrack.id,
        audio_url: chosenTrack.file_url,
      })
      .eq("id", poemId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ instrumental: chosenTrack, matchedMood }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
