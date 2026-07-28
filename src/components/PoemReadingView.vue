<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { usePoems } from "../composables/usePoems";
import { useReactions } from "../composables/useReactions";
import { useAuth } from "../composables/useAuth";
import { useTTS } from "../composables/useTTS";
import { useRouter } from "vue-router";

const router = useRouter();

function goBack() {
  router.back();
}
const props = defineProps({
  id: { type: String, required: true },
});

const { getPoemWithLines } = usePoems();
const { counts, userReactedLineIds, loadReactions, toggleReaction } =
  useReactions();
const { user } = useAuth();
const { isSpeaking, isPaused, isSupported, speak, pause, resume, stop } =
  useTTS();

const poem = ref(null);
const isLoading = ref(true);
const errorMessage = ref("");
const audioRef = ref(null);
const isInstrumentalPlaying = ref(false);

const fullText = computed(() =>
  poem.value ? poem.value.lines.map((line) => line.content).join(". ") : "",
);

async function loadPoem() {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    poem.value = await getPoemWithLines(props.id);
    await loadReactions(poem.value.lines.map((line) => line.id));
  } catch (err) {
    errorMessage.value = "This poem doesn't exist, or isn't published.";
  } finally {
    isLoading.value = false;
  }
}

onMounted(loadPoem);
watch(() => props.id, loadPoem);
watch(() => props.id, stop);
watch(
  () => props.id,
  () => {
    if (audioRef.value) {
      audioRef.value.pause();
      audioRef.value.currentTime = 0;
    }
    isInstrumentalPlaying.value = false;
  },
);

function handleLineClick(lineId) {
  if (!user.value) return;
  toggleReaction(lineId);
}

function toggleInstrumental() {
  if (!audioRef.value) return;
  if (audioRef.value.paused) {
    audioRef.value.play();
  } else {
    audioRef.value.pause();
  }
}

function handleReadAloud() {
  if (isSpeaking.value && !isPaused.value) {
    pause();
  } else if (isPaused.value) {
    resume();
  } else {
    speak(fullText.value);
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col px-4 py-10 sm:px-8 sm:py-16">
    <div class="mx-auto mb-6 w-full max-w-xl">
      <button
        @click="goBack"
        class="flex items-center gap-2 rounded-full border border-brown/20 bg-card px-4 py-2 font-body text-sm text-brown transition hover:bg-brown hover:text-card"
      >
        ← Back
      </button>
    </div>
    <p v-if="isLoading" class="text-brown/60">Loading...</p>
    <p v-else-if="errorMessage" class="text-brown/60">{{ errorMessage }}</p>

    <article
      v-else
      class="animate-page-turn mx-auto flex w-full max-w-xl flex-col items-center gap-6 rounded-lg bg-card p-6 text-center shadow-[0_4px_24px_rgba(59,47,47,0.15)] sm:gap-8 sm:p-10"
      style="
        background-image: radial-gradient(
          circle,
          rgba(59, 47, 47, 0.12) 1px,
          transparent 1px
        );
        background-size: 16px 16px;
      "
    >
      <button
        v-if="poem.audio_url"
        @click="toggleInstrumental"
        class="flex h-11 w-11 items-center justify-center rounded-full border border-brown/20 bg-card text-lg transition hover:bg-brown hover:text-card"
        :class="{ '!bg-brown !text-card': isInstrumentalPlaying }"
        :title="
          isInstrumentalPlaying ? 'Pause instrumental' : 'Play instrumental'
        "
      >
        🔊
      </button>
      <audio
        v-if="poem.audio_url"
        ref="audioRef"
        :src="poem.audio_url"
        loop
        class="hidden"
        @play="isInstrumentalPlaying = true"
        @pause="isInstrumentalPlaying = false"
      />

      <div class="flex flex-col items-center gap-2">
        <h1 class="font-heading text-2xl font-medium text-ink sm:text-3xl">
          {{ poem.title }}
        </h1>
        <p class="font-body text-sm text-brown">
          by {{ poem.profiles?.username ?? "unknown" }}
        </p>
      </div>

      <div v-if="isSupported" class="flex items-center gap-2">
        <button
          @click="handleReadAloud"
          class="flex items-center gap-2 rounded-full border border-brown/20 bg-card px-4 py-2 font-body text-sm text-brown transition hover:bg-brown hover:text-card"
        >
          {{
            isSpeaking && !isPaused
              ? "⏸ Pause"
              : isPaused
                ? "▶ Resume"
                : "▶ Read aloud"
          }}
        </button>
        <button
          v-if="isSpeaking || isPaused"
          @click="stop"
          class="rounded-full border border-brown/20 bg-card px-4 py-2 font-body text-sm text-brown transition hover:bg-brown hover:text-card"
        >
          ⏹ Stop
        </button>
      </div>

      <div class="flex w-full flex-col gap-3">
        <div
          v-for="line in poem.lines"
          :key="line.id"
          class="group flex flex-wrap items-center justify-center gap-x-2 gap-y-1"
        >
          <p class="font-body text-base leading-relaxed text-ink/80 sm:text-lg">
            {{ line.content }}
          </p>
          <button
            v-if="user"
            class="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
            :class="{ '!opacity-100': userReactedLineIds.has(line.id) }"
            @click="handleLineClick(line.id)"
          >
            <span
              :class="
                userReactedLineIds.has(line.id) ? 'text-gold' : 'text-brown/30'
              "
              >♥</span
            >
            <span v-if="counts[line.id]" class="text-xs text-brown/50">{{
              counts[line.id]
            }}</span>
          </button>
        </div>
      </div>
    </article>
  </div>
</template>
