<script setup>
import { ref, onMounted, watch } from "vue";
import { usePoems } from "../composables/usePoems";
import { useReactions } from "../composables/useReactions";
import { useAuth } from "../composables/useAuth";

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
  <div
    class="flex min-h-[calc(100vh-73px)] items-center justify-center px-8 py-16"
  >
    <p v-if="isLoading" class="text-brown/60">Loading...</p>
    <p v-else-if="errorMessage" class="text-brown/60">{{ errorMessage }}</p>

    <article
      v-else
      class="animate-page-turn flex max-w-xl flex-col items-center gap-8 rounded-lg bg-card p-10 text-center shadow-[0_4px_24px_rgba(59,47,47,0.15)]"
    >
      <div class="flex flex-col items-center gap-2">
        <h1 class="font-heading text-3xl font-medium text-ink">
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
      <div class="flex flex-col gap-3">
        <div
          v-for="line in poem.lines"
          :key="line.id"
          class="group flex items-center justify-center gap-2"
        >
          <p class="font-body text-lg leading-relaxed text-ink/80">
            {{ line.content }}
          </p>
          <button
            v-if="user"
            class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
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
