<script setup>
import { ref } from "vue";
import { useCollections } from "../composables/useCollections";

const { createCollection } = useCollections();
const emit = defineEmits(["created"]);

const title = ref("");
const description = ref("");
const isSaving = ref(false);

async function handleSubmit() {
  if (!title.value.trim()) return;
  isSaving.value = true;
  try {
    const collection = await createCollection(title.value, description.value);
    title.value = "";
    description.value = "";
    emit("created", collection);
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="flex flex-col gap-3">
    <input
      v-model="title"
      type="text"
      placeholder="Collection title"
      class="rounded-lg border border-brown/20 bg-card px-4 py-2 font-body text-ink placeholder-brown/40"
    />
    <textarea
      v-model="description"
      placeholder="A short description (optional)"
      rows="2"
      class="resize-none rounded-lg border border-brown/20 bg-card px-4 py-2 font-body text-ink placeholder-brown/40"
    />
    <button
      type="submit"
      :disabled="isSaving"
      class="self-start rounded-lg bg-brown px-4 py-2 font-body text-sm text-card hover:bg-brown/90 disabled:opacity-50"
    >
      Create collection
    </button>
  </form>
</template>
