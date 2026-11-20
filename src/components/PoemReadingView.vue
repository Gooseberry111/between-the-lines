<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { usePoems } from "../composables/usePoems";
import { useReactions } from "../composables/useReactions";
import { useAuth } from "../composables/useAuth";
import { useTTS } from "../composables/useTTS";
import { useSaved } from "../composables/useSaved";
import { useToast } from "../composables/useToast";
import { useUI, TEXT_SIZES } from "../composables/useUI";
import { formatDate, readMinutes } from "../lib/poemText";
import Icon from "./ui/Icon.vue";
import Skeleton from "./ui/Skeleton.vue";
import EmptyState from "./ui/EmptyState.vue";
import PoemCard from "./ui/PoemCard.vue";
import MarginNotes from "./MarginNotes.vue";
import ShareLineModal from "./ShareLineModal.vue";

const props = defineProps({
  id: { type: String, required: true },
});

const router = useRouter();
const { getPoemWithLines, getPoemsByAuthor } = usePoems();
const { counts, userReactedLineIds, loadReactions, toggleReaction } = useReactions();
const { user } = useAuth();
const tts = useTTS();
const { isSaved, toggleSaved, isAvailable: savingAvailable } = useSaved();
const { toast } = useToast();
const { focusMode, textSize, biggerText, smallerText } = useUI();

const poem = ref(null);
const moreByAuthor = ref([]);
const isLoading = ref(true);
const notFound = ref(false);

const audioRef = ref(null);

// Line tools: note (margin note), share (image card), active (phone action sheet)
const noteLine = ref(null);
const shareLine = ref(null);
const activeLine = ref(null);
const isTouch = window.matchMedia("(hover: none)").matches;
const isInstrumentalPlaying = ref(false);

const authorName = computed(() => poem.value?.profiles?.username ?? "Anonymous");
const isOwner = computed(() => user.value && poem.value?.author_id === user.value.id);
const sizeClass = computed(() => TEXT_SIZES[textSize.value]);

async function loadPoem() {
  isLoading.value = true;
  notFound.value = false;
  try {
    poem.value = await getPoemWithLines(props.id);
    await loadReactions(poem.value.lines.map((line) => line.id));
    document.title = `${poem.value.title} · Between the Lines`;
    loadMoreByAuthor();
  } catch (err) {
    console.error(err);
    notFound.value = true;
  } finally {
    isLoading.value = false;
  }
}

async function loadMoreByAuthor() {
  try {
    const poems = await getPoemsByAuthor(poem.value.author_id);
    moreByAuthor.value = poems.filter((p) => p.id !== poem.value.id).slice(0, 3);
  } catch {
    moreByAuthor.value = [];
  }
}

onMounted(() => {
  loadPoem();
  document.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  focusMode.value = false;
  document.title = "Between the Lines";
  document.removeEventListener("keydown", onKeydown);
});

function onKeydown(e) {
  if (e.key === "Escape" && focusMode.value) focusMode.value = false;
}

// Blank lines aren't stored, so a jump in line_number marks a stanza break
function startsStanza(index) {
  if (index === 0) return false;
  const lines = poem.value.lines;
  return lines[index].line_number - lines[index - 1].line_number > 1;
}

// ---------- Navigation ----------
function goBack() {
  // Opened from a shared link there's no in-app history to go back to
  if (window.history.state?.back) router.back();
  else router.push("/");
}

// ---------- Read aloud ----------
function handleListen() {
  if (tts.isSpeaking.value && !tts.isPaused.value) tts.pause();
  else if (tts.isPaused.value) tts.resume();
  else tts.speakLines(poem.value.lines.map((l) => l.content));
}

const listenLabel = computed(() =>
  tts.isSpeaking.value && !tts.isPaused.value
    ? "Pause"
    : tts.isPaused.value
      ? "Resume"
      : "Listen",
);

// ---------- Instrumental ----------
function toggleInstrumental() {
  const audio = audioRef.value;
  if (!audio) return;
  if (audio.paused) {
    audio.volume = tts.isSpeaking.value ? 0.25 : 0.7;
    audio.play().catch((err) => {
      console.warn("Couldn't play instrumental:", err);
      toast("The instrumental couldn't be played.", "error");
    });
  } else {
    audio.pause();
  }
}

// Duck the music while the voice is reading
watch(tts.isSpeaking, (speaking) => {
  if (audioRef.value) audioRef.value.volume = speaking ? 0.25 : 0.7;
});

// ---------- Reactions ----------
async function handleHeart(lineId) {
  if (!user.value) return;
  try {
    await toggleReaction(lineId);
  } catch (err) {
    console.error(err);
    toast("Couldn't save that — try again.", "error");
  }
}

// ---------- Sharing ----------
async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    toast(message, "success");
  } catch {
    toast("Copying isn't available in this browser.", "error");
  }
}

function onLineTap(line) {
  if (isTouch) activeLine.value = activeLine.value?.id === line.id ? null : line;
}

function startNote(line) {
  activeLine.value = null;
  noteLine.value = line;
}

function startShare(line) {
  activeLine.value = null;
  shareLine.value = line;
}

function copyLine(line) {
  activeLine.value = null;
  copyText(`“${line.content.trim()}”\n— ${authorName.value}, ${poem.value.title}`, "Line copied");
}

async function sharePoem() {
  const url = window.location.href;
  if (navigator.share) {
    try {
      await navigator.share({
        title: poem.value.title,
        text: `“${poem.value.title}” by ${authorName.value}`,
        url,
      });
      return;
    } catch (err) {
      if (err?.name === "AbortError") return;
    }
  }
  copyText(url, "Link copied");
}

// ---------- Saving ----------
async function handleSave() {
  try {
    const nowSaved = await toggleSaved(poem.value.id);
    toast(nowSaved ? "Saved to your library" : "Removed from saved", "success");
  } catch (err) {
    console.error(err);
    toast("Couldn't update your saved poems.", "error");
  }
}
</script>

<template>
  <div class="px-5 pt-6 pb-24 sm:px-8">
    <!-- Toolbar -->
    <div
      v-if="!focusMode"
      class="mx-auto flex max-w-3xl items-center justify-between gap-2"
    >
      <button class="btn btn-ghost -ml-3" @click="goBack">
        <Icon name="arrow-left" :size="16" /> Back
      </button>

      <div v-if="poem && !isLoading" class="flex items-center gap-0.5">
        <button class="icon-btn" aria-label="Smaller text" title="Smaller text" :disabled="textSize === 0" @click="smallerText">
          <span class="font-serif text-sm">A</span>
        </button>
        <button class="icon-btn" aria-label="Larger text" title="Larger text" :disabled="textSize === TEXT_SIZES.length - 1" @click="biggerText">
          <span class="font-serif text-lg">A</span>
        </button>
        <span class="mx-1 h-5 w-px bg-rule" aria-hidden="true" />
        <button class="icon-btn" aria-label="Focus mode" title="Focus mode" @click="focusMode = true">
          <Icon name="expand" />
        </button>
        <button
          v-if="user && savingAvailable"
          class="icon-btn"
          :class="{ 'text-accent hover:text-accent': isSaved(poem.id) }"
          :aria-label="isSaved(poem.id) ? 'Remove from saved' : 'Save poem'"
          :aria-pressed="isSaved(poem.id)"
          :title="isSaved(poem.id) ? 'Saved' : 'Save'"
          @click="handleSave"
        >
          <Icon name="bookmark" :filled="isSaved(poem.id)" />
        </button>
        <button class="icon-btn" aria-label="Share poem" title="Share" @click="sharePoem">
          <Icon name="share" />
        </button>
      </div>
    </div>

    <!-- Exit focus -->
    <button
      v-else
      class="btn btn-secondary fixed top-4 right-4 z-40 shadow-sm"
      @click="focusMode = false"
    >
      <Icon name="shrink" :size="15" /> Exit focus
      <kbd class="ml-1 hidden rounded border border-rule px-1.5 text-[10px] text-faint sm:inline">Esc</kbd>
    </button>

    <div class="mx-auto mt-12 max-w-3xl" :class="{ 'mt-24': focusMode }">
      <Skeleton v-if="isLoading" variant="poem" />

      <EmptyState
        v-else-if="notFound"
        title="This poem has slipped away."
        body="It may have been unpublished or deleted."
      >
        <RouterLink to="/explore" class="btn btn-secondary">Find another poem</RouterLink>
      </EmptyState>

      <article v-else>
        <!-- Header -->
        <header class="text-center">
          <p
            v-if="poem.status === 'draft'"
            class="mb-5 inline-flex items-center gap-2 rounded-full bg-ink/5 px-3 py-1 text-xs text-muted"
          >
            <Icon name="eye-off" :size="13" /> Draft — only you can see this
          </p>
          <p v-if="poem.category" class="eyebrow mb-4 text-accent">{{ poem.category }}</p>
          <h1 class="font-serif text-4xl leading-tight tracking-tight text-ink text-balance sm:text-5xl">
            {{ poem.title }}
          </h1>
          <p class="mt-4 text-sm text-muted">
            by
            <RouterLink :to="`/poet/${poem.author_id}`" class="font-medium text-ink hover:text-accent">
              {{ authorName }}
            </RouterLink>
            <span class="mx-1.5">·</span>{{ formatDate(poem.created_at, { month: "long", day: "numeric", year: "numeric" }) }}
            <span class="mx-1.5">·</span>{{ readMinutes(poem.body) }} min read
          </p>

          <!-- Listening controls -->
          <div v-if="!focusMode || tts.isSpeaking.value" class="mt-8 flex flex-wrap items-center justify-center gap-2">
            <template v-if="tts.isSupported">
              <button class="btn btn-secondary" @click="handleListen">
                <Icon :name="tts.isSpeaking.value && !tts.isPaused.value ? 'pause' : 'play'" :size="15" :filled="!(tts.isSpeaking.value && !tts.isPaused.value)" />
                {{ listenLabel }}
              </button>
              <button
                v-if="tts.isSpeaking.value || tts.isPaused.value"
                class="icon-btn border border-rule"
                aria-label="Stop reading"
                title="Stop"
                @click="tts.stop()"
              >
                <Icon name="stop" :size="14" :filled="true" />
              </button>
            </template>

            <template v-if="poem.audio_url">
              <button
                class="btn"
                :class="isInstrumentalPlaying ? 'btn-primary' : 'btn-secondary'"
                :aria-pressed="isInstrumentalPlaying"
                @click="toggleInstrumental"
              >
                <Icon name="music" :size="15" />
                <span class="max-w-[12rem] truncate">
                  {{ poem.instrumentals?.title ?? "Instrumental" }}
                </span>
                <span v-if="isInstrumentalPlaying" class="flex h-3 items-end gap-[2px]" aria-hidden="true">
                  <span class="eq-bar" /><span class="eq-bar [animation-delay:.2s]" /><span class="eq-bar [animation-delay:.4s]" />
                </span>
              </button>
              <audio
                ref="audioRef"
                :src="poem.audio_url"
                loop
                preload="none"
                class="hidden"
                @play="isInstrumentalPlaying = true"
                @pause="isInstrumentalPlaying = false"
              />
            </template>
          </div>
        </header>

        <!-- Poem -->
        <div class="mt-14 flex justify-center">
          <div class="w-fit max-w-full font-serif text-ink" :class="sizeClass">
            <div
              v-for="(line, index) in poem.lines"
              :key="line.id"
              class="group relative -mx-4 rounded-md pr-14 pl-4 transition-colors duration-300 sm:pr-4"
              :class="[
                { 'mt-[1.1em]': startsStanza(index) },
                tts.currentIndex.value === index ? 'bg-accent-soft' : '',
                tts.currentIndex.value >= 0 && tts.currentIndex.value !== index ? 'text-ink/35' : '',
              ]"
            >
              <!-- Hanging indent: if a long line wraps, the run-over is indented -->
              <span
                class="block pl-[1.25em] indent-[-1.25em]"
                :class="{ 'cursor-pointer': isTouch, 'underline decoration-accent/50 underline-offset-4': activeLine?.id === line.id }"
                @click="onLineTap(line)"
              >{{ line.content }}</span>

              <!-- Line actions -->
              <span
                class="absolute top-1/2 right-0 inline-flex -translate-y-1/2 items-center gap-0.5 font-sans transition-opacity sm:right-auto sm:left-full sm:ml-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-within:opacity-100"
                :class="{ '[@media(hover:hover)]:opacity-100': counts[line.id] || userReactedLineIds.has(line.id) }"
              >
                <button
                  v-if="user"
                  class="inline-flex min-h-9 min-w-9 items-center justify-center gap-1 rounded-full px-2 text-xs transition-colors sm:min-h-0 sm:min-w-0 sm:px-1.5 sm:py-1"
                  :class="userReactedLineIds.has(line.id) ? 'text-accent' : 'text-faint hover:text-accent'"
                  :aria-label="userReactedLineIds.has(line.id) ? 'Remove heart from line' : 'Heart this line'"
                  :aria-pressed="userReactedLineIds.has(line.id)"
                  @click="handleHeart(line.id)"
                >
                  <Icon name="heart" :size="14" :filled="userReactedLineIds.has(line.id)" />
                  <span v-if="counts[line.id]" class="tabular-nums">{{ counts[line.id] }}</span>
                </button>
                <span v-else-if="counts[line.id]" class="inline-flex items-center gap-1 px-1.5 text-xs text-faint">
                  <Icon name="heart" :size="13" /> {{ counts[line.id] }}
                </span>
                <template v-if="!isTouch">
                  <button
                    v-if="user && poem.status === 'published'"
                    class="hidden rounded-full p-1 text-faint transition-colors hover:text-ink sm:inline-flex"
                    aria-label="Write a note about this line"
                    title="Note"
                    @click="startNote(line)"
                  >
                    <Icon name="message" :size="13" />
                  </button>
                  <button
                    class="hidden rounded-full p-1 text-faint transition-colors hover:text-ink sm:inline-flex"
                    aria-label="Share line as image"
                    title="Share as image"
                    @click="startShare(line)"
                  >
                    <Icon name="image" :size="13" />
                  </button>
                  <button
                    class="hidden rounded-full p-1 text-faint transition-colors hover:text-ink sm:inline-flex"
                    aria-label="Copy line"
                    title="Copy line"
                    @click="copyLine(line)"
                  >
                    <Icon name="copy" :size="13" />
                  </button>
                </template>
              </span>
            </div>
          </div>
        </div>

        <!-- Closing -->
        <div v-if="!focusMode" class="mt-16 text-center">
          <p class="font-serif text-xl tracking-[0.5em] text-faint" aria-hidden="true">· · ·</p>
          <p v-if="user" class="mt-6 text-xs text-faint">
            {{ isTouch ? "Tap a line to heart it, share it or leave a note." : "Hover a line to heart it, share it or leave a note." }}
          </p>
          <p v-else class="mt-6 text-sm text-muted">
            <RouterLink :to="{ name: 'auth', query: { redirect: `/poem/${poem.id}` } }" class="text-ink underline decoration-rule underline-offset-4 hover:decoration-ink">Log in</RouterLink>
            to heart lines, save poems and leave notes.
          </p>
          <div v-if="isOwner" class="mt-6">
            <RouterLink :to="`/edit/${poem.id}`" class="btn btn-secondary">
              <Icon name="pen" :size="15" /> Edit poem
            </RouterLink>
          </div>
        </div>

        <MarginNotes v-if="!focusMode" v-model:line="noteLine" :poem="poem" />

        <!-- More by author -->
        <section v-if="!focusMode && moreByAuthor.length" class="mt-20">
          <div class="mb-2 flex items-baseline justify-between">
            <h2 class="font-serif text-2xl text-ink">More by {{ authorName }}</h2>
            <RouterLink :to="`/poet/${poem.author_id}`" class="text-sm text-muted hover:text-ink">
              All poems →
            </RouterLink>
          </div>
          <div class="grid gap-x-8 sm:grid-cols-3">
            <PoemCard v-for="p in moreByAuthor" :key="p.id" :poem="p" :show-author="false" :lines="2" />
          </div>
        </section>
      </article>
    </div>

    <!-- Phone: actions for a tapped line -->
    <Transition name="sheet">
      <div
        v-if="activeLine"
        class="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-surface px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.08)]"
        role="dialog"
        aria-label="Line actions"
      >
        <div class="flex items-start justify-between gap-3">
          <p class="line-clamp-2 font-serif text-ink italic">“{{ activeLine.content }}”</p>
          <button class="icon-btn -mt-1 -mr-1" aria-label="Close" @click="activeLine = null">
            <Icon name="x" :size="18" />
          </button>
        </div>
        <div class="mt-3 grid grid-cols-4 gap-1 text-xs text-muted">
          <button
            v-if="user"
            class="flex flex-col items-center gap-1.5 rounded-xl py-2.5 hover:bg-ink/5"
            :class="{ 'text-accent': userReactedLineIds.has(activeLine.id) }"
            @click="handleHeart(activeLine.id)"
          >
            <Icon name="heart" :filled="userReactedLineIds.has(activeLine.id)" />
            {{ userReactedLineIds.has(activeLine.id) ? "Hearted" : "Heart" }}
          </button>
          <button
            v-if="user && poem.status === 'published'"
            class="flex flex-col items-center gap-1.5 rounded-xl py-2.5 hover:bg-ink/5"
            @click="startNote(activeLine)"
          >
            <Icon name="message" /> Note
          </button>
          <button class="flex flex-col items-center gap-1.5 rounded-xl py-2.5 hover:bg-ink/5" @click="startShare(activeLine)">
            <Icon name="image" /> Image
          </button>
          <button class="flex flex-col items-center gap-1.5 rounded-xl py-2.5 hover:bg-ink/5" @click="copyLine(activeLine)">
            <Icon name="copy" /> Copy
          </button>
        </div>
      </div>
    </Transition>

    <ShareLineModal
      v-if="shareLine"
      :line="shareLine.content"
      :title="poem.title"
      :author="authorName"
      @close="shareLine = null"
    />
  </div>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: transform 0.22s ease;
}
.sheet-enter-from,
.sheet-leave-to {
  transform: translateY(100%);
}

.eq-bar {
  width: 2px;
  height: 100%;
  background: currentColor;
  border-radius: 1px;
  animation: eq 0.9s ease-in-out infinite alternate;
  transform-origin: bottom;
}
@keyframes eq {
  from {
    transform: scaleY(0.3);
  }
  to {
    transform: scaleY(1);
  }
}
</style>
