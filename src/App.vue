<script setup>
import { onMounted } from "vue";
import { useAuth } from "./composables/useAuth";
import { useTheme } from "./composables/useTheme";
import { supabase } from "./lib/supabase";
import ParchmentBackground from "./components/ParchmentBackground.vue";
import FloralCorners from "./components/FloralCorners.vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import DarkVintageBackground from "./components/DarkVintageBackground.vue";

const route = useRoute();

function isActive(path) {
  return route.path === path;
}
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
  <DarkVintageBackground v-if="isDark" />
  <ParchmentBackground v-else />

  <main class="relative z-10 min-h-screen text-ink">
    <div class="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
      <nav
        v-if="!isActive('/auth')"
        class="flex flex-col items-center gap-4 py-6"
      >
        <!-- Logo -->
        <div class="text-center">
          <p class="font-heading text-base tracking-wide text-ink sm:text-lg">
            BETWEEN THE LINES
          </p>
        </div>

        <!-- Navigation Links -->
        <div
          class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-body text-xs text-brown sm:text-sm"
        >
          <RouterLink
            to="/"
            class="border-b pb-0.5"
            :class="
              isActive('/')
                ? 'border-brown/60 text-ink'
                : 'border-transparent hover:text-ink'
            "
          >
            Home
          </RouterLink>

          <RouterLink
            to="/search"
            class="border-b pb-0.5"
            :class="
              isActive('/search')
                ? 'border-brown/60 text-ink'
                : 'border-transparent hover:text-ink'
            "
          >
            Explore
          </RouterLink>

          <RouterLink
            to="/write"
            class="border-b pb-0.5"
            :class="
              isActive('/write')
                ? 'border-brown/60 text-ink'
                : 'border-transparent hover:text-ink'
            "
          >
            Write
          </RouterLink>

          <RouterLink
            to="/collections"
            class="border-b pb-0.5"
            :class="
              isActive('/collections')
                ? 'border-brown/60 text-ink'
                : 'border-transparent hover:text-ink'
            "
          >
            Collections
          </RouterLink>

          <RouterLink
            to="/my-poems"
            class="border-b pb-0.5 whitespace-nowrap"
            :class="
              isActive('/my-poems')
                ? 'border-brown/60 text-ink'
                : 'border-transparent hover:text-ink'
            "
          >
            My poems
          </RouterLink>
        </div>

        <!-- Search + Theme -->
        <div class="flex items-center justify-center gap-4">
          <RouterLink
            to="/search"
            class="text-brown transition hover:text-ink"
            aria-label="Search"
          >
            <svg
              viewBox="0 0 24 24"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" />
            </svg>
          </RouterLink>

          <button
            @click="toggleTheme"
            class="text-brown transition hover:text-ink"
            :aria-label="
              isDark ? 'Switch to light mode' : 'Switch to dark mode'
            "
          >
            <svg
              v-if="isDark"
              viewBox="0 0 24 24"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>

            <svg
              v-else
              viewBox="0 0 24 24"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <circle cx="12" cy="12" r="4.5" />
              <path
                d="M12 2.5v2.5M12 19v2.5M21.5 12H19M5 12H2.5M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>

        <!-- CTA -->
        <RouterLink
          to="/write"
          class="rounded-lg bg-brown px-4 py-2 font-body text-xs text-card transition hover:bg-brown/90"
        >
          Write a poem
        </RouterLink>

        <!-- Account -->
        <RouterLink
          v-if="user"
          to="/auth"
          class="flex h-8 w-8 items-center justify-center rounded-full border border-brown/30 bg-card font-body text-xs text-ink"
          aria-label="My account"
        >
          {{ user.email?.[0]?.toUpperCase() }}
        </RouterLink>

        <RouterLink
          v-else
          to="/auth"
          class="text-xs text-black hover:text-brown"
        >
          Log in
        </RouterLink>
      </nav>

      <RouterView />
    </div>
  </main>
</template>
