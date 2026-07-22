<script setup>
import { useRouter } from "vue-router";
const router = useRouter();
</script>

<template>
  <section
    class="flex min-h-[calc(100vh-73px)] flex-col items-center justify-center gap-8 px-8 text-center"
  >
    <p class="font-script text-4xl text-brown">
      Every poem leaves a footprint on a soul.
    </p>

    <div class="flex gap-4">
      <button
        @click="router.push('/')"
        class="rounded-lg border border-gold bg-card px-6 py-2.5 font-body text-sm text-ink transition-colors hover:bg-gold/10"
      >
        Read poems
      </button>
      <button
        @click="router.push('/write')"
        class="rounded-lg bg-brown px-6 py-2.5 font-body text-sm text-card transition-colors hover:bg-brown/90"
      >
        Write a poem
      </button>
    </div>
  </section>
</template>
