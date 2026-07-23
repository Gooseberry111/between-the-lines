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
  <div class="w-full flex flex-col gap-10 px-3 py-6 md:px-8 md:gap-14 md:py-10">
    <p v-if="isLoading" class="text-center font-body text-brown/60">
      Loading...
    </p>

    <template v-else-if="poems.length > 0">
      <div class="grid grid-cols-1 gap-10 md:grid-cols-[1fr_2px_2fr] md:gap-8">
        <!-- Poem of the Day -->
        <div class="flex flex-col items-center gap-3 text-center">
          <p class="font-body text-xs tracking-widest text-brown/60">
            POEM OF THE DAY
          </p>

          <h1
            class="font-heading text-2xl font-medium text-ink sm:text-3xl md:text-4xl"
          >
            "{{ poemOfTheDay.title }}"
          </h1>

          <p class="max-w-md font-body italic leading-relaxed text-ink/70">
            {{ poemOfTheDay.firstLine }}
          </p>

          <p class="font-script text-lg text-brown">
            — {{ poemOfTheDay.profiles?.username }}
          </p>

          <button
            class="mt-2 font-body text-sm text-brown underline hover:text-ink"
            @click="router.push(`/poem/${poemOfTheDay.id}`)"
          >
            Read full poem →
          </button>
        </div>

        <div class="hidden bg-brown/15 md:block"></div>

        <!-- Featured Poems -->
        <div class="flex flex-col gap-4">
          <p
            class="text-center font-body text-xs tracking-widest text-brown/60"
          >
            FEATURED POEMS
          </p>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="(poem, index) in featured"
              :key="poem.id"
              class="flex cursor-pointer flex-col justify-between rounded-lg border border-brown/10 bg-card p-5 text-center transition hover:shadow-md"
              @click="router.push(`/poem/${poem.id}`)"
            >
              <div>
                <h3 class="font-heading text-lg text-ink">
                  {{ poem.title }}
                </h3>

                <p class="font-body text-xs text-brown/60">
                  by {{ poem.profiles?.username }}
                </p>

                <p
                  class="mt-3 line-clamp-3 font-body text-sm italic leading-relaxed text-ink/60"
                >
                  {{ poem.firstLine }}
                </p>
              </div>

              <div class="mt-4 flex items-center justify-between">
                <span class="font-body text-xs text-brown underline">
                  Read More →
                </span>

                <PoemDoodle :variant="doodleFor(index)" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Poems -->
      <div class="flex flex-col gap-4">
        <p class="text-center font-body text-xs tracking-widest text-brown/60">
          RECENTLY PUBLISHED
        </p>

        <div
          class="flex flex-col divide-y divide-brown/10 rounded-lg border border-brown/10 bg-card"
        >
          <div
            v-for="(poem, index) in recent"
            :key="poem.id"
            class="flex flex-col gap-3 p-4 hover:bg-brown/5 sm:flex-row sm:items-center"
            @click="router.push(`/poem/${poem.id}`)"
          >
            <div class="flex items-center gap-3">
              <PoemDoodle :variant="doodleFor(index)" class="shrink-0" />

              <div class="flex-1">
                <h3 class="font-heading text-base text-ink">
                  {{ poem.title }}
                </h3>

                <p class="font-body text-xs text-brown/60">
                  by {{ poem.profiles?.username }}
                </p>

                <p
                  class="mt-1 line-clamp-2 font-body text-sm italic text-ink/60"
                >
                  {{ poem.firstLine }}
                </p>
              </div>
            </div>

            <div
              class="flex items-center justify-between sm:ml-auto sm:flex-col sm:items-end"
            >
              <span class="whitespace-nowrap font-body text-xs text-brown/50">
                {{ estimateReadTime(poem) }} min read
              </span>

              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                class="h-4 w-4 text-brown/50 hover:text-brown"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 3h12a1 1 0 0 1 1 1v16l-7-4-7 4V4a1 1 0 0 1 1-1Z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </template>

    <p v-else class="text-center font-body text-brown/60">
      No poems published yet.
    </p>
  </div>
</template>
