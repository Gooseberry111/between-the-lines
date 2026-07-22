<script setup>
import { onMounted } from "vue";
import { useAuth } from "./composables/useAuth";
import { useTheme } from "./composables/useTheme";
import { supabase } from "./lib/supabase";
import { RouterLink, RouterView } from "vue-router";
import ParchmentBackground from "./components/ParchmentBackground.vue";
import StarryVintageBackground from "./components/StarryVintageBackground.vue";

const { user, getCurrentUser, signOut } = useAuth();
const { isDark, toggleTheme } = useTheme();

onMounted(() => {
  getCurrentUser();
  supabase.auth.onAuthStateChange((event, session) => {
    user.value = session?.user ?? null;
  });
});
</script>

<template>
  <StarryVintageBackground v-if="isDark" />
  <ParchmentBackground v-else />

  <main class="min-h-screen text-ink dark:text-[#f0d9a8]">
    <nav
      class="flex items-center justify-between border-b border-brown/15 bg-card px-8 py-4 dark:border-[#f0d9a8]/15 dark:bg-[#3a2550]"
    >
      <RouterLink
        to="/"
        class="font-heading text-xl font-medium text-ink dark:text-[#f0d9a8]"
        >Between the Lines</RouterLink
      >
      <div class="flex items-center gap-6 font-body text-sm">
        <RouterLink
          to="/write"
          class="text-brown hover:text-ink dark:text-[#f0d9a8]/70 dark:hover:text-[#f0d9a8]"
          >Write</RouterLink
        >
        <RouterLink
          to="/collections"
          class="text-brown hover:text-ink dark:text-[#f0d9a8]/70 dark:hover:text-[#f0d9a8]"
          >Collections</RouterLink
        >
        <RouterLink
          to="/search"
          class="text-brown hover:text-ink dark:text-[#f0d9a8]/70 dark:hover:text-[#f0d9a8]"
          >Search</RouterLink
        >
        <span v-if="user" class="text-brown/60 dark:text-[#f0d9a8]/50">{{
          user.email
        }}</span>
        <button
          v-if="user"
          @click="signOut"
          class="text-brown hover:text-ink dark:text-[#f0d9a8]/70 dark:hover:text-[#f0d9a8]"
        >
          Log out
        </button>
        <RouterLink
          v-else
          to="/auth"
          class="text-gold hover:text-brown dark:text-[#f0d9a8] dark:hover:text-white"
          >Log in</RouterLink
        >
        <button
          @click="toggleTheme"
          class="text-lg"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          {{ isDark ? "🌙" : "☀️" }}
        </button>
      </div>
    </nav>

    <RouterView />
  </main>
</template>
