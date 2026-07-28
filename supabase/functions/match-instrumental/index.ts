// supabase/functions/match-instrumental/index.ts
//
// Tries Gemini first for smarter mood matching. If that call fails for any
// reason (quota, billing, downtime, model retirement) it automatically
// falls back to local keyword scoring instead of leaving the poem silent.
//
// Deploy with:
//   supabase functions deploy match-instrumental
// Set the Gemini key as a secret:
//   supabase secrets set GEMINI_API_KEY=your_key_here

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Update this if Google retires the model again — check
// https://ai.google.dev/gemini-api/docs/deprecations for current status.
const GEMINI_MODEL = "gemini-3.1-flash-lite";

const MOOD_KEYWORDS: Record<string, string[]> = {
  grieving: [
    "grief",
    "gone",
    "missing",
    "absence",
    "mourn",
    "funeral",
    "cry",
    "tears",
    "hollow",
    "buried",
    "memory",
    "loss",
    "lost",
    "empty",
    "goodbye",
    "ghost",
    "died",
    "death",
    "forever gone",
  ],
  heartbroken: [
    "heartbreak",
    "broken heart",
    "betray",
    "left me",
    "abandoned",
    "breakup",
    "shattered",
    "cheat",
    "hurt",
    "sorry",
    "ache",
    "wound",
    "cold",
    "silence",
    "alone",
    "unloved",
    "used to",
  ],
  happy: [
    "happy",
    "joy",
    "laugh",
    "smile",
    "sunshine",
    "celebrate",
    "bright",
    "dance",
    "delight",
    "cheerful",
    "glad",
    "fun",
    "sparkle",
    "warmth",
    "laughter",
    "giggle",
  ],
  love: [
    "love",
    "beloved",
    "adore",
    "cherish",
    "soulmate",
    "romance",
    "sweetheart",
    "darling",
    "embrace",
    "kiss",
    "heart",
    "forever",
    "devotion",
    "tender",
    "belong to you",
  ],
  lustful: [
    "desire",
    "crave",
    "skin",
    "touch",
    "heat",
    "longing",
    "temptation",
    "whisper",
    "breath",
    "body",
    "passion",
    "ache for you",
    "burn",
    "fingertips",
    "closer",
  ],
  identity: [
    "who am i",
    "myself",
    "mirror",
    "become",
    "mask",
    "soul",
    "reflection",
    "my name",
    "roots",
    "belong",
    "self",
    "within me",
    "unravel",
    "rebuild",
  ],
  melancholy: [
    "sad",
    "blue",
    "rain",
    "grey",
    "gray",
    "quiet",
    "wistful",
    "autumn",
    "fading",
    "lonely",
    "drift",
    "longing",
    "faded",
    "distant",
    "dusk",
  ],
  peaceful: [
    "calm",
    "still",
    "breeze",
    "gentle",
    "peace",
    "serene",
    "meadow",
    "hush",
    "soft",
    "rest",
    "quiet",
    "morning light",
    "drift",
    "ease",
  ],
  neutral: [],
};

function pickMoodByKeywords(text: string, availableMoods: string[]): string {
  const lower = text.toLowerCase();
  const scores: Record<string, number> = {};

  for (const mood of availableMoods) {
    const keywords = MOOD_KEYWORDS[mood] ?? [];
    let score = 0;
    for (const keyword of keywords) {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = keyword.includes(" ")
        ? new RegExp(escaped, "g")
        : new RegExp(`\\b${escaped}\\b`, "g");
      const matches = lower.match(pattern);
      if (matches) score += matches.length;
    }
    scores[mood] = score;
  }

  const topScore = Math.max(...Object.values(scores));

  if (topScore === 0) {
    return availableMoods.includes("neutral")
      ? "neutral"
      : availableMoods[Math.floor(Math.random() * availableMoods.length)];
  }

  const topMoods = availableMoods.filter((m) => scores[m] === topScore);
  return topMoods[Math.floor(Math.random() * topMoods.length)];
}

async function pickMoodWithGemini(
  title: string,
  body: string,
  availableMoods: string[],
): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const prompt = `You are matching a poem to a background instrumental track.
Pick exactly ONE mood from this list that best fits the poem's tone: ${availableMoods.join(", ")}.

Poem title: ${title ?? "Untitled"}
Poem:
${body}

Respond with ONLY the single mood word from the list above, nothing else.`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
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

  const matched = availableMoods.find((m) => m.toLowerCase() === rawMood);
  if (!matched)
    throw new Error(`Gemini returned an unrecognized mood: ${rawMood}`);

  return matched;
}

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

    // 2. Try Gemini first, fall back to keyword scoring if it fails
    let matchedMood: string;
    let matchedVia: "gemini" | "keywords";
    try {
      matchedMood = await pickMoodWithGemini(title, body, availableMoods);
      matchedVia = "gemini";
    } catch (geminiErr) {
      console.warn(
        "Gemini matching failed, falling back to keywords:",
        geminiErr.message,
      );
      matchedMood = pickMoodByKeywords(
        `${title ?? ""} ${body}`,
        availableMoods,
      );
      matchedVia = "keywords";
    }

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
        matched_via: matchedVia,
      })
      .eq("id", poemId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ instrumental: chosenTrack, matchedMood, matchedVia }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
