import { ref } from "vue";

const toasts = ref([]);
let nextId = 1;

export function useToast() {
  function dismiss(id) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  /** type: "info" | "success" | "error" */
  function toast(message, type = "info", duration = 3200) {
    const id = nextId++;
    toasts.value.push({ id, message, type });
    setTimeout(() => dismiss(id), duration);
  }

  return { toasts, toast, dismiss };
}
