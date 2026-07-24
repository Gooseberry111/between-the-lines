<script setup>
import { ref, onMounted, watch } from "vue";
import { useAuth } from "./composables/useAuth";
import { useTheme } from "./composables/useTheme";
import { supabase } from "./lib/supabase";
import ParchmentBackground from "./components/ParchmentBackground.vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import DarkVintageBackground from "./components/DarkVintageBackground.vue";

const route = useRoute();

function isActive(path) {
  return route.path === path;
}
const { user, getCurrentUser, signOut } = useAuth();
const { isDark, toggleTheme } = useTheme();

const mobileMenuOpen = ref(false);

function closeMobileMenu() {
  mobileMenuOpen.value = false;
}

// close the mobile menu whenever the route changes
watch(() => route.path, closeMobileMenu);

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
    <nav
      v-if="!isActive('/auth')"
      class="sticky top-0 z-20 border-b border-brown/10 bg-card/90 backdrop-blur-sm"
    >
      <div
        class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
      >
        <RouterLink
          to="/"
          class="font-heading text-base tracking-wide text-ink sm:text-lg"
        >
          BETWEEN THE LINES
        </RouterLink>

        <div
          class="hidden items-center gap-6 font-body text-sm text-brown md:flex"
        >
          <RouterLink
            to="/"
            class="border-b pb-0.5"
            :class="
              isActive('/')
                ? 'border-brown/60 text-ink'
                : 'border-transparent hover:text-ink'
            "
            >Home</RouterLink
          >
          <RouterLink
            to="/explore"
            class="border-b pb-0.5"
            :class="
              isActive('/explore')
                ? 'border-brown/60 text-ink'
                : 'border-transparent hover:text-ink'
            "
            >Explore</RouterLink
          >
          <!-- <RouterLink
            to="/write"
            class="border-b pb-0.5"
            :class="
              isActive('/write')
                ? 'border-brown/60 text-ink'
                : 'border-transparent hover:text-ink'
            "
            >Write</RouterLink
          > -->
          <RouterLink
            to="/collections"
            class="border-b pb-0.5"
            :class="
              isActive('/collections')
                ? 'border-brown/60 text-ink'
                : 'border-transparent hover:text-ink'
            "
            >Collections</RouterLink
          >
          <RouterLink
            to="/my-poems"
            class="border-b pb-0.5 whitespace-nowrap"
            :class="
              isActive('/my-poems')
                ? 'border-brown/60 text-ink'
                : 'border-transparent hover:text-ink'
            "
            >My poems</RouterLink
          >
        </div>

        <div class="hidden items-center gap-4 md:flex">
          <!-- <RouterLink
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
          </RouterLink> -->

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

          <RouterLink
            to="/write"
            class="rounded-lg bg-brown px-4 py-2 font-body text-xs text-card transition hover:bg-brown/90"
          >
            Write a poem
          </RouterLink>

          <RouterLink
            v-if="user"
            to="/profile"
            class="flex h-8 w-8 items-center justify-center rounded-full border border-brown/30 bg-card font-body text-xs text-ink"
            aria-label="My account"
          >
            {{ user.email?.[0]?.toUpperCase() }}
          </RouterLink>
          <RouterLink
            v-else
            to="/auth"
            class="text-xs text-black hover:text-brown"
            >Log in</RouterLink
          >
        </div>

        <button
          class="flex h-9 w-9 items-center justify-center text-ink md:hidden"
          @click="mobileMenuOpen = !mobileMenuOpen"
          aria-label="Toggle menu"
        >
          <svg
            v-if="!mobileMenuOpen"
            viewBox="0 0 24 24"
            class="h-6 w-6"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            class="h-6 w-6"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div
        v-if="mobileMenuOpen"
        class="flex flex-col gap-4 border-t border-brown/10 bg-card px-4 py-4 font-body text-sm text-brown md:hidden"
      >
        <RouterLink to="/" :class="isActive('/') ? 'text-ink' : ''"
          >Home</RouterLink
        >
        <RouterLink to="/explore" :class="isActive('/search') ? 'text-ink' : ''"
          >Explore</RouterLink
        >
        <!-- <RouterLink to="/write" :class="isActive('/write') ? 'text-ink' : ''"
          >Write</RouterLink
        > -->
        <RouterLink
          to="/collections"
          :class="isActive('/collections') ? 'text-ink' : ''"
          >Collections</RouterLink
        >
        <RouterLink
          to="/my-poems"
          :class="isActive('/my-poems') ? 'text-ink' : ''"
          >My poems</RouterLink
        >
        <RouterLink
          v-if="user"
          to="/profile"
          :class="isActive('/profile') ? 'text-ink' : ''"
          >My account</RouterLink
        >

        <div class="flex items-center gap-4 border-t border-brown/10 pt-4">
          <button
            @click="toggleTheme"
            class="flex items-center gap-2 text-brown"
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
            {{ isDark ? "Light mode" : "Dark mode" }}
          </button>
        </div>

        <RouterLink
          to="/write"
          class="rounded-lg bg-brown px-4 py-2 text-center font-body text-xs text-card"
        >
          Write a poem
        </RouterLink>

        <RouterLink v-if="!user" to="/auth" class="text-xs text-black"
          >Log in</RouterLink
        >
      </div>
    </nav>

    <div class="w-full px-4 sm:px-6 lg:px-8">
      <RouterView />
    </div>
  </main>
</template>
