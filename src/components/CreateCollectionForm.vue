<script setup>
import { ref } from "vue";
import { useCollections } from "../composables/useCollections";
import { useToast } from "../composables/useToast";
import Icon from "./ui/Icon.vue";

const { createCollection, getMyPoems, addPoemToCollection } = useCollections();
const { toast } = useToast();
const emit = defineEmits(["created", "cancel"]);

const title = ref("");
const description = ref("");
const myPoems = ref([]);
const selectedPoemIds = ref(new Set());
const isSaving = ref(false);
const isLoadingPoems = ref(true);

async function loadPoems() {
  isLoadingPoems.value = true;
  myPoems.value = await getMyPoems();
  isLoadingPoems.value = false;
}
loadPoems();

function togglePoem(poemId) {
  if (selectedPoemIds.value.has(poemId)) selectedPoemIds.value.delete(poemId);
  else selectedPoemIds.value.add(poemId);
}

async function handleSubmit() {
  if (!title.value.trim()) return;
  isSaving.value = true;
  try {
    const collection = await createCollection(title.value.trim(), description.value.trim());
    let position = 0;
    for (const poemId of selectedPoemIds.value) {
      await addPoemToCollection(collection.id, poemId, position++);
    }
    title.value = "";
    description.value = "";
    selectedPoemIds.value = new Set();
    toast("Collection created", "success");
    emit("created", collection);
  } catch (err) {
    toast(`Couldn't create collection: ${err.message}`, "error");
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <form
    class="rounded-2xl border border-rule bg-surface p-6 sm:p-8"
    @submit.prevent="handleSubmit"
  >
    <h2 class="font-serif text-2xl text-ink">New collection</h2>
    <p class="mt-1 text-sm text-muted">Gather poems into a chapbook, a season, a theme.</p>

    <div class="mt-6 grid gap-4">
      <div>
        <label for="col-title" class="label">Title</label>
        <input id="col-title" v-model="title" type="text" class="input" placeholder="e.g. Letters from November" required />
      </div>
      <div>
        <label for="col-desc" class="label">Description <span class="font-normal text-faint">· optional</span></label>
        <textarea id="col-desc" v-model="description" rows="2" class="input resize-none" placeholder="What ties these poems together?" />
      </div>

      <div>
        <p class="label">Poems <span class="font-normal text-faint">· optional, you can add more later</span></p>
        <p v-if="isLoadingPoems" class="text-sm text-muted">Loading your poems…</p>
        <p v-else-if="!myPoems.length" class="text-sm text-muted italic">You haven't written any poems yet.</p>
        <div v-else class="max-h-56 overflow-y-auto rounded-lg border border-rule">
          <label
            v-for="poem in myPoems"
            :key="poem.id"
            class="flex cursor-pointer items-center gap-3 border-b border-rule px-4 py-2.5 text-sm last:border-b-0 hover:bg-ink/[0.03]"
          >
            <span
              class="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition"
              :class="selectedPoemIds.has(poem.id) ? 'border-ink bg-ink text-paper' : 'border-rule'"
            >
              <Icon v-if="selectedPoemIds.has(poem.id)" name="check" :size="12" />
            </span>
            <input type="checkbox" class="sr-only" :checked="selectedPoemIds.has(poem.id)" @change="togglePoem(poem.id)" />
            <span class="font-serif text-base text-ink">{{ poem.title }}</span>
          </label>
        </div>
      </div>
    </div>

    <div class="mt-6 flex justify-end gap-2">
      <button type="button" class="btn btn-ghost" @click="emit('cancel')">Cancel</button>
      <button type="submit" class="btn btn-primary" :disabled="isSaving || !title.trim()">
        {{ isSaving ? "Creating…" : "Create collection" }}
      </button>
    </div>
  </form>
</template>
