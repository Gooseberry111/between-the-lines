import { createRouter, createWebHistory } from "vue-router";
import PoemFeed from "../components/PoemFeed.vue";
import WritePage from "../components/WritePage.vue";
import PoemReadingView from "../components/PoemReadingView.vue";
import AuthForm from "../components/AuthForm.vue";
import CollectionView from "../components/CollectionView.vue";
import ManageCollectionsPage from "../components/ManageCollectionsPage.vue";
import SearchPage from "../components/SearchPage.vue";
import MyPoemsPage from "../components/MyPoemsPage.vue";
import EditPoemPage from "../components/EditPoemPage.vue";
import { supabase } from "../lib/supabase";
import ProfilePage from "../../views/ProfilePage.vue";
import ExplorerPage from "../../views/ExplorerPage.vue";

const routes = [
  { path: "/auth", name: "auth", component: AuthForm },
  { path: "/", name: "feed", component: PoemFeed },
  { path: "/write", name: "write", component: WritePage },
  { path: "/poem/:id", name: "poem", component: PoemReadingView, props: true },
  { path: "/explore", component: ExplorerPage },
  {
    path: "/collection/:id",
    name: "collection",
    component: CollectionView,
    props: true,
  },
  {
    path: "/collections",
    name: "collections",
    component: ManageCollectionsPage,
  },
  { path: "/search", name: "search", component: SearchPage },
  { path: "/my-poems", name: "my-poems", component: MyPoemsPage },
  { path: "/edit/:id", name: "edit-poem", component: EditPoemPage },
  { path: "/profile", component: ProfilePage },
];
const router = createRouter({
  history: createWebHistory(),
  routes,

  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }

    return {
      top: 0,
      behavior: "smooth",
    };
  },
});

router.beforeEach(async (to) => {
  if (to.name === "auth") return true;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { name: "auth" };
  }

  return true;
});

export default router;
