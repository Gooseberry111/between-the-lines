<script setup>
// One consistent line-icon set for the whole app (24px grid, 1.6 stroke).
const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 18 },
  filled: { type: Boolean, default: false },
});

const ICONS = {
  "arrow-left": ["M19 12H5", "M12 19l-7-7 7-7"],
  "arrow-right": ["M5 12h14", "M12 5l7 7-7 7"],
  play: ["M7 4.5v15l12-7.5z"],
  pause: ["M8 5v14", "M16 5v14"],
  stop: ["M6.5 6.5h11v11h-11z"],
  volume: ["M11 5 6 9H2v6h4l5 4z", "M15.5 8.5a5 5 0 0 1 0 7", "M19 5a10 10 0 0 1 0 14"],
  music: [
    "M9 18V5l12-2v13",
    "M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "M18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  ],
  heart: ["M19.5 12.57 12 20l-7.5-7.43A5 5 0 1 1 12 6a5 5 0 1 1 7.5 6.57z"],
  bookmark: ["M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"],
  share: ["M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7", "M16 6l-4-4-4 4", "M12 2v13"],
  copy: ["M9 9h11v11H9z", "M5 15H4V4h11v1"],
  link: [
    "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",
    "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  ],
  sun: [
    "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    "M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41",
  ],
  moon: ["M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"],
  search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "M21 21l-4.3-4.3"],
  menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
  x: ["M6 6l12 12", "M18 6 6 18"],
  plus: ["M12 5v14", "M5 12h14"],
  minus: ["M5 12h14"],
  expand: [
    "M8 3H5a2 2 0 0 0-2 2v3",
    "M21 8V5a2 2 0 0 0-2-2h-3",
    "M3 16v3a2 2 0 0 0 2 2h3",
    "M16 21h3a2 2 0 0 0 2-2v-3",
  ],
  shrink: [
    "M8 3v3a2 2 0 0 1-2 2H3",
    "M21 8h-3a2 2 0 0 1-2-2V3",
    "M3 16h3a2 2 0 0 1 2 2v3",
    "M16 21v-3a2 2 0 0 1 2-2h3",
  ],
  pen: ["M12 20h9", "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"],
  trash: ["M3 6h18", "M8 6V4h8v2", "M19 6l-1 14H6L5 6"],
  eye: ["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  "eye-off": [
    "M9.9 4.24A9 9 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-2.16 3.19",
    "M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9 9 0 0 0 5.4-1.6",
    "M2 2l20 20",
  ],
  user: ["M20 21a8 8 0 0 0-16 0", "M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z"],
  logout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"],
  check: ["M20 6 9 17l-5-5"],
  library: [
    "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z",
    "M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5",
  ],
  type: ["M4 7V4h16v3", "M9 20h6", "M12 4v16"],
  more: ["M12 12h.01", "M19 12h.01", "M5 12h.01"],
  bell: ["M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", "M10.3 21a1.94 1.94 0 0 0 3.4 0"],
  image: [
    "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
    "M9 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    "M21 15l-5-5L5 21",
  ],
  message: ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
  download: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M7 10l5 5 5-5", "M12 15V3"],
  history: ["M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5", "M12 7v5l4 2"],
  sparkle: ["M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z", "M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z"],
  shuffle: ["M16 3h5v5", "M4 20 21 3", "M21 16v5h-5", "M15 15l6 6", "M4 4l5 5"],
  "user-plus": ["M16 21a6 6 0 0 0-12 0", "M10 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M19 8v6", "M22 11h-6"],
  quote: ["M3 21c3 0 7-1 7-8V5H3v7h4c0 4-4 5-4 5", "M14 21c3 0 7-1 7-8V5h-7v7h4c0 4-4 5-4 5"],
};

const paths = () => ICONS[props.name] ?? [];
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="filled ? 'currentColor' : 'none'"
    stroke="currentColor"
    :stroke-width="name === 'more' ? 3 : 1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="shrink-0"
  >
    <path v-for="(d, i) in paths()" :key="i" :d="d" />
  </svg>
</template>
