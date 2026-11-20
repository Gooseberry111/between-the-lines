<script setup>
import { ref, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { useCollections } from "../composables/useCollections";
import { useToast } from "../composables/useToast";
import CreateCollectionForm from "./CreateCollectionForm.vue";
import Icon from "./ui/Icon.vue";
import Skeleton from "./ui/Skeleton.vue";
import EmptyState from "./ui/EmptyState.vue";

const {
  getMyCollections,
  getMyPoems,
  getMyPoemsNotInCollection,
  addPoemToCollection,
  deleteCollection,
} = useCollections();
const { toast } = useToast();

const collections = ref([]);
const totalMyPoems = ref(0);
const availablePoemsByCollection = ref({});
const searchByCollection = ref({});
const openPickerId = ref(null);
const showCreate = ref(false);
const isLoading = ref(true);
const errorMessage = ref("");

async function loadCollections() {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const [myCollections, myPoems] = await Promise.all([getMyCollections(), getMyPoems()]);
    totalMyPoems.value = myPoems.length;
    const available = await Promise.all(
      myCollections.map((c) => getMyPoemsNotInCollection(c.id)),
    );
    myCollections.forEach((c, i) => {
      availablePoemsByCollection.value[c.id] = available[i];
    });
    collections.value = myCollections;
  } catch (err) {
    console.error(err);
    errorMessage.value = "We couldn't load your collections.";
  } finally {
    isLoading.value = false;
  }
}
onMounted(loadCollections);

function poemCount(collection) {
  const notIn = availablePoemsByCollection.value[collection.id]?.length ?? 0;
  return Math.max(0, totalMyPoems.value - notIn);
}

function filteredAvailable(collectionId) {
  const search = (searchByCollection.value[collectionId] || "").toLowerCase();
  const list = availablePoemsByCollection.value[collectionId] || [];
  return search ? list.filter((p) => p.title.toLowerCase().includes(search)) : list;
}

function togglePicker(collectionId) {
  openPickerId.value = openPickerId.value === collectionId ? null : collectionId;
}

async function handleAdd(collection, poem) {
  try {
    await addPoemToCollection(collection.id, poem.id, poemCount(collection));
    availablePoemsByCollection.value[collection.id] = await getMyPoemsNotInCollection(collection.id);
    toast(`Added “${poem.title}”`, "success");
  } catch (err) {
    toast(`Couldn't add poem: ${err.message}`, "error");
  }
}

async function handleDelete(collection) {
  if (!confirm(`Delete the collection “${collection.title}”? The poems themselves are kept.`)) return;
  try {
    await deleteCollection(collection.id);
    collections.value = collections.value.filter((c) => c.id !== collection.id);
    toast("Collection deleted", "success");
  } catch (err) {
    toast(`Couldn't delete collection: ${err.message}`, "error");
  }
}

function onCreated() {
  showCreate.value = false;
  loadCollections();
}
</script>

<template>
  <div class="page">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow mb-3">Your shelf</p>
        <h1 class="page-title">Collections</h1>
      </div>
      <button v-if="!showCreate" class="btn btn-primary" @click="showCreate = true">
        <Icon name="plus" :size="15" /> New collection
      </button>
    </header>

    <Transition name="fade">
      <CreateCollectionForm
        v-if="showCreate"
        class="mt-10"
        @created="onCreated"
        @cancel="showCreate = false"
      />
    </Transition>

    <div class="mt-10">
      <Skeleton v-if="isLoading" variant="grid" :rows="3" />

      <EmptyState v-else-if="errorMessage" title="Something went wrong." :body="errorMessage">
        <button class="btn btn-secondary" @click="loadCollections">Try again</button>
      </EmptyState>

      <EmptyState
        v-else-if="!collections.length && !showCreate"
        title="No collections yet."
        body="Gather your poems into chapbooks, seasons or themes."
      >
        <button class="btn btn-primary" @click="showCreate = true">
          <Icon name="plus" :size="15" /> Create your first
        </button>
      </EmptyState>

      <div v-else class="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
        <article
          v-for="collection in collections"
          :key="collection.id"
          class="flex flex-col border-t border-rule py-6"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <RouterLink
                :to="`/collection/${collection.id}`"
                class="font-serif text-2xl text-ink hover:underline hover:decoration-rule hover:underline-offset-4"
              >
                {{ collection.title }}
              </RouterLink>
              <p v-if="collection.description" class="mt-1 line-clamp-2 font-serif text-muted italic">
                {{ collection.description }}
              </p>
            </div>
            <button
              class="icon-btn -mt-1 -mr-2 hover:text-accent"
              aria-label="Delete collection"
              title="Delete"
              @click="handleDelete(collection)"
            >
              <Icon name="trash" :size="16" />
            </button>
          </div>

          <div class="mt-4 flex items-center gap-4 text-sm">
            <span class="text-muted">
              {{ poemCount(collection) }} poem{{ poemCount(collection) === 1 ? "" : "s" }}
            </span>
            <RouterLink :to="`/collection/${collection.id}`" class="-my-2 py-2 text-ink hover:text-accent">Open →</RouterLink>
            <button class="-my-2 ml-auto py-2 text-muted hover:text-ink" @click="togglePicker(collection.id)">
              {{ openPickerId === collection.id ? "Done" : "+ Add poems" }}
            </button>
          </div>

          <div v-if="openPickerId === collection.id" class="mt-4 rounded-xl border border-rule bg-surface p-3">
            <input
              v-model="searchByCollection[collection.id]"
              type="search"
              placeholder="Search your poems…"
              class="input mb-2 py-2"
            />
            <p v-if="!filteredAvailable(collection.id).length" class="px-1 py-3 text-sm text-muted italic">
              No poems left to add.
            </p>
            <ul v-else class="max-h-52 overflow-y-auto">
              <li
                v-for="poem in filteredAvailable(collection.id)"
                :key="poem.id"
                class="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-ink/[0.03]"
              >
                <span class="truncate font-serif text-ink">{{ poem.title }}</span>
                <button class="btn btn-secondary px-3 py-1 text-xs" @click="handleAdd(collection, poem)">Add</button>
              </li>
            </ul>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
