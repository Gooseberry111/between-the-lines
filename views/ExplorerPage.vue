<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { usePoems } from "../src/composables/usePoems";
import { CATEGORIES } from "../src/lib/poemText";
import PoemCard from "../src/components/ui/PoemCard.vue";
import Skeleton from "../src/components/ui/Skeleton.vue";
import EmptyState from "../src/components/ui/EmptyState.vue";
import Icon from "../src/components/ui/Icon.vue";

const route = useRoute();
const router = useRouter();
const { listPoems } = usePoems();

const PAGE = 24;

// Search + filter live in the URL so results can be shared and survive reloads
const query = ref(typeof route.query.q === "string" ? route.query.q : "");
const activeCategory = ref(
  typeof route.query.category === "string" ? route.query.category : null,
);
const sort = ref("newest");

const results = ref([]);
const hasMore = ref(false);
const isLoading = ref(true);
const loadingMore = ref(false);
const errorMessage = ref("");

let debounceTimer = null;
let latestRequest = 0;

function filters(offset) {
  return {
    query: query.value.trim(),
    category: activeCategory.value,
    ascending: sort.value === "oldest",
    offset,
    limit: PAGE,
  };
}

async function runSearch() {
  const requestId = ++latestRequest;
  isLoading.value = true;
  errorMessage.value = "";

  router.replace({
    query: {
      ...(query.value.trim() ? { q: query.value.trim() } : {}),
      ...(activeCategory.value ? { category: activeCategory.value } : {}),
    },
  });

  try {
    const page = await listPoems(filters(0));
    if (requestId === latestRequest) {
      results.value = page.poems;
      hasMore.value = page.hasMore;
    }
  } catch (err) {
    console.error(err);
    if (requestId === latestRequest) {
      errorMessage.value = "Search isn't responding right now.";
    }
  } finally {
    if (requestId === latestRequest) isLoading.value = false;
  }
}

async function loadMore() {
  const requestId = latestRequest;
  loadingMore.value = true;
  try {
    const page = await listPoems(filters(results.value.length));
    // Ignore if the search changed while this was loading
    if (requestId === latestRequest) {
      results.value.push(...page.poems);
      hasMore.value = page.hasMore;
    }
  } catch {
    errorMessage.value = "Couldn't load more poems.";
  } finally {
    loadingMore.value = false;
  }
}

onMounted(runSearch);

watch(query, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runSearch, 300);
});

watch(sort, runSearch);

function selectCategory(category) {
  activeCategory.value = activeCategory.value === category ? null : category;
  clearTimeout(debounceTimer);
  runSearch();
}

function clearAll() {
  activeCategory.value = null;
  query.value = "";
  clearTimeout(debounceTimer);
  runSearch();
}

const heading = computed(() => {
  if (query.value.trim() && activeCategory.value)
    return `“${query.value.trim()}” in ${activeCategory.value}`;
  if (query.value.trim()) return `Results for “${query.value.trim()}”`;
  if (activeCategory.value) return activeCategory.value;
  return "All poems";
});
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
    <header class="max-w-2xl">
      <p class="eyebrow mb-3">Explore</p>
      <h1 class="page-title">Find something to read.</h1>
      <p class="mt-4 font-serif text-lg text-muted italic">
        Search by title or a phrase you half-remember, or browse by feeling.
      </p>
    </header>

    <!-- Search -->
    <div class="relative mt-10 max-w-2xl">
      <Icon
        name="search"
        :size="18"
        class="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-faint"
      />
      <input
        v-model="query"
        type="search"
        placeholder="Search poems…"
        aria-label="Search poems"
        class="input rounded-full py-3 pr-4 pl-11 text-base"
      />
    </div>

    <!-- Categories -->
    <div class="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter by feeling">
      <button
        class="chip"
        :class="{ 'chip-active': !activeCategory }"
        @click="activeCategory && selectCategory(activeCategory)"
      >
        All
      </button>
      <button
        v-for="c in CATEGORIES"
        :key="c"
        class="chip"
        :class="{ 'chip-active': activeCategory === c }"
        :aria-pressed="activeCategory === c"
        @click="selectCategory(c)"
      >
        {{ c }}
      </button>
    </div>

    <!-- Results header -->
    <div class="mt-14 mb-2 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 class="font-serif text-3xl text-ink">{{ heading }}</h2>
        <p v-if="!isLoading" class="mt-1 text-sm text-muted">
          {{ results.length }}{{ hasMore ? "+" : "" }} poem{{ results.length === 1 && !hasMore ? "" : "s" }}
        </p>
      </div>
      <label class="flex items-center gap-2 text-sm text-muted">
        Sort
        <select v-model="sort" class="input w-auto rounded-full py-1.5 pr-8 pl-3">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </label>
    </div>

    <Skeleton v-if="isLoading" variant="grid" :rows="6" />

    <EmptyState v-else-if="errorMessage" title="Hmm." :body="errorMessage">
      <button class="btn btn-secondary" @click="runSearch">Try again</button>
    </EmptyState>

    <EmptyState
      v-else-if="!results.length"
      title="Nothing here yet."
      body="Try a different word, or clear the filters to see everything."
    >
      <button class="btn btn-secondary" @click="clearAll">Clear filters</button>
    </EmptyState>

    <TransitionGroup
      v-else
      tag="div"
      name="rise"
      appear
      class="grid grid-cols-1 gap-x-10 sm:grid-cols-2 lg:grid-cols-3"
    >
      <PoemCard
        v-for="poem in results"
        :key="poem.id"
        :poem="poem"
        :show-category="!activeCategory"
      />
    </TransitionGroup>

    <div v-if="!isLoading && hasMore" class="mt-10 flex justify-center">
      <button class="btn btn-secondary" :disabled="loadingMore" @click="loadMore">
        {{ loadingMore ? "Loading…" : "Load more" }}
      </button>
    </div>
  </div>
</template>
