<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { usePoems } from "../composables/usePoems";

const router = useRouter();
const { getMyPoems, updatePoemStatus, deletePoem } = usePoems();

const poems = ref([]);
const isLoading = ref(true);

async function loadPoems() {
  isLoading.value = true;
  poems.value = await getMyPoems();
  isLoading.value = false;
}

onMounted(loadPoems);

async function handleToggleStatus(poem) {
  const newStatus = poem.status === "published" ? "draft" : "published";
  await updatePoemStatus(poem.id, newStatus);
  poem.status = newStatus;
}

async function handleDelete(poemId) {
  if (!confirm("Delete this poem? This cannot be undone.")) return;
  await deletePoem(poemId);
  poems.value = poems.value.filter((p) => p.id !== poemId);
}
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-6 p-8">
    <h1 class="font-heading text-2xl font-medium text-ink">My poems</h1>

    <p v-if="isLoading" class="font-body text-brown/60">Loading...</p>
    <p v-else-if="poems.length === 0" class="font-body text-brown/60">
      You haven't written anything yet.
    </p>

    <div
      v-for="poem in poems"
      :key="poem.id"
      class="flex flex-col gap-3 rounded-lg border border-brown/10 bg-card p-5"
    >
      <div class="flex items-center justify-between gap-4">
        <p class="font-heading text-lg text-ink">{{ poem.title }}</p>
        <span
          class="rounded-full px-2.5 py-0.5 font-body text-xs"
          :class="
            poem.status === 'published'
              ? 'bg-gold/15 text-gold'
              : 'bg-brown/10 text-brown'
          "
        >
          {{ poem.status }}
        </span>
      </div>

      <div class="flex gap-3 font-body text-sm">
        <button
          class="text-brown hover:text-ink"
          @click="router.push(`/edit/${poem.id}`)"
        >
          Edit
        </button>
        <button
          class="text-brown hover:text-ink"
          @click="handleToggleStatus(poem)"
        >
          {{ poem.status === "published" ? "Unpublish" : "Publish" }}
        </button>
        <button
          class="text-red-700 hover:text-red-900"
          @click="handleDelete(poem.id)"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</template>
