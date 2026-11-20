<script setup>
import { ref, computed, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { useCollections } from "../composables/useCollections";
import { useAuth } from "../composables/useAuth";
import { useToast } from "../composables/useToast";
import { excerptLines } from "../lib/poemText";
import Icon from "./ui/Icon.vue";
import Skeleton from "./ui/Skeleton.vue";
import EmptyState from "./ui/EmptyState.vue";

const props = defineProps({
  id: { type: String, required: true },
});

const { getCollectionWithPoems, removePoemFromCollection } = useCollections();
const { user } = useAuth();
const { toast } = useToast();

const collection = ref(null);
const isLoading = ref(true);
const notFound = ref(false);

const isOwner = computed(() => user.value && collection.value?.author_id === user.value.id);

async function loadCollection() {
  collection.value = await getCollectionWithPoems(props.id);
}

onMounted(async () => {
  try {
    await loadCollection();
    document.title = `${collection.value.title} · Between the Lines`;
  } catch {
    notFound.value = true;
  } finally {
    isLoading.value = false;
  }
});

async function handleRemove(poem) {
  if (!confirm(`Remove “${poem.title}” from this collection?`)) return;
  try {
    await removePoemFromCollection(collection.value.id, poem.id);
    collection.value.poems = collection.value.poems.filter((p) => p.id !== poem.id);
    toast("Removed from collection", "success");
  } catch (err) {
    toast(`Couldn't remove poem: ${err.message}`, "error");
  }
}
</script>

<template>
  <div class="page-narrow">
    <RouterLink to="/collections" class="btn btn-ghost -ml-3">
      <Icon name="arrow-left" :size="16" /> Collections
    </RouterLink>

    <Skeleton v-if="isLoading" class="mt-10" :rows="5" />

    <EmptyState
      v-else-if="notFound"
      title="This collection isn't here."
      body="It may have been deleted, or you don't have access to it."
    />

    <template v-else>
      <header class="mt-10 border-b border-ink pb-8 text-center">
        <p class="eyebrow mb-4 text-accent">A collection</p>
        <h1 class="page-title text-balance">{{ collection.title }}</h1>
        <p v-if="collection.description" class="mx-auto mt-4 max-w-md font-serif text-lg text-muted italic">
          {{ collection.description }}
        </p>
        <p class="mt-5 text-sm text-muted">
          gathered by
          <RouterLink :to="`/poet/${collection.author_id}`" class="font-medium text-ink hover:text-accent">
            {{ collection.profiles?.username ?? "Anonymous" }}
          </RouterLink>
          · {{ collection.poems.length }} poem{{ collection.poems.length === 1 ? "" : "s" }}
        </p>
      </header>

      <EmptyState
        v-if="!collection.poems.length"
        title="No poems in here yet."
        :body="isOwner ? 'Add some from the Collections page.' : ''"
      />

      <!-- Table of contents -->
      <ol v-else class="mt-4">
        <li
          v-for="(poem, i) in collection.poems"
          :key="poem.id"
          class="group relative flex items-baseline gap-5 border-b border-rule py-5"
        >
          <span class="w-7 font-serif text-sm text-faint tabular-nums">{{ String(i + 1).padStart(2, "0") }}</span>
          <div class="min-w-0 flex-1">
            <RouterLink
              :to="`/poem/${poem.id}`"
              class="font-serif text-2xl text-ink after:absolute after:inset-0 group-hover:underline group-hover:decoration-rule group-hover:underline-offset-4"
            >
              {{ poem.title }}
            </RouterLink>
            <p v-if="poem.body" class="mt-1 truncate font-serif text-muted italic">
              {{ excerptLines(poem.body, 1)[0] }}
            </p>
          </div>
          <span
            v-if="poem.status !== 'published'"
            class="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] text-muted"
          >
            Draft
          </span>
          <button
            v-if="isOwner"
            class="icon-btn relative z-10 opacity-60 hover:text-accent hover:opacity-100"
            aria-label="Remove from collection"
            title="Remove"
            @click="handleRemove(poem)"
          >
            <Icon name="x" :size="16" />
          </button>
        </li>
      </ol>
    </template>
  </div>
</template>
