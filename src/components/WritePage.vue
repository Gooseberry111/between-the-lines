<script setup>
import { ref } from "vue";
import { usePoems } from "../composables/usePoems";

const { createPoem } = usePoems();

const title = ref("");
const body = ref("");
const isSaving = ref(false);
const savedMessage = ref("");

async function handleSave(status) {
  if (!title.value.trim() || !body.value.trim()) return;

  isSaving.value = true;
  savedMessage.value = "";

  try {
    await createPoem(title.value, body.value, status);
    savedMessage.value =
      status === "published" ? "Published!" : "Saved as draft.";
    title.value = "";
    body.value = "";
  } catch (err) {
    savedMessage.value = `Error: ${err.message}`;
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-4 p-8">
    <input
      v-model="title"
      type="text"
      placeholder="Title"
      class="border-b border-white/10 bg-transparent pb-3 text-2xl font-medium text-white placeholder-white/30 focus:outline-none"
    />
    <textarea
      v-model="body"
      placeholder="Write your poem, line by line..."
      rows="12"
      class="resize-none bg-transparent text-lg leading-relaxed text-white/80 placeholder-white/30 focus:outline-none"
    />
    <p v-if="savedMessage" class="text-sm text-amber-200">{{ savedMessage }}</p>
    <div class="flex gap-3">
      <button
        :disabled="isSaving"
        @click="handleSave('draft')"
        class="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 disabled:opacity-50"
      >
        Save draft
      </button>
      <button
        :disabled="isSaving"
        @click="handleSave('published')"
        class="rounded-lg bg-amber-300/20 px-4 py-2 text-sm text-amber-200 hover:bg-amber-300/30 disabled:opacity-50"
      >
        Publish
      </button>
    </div>
  </div>
</template>
