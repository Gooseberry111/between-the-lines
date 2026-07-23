<script setup>
defineProps({
  variant: { type: String, required: true }, // 'leaf' | 'feather' | 'wave'
});
</script>

<template>
  <svg viewBox="0 0 60 60" class="h-10 w-10 text-brown/25">
    <g
      v-if="variant === 'leaf'"
      fill="none"
      stroke="currentColor"
      stroke-width="1.3"
    >
      <path d="M30 5 Q45 20 40 40 Q35 55 20 50 Q10 45 15 30 Q20 12 30 5Z" />
      <path d="M30 5 L28 48" />
      <path d="M28 20 Q20 22 16 18" />
      <path d="M28 32 Q38 34 40 30" />
    </g>
    <g
      v-else-if="variant === 'feather'"
      fill="none"
      stroke="currentColor"
      stroke-width="1.3"
    >
      <path d="M30 5 Q35 25 30 55" />
      <path d="M30 10 Q20 15 15 12" />
      <path d="M30 18 Q42 22 46 18" />
      <path d="M30 26 Q18 30 14 27" />
      <path d="M30 34 Q40 38 44 35" />
    </g>
    <g v-else fill="none" stroke="currentColor" stroke-width="1.3">
      <path d="M5 35 Q15 25 25 35 Q35 45 45 35 Q52 28 55 32" />
      <path d="M5 42 Q15 34 25 42 Q35 50 45 42 Q52 36 55 39" />
    </g>
  </svg>
</template>
