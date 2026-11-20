<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { useAuth } from "./composables/useAuth";
import { useTheme } from "./composables/useTheme";
import { useUI } from "./composables/useUI";
import { useSaved } from "./composables/useSaved";
import { useSocial } from "./composables/useSocial";
import { useScrollLock } from "./composables/useScrollLock";
import { useAdmin } from "./composables/useAdmin";
import { supabase } from "./lib/supabase";
import Icon from "./components/ui/Icon.vue";
import Toaster from "./components/ui/Toaster.vue";
import MenuToggle from "./components/ui/MenuToggle.vue";

const route = useRoute();
const router = useRouter();
const { user, signOut } = useAuth();
const { isDark, toggleTheme } = useTheme();
const { focusMode } = useUI();
const { loadSavedIds, reset: resetSaved } = useSaved();
const { unreadCount, refreshUnread } = useSocial();
const { isAdmin, openReports, loadAdmin, reset: resetAdmin } = useAdmin();

const mobileMenuOpen = ref(false);
// Drives the lines → ✕ animation; flips a frame after the panel appears
// so the transition actually plays, and back before it disappears.
const menuMorph = ref(false);

function openMenu() {
  mobileMenuOpen.value = true;
  requestAnimationFrame(() => requestAnimationFrame(() => (menuMorph.value = true)));
}

function closeMenu() {
  // The ✕ unfolds while the drawer slides away
  menuMorph.value = false;
  mobileMenuOpen.value = false;
}
useScrollLock(() => mobileMenuOpen.value);

// The menu is phones-only: if the window grows past md, close it
const desktopQuery = window.matchMedia("(min-width: 768px)");
desktopQuery.addEventListener("change", (e) => {
  if (e.matches) {
    mobileMenuOpen.value = false;
    menuMorph.value = false;
  }
});

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
    menuMorph.value = false;
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
    if (mobileMenuOpen.value) closeMenu();
  }
}

let authSub = null;
let unreadTimer = null;
onMounted(() => {
  refreshUnread();
  unreadTimer = setInterval(refreshUnread, 60_000);

  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", onKeydown);

  if (user.value) {
    loadSavedIds();
    loadAdmin();
  }

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    user.value = session?.user ?? null;
    if (event === "SIGNED_IN") {
      loadSavedIds(true);
      loadAdmin(true);
      refreshUnread();
    }
    if (event === "SIGNED_OUT") {
      resetSaved();
      resetAdmin();
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
      class="sticky top-0 z-30 border-b border-rule bg-paper/85 pt-[env(safe-area-inset-top)] backdrop-blur-md"
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
                <RouterLink v-if="isAdmin" to="/admin" class="menu-item" role="menuitem">
                  <Icon name="sparkle" :size="16" /> Admin
                  <span v-if="openReports" class="ml-auto rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-paper tabular-nums">{{ openReports }}</span>
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
            class="icon-btn menu-toggle-btn md:hidden"
            :aria-expanded="mobileMenuOpen"
            aria-label="Toggle menu"
            @click="openMenu"
          >
            <MenuToggle :open="false" />
          </button>
        </div>
      </div>

    </header>

    <!-- Mobile menu: a drawer sliding in from the right (outside the header,
         whose blur would otherwise trap a fixed element inside it) -->
    <Transition name="fade">
      <div
        v-if="mobileMenuOpen"
        class="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] md:hidden"
        aria-hidden="true"
        @click="closeMenu"
      />
    </Transition>
    <Transition name="drawer">
      <div
        v-if="mobileMenuOpen"
        class="fixed inset-y-0 right-0 z-50 flex w-[min(20rem,86vw)] flex-col bg-paper pt-[env(safe-area-inset-top)] shadow-2xl shadow-black/20 md:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div class="flex h-16 shrink-0 items-center justify-between border-b border-rule px-5">
          <p class="eyebrow">Menu</p>
          <div class="flex items-center gap-1.5">
            <button
              class="icon-btn"
              :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
              @click="toggleTheme"
            >
              <Icon :name="isDark ? 'sun' : 'moon'" />
            </button>
            <button class="icon-btn menu-toggle-btn" aria-label="Close menu" @click="closeMenu">
              <MenuToggle :open="menuMorph" />
            </button>
          </div>
        </div>

        <nav
          class="mobile-nav flex-1 overflow-y-auto overscroll-contain px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          :class="{ 'is-in': menuMorph }"
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
            <RouterLink v-if="isAdmin" to="/admin" class="flex items-center justify-between border-b border-rule py-3 font-serif text-xl text-muted">
              Admin
              <span v-if="openReports" class="rounded-full bg-accent px-2 py-0.5 font-sans text-xs text-paper">{{ openReports }}</span>
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
      </div>
    </Transition>

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

/* Drawer slides in from the right */
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.38s cubic-bezier(0.32, 0.72, 0, 1);
}
.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}

/* Menu links drift in from the right, one after another */
.mobile-nav > * {
  opacity: 0;
  transform: translateX(16px);
  transition:
    opacity 0.35s ease,
    transform 0.45s cubic-bezier(0.2, 0.7, 0.2, 1);
}
.mobile-nav.is-in > * {
  opacity: 1;
  transform: none;
}
.mobile-nav.is-in > *:nth-child(1) { transition-delay: 0.06s; }
.mobile-nav.is-in > *:nth-child(2) { transition-delay: 0.1s; }
.mobile-nav.is-in > *:nth-child(3) { transition-delay: 0.14s; }
.mobile-nav.is-in > *:nth-child(4) { transition-delay: 0.18s; }
.mobile-nav.is-in > *:nth-child(5) { transition-delay: 0.22s; }
.mobile-nav.is-in > *:nth-child(6) { transition-delay: 0.26s; }
.mobile-nav.is-in > *:nth-child(7) { transition-delay: 0.3s; }
.mobile-nav.is-in > *:nth-child(8) { transition-delay: 0.34s; }
.mobile-nav.is-in > *:nth-child(9) { transition-delay: 0.38s; }

.menu-item {
  @apply flex items-center gap-3 px-4 py-2 text-left text-sm text-ink/80 transition-colors hover:bg-ink/5 hover:text-ink;
}
</style>
