<script setup>
import { onMounted } from "vue";
import { useAuth } from "./composables/useAuth";
import { useTheme } from "./composables/useTheme";
import { supabase } from "./lib/supabase";
import ParchmentBackground from "./components/ParchmentBackground.vue";
import StarryVintageBackground from "./components/StarryVintageBackground.vue";
import FloralCorners from "./components/FloralCorners.vue";
import { RouterLink, RouterView, useRoute } from "vue-router";

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
  <StarryVintageBackground v-if="isDark" />
  <ParchmentBackground v-else />

  <main class="relative z-10 min-h-screen text-ink">
    <div class="mx-auto max-w-5xl px-24 md:px-15">
      <nav class="flex items-center justify-center gap-25 py-5">
        <div class="flex flex-col pl-5">
          <p
            class="font-heading text-lg tracking-wide text-ink whitespace-nowrap"
          >
            BETWEEN THE LINES
          </p>
        </div>

        <div class="flex items-center gap-7 font-body text-xs text-brown">
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

        <div class="flex items-center gap-3 pr-0">
          <RouterLink
            to="/search"
            class="text-brown hover:text-ink"
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
            class="text-base"
            :aria-label="
              isDark ? 'Switch to light mode' : 'Switch to dark mode'
            "
          >
            {{ isDark ? "🌙" : "☀️" }}
          </button>

          <RouterLink
            to="/write"
            class="whitespace-nowrap rounded-lg bg-brown px-3 py-1.5 font-body text-xs text-card hover:bg-brown/90"
          >
            Write a poem
          </RouterLink>

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
            class="text-xs text-gold hover:text-brown"
            >Log in</RouterLink
          >
        </div>
      </nav>

      <RouterView />
    </div>
  </main>
</template>
