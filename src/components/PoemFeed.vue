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
    <h1 class="font-heading text-2xl font-medium text-ink">Recent poems</h1>

    <p v-if="isLoading" class="text-brown/60">Loading...</p>
    <p v-else-if="poems.length === 0" class="text-brown/60">
      No poems published yet.
    </p>

    <div
      v-for="poem in poems"
      :key="poem.id"
      class="cursor-pointer rounded-lg border border-brown/10 bg-card p-5 shadow-[0_2px_10px_rgba(59,47,47,0.06)] transition-shadow hover:shadow-[0_4px_16px_rgba(59,47,47,0.1)]"
      @click="router.push(`/poem/${poem.id}`)"
    >
      <h2 class="font-heading text-lg font-medium text-ink">
        {{ poem.title }}
      </h2>
      <p class="mt-1 font-body italic text-sm text-brown/70">
        {{ poem.firstLine }}
      </p>
      <p class="mt-3 font-body text-xs text-gold">
        by {{ poem.profiles?.username ?? "unknown" }}
      </p>
    </div>
  </div>
</template>
