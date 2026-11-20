import { ref, watch } from "vue";

// Focus mode hides the site chrome so only the poem is on screen.
const focusMode = ref(false);

// Reading text size, remembered per browser.
// Each step is one notch smaller on phones so lines wrap less.
export const TEXT_SIZES = [
  "text-[15px] leading-7 sm:text-base sm:leading-8",
  "text-base leading-8 sm:text-lg sm:leading-9",
  "text-lg leading-9 sm:text-xl sm:leading-10",
  "text-xl leading-10 sm:text-2xl sm:leading-[2.75rem]",
  "text-2xl leading-[2.75rem] sm:text-3xl sm:leading-[3.25rem]",
];

function readSize() {
  try {
    const n = Number(localStorage.getItem("reading-size"));
    const stored = localStorage.getItem("reading-size");
    return stored !== null && Number.isInteger(n) && n >= 0 && n < TEXT_SIZES.length
      ? n
      : 2;
  } catch {
    return 2;
  }
}

const textSize = ref(readSize());
watch(textSize, (n) => {
  try {
    localStorage.setItem("reading-size", String(n));
  } catch {
    /* ignore */
  }
});

export function useUI() {
  function biggerText() {
    textSize.value = Math.min(textSize.value + 1, TEXT_SIZES.length - 1);
  }
  function smallerText() {
    textSize.value = Math.max(textSize.value - 1, 0);
  }

  return { focusMode, textSize, biggerText, smallerText };
}
