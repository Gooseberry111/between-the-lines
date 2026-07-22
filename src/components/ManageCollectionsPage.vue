<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useCollections } from "../composables/useCollections";
import CreateCollectionForm from "./CreateCollectionForm.vue";

const router = useRouter();
const { getMyCollections, getMyPoemsNotInCollection, addPoemToCollection } =
  useCollections();

const collections = ref([]);
const availablePoemsByCollection = ref({}); // { collectionId: [poems] }
const selectedPoemId = ref({}); // { collectionId: poemId }
const isLoading = ref(true);

async function loadCollections() {
  isLoading.value = true;
  collections.value = await getMyCollections();

  for (const collection of collections.value) {
    availablePoemsByCollection.value[collection.id] =
      await getMyPoemsNotInCollection(collection.id);
  }

  isLoading.value = false;
}

onMounted(loadCollections);

async function handleAdd(collectionId) {
  const poemId = selectedPoemId.value[collectionId];
  if (!poemId) return;

  await addPoemToCollection(collectionId, poemId);
  selectedPoemId.value[collectionId] = "";
  // refresh the available list for this collection, since that poem is no longer "available"
  availablePoemsByCollection.value[collectionId] =
    await getMyPoemsNotInCollection(collectionId);
}
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-8 p-8">
    <h1 class="font-heading text-2xl font-medium text-ink">My collections</h1>

    <CreateCollectionForm @created="loadCollections" />

    <p v-if="isLoading" class="font-body text-brown/60">Loading...</p>

    <div v-else class="flex flex-col gap-4">
      <div
        v-for="collection in collections"
        :key="collection.id"
        class="rounded-lg border border-brown/10 bg-card p-5"
      >
        <div class="flex items-center justify-between">
          <p
            class="cursor-pointer font-heading text-ink hover:text-gold"
            @click="router.push(`/collection/${collection.id}`)"
          >
            {{ collection.title }}
          </p>
        </div>

        <div class="mt-3 flex gap-2">
          <select
            v-model="selectedPoemId[collection.id]"
            class="flex-1 rounded-lg border border-brown/20 bg-parchment px-3 py-1.5 font-body text-sm text-ink"
          >
            <option value="" disabled>Add a poem...</option>
            <option
              v-for="poem in availablePoemsByCollection[collection.id]"
              :key="poem.id"
              :value="poem.id"
            >
              {{ poem.title }}
            </option>
          </select>
          <button
            @click="handleAdd(collection.id)"
            class="rounded-lg bg-brown px-3 py-1.5 font-body text-sm text-card hover:bg-brown/90"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
