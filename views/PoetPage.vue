<script setup>
import { ref, computed, onMounted } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { usePoems } from "../src/composables/usePoems";
import { useAuth } from "../src/composables/useAuth";
import { useSocial } from "../src/composables/useSocial";
import { useToast } from "../src/composables/useToast";
import { formatDate, wordCount } from "../src/lib/poemText";
import PoemCard from "../src/components/ui/PoemCard.vue";
import Skeleton from "../src/components/ui/Skeleton.vue";
import EmptyState from "../src/components/ui/EmptyState.vue";
import Icon from "../src/components/ui/Icon.vue";

const props = defineProps({
  id: { type: String, required: true },
});

const route = useRoute();
const { getProfile, getPoemsByAuthor, getTopLines } = usePoems();
const { user } = useAuth();
const { getFollowCounts, isFollowing, follow, unfollow } = useSocial();
const { toast } = useToast();

const counts = ref(null); // null = follows not set up
const following = ref(false);
const followBusy = ref(false);
const topLines = ref([]);

async function toggleFollow() {
  followBusy.value = true;
  try {
    if (following.value) {
      await unfollow(props.id);
      following.value = false;
      counts.value.followers--;
    } else {
      await follow(props.id);
      following.value = true;
      counts.value.followers++;
      toast(`Following ${name.value}`, "success");
    }
  } catch (err) {
    toast(`Couldn't update: ${err.message}`, "error");
  } finally {
    followBusy.value = false;
  }
}

const profile = ref(null);
const poems = ref([]);
const isLoading = ref(true);
const notFound = ref(false);

const isMe = computed(() => user.value?.id === props.id);
const name = computed(() => profile.value?.username ?? "Unknown poet");

const stats = computed(() => {
  const categories = {};
  let words = 0;
  for (const p of poems.value) {
    words += wordCount(p.body);
    if (p.category) categories[p.category] = (categories[p.category] ?? 0) + 1;
  }
  const topFeelings = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);
  return { words, topFeelings };
});

onMounted(async () => {
  try {
    const [p, list] = await Promise.all([getProfile(props.id), getPoemsByAuthor(props.id)]);
    profile.value = p;
    poems.value = list;
    // Secondary info loads without blocking the page
    getFollowCounts(props.id).then((c) => (counts.value = c));
    isFollowing(props.id).then((f) => (following.value = f));
    getTopLines({ authorId: props.id, limit: 3 }).then((l) => (topLines.value = l));
    document.title = `${p.username ?? "Poet"} · Between the Lines`;
  } catch (err) {
    console.error(err);
    notFound.value = true;
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="page">
    <Skeleton v-if="isLoading" variant="grid" :rows="6" />

    <EmptyState
      v-else-if="notFound"
      title="We couldn't find this poet."
      body="The account may no longer exist."
    >
      <RouterLink to="/explore" class="btn btn-secondary">Explore poems</RouterLink>
    </EmptyState>

    <template v-else>
      <header class="flex flex-col items-start gap-6 border-b border-ink pb-10 sm:flex-row sm:items-end sm:justify-between">
        <div class="flex items-center gap-5">
          <div
            class="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-accent-soft font-serif text-4xl text-accent"
            aria-hidden="true"
          >
            {{ name.charAt(0).toUpperCase() }}
          </div>
          <div>
            <p class="eyebrow mb-2">Poet</p>
            <h1 class="page-title">{{ name }}</h1>
            <p v-if="profile.created_at" class="mt-2 text-sm text-muted">
              Writing here since {{ formatDate(profile.created_at, { month: "long", year: "numeric" }) }}
            </p>
          </div>
        </div>

        <RouterLink v-if="isMe" to="/profile" class="btn btn-secondary">
          <Icon name="pen" :size="15" /> Edit profile
        </RouterLink>
        <button
          v-else-if="user && counts"
          class="btn"
          :class="following ? 'btn-secondary' : 'btn-primary'"
          :disabled="followBusy"
          :aria-pressed="following"
          @click="toggleFollow"
        >
          <Icon :name="following ? 'check' : 'user-plus'" :size="15" />
          {{ following ? "Following" : "Follow" }}
        </button>
        <RouterLink
          v-else-if="!user && counts"
          :to="{ name: 'auth', query: { redirect: route.fullPath } }"
          class="btn btn-primary"
        >
          <Icon name="user-plus" :size="15" /> Follow
        </RouterLink>
      </header>

      <p v-if="profile.bio" class="max-w-2xl border-b border-rule py-6 font-serif text-xl leading-relaxed text-ink/85 italic">
        {{ profile.bio }}
      </p>

      <dl class="grid grid-cols-2 gap-6 border-b border-rule py-6 sm:grid-cols-4">
        <div>
          <dt class="eyebrow">Poems</dt>
          <dd class="mt-1 font-serif text-3xl text-ink tabular-nums">{{ poems.length }}</dd>
        </div>
        <div v-if="counts">
          <dt class="eyebrow">Followers</dt>
          <dd class="mt-1 font-serif text-3xl text-ink tabular-nums">{{ counts.followers }}</dd>
        </div>
        <div>
          <dt class="eyebrow">Words</dt>
          <dd class="mt-1 font-serif text-3xl text-ink tabular-nums">{{ stats.words.toLocaleString() }}</dd>
        </div>
        <div v-if="stats.topFeelings.length" class="col-span-2 sm:col-span-1">
          <dt class="eyebrow">Often writes about</dt>
          <dd class="mt-2 flex flex-wrap gap-1.5">
            <RouterLink
              v-for="c in stats.topFeelings"
              :key="c"
              :to="{ path: '/explore', query: { category: c } }"
              class="chip"
            >
              {{ c }}
            </RouterLink>
          </dd>
        </div>
      </dl>

      <section v-if="topLines.length" class="border-b border-rule py-8" aria-labelledby="poet-loved">
        <h2 id="poet-loved" class="eyebrow mb-5">Their most-loved lines</h2>
        <div class="grid gap-6 sm:grid-cols-3">
          <RouterLink v-for="l in topLines" :key="l.line_id" :to="`/poem/${l.poem_id}`" class="group">
            <p class="font-serif text-lg leading-snug text-ink group-hover:text-ink/75">“{{ l.content }}”</p>
            <p class="mt-2 flex items-center gap-1.5 text-xs text-muted">
              <Icon name="heart" :size="12" :filled="true" class="text-accent" /> {{ l.hearts }} · {{ l.poem_title }}
            </p>
          </RouterLink>
        </div>
      </section>

      <EmptyState
        v-if="!poems.length"
        :title="isMe ? 'You haven\'t published anything yet.' : 'No published poems yet.'"
        :body="isMe ? 'Your drafts stay private. Publish one and it will appear here.' : 'Check back soon.'"
      >
        <RouterLink v-if="isMe" to="/my-poems" class="btn btn-primary">Go to your drafts</RouterLink>
      </EmptyState>

      <div v-else class="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
        <PoemCard v-for="poem in poems" :key="poem.id" :poem="poem" :show-author="false" />
      </div>
    </template>
  </div>
</template>
