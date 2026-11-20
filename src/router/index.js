import { createRouter, createWebHistory } from "vue-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../composables/useAuth";
import { safeRedirect } from "../lib/redirect";

import PoemFeed from "../components/PoemFeed.vue";
import WritePage from "../components/WritePage.vue";
import PoemReadingView from "../components/PoemReadingView.vue";
import AuthForm from "../components/AuthForm.vue";
import CollectionView from "../components/CollectionView.vue";
import ManageCollectionsPage from "../components/ManageCollectionsPage.vue";
import MyPoemsPage from "../components/MyPoemsPage.vue";
import ProfilePage from "../../views/ProfilePage.vue";
import ExplorerPage from "../../views/ExplorerPage.vue";
import PoetPage from "../../views/PoetPage.vue";
import SavedPage from "../../views/SavedPage.vue";
import NotificationsPage from "../../views/NotificationsPage.vue";

const routes = [
  { path: "/auth", name: "auth", component: AuthForm, meta: { public: true, bare: true } },
  { path: "/", name: "feed", component: PoemFeed, meta: { public: true } },
  { path: "/explore", name: "explore", component: ExplorerPage, meta: { public: true } },
  { path: "/poem/:id", name: "poem", component: PoemReadingView, props: true, meta: { public: true } },
  { path: "/poet/:id", name: "poet", component: PoetPage, props: true, meta: { public: true } },
  { path: "/write", name: "write", component: WritePage },
  { path: "/edit/:id", name: "edit-poem", component: WritePage, props: true },
  { path: "/my-poems", name: "my-poems", component: MyPoemsPage },
  { path: "/saved", name: "saved", component: SavedPage },
  { path: "/collections", name: "collections", component: ManageCollectionsPage },
  { path: "/collection/:id", name: "collection", component: CollectionView, props: true, meta: { public: true } },
  { path: "/notifications", name: "notifications", component: NotificationsPage },
  { path: "/profile", name: "profile", component: ProfilePage },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,

  scrollBehavior(to, from, savedPosition) {
    // Back/forward: return to where the reader was
    if (savedPosition) return savedPosition;
    // Same page, only the query changed (e.g. Explore filters): don't jump
    if (to.path === from.path) return false;
    return { top: 0 };
  },
});

router.beforeEach(async (to) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Populate the shared user before any page mounts, so pages that read
  // user.value.id on load don't crash on a hard refresh.
  const { user } = useAuth();
  user.value = session?.user ?? null;

  // Already signed in — no reason to see the login page
  if (to.name === "auth" && session) {
    return safeRedirect(to.query.redirect) ?? { name: "feed" };
  }

  // Reading is open to everyone; writing, saving and settings need an account
  if (!to.meta.public && !session) {
    // Remember where they were going so login can send them back
    return {
      name: "auth",
      query: to.fullPath !== "/" ? { redirect: to.fullPath } : {},
    };
  }

  return true;
});

export default router;
