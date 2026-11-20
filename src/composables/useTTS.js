import { ref, onUnmounted } from "vue";

// Reads a poem aloud one line at a time, exposing which line is being
// spoken so the reading view can highlight it. Speaking line by line also
// avoids Chrome's habit of cutting off long utterances after ~15 seconds.

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  const preferred = english.find((v) =>
    /natural|neural|premium|enhanced|samantha|daniel|google uk/i.test(v.name),
  );
  return preferred ?? english.find((v) => v.default) ?? english[0] ?? null;
}

export function useTTS() {
  const isSupported = "speechSynthesis" in window;
  const isSpeaking = ref(false);
  const isPaused = ref(false);
  const currentIndex = ref(-1); // index into the lines passed to speakLines

  // Bumped on every new run so late events from a cancelled run are ignored
  let session = 0;

  function finish(runId) {
    if (runId !== session) return;
    isSpeaking.value = false;
    isPaused.value = false;
    currentIndex.value = -1;
  }

  /** lines: array of strings. Empty strings are skipped. */
  function speakLines(lines) {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    const runId = ++session;

    const voice = pickVoice();
    const queue = lines
      .map((text, index) => ({ text: text.trim(), index }))
      .filter((item) => item.text);
    if (!queue.length) return;

    isSpeaking.value = true;
    isPaused.value = false;

    queue.forEach((item, i) => {
      const utterance = new SpeechSynthesisUtterance(item.text);
      if (voice) utterance.voice = voice;
      utterance.rate = 0.9;
      utterance.onstart = () => {
        if (runId === session) currentIndex.value = item.index;
      };
      if (i === queue.length - 1) utterance.onend = () => finish(runId);
      utterance.onerror = (e) => {
        if (e.error !== "interrupted" && e.error !== "canceled") finish(runId);
      };
      window.speechSynthesis.speak(utterance);
    });
  }

  function pause() {
    if (isSupported && isSpeaking.value) {
      window.speechSynthesis.pause();
      isPaused.value = true;
    }
  }

  function resume() {
    if (isSupported && isPaused.value) {
      window.speechSynthesis.resume();
      isPaused.value = false;
    }
  }

  function stop() {
    session++;
    if (isSupported) window.speechSynthesis.cancel();
    isSpeaking.value = false;
    isPaused.value = false;
    currentIndex.value = -1;
  }

  onUnmounted(stop);

  return {
    isSupported,
    isSpeaking,
    isPaused,
    currentIndex,
    speakLines,
    pause,
    resume,
    stop,
  };
}
