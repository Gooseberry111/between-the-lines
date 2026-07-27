<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { usePoems } from "../composables/usePoems";

const router = useRouter();
const { createPoem } = usePoems();

const title = ref("");
const body = ref("");
const category = ref("");
const isSaving = ref(false);
const savedMessage = ref("");

const categoryOptions = [
  "Love",
  "Lust",
  "Heartbreak",
  "Loss",
  "Joy",
  "Hope",
  "Nature",
  "Melancholy",
  "Identity",
  "Other",
];

async function handleSave(status) {
  if (!title.value.trim() || !body.value.trim()) return;

  isSaving.value = true;
  savedMessage.value =
    status === "published" ? "Finding the perfect instrumental..." : "";

  try {
    await createPoem(title.value, body.value, status, category.value || null);

    if (status === "published") {
      router.push("/");
    } else {
      savedMessage.value = "Saved as draft.";
      title.value = "";
      body.value = "";
      category.value = "";
    }
  } catch (err) {
    savedMessage.value = `Error: ${err.message}`;
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8 sm:px-8">
    <input
      v-model="title"
      type="text"
      placeholder="Title"
      class="border-b border-brown/20 bg-transparent pb-3 font-heading text-2xl font-medium text-ink placeholder-brown/30 focus:outline-none"
    />
    <textarea
      v-model="body"
      placeholder="Write your poem, line by line..."
      rows="12"
      class="resize-none bg-transparent font-body text-lg leading-relaxed text-ink/80 placeholder-brown/30 focus:outline-none"
    />

    <label class="flex flex-col gap-1.5 font-body text-sm text-brown">
      Category
      <select
        v-model="category"
        class="rounded-lg border border-brown/20 bg-card px-3 py-2 font-body text-sm text-ink focus:outline-none"
      >
        <option value="">No category</option>
        <option v-for="option in categoryOptions" :key="option" :value="option">
          {{ option }}
        </option>
      </select>
    </label>

    <p class="font-body text-xs text-brown/50">
      🎵 On publish, an AI will read your poem's mood and set a matching
      instrumental automatically.
    </p>

    <p v-if="savedMessage" class="font-body text-sm text-gold">
      {{ savedMessage }}
    </p>
    <div class="flex gap-3">
      <button
        :disabled="isSaving"
        @click="handleSave('draft')"
        class="rounded-lg border border-brown/20 bg-card px-4 py-2 font-body text-sm text-ink hover:bg-brown/5 disabled:opacity-50"
      >
        Save draft
      </button>
      <button
        :disabled="isSaving"
        @click="handleSave('published')"
        class="rounded-lg bg-brown px-4 py-2 font-body text-sm text-card hover:bg-brown/90 disabled:opacity-50"
      >
        {{ isSaving ? "Publishing..." : "Publish" }}
      </button>
    </div>
  </div>
</template>
