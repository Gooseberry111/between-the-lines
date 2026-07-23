<script setup>
import { ref } from "vue";
import { useCollections } from "../composables/useCollections";

const { createCollection, getMyPoems, addPoemToCollection } = useCollections();
const emit = defineEmits(["created"]);

const title = ref("");
const description = ref("");
const myPoems = ref([]);
const selectedPoemIds = ref(new Set());
const isSaving = ref(false);
const isLoadingPoems = ref(true);
const showPoems = ref(false);

async function loadPoems() {
  isLoadingPoems.value = true;
  myPoems.value = await getMyPoems();
  isLoadingPoems.value = false;
}
loadPoems();

function togglePoem(poemId) {
  if (selectedPoemIds.value.has(poemId)) {
    selectedPoemIds.value.delete(poemId);
  } else {
    selectedPoemIds.value.add(poemId);
  }
}

async function handleSubmit() {
  if (!title.value.trim()) return;
  isSaving.value = true;
  try {
    const collection = await createCollection(title.value, description.value);

    for (const poemId of selectedPoemIds.value) {
      await addPoemToCollection(collection.id, poemId);
    }

    title.value = "";
    description.value = "";
    selectedPoemIds.value = new Set();
    emit("created", collection);
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <form
    @submit.prevent="handleSubmit"
    class="flex flex-col gap-3 rounded-lg border border-brown/10 bg-card p-5"
  >
    <input
      v-model="title"
      type="text"
      placeholder="Collection title"
      class="rounded-lg border border-brown/20 bg-parchment px-4 py-2 font-body text-ink placeholder-brown/40"
    />
    <textarea
      v-model="description"
      placeholder="A short description (optional)"
      rows="2"
      class="resize-none rounded-lg border border-brown/20 bg-parchment px-4 py-2 font-body text-ink placeholder-brown/40"
    />
    <button
      type="button"
      @click="showPoems = !showPoems"
      class="self-start rounded-lg border border-brown/20 px-3 py-1.5 font-body text-sm text-brown hover:bg-brown/5"
    >
      {{ showPoems ? "Hide poems" : "Select poems" }}
    </button>
    <div v-if="showPoems" class="flex flex-col gap-2">
      <p class="font-body text-xs tracking-wide text-brown/60">
        Choose poems to include (optional)
      </p>

      <p v-if="isLoadingPoems" class="font-body text-sm text-brown/50">
        Loading your poems...
      </p>

      <p
        v-else-if="myPoems.length === 0"
        class="font-body text-sm italic text-brown/50"
      >
        You haven't written any poems yet.
      </p>

      <div
        v-else
        class="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border border-brown/10 p-2"
      >
        <label
          v-for="poem in myPoems"
          :key="poem.id"
          class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-brown/5"
        >
          <input
            type="checkbox"
            :checked="selectedPoemIds.has(poem.id)"
            @change="togglePoem(poem.id)"
            class="accent-brown"
          />
          <span class="font-body text-sm text-ink">{{ poem.title }}</span>
        </label>
      </div>
    </div>

    <button
      type="submit"
      :disabled="isSaving || !title.trim()"
      class="self-start rounded-lg bg-brown px-4 py-2 font-body text-sm text-card hover:bg-brown/90 disabled:opacity-50"
    >
      {{ isSaving ? "Creating..." : "Create collection" }}
    </button>
  </form>
</template>
