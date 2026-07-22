import { createRouter, createWebHistory } from "vue-router";
import PoemFeed from "../components/PoemFeed.vue";
import WritePage from "../components/WritePage.vue";
import PoemReadingView from "../components/PoemReadingView.vue";
import AuthForm from "../components/AuthForm.vue";
import CollectionView from "../components/CollectionView.vue";
import ManageCollectionsPage from "../components/ManageCollectionsPage.vue";
import SearchPage from "../components/SearchPage.vue";

const routes = [
  { path: "/", name: "feed", component: PoemFeed },
  { path: "/write", name: "write", component: WritePage },
  { path: "/poem/:id", name: "poem", component: PoemReadingView, props: true },
  { path: "/auth", name: "auth", component: AuthForm },
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
];
const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
