<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { RouterLink } from "vue-router";
import { useAdmin } from "../src/composables/useAdmin";
import { usePoems } from "../src/composables/usePoems";
import { useToast } from "../src/composables/useToast";
import { formatDate } from "../src/lib/poemText";
import { PINNED_POEM_ID } from "../src/lib/featured";
import Icon from "../src/components/ui/Icon.vue";
import Skeleton from "../src/components/ui/Skeleton.vue";
import EmptyState from "../src/components/ui/EmptyState.vue";

const admin = useAdmin();
const { isAdmin, openReports } = admin;
const { listPoems } = usePoems();
const { toast } = useToast();

const checking = ref(true);
const setUp = ref(true); // false until 06_admin.sql has been run
const tab = ref("reports");

// ---------------- Poem search (shared by both pickers) ----------------
const query = ref("");
const results = ref([]);
let searchTimer = null;
watch(query, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    const q = query.value.trim();
    if (!q) return (results.value = []);
    const { poems } = await listPoems({ query: q, limit: 8 });
    results.value = poems;
  }, 250);
});
watch(tab, () => {
  query.value = "";
  results.value = [];
});

// ---------------- Poem of the day ----------------
const potd = ref(null); // the pinned poem, or null for rotation
const potdMode = ref("rotation"); // "pinned" | "rotation"

async function loadPotd() {
  const setting = await admin.getSetting("poem_of_the_day");
  if (setting === undefined) return (setUp.value = false);
  const id = setting ? setting.poem_id : PINNED_POEM_ID;
  potd.value = id ? (await admin.getPoemsByIds([id]))[0] ?? null : null;
  potdMode.value = potd.value ? "pinned" : "rotation";
}

async function pinPoem(poem) {
  try {
    await admin.setPoemOfTheDay(poem.id);
    potd.value = poem;
    potdMode.value = "pinned";
    toast(`“${poem.title}” is now the poem of the day`, "success");
  } catch (err) {
    toast(`Couldn't save: ${err.message}`, "error");
  }
}

async function useRotation() {
  try {
    await admin.setPoemOfTheDay(null);
    potd.value = null;
    potdMode.value = "rotation";
    toast("Back to a different poem each day", "success");
  } catch (err) {
    toast(`Couldn't save: ${err.message}`, "error");
  }
}

// ---------------- Editor's picks ----------------
const picks = ref([]);
const MAX_PICKS = 6;
const pickIds = computed(() => new Set(picks.value.map((p) => String(p.id))));

async function loadPicks() {
  picks.value = await admin.getEditorsPicks();
}

async function savePicks(next, message) {
  const previous = picks.value;
  picks.value = next;
  try {
    await admin.setEditorsPicks(next.map((p) => p.id));
    if (message) toast(message, "success");
  } catch (err) {
    picks.value = previous;
    toast(`Couldn't save: ${err.message}`, "error");
  }
}

function addPick(poem) {
  if (picks.value.length >= MAX_PICKS) return toast(`Up to ${MAX_PICKS} picks`, "error");
  savePicks([...picks.value, poem], `Added “${poem.title}”`);
}
function removePick(poem) {
  savePicks(picks.value.filter((p) => p.id !== poem.id), "Removed");
}
function movePick(index, delta) {
  const next = [...picks.value];
  const [item] = next.splice(index, 1);
  next.splice(index + delta, 0, item);
  savePicks(next);
}

// ---------------- Reports ----------------
const reportStatus = ref("open");
const reports = ref([]);
const reportsLoading = ref(false);
const busyReport = ref(null);

async function loadReports() {
  reportsLoading.value = true;
  try {
    reports.value = await admin.getReports(reportStatus.value);
  } catch {
    reports.value = [];
  } finally {
    reportsLoading.value = false;
  }
}
watch(reportStatus, loadReports);

async function act(report, action) {
  busyReport.value = report.id;
  try {
    if (action === "delete-comment") {
      await admin.deleteComment(report.comment_id);
      await admin.setReportStatus(report.id, "resolved");
      toast("Note deleted", "success");
    } else if (action === "delete-poem") {
      if (!confirm(`Delete “${report.poems?.title}” permanently? This can't be undone.`)) return;
      await admin.deletePoem(report.poem_id);
      toast("Poem deleted", "success");
    } else if (action === "unpublish") {
      await admin.unpublishPoem(report.poem_id);
      await admin.setReportStatus(report.id, "resolved");
      toast("Poem unpublished — it's back in the poet's drafts", "success");
    } else if (action === "dismiss") {
      await admin.setReportStatus(report.id, "dismissed");
      toast("Report dismissed", "success");
    } else if (action === "reopen") {
      await admin.setReportStatus(report.id, "open");
    }
    reports.value = reports.value.filter((r) => r.id !== report.id);
  } catch (err) {
    toast(`Couldn't do that: ${err.message}`, "error");
  } finally {
    busyReport.value = null;
  }
}

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return formatDate(iso);
}

onMounted(async () => {
  await admin.loadAdmin(true);
  checking.value = false;
  if (!isAdmin.value) return;
  await Promise.all([loadPotd(), loadPicks(), loadReports()]);
});

const tabs = computed(() => [
  { key: "reports", label: "Reports", count: openReports.value },
  { key: "potd", label: "Poem of the day" },
  { key: "picks", label: "Editor's picks" },
]);
</script>

<template>
  <div class="page">
    <Skeleton v-if="checking" :rows="4" />

    <EmptyState
      v-else-if="!isAdmin"
      title="This page is for admins."
      body="If you run this site, run supabase/sql/06_admin.sql and make your account an admin (instructions at the top of that file)."
    >
      <RouterLink to="/" class="btn btn-secondary">Back home</RouterLink>
    </EmptyState>

    <template v-else>
      <header>
        <p class="eyebrow mb-3">Admin</p>
        <h1 class="page-title">Editor's desk</h1>
      </header>

      <div class="mt-10 flex gap-6 overflow-x-auto border-b border-rule" role="tablist">
        <button
          v-for="t in tabs"
          :key="t.key"
          role="tab"
          :aria-selected="tab === t.key"
          class="-mb-px shrink-0 border-b-2 pb-3 text-sm whitespace-nowrap transition-colors"
          :class="tab === t.key ? 'border-ink font-medium text-ink' : 'border-transparent text-muted hover:text-ink'"
          @click="tab = t.key"
        >
          {{ t.label }}
          <span v-if="t.count" class="ml-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-paper tabular-nums">{{ t.count }}</span>
        </button>
      </div>

      <p v-if="!setUp" class="mt-6 rounded-lg bg-accent-soft px-4 py-3 text-sm text-ink">
        Site settings aren't set up yet — run <code>supabase/sql/06_admin.sql</code>.
      </p>

      <!-- ================= Reports ================= -->
      <section v-if="tab === 'reports'" class="mt-6">
        <div class="mb-4 flex gap-2">
          <button
            v-for="s in ['open', 'resolved', 'dismissed']"
            :key="s"
            class="chip capitalize"
            :class="{ 'chip-active': reportStatus === s }"
            @click="reportStatus = s"
          >
            {{ s }}
          </button>
        </div>

        <Skeleton v-if="reportsLoading" :rows="3" />
        <EmptyState
          v-else-if="!reports.length"
          :title="reportStatus === 'open' ? 'Nothing to review.' : `No ${reportStatus} reports.`"
          :body="reportStatus === 'open' ? 'When readers report a note or a poem, it shows up here.' : ''"
        />

        <ul v-else>
          <li
            v-for="r in reports"
            :key="r.id"
            class="border-t border-rule py-5"
            :class="{ 'opacity-50': busyReport === r.id }"
          >
            <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span class="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">{{ r.reason }}</span>
              <span>{{ r.target_type === "comment" ? "Note" : "Poem" }}</span>
              <span>·</span>
              <span>reported by {{ r.reporter?.username ?? "someone" }} {{ timeAgo(r.created_at) }}</span>
            </div>

            <!-- What was reported -->
            <div class="mt-3 rounded-xl border border-rule bg-surface p-4">
              <template v-if="r.target_type === 'comment'">
                <p v-if="r.comments" class="text-[15px] whitespace-pre-line text-ink">{{ r.comments.body }}</p>
                <p v-else class="text-sm text-faint italic">This note has already been deleted.</p>
                <p class="mt-2 text-xs text-muted">
                  <template v-if="r.comments">by {{ r.comments.profiles?.username ?? "unknown" }} · </template>
                  on <RouterLink :to="`/poem/${r.poem_id}`" class="underline decoration-rule underline-offset-2 hover:decoration-ink">{{ r.poems?.title ?? "a poem" }}</RouterLink>
                </p>
              </template>
              <template v-else>
                <RouterLink v-if="r.poems" :to="`/poem/${r.poem_id}`" class="font-serif text-xl text-ink hover:underline">
                  {{ r.poems.title }}
                </RouterLink>
                <p v-else class="text-sm text-faint italic">This poem has been deleted.</p>
                <p v-if="r.poems" class="mt-1 text-xs text-muted">
                  by {{ r.poems.profiles?.username ?? "unknown" }} · {{ r.poems.status === "published" ? "Published" : "Unpublished" }}
                </p>
              </template>
            </div>

            <div class="mt-3 flex flex-wrap gap-2">
              <template v-if="r.status === 'open'">
                <button
                  v-if="r.target_type === 'comment' && r.comments"
                  class="btn btn-danger py-1.5"
                  :disabled="busyReport === r.id"
                  @click="act(r, 'delete-comment')"
                >
                  <Icon name="trash" :size="14" /> Delete note
                </button>
                <button
                  v-if="r.target_type === 'poem' && r.poems?.status === 'published'"
                  class="btn btn-danger py-1.5"
                  :disabled="busyReport === r.id"
                  @click="act(r, 'unpublish')"
                >
                  <Icon name="eye-off" :size="14" /> Unpublish poem
                </button>
                <button
                  v-if="r.target_type === 'poem' && r.poems"
                  class="btn btn-danger py-1.5"
                  :disabled="busyReport === r.id"
                  @click="act(r, 'delete-poem')"
                >
                  <Icon name="trash" :size="14" /> Delete poem
                </button>
                <button class="btn btn-secondary py-1.5" :disabled="busyReport === r.id" @click="act(r, 'dismiss')">
                  Dismiss
                </button>
              </template>
              <button v-else class="btn btn-ghost py-1.5" :disabled="busyReport === r.id" @click="act(r, 'reopen')">
                Reopen
              </button>
            </div>
          </li>
        </ul>
      </section>

      <!-- ================= Poem of the day ================= -->
      <section v-else-if="tab === 'potd'" class="mt-6 max-w-2xl">
        <div class="rounded-2xl border border-rule bg-surface p-6">
          <p class="eyebrow mb-3 text-accent">Today on the home page</p>
          <template v-if="potdMode === 'pinned' && potd">
            <p class="font-serif text-3xl text-ink">{{ potd.title }}</p>
            <p class="mt-1 text-sm text-muted">by {{ potd.profiles?.username ?? "Anonymous" }} · pinned</p>
            <button class="btn btn-secondary mt-5" @click="useRotation">
              <Icon name="shuffle" :size="15" /> Use a different poem each day
            </button>
          </template>
          <template v-else>
            <p class="font-serif text-2xl text-ink italic">A different poem each day</p>
            <p class="mt-1 text-sm text-muted">Chosen automatically from everything published.</p>
          </template>
        </div>

        <h2 class="mt-10 mb-3 text-sm font-medium text-ink">Pin a poem</h2>
        <div class="relative">
          <Icon name="search" :size="16" class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-faint" />
          <input v-model="query" type="search" class="input pl-10" placeholder="Search by title or a line…" />
        </div>
        <ul class="mt-2">
          <li v-for="p in results" :key="p.id" class="flex items-center justify-between gap-3 border-b border-rule py-3">
            <div class="min-w-0">
              <p class="truncate font-serif text-lg text-ink">{{ p.title }}</p>
              <p class="truncate text-xs text-muted">{{ p.profiles?.username ?? "Anonymous" }} · {{ p.preview }}</p>
            </div>
            <button
              class="btn shrink-0 px-3 py-1.5 text-xs"
              :class="potd?.id === p.id ? 'btn-secondary' : 'btn-primary'"
              :disabled="potd?.id === p.id"
              @click="pinPoem(p)"
            >
              {{ potd?.id === p.id ? "Pinned" : "Pin" }}
            </button>
          </li>
        </ul>
      </section>

      <!-- ================= Editor's picks ================= -->
      <section v-else class="mt-6 max-w-2xl">
        <p class="text-sm text-muted">
          Shown as “Editor's picks” on the home page, in this order. Up to {{ MAX_PICKS }}.
        </p>

        <ol v-if="picks.length" class="mt-4 rounded-2xl border border-rule bg-surface">
          <li
            v-for="(p, i) in picks"
            :key="p.id"
            class="flex items-center gap-3 border-b border-rule px-4 py-3 last:border-b-0"
          >
            <span class="w-5 font-serif text-sm text-faint tabular-nums">{{ i + 1 }}</span>
            <div class="min-w-0 flex-1">
              <p class="truncate font-serif text-lg text-ink">{{ p.title }}</p>
              <p class="truncate text-xs text-muted">{{ p.profiles?.username ?? "Anonymous" }}</p>
            </div>
            <button class="icon-btn" :disabled="i === 0" aria-label="Move up" @click="movePick(i, -1)">
              <Icon name="arrow-left" :size="15" class="rotate-90" />
            </button>
            <button class="icon-btn" :disabled="i === picks.length - 1" aria-label="Move down" @click="movePick(i, 1)">
              <Icon name="arrow-left" :size="15" class="-rotate-90" />
            </button>
            <button class="icon-btn hover:text-accent" aria-label="Remove pick" @click="removePick(p)">
              <Icon name="x" :size="15" />
            </button>
          </li>
        </ol>
        <p v-else class="mt-4 rounded-2xl border border-dashed border-rule px-4 py-6 text-center text-sm text-muted italic">
          No picks yet — the section stays hidden until you add one.
        </p>

        <h2 class="mt-10 mb-3 text-sm font-medium text-ink">Add a poem</h2>
        <div class="relative">
          <Icon name="search" :size="16" class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-faint" />
          <input v-model="query" type="search" class="input pl-10" placeholder="Search by title or a line…" />
        </div>
        <ul class="mt-2">
          <li v-for="p in results" :key="p.id" class="flex items-center justify-between gap-3 border-b border-rule py-3">
            <div class="min-w-0">
              <p class="truncate font-serif text-lg text-ink">{{ p.title }}</p>
              <p class="truncate text-xs text-muted">{{ p.profiles?.username ?? "Anonymous" }} · {{ p.preview }}</p>
            </div>
            <button
              class="btn shrink-0 px-3 py-1.5 text-xs"
              :class="pickIds.has(String(p.id)) ? 'btn-secondary' : 'btn-primary'"
              :disabled="pickIds.has(String(p.id)) || picks.length >= MAX_PICKS"
              @click="addPick(p)"
            >
              {{ pickIds.has(String(p.id)) ? "Added" : "Add" }}
            </button>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
