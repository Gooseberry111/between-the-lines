<script setup>
// "Notes in the margin": short comments on a poem, optionally tied to a line.
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useSocial } from "../composables/useSocial";
import { useAuth } from "../composables/useAuth";
import { useToast } from "../composables/useToast";
import Icon from "./ui/Icon.vue";

const props = defineProps({
  poem: { type: Object, required: true },
  // Line the reader chose to write about (v-model:line)
  line: { type: Object, default: null },
});
const emit = defineEmits(["update:line"]);

const route = useRoute();
const { getComments, addComment, deleteComment } = useSocial();
const { user } = useAuth();
const { toast } = useToast();

const notes = ref([]);
const available = ref(true);
const body = ref("");
const isPosting = ref(false);
const textareaRef = ref(null);

const lineText = computed(() => {
  const map = new Map(props.poem.lines.map((l) => [l.id, l.content]));
  return (id) => map.get(id);
});

onMounted(async () => {
  const data = await getComments(props.poem.id);
  if (data === null) available.value = false;
  else notes.value = data;
});

// Picking a line elsewhere on the page focuses the box
watch(
  () => props.line,
  async (line) => {
    if (!line) return;
    await nextTick();
    textareaRef.value?.scrollIntoView({ behavior: "smooth", block: "center" });
    textareaRef.value?.focus({ preventScroll: true });
  },
);

function canDelete(note) {
  return user.value && (note.user_id === user.value.id || props.poem.author_id === user.value.id);
}

async function post() {
  const text = body.value.trim();
  if (!text) return;
  isPosting.value = true;
  try {
    const note = await addComment(props.poem.id, text, props.line?.id ?? null);
    notes.value.push(note);
    body.value = "";
    emit("update:line", null);
  } catch (err) {
    toast(`Couldn't post your note: ${err.message}`, "error");
  } finally {
    isPosting.value = false;
  }
}

async function remove(note) {
  if (!confirm("Delete this note?")) return;
  try {
    await deleteComment(note.id);
    notes.value = notes.value.filter((n) => n.id !== note.id);
  } catch {
    toast("Couldn't delete that note.", "error");
  }
}

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
</script>

<template>
  <section v-if="available && poem.status === 'published'" class="mx-auto mt-20 max-w-xl" aria-labelledby="notes-title">
    <h2 id="notes-title" class="flex items-baseline gap-2 font-serif text-2xl text-ink">
      Notes in the margin
      <span v-if="notes.length" class="font-sans text-sm text-faint tabular-nums">{{ notes.length }}</span>
    </h2>

    <ul v-if="notes.length" class="mt-4">
      <li v-for="note in notes" :key="note.id" class="group border-t border-rule py-5">
        <div class="flex items-baseline justify-between gap-3">
          <p class="text-sm">
            <RouterLink :to="`/poet/${note.user_id}`" class="font-medium text-ink hover:text-accent">
              {{ note.profiles?.username ?? "Anonymous" }}
            </RouterLink>
            <span class="ml-2 text-xs text-faint">{{ timeAgo(note.created_at) }}</span>
          </p>
          <button
            v-if="canDelete(note)"
            class="text-xs text-faint opacity-0 transition group-hover:opacity-100 hover:text-accent focus:opacity-100 [@media(hover:none)]:opacity-100"
            @click="remove(note)"
          >
            Delete
          </button>
        </div>
        <p
          v-if="note.line_id && lineText(note.line_id)"
          class="mt-2 border-l-2 border-accent/40 pl-3 font-serif text-muted italic"
        >
          {{ lineText(note.line_id) }}
        </p>
        <p class="mt-2 text-[15px] leading-relaxed whitespace-pre-line text-ink/85">{{ note.body }}</p>
      </li>
    </ul>
    <p v-else class="mt-3 text-sm text-muted italic">No notes yet. Be the first to leave one.</p>

    <!-- Write a note -->
    <form v-if="user" class="mt-6" @submit.prevent="post">
      <div
        v-if="line"
        class="mb-2 flex items-start justify-between gap-3 rounded-lg bg-accent-soft px-3 py-2"
      >
        <p class="font-serif text-sm text-ink italic">“{{ line.content }}”</p>
        <button type="button" class="text-faint hover:text-ink" aria-label="Don't attach this line" @click="emit('update:line', null)">
          <Icon name="x" :size="14" />
        </button>
      </div>
      <textarea
        ref="textareaRef"
        v-model="body"
        rows="3"
        maxlength="1000"
        class="input resize-none"
        :placeholder="line ? 'What does this line stir in you?' : 'Leave a note for the poet…'"
        aria-label="Your note"
      />
      <div class="mt-2 flex items-center justify-between">
        <p class="text-xs text-faint">Be kind. Notes are public.</p>
        <button class="btn btn-primary py-1.5" :disabled="isPosting || !body.trim()">
          {{ isPosting ? "Posting…" : "Post note" }}
        </button>
      </div>
    </form>
    <p v-else class="mt-6 text-sm text-muted">
      <RouterLink :to="{ name: 'auth', query: { redirect: route.fullPath } }" class="text-ink underline decoration-rule underline-offset-4 hover:decoration-ink">
        Log in</RouterLink>
      to leave a note.
    </p>
  </section>
</template>
