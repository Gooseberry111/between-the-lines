import { watch, onBeforeUnmount } from "vue";

// Stops the page behind an open panel (menu, sheet, dialog) from scrolling.
//
// `overflow: hidden` alone isn't enough on iPhone Safari, so the body is
// pinned in place with position: fixed at the current scroll offset, then
// restored to exactly the same spot when the last panel closes.
// Reference-counted so stacked panels don't unlock each other early.

let locks = 0;
let savedScrollY = 0;
const PINNED = ["position", "top", "left", "right", "width", "overflow"];

function lock() {
  if (locks++ > 0) return;
  savedScrollY = window.scrollY;
  Object.assign(document.body.style, {
    position: "fixed",
    top: `-${savedScrollY}px`,
    left: "0",
    right: "0",
    width: "100%",
    overflow: "hidden",
  });
  // No rubber-band bounce of the page underneath
  document.documentElement.style.overscrollBehavior = "none";
}

function unlock() {
  if (locks === 0 || --locks > 0) return;
  for (const prop of PINNED) document.body.style[prop] = "";
  document.documentElement.style.overscrollBehavior = "";
  window.scrollTo(0, savedScrollY);
}

/** Locks page scrolling while `isOpen()` is true. */
export function useScrollLock(isOpen) {
  let held = false;
  watch(
    isOpen,
    (open) => {
      if (open && !held) {
        lock();
        held = true;
      } else if (!open && held) {
        unlock();
        held = false;
      }
    },
    { immediate: true },
  );
  onBeforeUnmount(() => {
    if (held) unlock();
  });
}
