<script setup>
import { useRouter } from "vue-router";
import { ref, onMounted } from "vue";
import { usePoems } from "../composables/usePoems";

const router = useRouter();
const { getPublishedFeed } = usePoems();
const poems = ref([]);
const isLoading = ref(true);
const emit = defineEmits(["open-poem"]);

onMounted(async () => {
  try {
    poems.value = await getPublishedFeed();
  } catch (err) {
    console.error("Failed to load feed:", err);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-6 p-8">
    <h1 class="text-2xl font-medium text-white">Recent poems</h1>

    <p v-if="isLoading" class="text-white/40">Loading...</p>
    <p v-else-if="poems.length === 0" class="text-white/40">
      No poems published yet.
    </p>

    <div
      v-for="poem in poems"
      :key="poem.id"
      class="cursor-pointer rounded-xl border border-white/10 bg-white/5 p-5 transition-colors hover:bg-white/10"
      @click="router.push(`/poem/${poem.id}`)"
    >
      <h2 class="text-lg font-medium text-white">{{ poem.title }}</h2>
      <p class="mt-1 text-sm italic text-white/50">{{ poem.firstLine }}</p>
      <p class="mt-3 text-xs text-amber-200/70">
        by {{ poem.profiles?.username ?? "unknown" }}
      </p>
    </div>
  </div>
</template>
