<script setup>
import { ref, computed, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { usePoems } from "../composables/usePoems";
import { useAuth } from "../composables/useAuth";
import { useToast } from "../composables/useToast";
import { formatDate } from "../lib/poemText";
import Icon from "./ui/Icon.vue";
import Skeleton from "./ui/Skeleton.vue";
import EmptyState from "./ui/EmptyState.vue";

const { getMyPoems, updatePoemStatus, deletePoem } = usePoems();
const { user } = useAuth();
const { toast } = useToast();

const poems = ref([]);
const isLoading = ref(true);
const errorMessage = ref("");
const busyId = ref(null);
const filter = ref("all");

async function loadPoems() {
  isLoading.value = true;
  try {
    poems.value = await getMyPoems();
  } catch {
    errorMessage.value = "We couldn't load your poems.";
  } finally {
    isLoading.value = false;
  }
}
onMounted(loadPoems);

const counts = computed(() => ({
  all: poems.value.length,
  published: poems.value.filter((p) => p.status === "published").length,
  draft: poems.value.filter((p) => p.status !== "published").length,
}));

const visible = computed(() =>
  filter.value === "all"
    ? poems.value
    : poems.value.filter((p) =>
        filter.value === "published" ? p.status === "published" : p.status !== "published",
      ),
);

const tabs = [
  { key: "all", label: "All" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Drafts" },
];

async function handleToggleStatus(poem) {
  const newStatus = poem.status === "published" ? "draft" : "published";
  busyId.value = poem.id;
  try {
    await updatePoemStatus(poem.id, newStatus);
    poem.status = newStatus;
    toast(newStatus === "published" ? "Published" : "Moved back to drafts", "success");
  } catch (err) {
    toast(`Couldn't update: ${err.message}`, "error");
  } finally {
    busyId.value = null;
  }
}

async function handleDelete(poem) {
  if (!confirm(`Delete “${poem.title}”? This can't be undone.`)) return;
  busyId.value = poem.id;
  try {
    await deletePoem(poem.id);
    poems.value = poems.value.filter((p) => p.id !== poem.id);
    toast("Poem deleted", "success");
  } catch (err) {
    toast(`Couldn't delete: ${err.message}`, "error");
  } finally {
    busyId.value = null;
  }
}
</script>

<template>
  <div class="page">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow mb-3">Your desk</p>
        <h1 class="page-title">Poems & drafts</h1>
      </div>
      <div class="flex gap-2">
        <RouterLink v-if="user" :to="`/poet/${user.id}`" class="btn btn-secondary">
          View public page
        </RouterLink>
        <RouterLink to="/write" class="btn btn-primary">
          <Icon name="plus" :size="15" /> New poem
        </RouterLink>
      </div>
    </header>

    <div class="mt-10 flex gap-6 border-b border-rule" role="tablist">
      <button
        v-for="t in tabs"
        :key="t.key"
        role="tab"
        :aria-selected="filter === t.key"
        class="-mb-px border-b-2 pb-3 text-sm transition-colors"
        :class="filter === t.key ? 'border-ink font-medium text-ink' : 'border-transparent text-muted hover:text-ink'"
        @click="filter = t.key"
      >
        {{ t.label }}
        <span class="ml-1 text-xs text-faint tabular-nums">{{ counts[t.key] }}</span>
      </button>
    </div>

    <Skeleton v-if="isLoading" :rows="4" class="mt-2" />

    <EmptyState v-else-if="errorMessage" title="Something went wrong." :body="errorMessage">
      <button class="btn btn-secondary" @click="loadPoems">Try again</button>
    </EmptyState>

    <EmptyState
      v-else-if="!poems.length"
      title="Your desk is clear."
      body="Every poem starts with a single line. Write yours — drafts stay private until you publish."
    >
      <RouterLink to="/write" class="btn btn-primary"><Icon name="pen" :size="15" /> Start writing</RouterLink>
    </EmptyState>

    <p v-else-if="!visible.length" class="py-12 text-center font-serif text-lg text-muted italic">
      No {{ filter === "draft" ? "drafts" : "published poems" }} yet.
    </p>

    <ul v-else>
      <li
        v-for="poem in visible"
        :key="poem.id"
        class="flex flex-col gap-4 border-b border-rule py-6 sm:flex-row sm:items-center"
        :class="{ 'opacity-60': busyId === poem.id }"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-3">
            <RouterLink
              :to="poem.status === 'published' ? `/poem/${poem.id}` : `/edit/${poem.id}`"
              class="truncate font-serif text-2xl text-ink hover:underline hover:decoration-rule hover:underline-offset-4"
            >
              {{ poem.title }}
            </RouterLink>
            <span
              class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
              :class="poem.status === 'published' ? 'bg-accent-soft text-accent' : 'bg-ink/5 text-muted'"
            >
              {{ poem.status === "published" ? "Published" : "Draft" }}
            </span>
          </div>
          <p class="mt-1 truncate font-serif text-muted italic">{{ poem.preview || "—" }}</p>
          <p class="mt-1.5 text-xs text-faint">
            {{ formatDate(poem.updated_at || poem.created_at) }}
            <template v-if="poem.category"> · {{ poem.category }}</template>
            · {{ poem.readMinutes }} min read
          </p>
        </div>

        <div class="flex items-center gap-1 sm:ml-4">
          <RouterLink :to="`/edit/${poem.id}`" class="btn btn-ghost py-1.5">
            <Icon name="pen" :size="15" /> Edit
          </RouterLink>
          <button
            class="btn btn-ghost py-1.5"
            :disabled="busyId === poem.id"
            @click="handleToggleStatus(poem)"
          >
            <Icon :name="poem.status === 'published' ? 'eye-off' : 'eye'" :size="15" />
            {{ poem.status === "published" ? "Unpublish" : "Publish" }}
          </button>
          <button
            class="icon-btn hover:text-accent"
            :disabled="busyId === poem.id"
            aria-label="Delete poem"
            title="Delete"
            @click="handleDelete(poem)"
          >
            <Icon name="trash" :size="16" />
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
