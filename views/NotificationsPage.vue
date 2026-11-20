<script setup>
import { ref, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { useSocial } from "../src/composables/useSocial";
import Icon from "../src/components/ui/Icon.vue";
import Skeleton from "../src/components/ui/Skeleton.vue";
import EmptyState from "../src/components/ui/EmptyState.vue";

const { getNotifications, markAllRead, socialAvailable } = useSocial();

const items = ref([]);
const isLoading = ref(true);
const failed = ref(false);

onMounted(async () => {
  try {
    items.value = await getNotifications();
    // Opening the page counts as reading them; keep the "new" dots this visit
    markAllRead();
  } catch {
    failed.value = true;
  } finally {
    isLoading.value = false;
  }
});

const ICON = { heart: "heart", follow: "user-plus", comment: "message" };

function link(n) {
  if (n.type === "follow") return `/poet/${n.actor?.id}`;
  return `/poem/${n.poem_id}`;
}

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
</script>

<template>
  <div class="page-narrow">
    <header>
      <p class="eyebrow mb-3">Activity</p>
      <h1 class="page-title">Notifications</h1>
    </header>

    <div class="mt-10">
      <Skeleton v-if="isLoading" :rows="5" />

      <EmptyState
        v-else-if="failed && !socialAvailable"
        title="Notifications aren't set up yet."
        body="Run supabase/sql/04_social.sql in the Supabase SQL editor to turn them on."
      />

      <EmptyState v-else-if="failed" title="Something went wrong." body="We couldn't load your notifications." />

      <EmptyState
        v-else-if="!items.length"
        title="All quiet."
        body="When someone hearts a line, leaves a note or follows you, it'll show up here."
      />

      <ul v-else>
        <li v-for="n in items" :key="n.id">
          <RouterLink
            :to="link(n)"
            class="flex gap-4 border-t border-rule py-5 transition-colors hover:bg-ink/[0.02]"
          >
            <span
              class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              :class="n.type === 'heart' ? 'bg-accent-soft text-accent' : 'bg-ink/5 text-muted'"
            >
              <Icon :name="ICON[n.type]" :size="16" :filled="n.type === 'heart'" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-[15px] text-ink">
                <span class="font-medium">{{ n.actor?.username ?? "Someone" }}</span>
                <template v-if="n.type === 'heart'"> hearted a line in <em class="font-serif">{{ n.poems?.title }}</em></template>
                <template v-else-if="n.type === 'comment'"> left a note on <em class="font-serif">{{ n.poems?.title }}</em></template>
                <template v-else> started following you</template>
              </p>
              <p
                v-if="n.poem_lines?.content"
                class="mt-1.5 truncate border-l-2 border-accent/40 pl-3 font-serif text-muted italic"
              >
                {{ n.poem_lines.content }}
              </p>
              <p class="mt-1.5 text-xs text-faint">{{ timeAgo(n.created_at) }}</p>
            </div>
            <span v-if="!n.read_at" class="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="New" />
          </RouterLink>
        </li>
      </ul>
    </div>
  </div>
</template>
