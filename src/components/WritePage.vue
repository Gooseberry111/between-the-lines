<script setup>
// Writing studio — used for both new poems (/write) and edits (/edit/:id).
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { RouterLink, useRouter, onBeforeRouteLeave } from "vue-router";
import { usePoems } from "../composables/usePoems";
import { useToast } from "../composables/useToast";
import { CATEGORIES, stanzas, wordCount, lineCount, formatDate, excerptLines } from "../lib/poemText";
import { promptOfTheDay, randomPrompt } from "../lib/prompts";
import Icon from "./ui/Icon.vue";
import Skeleton from "./ui/Skeleton.vue";
import EmptyState from "./ui/EmptyState.vue";

const props = defineProps({
  id: { type: String, default: null }, // present when editing
});

const router = useRouter();
const {
  createPoem,
  getPoemWithLines,
  updatePoem,
  updatePoemStatus,
  getInstrumentals,
  setInstrumental,
  getVersions,
} = usePoems();
const { toast } = useToast();

const isEdit = computed(() => !!props.id);
const DRAFT_KEY = "btl-unsaved-new-poem";

const title = ref("");
const body = ref("");
const category = ref("");
const status = ref("draft"); // status of the poem being edited

const isLoading = ref(isEdit.value);
const loadFailed = ref(false);
const isSaving = ref(false);
const savingAction = ref(""); // "draft" | "publish" | "save"
const tab = ref("write"); // mobile: "write" | "preview"
const restoredNotice = ref(false);
const lastAutosave = ref(null);

// Snapshot of what's stored, to detect unsaved edits
const savedSnapshot = ref(JSON.stringify(["", "", ""]));
const snapshot = computed(() => JSON.stringify([title.value, body.value, category.value]));
const isDirty = computed(
  () => snapshot.value !== savedSnapshot.value || chosenTrackId.value !== originalTrackId.value,
);

const textareaRef = ref(null);
const titleRef = ref(null);

// ---------- Prompt (new poems) ----------
const prompt = ref(promptOfTheDay());
const showPrompt = ref(true);
function shufflePrompt() {
  prompt.value = randomPrompt(prompt.value);
}

// ---------- Instrumental picker ----------
const instrumentals = ref([]);
const chosenTrackId = ref(""); // "" = let the AI choose
const originalTrackId = ref("");
const previewAudio = ref(null);
const previewingId = ref(null);

const tracksByMood = computed(() => {
  const groups = {};
  for (const t of instrumentals.value) (groups[t.mood] ??= []).push(t);
  return groups;
});
const chosenTrack = computed(() => instrumentals.value.find((t) => String(t.id) === String(chosenTrackId.value)) ?? null);

function togglePreview() {
  const audio = previewAudio.value;
  if (!audio || !chosenTrack.value) return;
  if (previewingId.value === chosenTrack.value.id) {
    audio.pause();
    previewingId.value = null;
    return;
  }
  audio.src = chosenTrack.value.file_url;
  audio.volume = 0.6;
  audio.play().then(() => (previewingId.value = chosenTrack.value.id)).catch(() => toast("Couldn't play that track.", "error"));
}
watch(chosenTrackId, () => {
  previewAudio.value?.pause();
  previewingId.value = null;
});

// ---------- History (editing) ----------
const showHistory = ref(false);
const versions = ref(undefined); // undefined = not loaded, null = unavailable
async function toggleHistory() {
  showHistory.value = !showHistory.value;
  if (showHistory.value && versions.value === undefined) {
    versions.value = await getVersions(props.id);
  }
}
function restoreVersion(v) {
  title.value = v.title ?? "";
  body.value = v.body ?? "";
  category.value = v.category ?? "";
  showHistory.value = false;
  nextTick(autoGrow);
  toast("Version restored — save to keep it", "success");
}

const stats = computed(() => ({
  words: wordCount(body.value),
  lines: lineCount(body.value),
  stanzas: stanzas(body.value).length,
}));
const previewStanzas = computed(() => stanzas(body.value));
const canSubmit = computed(() => title.value.trim() && body.value.trim() && !isSaving.value);

// ---------- Load ----------
onMounted(async () => {
  document.addEventListener("keydown", onKeydown);
  window.addEventListener("beforeunload", onBeforeUnload);

  if (isEdit.value) {
    try {
      const poem = await getPoemWithLines(props.id);
      title.value = poem.title;
      body.value = poem.body ?? poem.lines.map((l) => l.content).join("\n");
      category.value = poem.category ?? "";
      status.value = poem.status;
      chosenTrackId.value = poem.instrumental_id ? String(poem.instrumental_id) : "";
      originalTrackId.value = chosenTrackId.value;
      savedSnapshot.value = snapshot.value;
    } catch {
      loadFailed.value = true;
    } finally {
      isLoading.value = false;
    }
  } else {
    restoreLocalDraft();
  }

  getInstrumentals().then((list) => (instrumentals.value = list));

  await nextTick();
  autoGrow();
  (isEdit.value ? textareaRef : titleRef).value?.focus();
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
  window.removeEventListener("beforeunload", onBeforeUnload);
});

// ---------- Local autosave (new poems only) ----------
function restoreLocalDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (!draft.title && !draft.body) return;
    title.value = draft.title ?? "";
    body.value = draft.body ?? "";
    category.value = draft.category ?? "";
    lastAutosave.value = draft.savedAt ? new Date(draft.savedAt) : null;
    restoredNotice.value = true;
  } catch {
    /* corrupt or unavailable storage — start fresh */
  }
}

function clearLocalDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

function discardRestored() {
  clearLocalDraft();
  title.value = "";
  body.value = "";
  category.value = "";
  restoredNotice.value = false;
  lastAutosave.value = null;
  nextTick(autoGrow);
}

let autosaveTimer = null;
watch(snapshot, () => {
  if (isEdit.value) return;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    try {
      if (!title.value && !body.value) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      const savedAt = new Date();
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ title: title.value, body: body.value, category: category.value, savedAt }),
      );
      lastAutosave.value = savedAt;
    } catch {
      /* storage full or blocked */
    }
  }, 600);
});

const autosaveLabel = computed(() => {
  if (isEdit.value) return isDirty.value ? "Unsaved changes" : "All changes saved";
  if (!lastAutosave.value) return "Autosaves as you write";
  return `Autosaved ${lastAutosave.value.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
});

// ---------- Editor behaviour ----------
function autoGrow() {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function onKeydown(e) {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === "s") {
    e.preventDefault();
    if (canSubmit.value) isEdit.value ? saveChanges() : saveNew("draft");
  }
}

function onBeforeUnload(e) {
  if (isEdit.value && isDirty.value) {
    e.preventDefault();
    e.returnValue = "";
  }
}

let leavingOnPurpose = false;
onBeforeRouteLeave(() => {
  if (leavingOnPurpose || !isEdit.value || !isDirty.value) return true;
  return window.confirm("You have unsaved changes. Leave without saving?");
});

// ---------- Saving ----------
async function saveNew(newStatus) {
  if (!canSubmit.value) return;
  isSaving.value = true;
  savingAction.value = newStatus === "published" ? "publish" : "draft";
  try {
    const poem = await createPoem(title.value.trim(), body.value, newStatus, category.value || null, {
      instrumental: chosenTrack.value,
    });
    clearLocalDraft();
    leavingOnPurpose = true;
    if (newStatus === "published") {
      toast("Published — your poem is live", "success");
      router.push(`/poem/${poem.id}`);
    } else {
      toast("Saved to your drafts", "success");
      router.push("/my-poems");
    }
  } catch (err) {
    toast(`Couldn't save: ${err.message}`, "error");
  } finally {
    isSaving.value = false;
    savingAction.value = "";
  }
}

async function saveChanges({ publish = false } = {}) {
  if (!canSubmit.value) return;
  isSaving.value = true;
  savingAction.value = publish ? "publish" : "save";
  try {
    await updatePoem(props.id, title.value.trim(), body.value, category.value || null);
    if (chosenTrack.value && chosenTrackId.value !== originalTrackId.value) {
      await setInstrumental(props.id, chosenTrack.value);
      originalTrackId.value = chosenTrackId.value;
    }
    savedSnapshot.value = snapshot.value;
    versions.value = undefined; // a new version may exist now
    if (publish) {
      await updatePoemStatus(props.id, "published");
      status.value = "published";
      leavingOnPurpose = true;
      toast("Published — your poem is live", "success");
      router.push(`/poem/${props.id}`);
    } else {
      toast("Changes saved", "success");
    }
  } catch (err) {
    toast(`Couldn't save: ${err.message}`, "error");
  } finally {
    isSaving.value = false;
    savingAction.value = "";
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-5 pt-6 pb-24 sm:px-8">
    <Skeleton v-if="isLoading" variant="poem" class="mt-16" />

    <EmptyState
      v-else-if="loadFailed"
      title="We couldn't open this poem."
      body="It may have been deleted, or it isn't yours to edit."
    >
      <RouterLink to="/my-poems" class="btn btn-secondary">Back to your poems</RouterLink>
    </EmptyState>

    <template v-else>
      <!-- Studio bar -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
        <div class="flex items-center gap-3">
          <RouterLink :to="isEdit ? '/my-poems' : '/'" class="icon-btn -ml-2" aria-label="Close editor">
            <Icon name="x" />
          </RouterLink>
          <div>
            <p class="text-sm font-medium text-ink">
              {{ isEdit ? "Editing poem" : "New poem" }}
              <span
                v-if="isEdit"
                class="ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium"
                :class="status === 'published' ? 'bg-accent-soft text-accent' : 'bg-ink/5 text-muted'"
              >
                {{ status === "published" ? "Published" : "Draft" }}
              </span>
            </p>
            <p class="text-xs text-faint">{{ autosaveLabel }}</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <template v-if="!isEdit">
            <button class="btn btn-secondary" :disabled="!canSubmit" @click="saveNew('draft')">
              {{ savingAction === "draft" ? "Saving…" : "Save draft" }}
            </button>
            <button class="btn btn-primary" :disabled="!canSubmit" @click="saveNew('published')">
              {{ savingAction === "publish" ? "Publishing…" : "Publish" }}
            </button>
          </template>
          <template v-else>
            <button class="btn btn-ghost" :aria-pressed="showHistory" @click="toggleHistory">
              <Icon name="history" :size="15" /> <span class="hidden sm:inline">History</span>
            </button>
            <button
              class="btn"
              :class="status === 'draft' ? 'btn-secondary' : 'btn-primary'"
              :disabled="!canSubmit || !isDirty"
              @click="saveChanges()"
            >
              {{ savingAction === "save" ? "Saving…" : "Save changes" }}
            </button>
            <button
              v-if="status === 'draft'"
              class="btn btn-primary"
              :disabled="!canSubmit"
              @click="saveChanges({ publish: true })"
            >
              {{ savingAction === "publish" ? "Publishing…" : "Publish" }}
            </button>
          </template>
        </div>
      </div>

      <!-- Today's prompt (new poems) -->
      <div
        v-if="!isEdit && showPrompt && !body.trim()"
        class="mt-5 flex items-start gap-3 rounded-xl border border-rule bg-surface px-4 py-3"
      >
        <Icon name="sparkle" :size="16" class="mt-0.5 text-accent" />
        <div class="min-w-0 flex-1">
          <p class="eyebrow">Today's prompt</p>
          <p class="mt-1 font-serif text-lg text-ink italic">{{ prompt }}</p>
        </div>
        <button class="icon-btn" aria-label="Another prompt" title="Another prompt" @click="shufflePrompt">
          <Icon name="shuffle" :size="16" />
        </button>
        <button class="icon-btn -mr-2" aria-label="Hide prompt" title="Hide" @click="showPrompt = false">
          <Icon name="x" :size="16" />
        </button>
      </div>

      <!-- Restored notice -->
      <div
        v-if="restoredNotice"
        class="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-accent-soft px-4 py-3 text-sm text-ink"
      >
        <span>We restored the poem you were writing last time.</span>
        <div class="flex gap-2">
          <button class="btn btn-ghost py-1" @click="discardRestored">Start over</button>
          <button class="btn btn-secondary py-1" @click="restoredNotice = false">Keep writing</button>
        </div>
      </div>

      <!-- Mobile tabs -->
      <div class="mt-6 flex gap-1 rounded-full bg-ink/5 p-1 lg:hidden" role="tablist">
        <button
          v-for="t in ['write', 'preview']"
          :key="t"
          role="tab"
          :aria-selected="tab === t"
          class="flex-1 rounded-full py-1.5 text-sm capitalize transition"
          :class="tab === t ? 'bg-surface font-medium text-ink shadow-sm' : 'text-muted'"
          @click="tab = t; t === 'write' && nextTick(autoGrow)"
        >
          {{ t }}
        </button>
      </div>

      <div class="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
        <!-- Editor -->
        <section :class="{ 'hidden lg:block': tab !== 'write' }" aria-label="Editor">
          <input
            ref="titleRef"
            v-model="title"
            type="text"
            placeholder="Untitled"
            aria-label="Title"
            maxlength="140"
            class="w-full bg-transparent font-serif text-4xl tracking-tight text-ink placeholder:text-faint/70 focus:outline-none sm:text-5xl"
          />
          <textarea
            ref="textareaRef"
            v-model="body"
            placeholder="Begin with a single line…&#10;&#10;Leave an empty line between stanzas."
            aria-label="Poem"
            rows="12"
            spellcheck="true"
            class="mt-8 w-full resize-none overflow-hidden bg-transparent font-serif text-xl leading-9 text-ink placeholder:text-faint/70 focus:outline-none"
            @input="autoGrow"
          />

          <div class="mt-10 border-t border-rule pt-6">
            <p class="label">Feeling <span class="font-normal text-faint">· helps readers find it</span></p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="c in CATEGORIES"
                :key="c"
                type="button"
                class="chip"
                :class="{ 'chip-active': category === c }"
                :aria-pressed="category === c"
                @click="category = category === c ? '' : c"
              >
                {{ c }}
              </button>
            </div>
            <div class="mt-8">
              <label for="track" class="label">Instrumental</label>
              <div class="flex gap-2">
                <select id="track" v-model="chosenTrackId" class="input">
                  <option value="">{{ isEdit && !originalTrackId ? "Choose a track…" : isEdit ? "Keep current track" : "Let us choose — matched to your poem's mood" }}</option>
                  <optgroup v-for="(tracks, mood) in tracksByMood" :key="mood" :label="mood.charAt(0).toUpperCase() + mood.slice(1)">
                    <option v-for="t in tracks" :key="t.id" :value="String(t.id)">{{ t.title }}</option>
                  </optgroup>
                </select>
                <button
                  v-if="chosenTrack"
                  type="button"
                  class="icon-btn h-auto w-11 rounded-lg border border-rule"
                  :aria-label="previewingId ? 'Stop preview' : 'Preview track'"
                  :title="previewingId ? 'Stop' : 'Preview'"
                  @click="togglePreview"
                >
                  <Icon :name="previewingId ? 'pause' : 'play'" :size="15" :filled="!previewingId" />
                </button>
              </div>
              <p v-if="!chosenTrackId && !isEdit" class="mt-2 flex items-start gap-2 text-xs leading-relaxed text-muted">
                <Icon name="music" :size="14" class="mt-0.5" />
                When you publish, we read the poem's mood and pair it with a matching track.
              </p>
              <audio ref="previewAudio" class="hidden" @ended="previewingId = null" />
            </div>
          </div>
        </section>

        <!-- Preview -->
        <section
          :class="{ 'hidden lg:block': tab !== 'preview' }"
          class="lg:sticky lg:top-24 lg:self-start"
          aria-label="Preview"
        >
          <!-- History -->
          <div v-if="showHistory" class="mb-4 rounded-2xl border border-rule bg-surface p-5">
            <div class="flex items-center justify-between">
              <p class="eyebrow">Earlier versions</p>
              <button class="icon-btn -mr-2" aria-label="Close history" @click="showHistory = false"><Icon name="x" :size="16" /></button>
            </div>
            <p v-if="versions === undefined" class="mt-3 text-sm text-muted">Loading…</p>
            <p v-else-if="versions === null" class="mt-3 text-sm text-muted">
              History isn't set up yet — run <code class="text-xs">supabase/sql/05_poem_versions.sql</code>.
            </p>
            <p v-else-if="!versions.length" class="mt-3 text-sm text-muted italic">
              No earlier versions yet. They're kept each time you save a change.
            </p>
            <ul v-else class="mt-2 max-h-80 overflow-y-auto">
              <li v-for="v in versions" :key="v.id" class="flex items-start justify-between gap-3 border-t border-rule py-3 first:border-t-0">
                <div class="min-w-0">
                  <p class="truncate font-serif text-ink">{{ v.title }}</p>
                  <p class="truncate font-serif text-sm text-muted italic">{{ excerptLines(v.body, 1)[0] }}</p>
                  <p class="mt-1 text-xs text-faint">
                    {{ formatDate(v.created_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) }}
                  </p>
                </div>
                <button class="btn btn-secondary shrink-0 px-3 py-1 text-xs" @click="restoreVersion(v)">Restore</button>
              </li>
            </ul>
          </div>

          <div class="rounded-2xl border border-rule bg-surface px-6 py-10 sm:px-10">
            <p class="eyebrow mb-8 text-center">Preview</p>
            <p v-if="category" class="eyebrow mb-3 text-center text-accent">{{ category }}</p>
            <h2 class="text-center font-serif text-3xl leading-tight text-ink text-balance">
              {{ title.trim() || "Untitled" }}
            </h2>
            <div class="mt-10 flex justify-center">
              <div v-if="previewStanzas.length" class="w-fit max-w-full font-serif text-lg leading-8 text-ink/85">
                <div v-for="(stanza, si) in previewStanzas" :key="si" :class="{ 'mt-6': si > 0 }">
                  <p v-for="(line, li) in stanza" :key="li">{{ line }}</p>
                </div>
              </div>
              <p v-else class="font-serif text-lg text-faint italic">Your words will appear here.</p>
            </div>
          </div>

          <dl class="mt-4 flex justify-center gap-6 text-xs text-muted">
            <div><dt class="sr-only">Words</dt><dd><span class="font-medium text-ink tabular-nums">{{ stats.words }}</span> words</dd></div>
            <div><dt class="sr-only">Lines</dt><dd><span class="font-medium text-ink tabular-nums">{{ stats.lines }}</span> lines</dd></div>
            <div><dt class="sr-only">Stanzas</dt><dd><span class="font-medium text-ink tabular-nums">{{ stats.stanzas }}</span> stanzas</dd></div>
          </dl>
          <p class="mt-3 hidden text-center text-[11px] text-faint lg:block">
            <kbd class="rounded border border-rule px-1">Ctrl</kbd> /
            <kbd class="rounded border border-rule px-1">⌘</kbd> +
            <kbd class="rounded border border-rule px-1">S</kbd>
            {{ isEdit ? "saves changes" : "saves a draft" }}
          </p>
        </section>
      </div>
    </template>
  </div>
</template>
