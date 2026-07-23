<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { usePoems } from "../composables/usePoems";

const route = useRoute();
const router = useRouter();
const { getPoemWithLines, updatePoem } = usePoems();

const title = ref("");
const body = ref("");
const isLoading = ref(true);
const isSaving = ref(false);

onMounted(async () => {
  const poem = await getPoemWithLines(route.params.id);
  title.value = poem.title;
  body.value = poem.lines.map((line) => line.content).join("\n");
  isLoading.value = false;
});

async function handleSave() {
  if (!title.value.trim() || !body.value.trim()) return;
  isSaving.value = true;
  try {
    await updatePoem(route.params.id, title.value, body.value);
    router.push("/my-poems");
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-4 p-8">
    <p v-if="isLoading" class="font-body text-brown/60">Loading...</p>

    <template v-else>
      <input
        v-model="title"
        type="text"
        class="border-b border-brown/20 bg-transparent pb-3 font-heading text-2xl font-medium text-ink focus:outline-none"
      />
      <textarea
        v-model="body"
        rows="12"
        class="resize-none bg-transparent font-body text-lg leading-relaxed text-ink/80 focus:outline-none"
      />
      <button
        :disabled="isSaving"
        @click="handleSave"
        class="self-start rounded-lg bg-brown px-4 py-2 font-body text-sm text-card hover:bg-brown/90 disabled:opacity-50"
      >
        Save changes
      </button>
    </template>
  </div>
</template>
