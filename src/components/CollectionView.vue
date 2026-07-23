<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useCollections } from "../composables/useCollections";

const props = defineProps({
  id: { type: String, required: true },
});

const router = useRouter();

const { getCollectionWithPoems, removePoemFromCollection } = useCollections();

const collection = ref(null);
const isLoading = ref(true);

async function loadCollection() {
  collection.value = await getCollectionWithPoems(props.id);
}

async function handleRemove(poemId) {
  if (!confirm("Remove this poem from the collection?")) return;

  await removePoemFromCollection(collection.value.id, poemId);

  await loadCollection();
}

onMounted(async () => {
  await loadCollection();
  isLoading.value = false;
});
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-6 p-8">
    <p v-if="isLoading" class="font-body text-brown/60">Loading...</p>

    <template v-else>
      <button
        @click="router.push('/collections')"
        class="self-start rounded-lg border border-brown/20 px-3 py-1.5 font-body text-sm text-brown hover:bg-brown/5"
      >
        ← Back to collections
      </button>

      <div class="flex flex-col gap-1">
        <h1 class="font-heading text-2xl font-medium text-ink">
          {{ collection.title }}
        </h1>
        <p
          v-if="collection.description"
          class="font-body text-sm text-brown/70"
        >
          {{ collection.description }}
        </p>
        <p class="font-body text-xs text-gold">
          by {{ collection.profiles?.username }}
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <div
          v-for="poem in collection.poems"
          :key="poem.id"
          class="flex items-center justify-between rounded-lg border border-brown/10 bg-card p-4 hover:shadow-[0_4px_16px_rgba(59,47,47,0.1)]"
        >
          <p
            class="cursor-pointer font-body text-ink"
            @click="router.push(`/poem/${poem.id}`)"
          >
            {{ poem.title }}
          </p>

          <button
            @click="handleRemove(poem.id)"
            class="text-xs text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
