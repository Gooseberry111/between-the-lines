<script setup>
import { ref, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { useSaved } from "../src/composables/useSaved";
import { useToast } from "../src/composables/useToast";
import { usePoems } from "../src/composables/usePoems";
import PoemCard from "../src/components/ui/PoemCard.vue";
import Skeleton from "../src/components/ui/Skeleton.vue";
import EmptyState from "../src/components/ui/EmptyState.vue";
import Icon from "../src/components/ui/Icon.vue";

const { getSavedPoems, toggleSaved, isAvailable } = useSaved();
const { getPoemWithLines } = usePoems();
const { toast } = useToast();

const poems = ref([]);
const isLoading = ref(true);

onMounted(async () => {
  try {
    poems.value = await getSavedPoems();
    warmOfflineCopies();
  } catch (err) {
    console.error(err);
  } finally {
    isLoading.value = false;
  }
});

// Fetch each saved poem once so the service worker caches it — then the
// whole Saved shelf is readable offline, even poems not opened yet.
async function warmOfflineCopies() {
  if (!navigator.serviceWorker?.controller || !navigator.onLine) return;
  for (const poem of poems.value) {
    try {
      await getPoemWithLines(poem.id);
    } catch {
      /* best effort */
    }
  }
}

async function unsave(poem) {
  try {
    await toggleSaved(poem.id);
    poems.value = poems.value.filter((p) => p.id !== poem.id);
    toast("Removed from saved", "success");
  } catch {
    toast("Couldn't remove that poem.", "error");
  }
}
</script>

<template>
  <div class="page">
    <header>
      <p class="eyebrow mb-3">Your library</p>
      <h1 class="page-title">Saved poems</h1>
      <p class="mt-4 font-serif text-lg text-muted italic">
        The ones you wanted to come back to — readable even offline.
      </p>
    </header>

    <div class="mt-10">
      <Skeleton v-if="isLoading" variant="grid" :rows="3" />

      <EmptyState
        v-else-if="!isAvailable"
        title="Saving isn't set up yet."
        body="The saved_poems table hasn't been created in the database. Run supabase/sql/02_saved_poems.sql in the Supabase SQL editor to turn this on."
      />

      <EmptyState
        v-else-if="!poems.length"
        title="Nothing saved yet."
        body="Tap the bookmark on any poem to keep it here."
      >
        <RouterLink to="/explore" class="btn btn-primary">Explore poems</RouterLink>
      </EmptyState>

      <div v-else class="grid grid-cols-1 gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
        <PoemCard v-for="poem in poems" :key="poem.id" :poem="poem">
          <template #actions>
            <button class="btn btn-ghost -ml-3 mt-2 py-1 text-xs" @click="unsave(poem)">
              <Icon name="bookmark" :size="14" :filled="true" class="text-accent" /> Remove
            </button>
          </template>
        </PoemCard>
      </div>
    </div>
  </div>
</template>
