import { createApp } from "vue";
import router from "./router/index.js";
import "./style.css";
import App from "./App.vue";

createApp(App).use(router).mount("#app");

// Installable app + offline reading. Only in production builds, so the
// dev server never serves stale cached code.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  });
}
