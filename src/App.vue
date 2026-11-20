<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { useAuth } from "./composables/useAuth";
import { useTheme } from "./composables/useTheme";
import { useUI } from "./composables/useUI";
import { useSaved } from "./composables/useSaved";
import { useSocial } from "./composables/useSocial";
import { supabase } from "./lib/supabase";
import Icon from "./components/ui/Icon.vue";
import Toaster from "./components/ui/Toaster.vue";

const route = useRoute();
const router = useRouter();
const { user, signOut } = useAuth();
const { isDark, toggleTheme } = useTheme();
const { focusMode } = useUI();
const { loadSavedIds, reset: resetSaved } = useSaved();
const { unreadCount, refreshUnread } = useSocial();

const mobileMenuOpen = ref(false);

// Offline notice (the service worker serves cached poems meanwhile)
const isOffline = ref(!navigator.onLine);
const setOnline = () => (isOffline.value = false);
const setOffline = () => (isOffline.value = true);
window.addEventListener("online", setOnline);
window.addEventListener("offline", setOffline);
const userMenuOpen = ref(false);
const userMenuRef = ref(null);

const showChrome = computed(() => !route.meta.bare && !focusMode.value);

const displayName = computed(
  () =>
    user.value?.user_metadata?.username ??
    user.value?.email?.split("@")[0] ??
    "",
);
const initial = computed(() => displayName.value.charAt(0).toUpperCase());

// Collections and Saved need an account, so visitors only see the first two
const navLinks = computed(() => [
  { to: "/", label: "Home", exact: true },
  { to: "/explore", label: "Explore" },
  ...(user.value
    ? [
        { to: "/collections", label: "Collections" },
        { to: "/saved", label: "Saved" },
      ]
    : []),
]);

const loginLink = computed(() => ({
  name: "auth",
  query: route.path !== "/" ? { redirect: route.fullPath } : {},
}));

function isActive(link) {
  return link.exact ? route.path === link.to : route.path.startsWith(link.to);
}

// Close menus on navigation, and check for new notifications
watch(
  () => route.fullPath,
  () => {
    mobileMenuOpen.value = false;
    userMenuOpen.value = false;
    refreshUnread();
  },
);

function onDocumentClick(e) {
  if (userMenuOpen.value && !userMenuRef.value?.contains(e.target)) {
    userMenuOpen.value = false;
  }
}
function onKeydown(e) {
  if (e.key === "Escape") {
    userMenuOpen.value = false;
    mobileMenuOpen.value = false;
  }
}

let authSub = null;
let unreadTimer = null;
onMounted(() => {
  refreshUnread();
  unreadTimer = setInterval(refreshUnread, 60_000);

  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", onKeydown);

  if (user.value) loadSavedIds();

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    user.value = session?.user ?? null;
    if (event === "SIGNED_IN") {
      loadSavedIds(true);
      refreshUnread();
    }
    if (event === "SIGNED_OUT") {
      resetSaved();
      unreadCount.value = 0;
      // Signed out elsewhere (another tab, expired session): leave the page
      if (!route.meta.public) router.push({ name: "auth" });
    }
  });
  authSub = data.subscription;
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick);
  document.removeEventListener("keydown", onKeydown);
  authSub?.unsubscribe();
  clearInterval(unreadTimer);
});

async function handleLogout() {
  await signOut();
  router.push({ name: "auth" });
}
</script>

<template>
  <div class="page-bg" aria-hidden="true" />

  <div class="flex min-h-screen flex-col">
    <!-- Header -->
    <header
      v-if="showChrome"
      class="sticky top-0 z-30 border-b border-rule bg-paper/85 backdrop-blur-md"
    >
      <div class="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 sm:px-8">
        <RouterLink
          to="/"
          class="font-serif text-[22px] leading-none tracking-tight text-ink"
        >
          Between <span class="italic">the</span> Lines
        </RouterLink>

        <nav class="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
          <RouterLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="rounded-full px-3 py-1.5 text-sm transition-colors"
            :class="
              isActive(link)
                ? 'bg-ink/5 font-medium text-ink'
                : 'text-muted hover:text-ink'
            "
          >
            {{ link.label }}
          </RouterLink>
        </nav>

        <div class="ml-auto flex items-center gap-1.5">
          <button
            class="icon-btn"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            :title="isDark ? 'Light mode' : 'Dark mode'"
            @click="toggleTheme"
          >
            <Icon :name="isDark ? 'sun' : 'moon'" />
          </button>

          <RouterLink
            v-if="user"
            to="/notifications"
            class="icon-btn relative"
            :aria-label="unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'"
            title="Notifications"
          >
            <Icon name="bell" />
            <span
              v-if="unreadCount"
              class="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent ring-2 ring-paper"
            />
          </RouterLink>

          <RouterLink to="/write" class="btn btn-primary ml-1 hidden sm:inline-flex">
            <Icon name="pen" :size="15" />
            Write
          </RouterLink>

          <!-- User menu -->
          <div v-if="user" ref="userMenuRef" class="relative ml-1 hidden md:block">
            <button
              class="flex h-9 w-9 items-center justify-center rounded-full border border-rule bg-surface text-sm font-medium text-ink transition hover:border-ink/30"
              aria-haspopup="menu"
              :aria-expanded="userMenuOpen"
              aria-label="Account menu"
              @click="userMenuOpen = !userMenuOpen"
            >
              {{ initial }}
            </button>

            <Transition name="fade">
              <div
                v-if="userMenuOpen"
                role="menu"
                class="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-rule bg-surface py-1.5 shadow-xl shadow-black/5"
              >
                <div class="border-b border-rule px-4 pt-2 pb-3">
                  <p class="truncate text-sm font-medium text-ink">{{ displayName }}</p>
                  <p class="truncate text-xs text-muted">{{ user.email }}</p>
                </div>
                <RouterLink :to="`/poet/${user.id}`" class="menu-item" role="menuitem">
                  <Icon name="user" :size="16" /> Your poet page
                </RouterLink>
                <RouterLink to="/my-poems" class="menu-item" role="menuitem">
                  <Icon name="pen" :size="16" /> Your poems & drafts
                </RouterLink>
                <RouterLink to="/saved" class="menu-item" role="menuitem">
                  <Icon name="bookmark" :size="16" /> Saved poems
                </RouterLink>
                <RouterLink to="/profile" class="menu-item" role="menuitem">
                  <Icon name="type" :size="16" /> Account settings
                </RouterLink>
                <div class="my-1.5 border-t border-rule" />
                <button class="menu-item w-full" role="menuitem" @click="handleLogout">
                  <Icon name="logout" :size="16" /> Log out
                </button>
              </div>
            </Transition>
          </div>

          <RouterLink
            v-if="!user"
            :to="loginLink"
            class="btn btn-secondary ml-1 hidden md:inline-flex"
          >
            Log in
          </RouterLink>

          <button
            class="icon-btn md:hidden"
            :aria-expanded="mobileMenuOpen"
            aria-label="Toggle menu"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <Icon :name="mobileMenuOpen ? 'x' : 'menu'" :size="20" />
          </button>
        </div>
      </div>

      <!-- Mobile menu -->
      <Transition name="fade">
        <nav
          v-if="mobileMenuOpen"
          class="border-t border-rule bg-paper px-5 pt-3 pb-6 md:hidden"
          aria-label="Mobile"
        >
          <RouterLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="block border-b border-rule py-3 font-serif text-xl"
            :class="isActive(link) ? 'text-ink' : 'text-muted'"
          >
            {{ link.label }}
          </RouterLink>
          <template v-if="user">
            <RouterLink to="/notifications" class="flex items-center justify-between border-b border-rule py-3 font-serif text-xl text-muted">
              Notifications
              <span v-if="unreadCount" class="rounded-full bg-accent px-2 py-0.5 font-sans text-xs text-paper">{{ unreadCount }}</span>
            </RouterLink>
            <RouterLink to="/my-poems" class="block border-b border-rule py-3 font-serif text-xl text-muted">
              Your poems
            </RouterLink>
            <RouterLink :to="`/poet/${user.id}`" class="block border-b border-rule py-3 font-serif text-xl text-muted">
              Your poet page
            </RouterLink>
            <RouterLink to="/profile" class="block border-b border-rule py-3 font-serif text-xl text-muted">
              Account
            </RouterLink>
          </template>
          <div class="mt-5 flex gap-3">
            <RouterLink to="/write" class="btn btn-primary flex-1">
              <Icon name="pen" :size="15" /> Write a poem
            </RouterLink>
            <button v-if="user" class="btn btn-secondary" @click="handleLogout">
              Log out
            </button>
            <RouterLink v-else :to="loginLink" class="btn btn-secondary">Log in</RouterLink>
          </div>
        </nav>
      </Transition>
    </header>

    <div
      v-if="isOffline"
      class="border-b border-rule bg-ink/5 px-5 py-2 text-center text-xs text-muted"
      role="status"
    >
      You're offline — showing poems you've already opened or saved.
    </div>

    <!-- Page -->
    <main class="flex-1">
      <RouterView v-slot="{ Component, route: r }">
        <Transition name="fade" mode="out-in">
          <!-- Keyed by path so /poem/a → /poem/b remounts and reloads -->
          <component :is="Component" :key="r.path" />
        </Transition>
      </RouterView>
    </main>

    <Toaster />
  </div>
</template>

<style scoped>
@reference "./style.css";

.menu-item {
  @apply flex items-center gap-3 px-4 py-2 text-left text-sm text-ink/80 transition-colors hover:bg-ink/5 hover:text-ink;
}
</style>
