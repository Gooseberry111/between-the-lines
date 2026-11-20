<script setup>
// Turns a single line into a portrait quote card (1080×1350, the size
// Instagram and Stories like) that can be downloaded or shared.
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useToast } from "../composables/useToast";
import Icon from "./ui/Icon.vue";

const props = defineProps({
  line: { type: String, required: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
});
const emit = defineEmits(["close"]);
const { toast } = useToast();

const canvasRef = ref(null);
const style = ref("paper"); // "paper" | "ink"
const canShareFiles = ref(false);

const W = 1080;
const H = 1350;
const STYLES = {
  paper: { bg: "#f8f5ef", ink: "#1d1b18", muted: "#6b645a", accent: "#9b3b25", rule: "#e4ded2" },
  ink: { bg: "#1d1b18", ink: "#f3eee5", muted: "#a79f93", accent: "#e3876b", rule: "#3a3631" },
};

function wrap(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function draw() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const c = STYLES[style.value];
  const ctx = canvas.getContext("2d");

  // Make sure the web fonts are ready before drawing with them
  try {
    await Promise.all([
      document.fonts.load('400 72px "Newsreader"'),
      document.fonts.load('italic 400 40px "Newsreader"'),
      document.fonts.load('600 26px "Inter"'),
    ]);
  } catch {
    /* fall back to system fonts */
  }

  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);

  // Hairline frame
  ctx.strokeStyle = c.rule;
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 60, W - 120, H - 120);

  // The line itself, sized to fit
  const text = `“${props.line.trim()}”`;
  let size = 76;
  let lines;
  do {
    ctx.font = `400 ${size}px "Newsreader", Georgia, serif`;
    lines = wrap(ctx, text, W - 280);
    size -= 4;
  } while (lines.length * size * 1.35 > 640 && size > 36);
  size += 4;
  const lineHeight = size * 1.35;
  const blockHeight = lines.length * lineHeight;
  let y = (H - blockHeight) / 2 - 40;

  // Accent rule above
  ctx.fillStyle = c.accent;
  ctx.fillRect(140, y - 70, 64, 4);

  ctx.fillStyle = c.ink;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  for (const l of lines) {
    ctx.fillText(l, 140, y);
    y += lineHeight;
  }

  // Attribution
  y += 40;
  ctx.fillStyle = c.muted;
  ctx.font = 'italic 400 40px "Newsreader", Georgia, serif';
  const titleLines = wrap(ctx, props.title, W - 280).slice(0, 2);
  for (const l of titleLines) {
    ctx.fillText(l, 140, y);
    y += 52;
  }
  ctx.font = '600 26px "Inter", system-ui, sans-serif';
  ctx.fillText(props.author.toUpperCase().split("").join(" "), 140, y + 14);

  // Wordmark
  ctx.textAlign = "center";
  ctx.fillStyle = c.muted;
  ctx.font = '400 30px "Newsreader", Georgia, serif';
  ctx.fillText("Between the Lines", W / 2, H - 130);
}

function toBlob() {
  return new Promise((resolve) => canvasRef.value.toBlob(resolve, "image/png"));
}

function fileName() {
  return `${props.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "poem"}-line.png`;
}

async function download() {
  const blob = await toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName();
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Image saved", "success");
}

async function share() {
  const blob = await toBlob();
  const file = new File([blob], fileName(), { type: "image/png" });
  try {
    await navigator.share({ files: [file], title: props.title });
  } catch (err) {
    if (err?.name !== "AbortError") toast("Sharing didn't work — try saving instead.", "error");
  }
}

function onKeydown(e) {
  if (e.key === "Escape") emit("close");
}

onMounted(async () => {
  document.addEventListener("keydown", onKeydown);
  document.body.style.overflow = "hidden";
  try {
    canShareFiles.value = !!navigator.canShare?.({
      files: [new File([new Blob()], "x.png", { type: "image/png" })],
    });
  } catch {
    canShareFiles.value = false;
  }
  await nextTick();
  draw();
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = "";
});

watch(style, draw);
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6"
    role="dialog"
    aria-modal="true"
    aria-label="Share line as image"
    @click.self="emit('close')"
  >
    <div
      class="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl"
    >
      <div class="flex items-center justify-between border-b border-rule px-5 py-3">
        <p class="text-sm font-medium text-ink">Share this line</p>
        <button class="icon-btn -mr-2" aria-label="Close" @click="emit('close')">
          <Icon name="x" />
        </button>
      </div>

      <div class="overflow-y-auto p-5">
        <canvas
          ref="canvasRef"
          :width="W"
          :height="H"
          class="mx-auto block w-full max-w-[18rem] rounded-lg shadow-md"
          aria-label="Preview of the quote image"
        />

        <div class="mt-5 flex justify-center gap-1 rounded-full bg-ink/5 p-1" role="radiogroup" aria-label="Card style">
          <button
            v-for="s in ['paper', 'ink']"
            :key="s"
            role="radio"
            :aria-checked="style === s"
            class="flex-1 rounded-full py-1.5 text-sm capitalize transition"
            :class="style === s ? 'bg-surface font-medium text-ink shadow-sm' : 'text-muted'"
            @click="style = s"
          >
            {{ s }}
          </button>
        </div>
      </div>

      <div class="flex gap-2 border-t border-rule px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button class="btn btn-secondary flex-1" @click="download">
          <Icon name="download" :size="15" /> Save image
        </button>
        <button v-if="canShareFiles" class="btn btn-primary flex-1" @click="share">
          <Icon name="share" :size="15" /> Share
        </button>
      </div>
    </div>
  </div>
</template>
