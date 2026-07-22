<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useCollections } from "../composables/useCollections";

const props = defineProps({
  id: { type: String, required: true },
});

const router = useRouter();
const { getCollectionWithPoems } = useCollections();
const collection = ref(null);
const isLoading = ref(true);

onMounted(async () => {
  collection.value = await getCollectionWithPoems(props.id);
  isLoading.value = false;
});
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-6 p-8">
    <p v-if="isLoading" class="font-body text-brown/60">Loading...</p>

    <template v-else>
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
          class="cursor-pointer rounded-lg border border-brown/10 bg-card p-4 hover:shadow-[0_4px_16px_rgba(59,47,47,0.1)]"
          @click="router.push(`/poem/${poem.id}`)"
        >
          <p class="font-body text-ink">{{ poem.title }}</p>
        </div>
      </div>
    </template>
  </div>
</template>
