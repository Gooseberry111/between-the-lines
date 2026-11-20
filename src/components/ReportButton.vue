<script setup>
// "Report" link that expands into reason chips — one tap to send.
import { ref } from "vue";
import { useAdmin } from "../composables/useAdmin";
import { useToast } from "../composables/useToast";

const props = defineProps({
  // { type: "comment", commentId, poemId } or { type: "poem", poemId }
  target: { type: Object, required: true },
  label: { type: String, default: "Report" },
});

const { report } = useAdmin();
const { toast } = useToast();

const REASONS = ["Spam", "Harassment or hate", "Inappropriate", "Plagiarism", "Something else"];
const open = ref(false);
const sending = ref(false);
const sent = ref(false);

async function send(reason) {
  sending.value = true;
  try {
    await report(props.target, reason);
    sent.value = true;
    open.value = false;
    toast("Thanks — we'll take a look", "success");
  } catch (err) {
    console.error(err);
    toast("Couldn't send the report. Please try again.", "error");
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <span class="inline-flex flex-wrap items-center gap-1.5">
    <span v-if="sent" class="text-xs text-faint">Reported</span>
    <button
      v-else-if="!open"
      type="button"
      class="text-xs text-faint transition hover:text-accent"
      @click="open = true"
    >
      {{ label }}
    </button>
    <template v-else>
      <span class="text-xs text-muted">Why?</span>
      <button
        v-for="r in REASONS"
        :key="r"
        type="button"
        class="chip min-h-0 px-2.5 py-0.5 text-[11px]"
        :disabled="sending"
        @click="send(r)"
      >
        {{ r }}
      </button>
      <button type="button" class="text-xs text-faint hover:text-ink" @click="open = false">Cancel</button>
    </template>
  </span>
</template>
