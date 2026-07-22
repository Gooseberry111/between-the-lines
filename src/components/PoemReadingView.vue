<script setup>
import { ref, onMounted, watch } from "vue";
import { usePoems } from "../composables/usePoems";

const props = defineProps({
  id: { type: String, required: true },
});

const { getPoemWithLines } = usePoems();
const poem = ref(null);
const isLoading = ref(true);
const errorMessage = ref("");

async function loadPoem() {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    poem.value = await getPoemWithLines(props.id);
  } catch (err) {
    errorMessage.value = "This poem doesn't exist, or isn't published.";
  } finally {
    isLoading.value = false;
  }
}

onMounted(loadPoem);

// if the user navigates from one poem straight to another
// (e.g. clicking a related poem link later), reload instead of
// staying stuck showing the previous poem's content
watch(() => props.id, loadPoem);
</script>

<template>
  <div
    class="flex min-h-[calc(100vh-73px)] items-center justify-center px-8 py-16"
  >
    <p v-if="isLoading" class="text-white/40">Loading...</p>
    <p v-else-if="errorMessage" class="text-white/40">{{ errorMessage }}</p>

    <article
      v-else
      class="flex max-w-xl flex-col items-center gap-8 text-center"
    >
      <div class="flex flex-col items-center gap-2">
        <h1 class="text-3xl font-medium text-white">{{ poem.title }}</h1>
        <p class="text-sm text-amber-200/70">
          by {{ poem.profiles?.username ?? "unknown" }}
        </p>
      </div>

      <div class="flex flex-col gap-3">
        <p
          v-for="line in poem.lines"
          :key="line.id"
          class="text-lg leading-relaxed text-white/80"
        >
          {{ line.content }}
        </p>
      </div>
    </article>
  </div>
</template>
