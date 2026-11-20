<script setup>
import { ref, computed, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { usePoems } from "../composables/usePoems";
import { useSocial } from "../composables/useSocial";
import { useAuth } from "../composables/useAuth";
import { CATEGORIES, excerptLines } from "../lib/poemText";
import PoemCard from "./ui/PoemCard.vue";
import Skeleton from "./ui/Skeleton.vue";
import EmptyState from "./ui/EmptyState.vue";
import Icon from "./ui/Icon.vue";

const { listPoems, getPoemOfTheDay, getTopLines } = usePoems();
const { getFollowingIds } = useSocial();
const { user } = useAuth();

const PAGE = 9;

const poemOfTheDay = ref(null);
const recent = ref([]); // newest poems, minus the poem of the day
const more = ref([]);
const hasMore = ref(false);
const nextOffset = ref(0);
const loadingMore = ref(false);
const topLines = ref([]);
const following = ref([]);

const isLoading = ref(true);
const errorMessage = ref("");

const latest = computed(() => recent.value.slice(0, 5));

onMounted(async () => {
  try {
    const [potd, page] = await Promise.all([
      getPoemOfTheDay(),
      listPoems({ limit: 6 + PAGE }),
    ]);
    poemOfTheDay.value = potd;
    const others = page.poems.filter((p) => p.id !== potd?.id);
    recent.value = others.slice(0, 5);
    more.value = others.slice(5, 5 + PAGE);
    hasMore.value = page.hasMore;
    nextOffset.value = 6 + PAGE;
  } catch (err) {
    console.error(err);
    errorMessage.value = "We couldn't load poems just now. Please try again.";
  } finally {
    isLoading.value = false;
  }

  // Secondary sections load after the main content
  getTopLines({ limit: 6 }).then((lines) => (topLines.value = lines));
  if (user.value) loadFollowing();
});

async function loadFollowing() {
  const ids = await getFollowingIds();
  if (!ids.length) return;
  try {
    const { poems } = await listPoems({ authorIds: ids, limit: 3 });
    following.value = poems;
  } catch {
    following.value = [];
  }
}

async function loadMore() {
  loadingMore.value = true;
  try {
    const page = await listPoems({ offset: nextOffset.value, limit: PAGE });
    const seen = new Set([poemOfTheDay.value?.id, ...recent.value.map((p) => p.id), ...more.value.map((p) => p.id)]);
    more.value.push(...page.poems.filter((p) => !seen.has(p.id)));
    hasMore.value = page.hasMore;
    nextOffset.value += PAGE;
  } finally {
    loadingMore.value = false;
  }
}

const dateLine = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const potdLines = computed(() =>
  poemOfTheDay.value ? excerptLines(poemOfTheDay.value.body, 6) : [],
);
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
    <!-- Masthead line -->
    <div class="mb-10 flex items-baseline justify-between border-b border-ink pb-3">
      <p class="eyebrow text-ink">{{ dateLine }}</p>
      <RouterLink to="/explore" class="-my-2 py-2 text-xs text-muted hover:text-ink">
        Browse all poems →
      </RouterLink>
    </div>

    <Skeleton v-if="isLoading" variant="grid" :rows="6" />

    <EmptyState v-else-if="errorMessage" title="Something went quiet." :body="errorMessage" />

    <EmptyState
      v-else-if="!poemOfTheDay"
      title="The page is still blank."
      body="No poems have been published yet. Yours could be the first."
    >
      <RouterLink to="/write" class="btn btn-primary">
        <Icon name="pen" :size="15" /> Write the first poem
      </RouterLink>
    </EmptyState>

    <template v-else>
      <div class="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <!-- Poem of the day -->
        <section class="lg:col-span-7" aria-labelledby="potd-title">
          <p class="eyebrow mb-5 text-accent">Poem of the day</p>
          <h1
            id="potd-title"
            class="font-serif text-5xl leading-[1.05] tracking-tight text-balance text-ink sm:text-6xl"
          >
            <RouterLink :to="`/poem/${poemOfTheDay.id}`" class="hover:text-ink/80">
              {{ poemOfTheDay.title }}
            </RouterLink>
          </h1>
          <p class="mt-4 text-sm text-muted">
            by
            <RouterLink
              :to="`/poet/${poemOfTheDay.author_id}`"
              class="font-medium text-ink hover:text-accent"
            >
              {{ poemOfTheDay.profiles?.username ?? "Anonymous" }}
            </RouterLink>
            <span class="mx-1.5">·</span>{{ poemOfTheDay.readMinutes }} min read
            <template v-if="poemOfTheDay.category">
              <span class="mx-1.5">·</span>{{ poemOfTheDay.category }}
            </template>
          </p>

          <div
            class="mt-8 border-l-2 border-accent/60 pl-6 font-serif text-xl leading-9 text-ink/85 sm:text-[22px]"
          >
            <p v-for="(line, i) in potdLines" :key="i">{{ line }}</p>
          </div>

          <RouterLink :to="`/poem/${poemOfTheDay.id}`" class="btn btn-secondary mt-8">
            Read the full poem <Icon name="arrow-right" :size="15" />
          </RouterLink>
        </section>

        <!-- Latest -->
        <aside class="lg:col-span-5" aria-labelledby="latest-title">
          <h2 id="latest-title" class="eyebrow mb-1">Latest</h2>
          <ol>
            <li
              v-for="(poem, i) in latest"
              :key="poem.id"
              class="group relative flex gap-5 border-b border-rule py-5"
            >
              <span class="w-6 pt-1 font-serif text-sm text-faint tabular-nums">
                {{ String(i + 1).padStart(2, "0") }}
              </span>
              <div class="min-w-0 flex-1">
                <RouterLink
                  :to="`/poem/${poem.id}`"
                  class="font-serif text-xl leading-snug text-ink after:absolute after:inset-0 group-hover:underline group-hover:decoration-rule group-hover:underline-offset-4"
                >
                  {{ poem.title }}
                </RouterLink>
                <p class="mt-1 truncate font-serif text-[15px] text-muted italic">
                  {{ poem.preview }}
                </p>
                <p class="mt-1.5 text-xs text-faint">
                  {{ poem.profiles?.username ?? "Anonymous" }} · {{ poem.readMinutes }} min
                </p>
              </div>
            </li>
          </ol>
          <p v-if="!latest.length" class="py-5 text-sm text-muted italic">
            More poems will appear here as they're published.
          </p>
        </aside>
      </div>

      <!-- Most-loved lines -->
      <section v-if="topLines.length" class="mt-20" aria-labelledby="loved-title">
        <h2 id="loved-title" class="eyebrow mb-6">Most-loved lines</h2>
        <div class="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          <RouterLink
            v-for="line in topLines"
            :key="line.line_id"
            :to="`/poem/${line.poem_id}`"
            class="group flex flex-col border-t border-rule pt-5"
          >
            <Icon name="quote" :size="18" class="text-accent/50" />
            <p class="mt-3 font-serif text-xl leading-snug text-ink group-hover:text-ink/80">
              {{ line.content }}
            </p>
            <p class="mt-3 flex items-center gap-2 text-xs text-muted">
              <span class="inline-flex items-center gap-1 text-accent">
                <Icon name="heart" :size="12" :filled="true" /> {{ line.hearts }}
              </span>
              <span>·</span>
              <span class="truncate">{{ line.poem_title }} — {{ line.username ?? "Anonymous" }}</span>
            </p>
          </RouterLink>
        </div>
      </section>

      <!-- From poets you follow -->
      <section v-if="following.length" class="mt-20" aria-labelledby="following-title">
        <h2 id="following-title" class="font-serif text-3xl text-ink">From poets you follow</h2>
        <div class="mt-2 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
          <PoemCard v-for="poem in following" :key="poem.id" :poem="poem" />
        </div>
      </section>

      <!-- Browse by feeling -->
      <section class="mt-20" aria-labelledby="feelings-title">
        <h2 id="feelings-title" class="eyebrow mb-4">Read by feeling</h2>
        <div class="flex flex-wrap gap-2">
          <RouterLink
            v-for="c in CATEGORIES"
            :key="c"
            :to="{ path: '/explore', query: { category: c } }"
            class="chip sm:px-4 sm:py-1.5 sm:text-sm"
          >
            {{ c }}
          </RouterLink>
        </div>
      </section>

      <!-- More poems -->
      <section v-if="more.length" class="mt-20" aria-labelledby="more-title">
        <div class="mb-2 flex items-baseline justify-between">
          <h2 id="more-title" class="font-serif text-3xl text-ink">More to read</h2>
          <RouterLink to="/explore" class="text-sm text-muted hover:text-ink">See all →</RouterLink>
        </div>
        <div class="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
          <PoemCard v-for="poem in more" :key="poem.id" :poem="poem" />
        </div>
        <div v-if="hasMore" class="mt-8 flex justify-center">
          <button class="btn btn-secondary" :disabled="loadingMore" @click="loadMore">
            {{ loadingMore ? "Loading…" : "Load more poems" }}
          </button>
        </div>
      </section>
    </template>
  </div>
</template>
