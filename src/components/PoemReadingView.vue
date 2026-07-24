<script setup>
import { ref, onMounted, watch } from "vue";
import { usePoems } from "../composables/usePoems";
import { useReactions } from "../composables/useReactions";
import { useAuth } from "../composables/useAuth";
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

const poem = ref(null);
const isLoading = ref(true);
const errorMessage = ref("");

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

function handleLineClick(lineId) {
  if (!user.value) return;
  toggleReaction(lineId);
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
      <div class="flex flex-col items-center gap-2">
        <h1 class="font-heading text-2xl font-medium text-ink sm:text-3xl">
          {{ poem.title }}
        </h1>
        <p class="font-body text-sm text-brown">
          by {{ poem.profiles?.username ?? "unknown" }}
        </p>
      </div>
      <audio
        v-if="poem.audio_url"
        :src="poem.audio_url"
        controls
        class="w-full max-w-sm rounded-lg"
      />
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
