<script setup>
import { ref, onMounted, watch } from "vue";
// import { Search } from "lucide-vue-next";
import { usePoems } from "../src/composables/usePoems";

const { searchPoems, getCategories, getAllPoems, getPoemsByCategory } =
  usePoems();

const query = ref("");
const results = ref([]);
const categories = ref([]);
const activeCategory = ref(null);
const isLoading = ref(false);

let debounceTimer = null;

onMounted(async () => {
  isLoading.value = true;

  try {
    // Load categories
    categories.value = await getCategories();

    // Load all published poems
    results.value = await getAllPoems();
  } catch (err) {
    console.error(err);
  } finally {
    isLoading.value = false;
  }
});

async function runSearch() {
  isLoading.value = true;

  try {
    // Searching
    if (query.value.trim()) {
      activeCategory.value = null;
      results.value = await searchPoems(query.value.trim());
      return;
    }

    // Category selected
    if (activeCategory.value) {
      results.value = await getPoemsByCategory(activeCategory.value);
      return;
    }

    // Default
    results.value = await getAllPoems();
  } catch (err) {
    console.error(err);
  } finally {
    isLoading.value = false;
  }
}

watch(query, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runSearch, 300);
});

async function selectCategory(category) {
  query.value = "";

  if (activeCategory.value === category) {
    activeCategory.value = null;
    results.value = await getAllPoems();
    return;
  }

  activeCategory.value = category;
  await runSearch();
}

const categoryColors = {
  Love: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",

  Lust: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-200",

  Heartbreak:
    "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",

  Loss: "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-200",

  Joy: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",

  Hope: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",

  Nature:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200",

  Melancholy:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200",

  Identity:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200",
};

function categoryStyle(category) {
  return (
    categoryColors[category] ?? "bg-white/80 text-brown border border-brown/20"
  );
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-10">
    <!-- Hero -->
    <section
      class="rounded-2xl border border-brown/20 bg-card p-8 shadow-lg transition-colors duration-300"
    >
      <div class="max-w-lg">
        <h1 class="font-heading text-5xl text-ink">Explore Poetry</h1>

        <p class="mt-4 font-body text-lg leading-relaxed text-ink/75">
          Wander through verses written by poets around the world. Search by
          title, discover emotions through categories, and find words that stay
          with you.
        </p>
      </div>

      <!-- Search -->
      <div class="relative mt-8">
        <Search
          class="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-brown/40"
        />

        <input
          v-model="query"
          type="text"
          placeholder="Search poems..."
          class="w-full rounded-2xl border border-brown/20 bg-card py-4 pl-14 pr-6 font-body text-ink placeholder:text-brown/50 shadow-sm transition-colors duration-300 focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/20"
        />
      </div>

      <!-- Categories -->
      <div v-if="categories.length" class="mt-8 flex flex-wrap gap-3">
        <button
          v-for="category in categories"
          :key="category"
          @click="selectCategory(category)"
          class="rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          :class="[
            categoryStyle(category),
            activeCategory === category ? 'ring-2 ring-brown shadow' : '',
          ]"
        >
          {{ category }}
        </button>
      </div>
    </section>

    <!-- Loading -->
    <div v-if="isLoading" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="n in 6"
        :key="n"
        class="h-56 animate-pulse rounded-3xl bg-card"
      />
    </div>

    <!-- Results -->
    <template v-else>
      <!-- Heading -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-heading text-3xl text-ink">
            {{ query || activeCategory ? "Search Results" : "Featured Poems" }}
          </h2>

          <p class="mt-1 font-body text-ink/60">
            {{ results.length }} poem<span v-if="results.length !== 1">s</span>
          </p>
        </div>
      </div>

      <!-- Grid -->
      <div
        v-if="results.length"
        class="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
      >
        <RouterLink
          v-for="poem in results"
          :key="poem.id"
          :to="`/poem/${poem.id}`"
          class="group flex h-full flex-col rounded-3xl border border-brown/20 bg-card p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-brown hover:shadow-xl"
        >
          <!-- Category -->
          <div v-if="poem.category" class="mb-5">
            <span
              class="rounded-full border border-brown/20 bg-brown/10 px-3 py-1 text-xs font-medium text-brown transition-colors"
            >
              {{ poem.category }}
            </span>
          </div>

          <!-- Title -->
          <h3
            class="font-heading text-2xl leading-tight text-ink transition group-hover:text-brown"
          >
            {{ poem.title }}
          </h3>

          <!-- Preview -->
          <p class="mt-4 line-clamp-4 flex-1 font-body leading-7 text-ink/75">
            {{ poem.preview || "No preview available." }}
          </p>

          <!-- Footer -->
          <div
            class="mt-8 flex items-center justify-between border-t border-brown/20 pt-5"
          >
            <div>
              <p class="font-body text-sm font-semibold text-ink">
                {{ poem.profiles?.username ?? "Anonymous" }}
              </p>

              <p class="font-body text-xs text-ink/50">
                {{ new Date(poem.created_at).toLocaleDateString() }}
              </p>
            </div>

            <div
              class="rounded-full bg-brown/10 px-3 py-2 text-brown transition-all duration-300 group-hover:bg-brown group-hover:text-card"
            >
              →
            </div>
          </div>
        </RouterLink>
      </div>

      <!-- Empty -->
      <div
        v-else
        class="rounded-3xl border border-dashed border-brown/30 bg-card py-20 text-center shadow-sm"
      >
        <h3 class="font-heading text-3xl text-ink">No poems found</h3>

        <p class="mt-4 font-body text-brown/60">
          Try another search or explore a different category.
        </p>
      </div>
    </template>
  </div>
</template>
