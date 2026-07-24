<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "../src/composables/useAuth";
import { useAccount } from "../src/composables/useAccount";
import { supabase } from "../src/lib/supabase";

const router = useRouter();
const { user, signOut } = useAuth();
const {
  isSaving,
  errorMessage,
  successMessage,
  updateUsername,
  updatePassword,
  deleteAccount,
} = useAccount();

const username = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const showDeleteConfirm = ref(false);

onMounted(async () => {
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.value.id)
    .single();
  username.value = data?.username ?? "";
});

async function handleUsernameSave() {
  if (!username.value.trim()) return;
  await updateUsername(username.value.trim());
}

async function handlePasswordSave() {
  if (!newPassword.value || newPassword.value !== confirmPassword.value) {
    errorMessage.value = "Passwords don't match.";
    return;
  }
  await updatePassword(newPassword.value);
  newPassword.value = "";
  confirmPassword.value = "";
}

async function handleLogout() {
  await signOut();
  router.push("/");
}

async function handleDeleteAccount() {
  await deleteAccount();
  router.push("/");
}
</script>

<template>
  <div class="mx-auto flex max-w-xl flex-col gap-2 px-4 py-10 sm:px-8 sm:py-16">
    <h1 class="font-heading text-2xl font-medium text-ink sm:text-3xl">
      My account
    </h1>

    <p
      v-if="errorMessage"
      class="rounded-lg bg-red-100 px-4 py-2 font-body text-sm text-red-700"
    >
      {{ errorMessage }}
    </p>
    <p
      v-if="successMessage"
      class="rounded-lg bg-green-100 px-4 py-2 font-body text-sm text-green-700"
    >
      {{ successMessage }}
    </p>

    <section class="flex flex-col gap-3 rounded-lg bg-card p-5">
      <h2 class="font-heading text-lg text-ink">Username</h2>
      <input
        v-model="username"
        type="text"
        class="rounded-lg border border-brown/20 bg-transparent px-3 py-2 font-body text-sm text-ink focus:outline-none"
      />
      <button
        :disabled="isSaving"
        @click="handleUsernameSave"
        class="self-start rounded-lg bg-brown px-4 py-2 font-body text-sm text-card hover:bg-brown/90 disabled:opacity-50"
      >
        Save username
      </button>
    </section>

    <section class="flex flex-col gap-3 rounded-lg bg-card p-5">
      <h2 class="font-heading text-lg text-ink">Change password</h2>
      <input
        v-model="newPassword"
        type="password"
        placeholder="New password"
        class="rounded-lg border border-brown/20 bg-transparent px-3 py-2 font-body text-sm text-ink placeholder-brown/30 focus:outline-none"
      />
      <input
        v-model="confirmPassword"
        type="password"
        placeholder="Confirm new password"
        class="rounded-lg border border-brown/20 bg-transparent px-3 py-2 font-body text-sm text-ink placeholder-brown/30 focus:outline-none"
      />
      <button
        :disabled="isSaving"
        @click="handlePasswordSave"
        class="self-start rounded-lg bg-brown px-4 py-2 font-body text-sm text-card hover:bg-brown/90 disabled:opacity-50"
      >
        Update password
      </button>
    </section>

    <section class="flex flex-col gap-3 rounded-lg bg-card p-5">
      <h2 class="font-heading text-lg text-ink">Session</h2>
      <button
        @click="handleLogout"
        class="self-start rounded-lg border border-brown/20 px-4 py-2 font-body text-sm text-ink hover:bg-brown/5"
      >
        Log out
      </button>
    </section>

    <section
      class="flex flex-col gap-3 rounded-lg border border-red-300 bg-red-50 p-5"
    >
      <h2 class="font-heading text-lg text-red-700">Danger zone</h2>
      <p class="font-body text-sm text-red-700/80">
        Deleting your account permanently removes your poems, collections, and
        reactions. This can't be undone.
      </p>

      <button
        v-if="!showDeleteConfirm"
        @click="showDeleteConfirm = true"
        class="self-start rounded-lg border border-red-400 px-4 py-2 font-body text-sm text-red-700 hover:bg-red-100"
      >
        Delete account
      </button>

      <div v-else class="flex flex-col gap-2">
        <p class="font-body text-sm font-medium text-red-700">
          Are you sure? This is permanent.
        </p>
        <div class="flex gap-2">
          <button
            :disabled="isSaving"
            @click="handleDeleteAccount"
            class="rounded-lg bg-red-600 px-4 py-2 font-body text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            Yes, delete my account
          </button>
          <button
            @click="showDeleteConfirm = false"
            class="rounded-lg border border-brown/20 px-4 py-2 font-body text-sm text-ink hover:bg-brown/5"
          >
            Cancel
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
