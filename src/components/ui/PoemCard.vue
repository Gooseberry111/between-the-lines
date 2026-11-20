<script setup>
// Editorial poem preview: hairline rule on top, serif title, opening lines,
// then quiet metadata. Lay several out in a grid or a column.
import { RouterLink } from "vue-router";
import { formatDate } from "../../lib/poemText";

defineProps({
  poem: { type: Object, required: true },
  showAuthor: { type: Boolean, default: true },
  showCategory: { type: Boolean, default: true },
  lines: { type: Number, default: 3 },
});
</script>

<template>
  <article class="group relative flex flex-col border-t border-rule py-6">
    <p
      v-if="showCategory && poem.category"
      class="eyebrow mb-3 text-accent"
    >
      {{ poem.category }}
    </p>

    <h3 class="font-serif text-2xl leading-tight text-ink">
      <RouterLink
        :to="`/poem/${poem.id}`"
        class="after:absolute after:inset-0 group-hover:underline group-hover:decoration-rule group-hover:underline-offset-4"
      >
        {{ poem.title }}
      </RouterLink>
    </h3>

    <div
      v-if="poem.excerpt?.length"
      class="mt-3 font-serif text-[17px] leading-relaxed text-ink/70 italic"
    >
      <p v-for="(line, i) in poem.excerpt.slice(0, lines)" :key="i" class="truncate">
        {{ line }}
      </p>
    </div>

    <p class="mt-4 flex flex-wrap items-center gap-x-2 text-xs text-muted">
      <template v-if="showAuthor">
        <RouterLink
          :to="`/poet/${poem.author_id}`"
          class="relative z-10 font-medium text-ink/80 hover:text-accent"
        >
          {{ poem.profiles?.username ?? "Anonymous" }}
        </RouterLink>
        <span aria-hidden="true">·</span>
      </template>
      <span>{{ poem.readMinutes }} min read</span>
      <span aria-hidden="true">·</span>
      <span>{{ formatDate(poem.created_at) }}</span>
    </p>

    <div class="relative z-10 empty:hidden">
      <slot name="actions" />
    </div>
  </article>
</template>
