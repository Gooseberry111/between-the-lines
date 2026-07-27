import { ref, onUnmounted } from "vue";

export function useTTS() {
  const isSpeaking = ref(false);
  const isPaused = ref(false);
  const isSupported = "speechSynthesis" in window;

  function speak(text) {
    if (!isSupported || !text?.trim()) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 1;

    utterance.onstart = () => {
      isSpeaking.value = true;
      isPaused.value = false;
    };
    utterance.onend = () => {
      isSpeaking.value = false;
      isPaused.value = false;
    };
    utterance.onerror = () => {
      isSpeaking.value = false;
      isPaused.value = false;
    };

    window.speechSynthesis.speak(utterance);
  }

  function pause() {
    if (isSupported && window.speechSynthesis.speaking) {
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
    if (isSupported) window.speechSynthesis.cancel();
    isSpeaking.value = false;
    isPaused.value = false;
  }

  onUnmounted(stop);

  return { isSpeaking, isPaused, isSupported, speak, pause, resume, stop };
}
