<script setup>
import { useToast } from "../../composables/useToast";
import Icon from "./Icon.vue";

const { toasts, dismiss } = useToast();
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4"
    aria-live="polite"
  >
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex max-w-sm items-center gap-3 rounded-full bg-ink py-2.5 pr-2.5 pl-4 text-sm text-paper shadow-lg shadow-black/10"
      >
        <Icon
          v-if="t.type === 'success'"
          name="check"
          :size="16"
          class="text-paper/70"
        />
        <span
          v-else-if="t.type === 'error'"
          class="h-1.5 w-1.5 rounded-full bg-accent"
        />
        <span>{{ t.message }}</span>
        <button
          class="rounded-full p-1 text-paper/50 transition hover:text-paper"
          aria-label="Dismiss"
          @click="dismiss(t.id)"
        >
          <Icon name="x" :size="14" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
