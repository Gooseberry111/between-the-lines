import { ref, computed, watch } from "vue";

// "light" | "dark" | "system". Stored per browser; defaults to the OS setting.
function readStored() {
  try {
    return localStorage.getItem("theme") ?? "system";
  } catch {
    return "system";
  }
}

const mode = ref(readStored());
const media = window.matchMedia("(prefers-color-scheme: dark)");
const systemDark = ref(media.matches);
media.addEventListener("change", (e) => (systemDark.value = e.matches));

const isDark = computed(() =>
  mode.value === "system" ? systemDark.value : mode.value === "dark",
);

function apply() {
  document.documentElement.classList.toggle("dark", isDark.value);
  // Match the phone's status-bar area to the site, not the system setting
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", isDark.value ? "#121110" : "#f8f5ef");
}
apply();

watch(isDark, apply);
watch(mode, (value) => {
  try {
    localStorage.setItem("theme", value);
  } catch {
    /* storage unavailable — theme just won't persist */
  }
});

export function useTheme() {
  function setMode(value) {
    mode.value = value;
  }

  function toggleTheme() {
    mode.value = isDark.value ? "light" : "dark";
  }

  return { mode, isDark, setMode, toggleTheme };
}
