<script setup>
import { onMounted } from "vue";
import { useAuth } from "./composables/useAuth";
import { supabase } from "./lib/supabase";
import { RouterLink, RouterView } from "vue-router";

const { user, getCurrentUser, signOut } = useAuth();

onMounted(() => {
  getCurrentUser();
  supabase.auth.onAuthStateChange((event, session) => {
    user.value = session?.user ?? null;
  });
});
</script>

<template>
  <main class="min-h-screen bg-black text-white">
    <nav
      class="flex items-center justify-between border-b border-white/10 px-8 py-4"
    >
      <RouterLink to="/" class="text-lg font-medium text-white"
        >Between the Lines</RouterLink
      >
      <div class="flex items-center gap-4 text-sm">
        <RouterLink to="/write" class="text-white/60 hover:text-white"
          >Write</RouterLink
        >
        <span v-if="user" class="text-white/40">{{ user.email }}</span>
        <button
          v-if="user"
          @click="signOut"
          class="text-white/60 hover:text-white"
        >
          Log out
        </button>
        <RouterLink
          v-else
          to="/auth"
          class="text-amber-200 hover:text-amber-100"
          >Log in</RouterLink
        >
      </div>
    </nav>

    <RouterView />
  </main>
</template>
