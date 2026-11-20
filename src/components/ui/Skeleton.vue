<script setup>
// Quiet placeholder blocks shown while content loads.
defineProps({
  rows: { type: Number, default: 3 },
  variant: { type: String, default: "list" }, // "list" | "poem" | "grid"
});
</script>

<template>
  <div class="animate-pulse" aria-busy="true" aria-label="Loading">
    <div v-if="variant === 'poem'" class="mx-auto flex max-w-xl flex-col gap-4">
      <div class="mx-auto h-3 w-20 rounded bg-ink/8" />
      <div class="mx-auto h-9 w-2/3 rounded bg-ink/8" />
      <div class="mx-auto mb-8 h-3 w-40 rounded bg-ink/6" />
      <div
        v-for="n in 8"
        :key="n"
        class="h-4 rounded bg-ink/6"
        :style="{ width: `${55 + ((n * 37) % 40)}%` }"
      />
    </div>

    <div v-else-if="variant === 'grid'" class="grid gap-x-10 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="n in rows" :key="n" class="flex flex-col gap-3 border-t border-rule py-6">
        <div class="h-6 w-3/4 rounded bg-ink/8" />
        <div class="h-3.5 w-full rounded bg-ink/6" />
        <div class="h-3.5 w-5/6 rounded bg-ink/6" />
        <div class="mt-2 h-3 w-1/3 rounded bg-ink/6" />
      </div>
    </div>

    <div v-else class="flex flex-col">
      <div v-for="n in rows" :key="n" class="flex flex-col gap-2.5 border-t border-rule py-5">
        <div class="h-5 w-1/2 rounded bg-ink/8" />
        <div class="h-3.5 w-3/4 rounded bg-ink/6" />
      </div>
    </div>
  </div>
</template>
