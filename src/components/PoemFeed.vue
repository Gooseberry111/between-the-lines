<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { usePoems } from "../composables/usePoems";
import PoemDoodle from "./PoemDoodle.vue";

const router = useRouter();
const { getPublishedFeed } = usePoems();

const poems = ref([]);
const isLoading = ref(true);

onMounted(async () => {
  try {
    poems.value = await getPublishedFeed();
  } finally {
    isLoading.value = false;
  }
});

const poemOfTheDay = computed(() => {
  if (poems.value.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * poems.value.length);
  return poems.value[randomIndex];
});

const featured = computed(() => {
  return poems.value.filter((p) => p.id !== poemOfTheDay.value?.id).slice(0, 3);
});

const recent = computed(() => {
  const featuredIds = new Set(featured.value.map((p) => p.id));
  return poems.value
    .filter((p) => p.id !== poemOfTheDay.value?.id && !featuredIds.has(p.id))
    .slice(0, 5);
});

function estimateReadTime(poem) {
  const wordCount =
    (poem.firstLine || "").split(" ").length * (poem.poem_lines?.length || 1);
  return Math.max(1, Math.round(wordCount / 100));
}
const doodleVariants = ["leaf", "feather", "wave"];
function doodleFor(index) {
  return doodleVariants[index % doodleVariants.length];
}
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-14 px-8 py-10">
    <p v-if="isLoading" class="font-body text-brown/60">Loading...</p>

    <template v-else-if="poems.length > 0">
      <div class="grid grid-cols-1 gap-8 md:grid-cols-[1fr_2px_1fr]">
        <div class="flex flex-col gap-3">
          <p
            class="text-center font-body text-xs tracking-widest text-brown/60"
          >
            POEM OF THE DAY
          </p>
          <h1 class="font-heading text-3xl font-medium text-ink">
            "{{ poemOfTheDay.title }}"
          </h1>
          <p class="font-body italic leading-relaxed text-ink/70">
            {{ poemOfTheDay.firstLine }}
          </p>
          <p class="font-script text-lg text-brown">
            — {{ poemOfTheDay.profiles?.username }}
          </p>
          <button
            class="mt-2 self-start font-body text-sm text-brown underline hover:text-ink"
            @click="router.push(`/poem/${poemOfTheDay.id}`)"
          >
            Read full poem →
          </button>
        </div>

        <div class="hidden bg-brown/15 md:block"></div>

        <div class="flex flex-col gap-4">
          <p
            class="text-center font-body text-xs tracking-widest text-brown/60"
          >
            FEATURED POEMS
          </p>
          <div
            v-for="(poem, index) in featured"
            :key="poem.id"
            class="cursor-pointer rounded-lg border border-brown/10 bg-card p-4"
            @click="router.push(`/poem/${poem.id}`)"
          >
            <h3 class="font-heading text-base text-ink">{{ poem.title }}</h3>
            <p class="font-body text-xs text-brown/60">
              by {{ poem.profiles?.username }}
            </p>
            <p class="mt-2 font-body text-sm italic text-ink/60">
              {{ poem.firstLine }}
            </p>
            <PoemDoodle :variant="doodleFor(index)" class="mt-3 ml-auto" />
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-4">
        <p class="text-center font-body text-xs tracking-widest text-brown/60">
          RECENTLY PUBLISHED
        </p>
        <div
          class="flex flex-col divide-y divide-brown/10 rounded-lg border border-brown/10 bg-card"
        >
          <div
            v-for="poem in recent"
            :key="poem.id"
            class="flex cursor-pointer items-center justify-between gap-4 p-4 hover:bg-brown/5"
            @click="router.push(`/poem/${poem.id}`)"
          >
            <div class="flex-1">
              <h3 class="font-heading text-base text-ink">{{ poem.title }}</h3>
              <p class="font-body text-xs text-brown/60">
                by {{ poem.profiles?.username }}
              </p>
              <p class="mt-1 font-body text-sm italic text-ink/60">
                {{ poem.firstLine }}
              </p>
            </div>
            <span class="whitespace-nowrap font-body text-xs text-brown/50"
              >{{ estimateReadTime(poem) }} min read</span
            >
          </div>
        </div>
      </div>
    </template>

    <p v-else class="font-body text-brown/60">No poems published yet.</p>
  </div>
</template>
