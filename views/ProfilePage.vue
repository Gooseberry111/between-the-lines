<script setup>
import { ref, onMounted } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useAuth } from "../src/composables/useAuth";
import { useAccount } from "../src/composables/useAccount";
import { useTheme } from "../src/composables/useTheme";
import { useToast } from "../src/composables/useToast";
import { supabase } from "../src/lib/supabase";
import Icon from "../src/components/ui/Icon.vue";

const router = useRouter();
const { user, signOut } = useAuth();
const { isSaving, errorMessage, updateUsername, updateBio, updatePassword, deleteAccount } =
  useAccount();
const { mode, setMode } = useTheme();
const { toast } = useToast();

const username = ref("");
const bio = ref("");
const bioAvailable = ref(false);
const newPassword = ref("");
const confirmPassword = ref("");
const showDeleteConfirm = ref(false);
const deleteConfirmText = ref("");

onMounted(async () => {
  const { data } = await supabase.from("profiles").select("*").eq("id", user.value.id).single();
  username.value = data?.username ?? "";
  // The bio column comes from supabase/sql/04_social.sql
  bioAvailable.value = data ? "bio" in data : false;
  bio.value = data?.bio ?? "";
});

async function handleUsernameSave() {
  if (!username.value.trim()) return;
  await updateUsername(username.value.trim());
  if (errorMessage.value) toast(errorMessage.value, "error");
  else toast("Pen name updated", "success");
}

async function handleBioSave() {
  await updateBio(bio.value.trim());
  if (errorMessage.value) toast(errorMessage.value, "error");
  else toast("Bio updated", "success");
}

async function handlePasswordSave() {
  if (!newPassword.value) return toast("Enter a new password.", "error");
  if (newPassword.value.length < 6) return toast("Use at least 6 characters.", "error");
  if (newPassword.value !== confirmPassword.value) return toast("Passwords don't match.", "error");
  await updatePassword(newPassword.value);
  if (errorMessage.value) {
    toast(errorMessage.value, "error");
  } else {
    newPassword.value = "";
    confirmPassword.value = "";
    toast("Password updated", "success");
  }
}

async function handleLogout() {
  await signOut();
  router.push({ name: "auth" });
}

async function handleDeleteAccount() {
  await deleteAccount();
  if (errorMessage.value) {
    toast(`Couldn't delete account: ${errorMessage.value}`, "error");
  } else {
    router.push({ name: "auth" });
  }
}

const themeOptions = [
  { key: "light", label: "Light", icon: "sun" },
  { key: "dark", label: "Dark", icon: "moon" },
  { key: "system", label: "System", icon: "type" },
];
</script>

<template>
  <div class="page-narrow">
    <header>
      <p class="eyebrow mb-3">Settings</p>
      <h1 class="page-title">Your account</h1>
      <p class="mt-3 text-sm text-muted">
        Signed in as {{ user?.email }} ·
        <RouterLink :to="`/poet/${user?.id}`" class="text-ink underline decoration-rule underline-offset-4 hover:decoration-ink">
          view your poet page
        </RouterLink>
      </p>
    </header>

    <div class="mt-12 divide-y divide-rule border-y border-rule">
      <!-- Pen name -->
      <section class="grid grid-cols-1 gap-4 py-8 sm:grid-cols-3">
        <div>
          <h2 class="text-sm font-medium text-ink">Pen name</h2>
          <p class="mt-1 text-xs text-muted">Shown on your poems and poet page.</p>
        </div>
        <form class="flex items-center gap-2 self-start sm:col-span-2" @submit.prevent="handleUsernameSave">
          <input v-model="username" type="text" class="input" maxlength="40" aria-label="Pen name" />
          <button class="btn btn-secondary" :disabled="isSaving">Save</button>
        </form>
      </section>

      <!-- Bio -->
      <section v-if="bioAvailable" class="grid grid-cols-1 gap-4 py-8 sm:grid-cols-3">
        <div>
          <h2 class="text-sm font-medium text-ink">Bio</h2>
          <p class="mt-1 text-xs text-muted">A line or two for your poet page.</p>
        </div>
        <form class="flex flex-col gap-2 self-start sm:col-span-2" @submit.prevent="handleBioSave">
          <textarea v-model="bio" rows="3" maxlength="300" class="input resize-none" placeholder="Who are you, between the lines?" aria-label="Bio" />
          <div class="flex items-center justify-between">
            <span class="text-xs text-faint tabular-nums">{{ bio.length }}/300</span>
            <button class="btn btn-secondary" :disabled="isSaving">Save bio</button>
          </div>
        </form>
      </section>

      <!-- Appearance -->
      <section class="grid grid-cols-1 gap-4 py-8 sm:grid-cols-3">
        <div>
          <h2 class="text-sm font-medium text-ink">Appearance</h2>
          <p class="mt-1 text-xs text-muted">System follows your device.</p>
        </div>
        <div class="flex gap-1 self-start rounded-full bg-ink/5 p-1 sm:col-span-2 sm:w-fit" role="radiogroup">
          <button
            v-for="opt in themeOptions"
            :key="opt.key"
            role="radio"
            :aria-checked="mode === opt.key"
            class="flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-1.5 text-sm transition"
            :class="mode === opt.key ? 'bg-surface font-medium text-ink shadow-sm' : 'text-muted hover:text-ink'"
            @click="setMode(opt.key)"
          >
            <Icon v-if="opt.key !== 'system'" :name="opt.icon" :size="14" />
            {{ opt.label }}
          </button>
        </div>
      </section>

      <!-- Password -->
      <section class="grid grid-cols-1 gap-4 py-8 sm:grid-cols-3">
        <div>
          <h2 class="text-sm font-medium text-ink">Password</h2>
          <p class="mt-1 text-xs text-muted">At least 6 characters.</p>
        </div>
        <form class="flex flex-col gap-2 self-start sm:col-span-2" @submit.prevent="handlePasswordSave">
          <input v-model="newPassword" type="password" class="input" placeholder="New password" autocomplete="new-password" />
          <input v-model="confirmPassword" type="password" class="input" placeholder="Confirm new password" autocomplete="new-password" />
          <button class="btn btn-secondary self-start" :disabled="isSaving">Update password</button>
        </form>
      </section>

      <!-- Session -->
      <section class="grid grid-cols-1 gap-4 py-8 sm:grid-cols-3">
        <div>
          <h2 class="text-sm font-medium text-ink">Session</h2>
        </div>
        <div class="sm:col-span-2">
          <button class="btn btn-secondary" @click="handleLogout">
            <Icon name="logout" :size="15" /> Log out
          </button>
        </div>
      </section>

      <!-- Danger -->
      <section class="grid grid-cols-1 gap-4 py-8 sm:grid-cols-3">
        <div>
          <h2 class="text-sm font-medium text-accent">Delete account</h2>
          <p class="mt-1 text-xs text-muted">Permanently removes your poems, collections and reactions.</p>
        </div>
        <div class="sm:col-span-2">
          <button v-if="!showDeleteConfirm" class="btn btn-danger" @click="showDeleteConfirm = true">
            Delete my account…
          </button>
          <div v-else class="rounded-xl border border-accent/30 bg-accent-soft p-4">
            <p class="text-sm text-ink">
              This can't be undone. Type <strong class="font-semibold">delete</strong> to confirm.
            </p>
            <input v-model="deleteConfirmText" type="text" class="input mt-3" aria-label="Type delete to confirm" />
            <div class="mt-3 flex gap-2">
              <button
                class="btn bg-accent text-paper hover:bg-accent/90"
                :disabled="isSaving || deleteConfirmText.trim().toLowerCase() !== 'delete'"
                @click="handleDeleteAccount"
              >
                {{ isSaving ? "Deleting…" : "Delete forever" }}
              </button>
              <button class="btn btn-ghost" @click="showDeleteConfirm = false; deleteConfirmText = ''">Cancel</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
