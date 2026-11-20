<script setup>
defineProps({
  title: { type: String, required: true },
  body: { type: String, default: "" },
});
</script>

<template>
  <div class="flex flex-col items-center border-t border-rule px-6 py-16 text-center">
    <p class="font-serif text-2xl text-ink italic">{{ title }}</p>
    <p v-if="body" class="mt-2 max-w-sm text-sm leading-relaxed text-muted">
      {{ body }}
    </p>
    <div class="mt-6 empty:hidden">
      <slot />
    </div>
  </div>
</template>
