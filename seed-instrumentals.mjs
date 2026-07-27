// seed-instrumentals.mjs
//
// What it does:
//   Scans every folder in your `instrumentals` storage bucket, treats the
//   folder name as the mood, builds each file's public URL, and inserts
//   all of them into the `instrumentals` table in one go.
//
// Before running:
//   1. In Supabase Dashboard -> Storage -> instrumentals bucket, organize
//      your 38 files into folders named after moods, e.g.:
//        instrumentals/romantic/soft-piano-love.mp3
//        instrumentals/romantic/velvet-nights.mp3
//        instrumentals/heartbroken/broken-strings.mp3
//        ...
//      (Drag-and-drop in the dashboard UI works fine for this.)
//   2. Get your Service Role key: Dashboard -> Project Settings -> API
//      -> "service_role" key (NOT the anon key — this one bypasses RLS
//      so it can insert). Never commit this key or put it in frontend code.
//
// To run:
//   npm install @supabase/supabase-js
//   SUPABASE_URL=https://your-project.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
//   node seed-instrumentals.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const BUCKET = "instrumentals";

function titleFromFilename(filename) {
  return filename
    .replace(/\.[^/.]+$/, "") // strip extension
    .replace(/[-_]+/g, " ") // hyphens/underscores -> spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()) // Title Case
    .trim();
}

async function main() {
  // 1. List top-level items in the bucket — these should be your mood folders
  const { data: topLevel, error: topLevelError } = await supabase.storage
    .from(BUCKET)
    .list("", { limit: 1000 });

  if (topLevelError) throw topLevelError;

  const moodFolders = topLevel.filter((item) => item.id === null); // folders have no id
  if (moodFolders.length === 0) {
    console.error(
      "No folders found in the bucket root. Did you organize the files into mood folders first?",
    );
    process.exit(1);
  }

  const rows = [];

  for (const folder of moodFolders) {
    const mood = folder.name;

    const { data: files, error: filesError } = await supabase.storage
      .from(BUCKET)
      .list(mood, { limit: 1000 });

    if (filesError) throw filesError;

    for (const file of files) {
      if (file.id === null) continue; // skip nested folders, just in case

      const path = `${mood}/${file.name}`;
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

      rows.push({
        title: titleFromFilename(file.name),
        mood,
        file_url: urlData.publicUrl,
      });
    }
  }

  console.log(
    `Found ${rows.length} tracks across ${moodFolders.length} moods:`,
  );
  const counts = rows.reduce((acc, r) => {
    acc[r.mood] = (acc[r.mood] || 0) + 1;
    return acc;
  }, {});
  console.table(counts);

  const { error: insertError } = await supabase
    .from("instrumentals")
    .insert(rows);

  if (insertError) throw insertError;

  console.log(`✅ Inserted ${rows.length} instrumentals successfully.`);
}

main().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});
