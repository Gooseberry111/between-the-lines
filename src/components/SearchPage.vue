<script setup>
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { usePoems } from "../composables/usePoems";

const router = useRouter();
const { searchPoems } = usePoems();

const query = ref("");
const results = ref([]);
const isSearching = ref(false);
let debounceTimeout = null;

watch(query, (newQuery) => {
  clearTimeout(debounceTimeout);

  if (!newQuery.trim()) {
    results.value = [];
    return;
  }

  // wait 300ms after the last keystroke before actually searching,
  // so we're not firing a database query on every single letter typed
  debounceTimeout = setTimeout(async () => {
    isSearching.value = true;
    try {
      results.value = await searchPoems(newQuery);
    } finally {
      isSearching.value = false;
    }
  }, 300);
});
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-6 p-8">
    <input
      v-model="query"
      type="text"
      placeholder="Search poems..."
      class="rounded-lg border border-brown/20 bg-card px-4 py-2 font-body text-ink placeholder-brown/40"
    />

    <p v-if="isSearching" class="font-body text-brown/60">Searching...</p>
    <p
      v-else-if="query.trim() && results.length === 0"
      class="font-body text-brown/60"
    >
      No poems found.
    </p>

    <div
      v-for="poem in results"
      :key="poem.id"
      class="cursor-pointer rounded-lg border border-brown/10 bg-card p-5 hover:shadow-[0_4px_16px_rgba(59,47,47,0.1)]"
      @click="router.push(`/poem/${poem.id}`)"
    >
      <h2 class="font-heading text-lg font-medium text-ink">
        {{ poem.title }}
      </h2>
      <p class="mt-2 font-body text-xs text-gold">
        by {{ poem.profiles?.username ?? "unknown" }}
      </p>
    </div>
  </div>
</template>
