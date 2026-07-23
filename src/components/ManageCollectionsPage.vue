<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useCollections } from "../composables/useCollections";
import { usePoems } from "../composables/usePoems.js";
import CreateCollectionForm from "./CreateCollectionForm.vue";

const router = useRouter();
const {
  getMyCollections,
  getMyPoems,
  getMyPoemsNotInCollection,
  addPoemToCollection,
  deleteCollection,
} = useCollections();

const collections = ref([]);
const totalMyPoems = ref(0);
const availablePoemsByCollection = ref({});
const searchByCollection = ref({});
const openPickerId = ref(null); // which collection's "add poems" panel is open
const isLoading = ref(true);

async function loadCollections() {
  isLoading.value = true;
  const [myCollections, myPoems] = await Promise.all([
    getMyCollections(),
    getMyPoems(),
  ]);
  collections.value = myCollections;
  totalMyPoems.value = myPoems.length;

  for (const collection of collections.value) {
    availablePoemsByCollection.value[collection.id] =
      await getMyPoemsNotInCollection(collection.id);
  }

  isLoading.value = false;
}

onMounted(loadCollections);

function poemCount(collection) {
  const notIn = availablePoemsByCollection.value[collection.id]?.length ?? 0;
  return Math.max(0, totalMyPoems.value - notIn);
}

function filteredAvailable(collectionId) {
  const search = (searchByCollection.value[collectionId] || "").toLowerCase();
  const list = availablePoemsByCollection.value[collectionId] || [];
  if (!search) return list;
  return list.filter((p) => p.title.toLowerCase().includes(search));
}

function togglePicker(collectionId) {
  openPickerId.value =
    openPickerId.value === collectionId ? null : collectionId;
}

async function handleAdd(collectionId, poemId) {
  await addPoemToCollection(collectionId, poemId);
  availablePoemsByCollection.value[collectionId] =
    await getMyPoemsNotInCollection(collectionId);
}
async function handleDeleteCollection(collectionId) {
  if (!confirm("Delete this collection?")) return;

  await deleteCollection(collectionId);
  await loadCollections();
}
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-8 p-8">
    <h1 class="font-heading text-2xl font-medium text-ink">My collections</h1>

    <CreateCollectionForm @created="loadCollections" />

    <p v-if="isLoading" class="font-body text-brown/60">Loading...</p>

    <p
      v-else-if="collections.length === 0"
      class="font-body text-sm italic text-brown/50"
    >
      You haven't created any collections yet.
    </p>

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

          <div class="flex items-center gap-3">
            <span class="whitespace-nowrap font-body text-xs text-brown/50">
              {{ poemCount(collection) }} poem{{
                poemCount(collection) === 1 ? "" : "s"
              }}
            </span>

            <button
              @click="handleDeleteCollection(collection.id)"
              class="text-xs text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        </div>

        <button
          @click="togglePicker(collection.id)"
          class="mt-3 font-body text-xs text-brown underline hover:text-ink"
        >
          {{ openPickerId === collection.id ? "Close" : "+ Add poems" }}
        </button>

        <div
          v-if="openPickerId === collection.id"
          class="mt-3 flex flex-col gap-2"
        >
          <input
            v-model="searchByCollection[collection.id]"
            type="text"
            placeholder="Search your poems..."
            class="rounded-lg border border-brown/20 bg-parchment px-3 py-1.5 font-body text-sm text-ink placeholder-brown/40"
          />

          <p
            v-if="filteredAvailable(collection.id).length === 0"
            class="font-body text-sm italic text-brown/50"
          >
            No matching poems to add.
          </p>

          <div
            v-else
            class="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-brown/10 p-2"
          >
            <div
              v-for="poem in filteredAvailable(collection.id)"
              :key="poem.id"
              class="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-brown/5"
            >
              <span class="font-body text-sm text-ink">{{ poem.title }}</span>
              <button
                @click="handleAdd(collection.id, poem.id)"
                class="whitespace-nowrap rounded bg-brown px-2 py-0.5 font-body text-xs text-card hover:bg-brown/90"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
