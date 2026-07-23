<script setup>
import { ref, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "../composables/useAuth";
const { signUp, signIn } = useAuth();
const router = useRouter();

const mode = ref("login"); // 'login' or 'signup'
const email = ref("");
const password = ref("");
const username = ref("");
const errorMessage = ref("");
const isSubmitting = ref(false);
const animateKey = ref(0);

async function handleSubmit() {
  errorMessage.value = "";
  isSubmitting.value = true;
  try {
    if (mode.value === "signup") {
      await signUp(email.value, password.value, username.value);
      password.value = "";
      await switchMode("login");
    } else {
      await signIn(email.value, password.value);
      router.push("/");
    }
  } catch (err) {
    errorMessage.value = err.message;
  } finally {
    isSubmitting.value = false;
  }
}

async function switchMode(next) {
  if (mode.value === next) return;
  errorMessage.value = "";
  mode.value = next;
  animateKey.value++;
  await nextTick();
}
</script>

<template>
  <div class="mx-auto flex max-w-5xl items-center justify-center px-8 py-16">
    <div
      :key="animateKey"
      class="animate-page-turn relative w-full max-w-md rounded-xl border border-brown/15 bg-card/90 p-10 shadow-[0_8px_30px_rgba(59,47,47,0.12)] backdrop-blur-sm"
    >
      <!-- corner flourishes -->
      <svg
        viewBox="0 0 60 60"
        class="absolute -left-3 -top-3 h-10 w-10 text-brown/25"
        fill="none"
        stroke="currentColor"
        stroke-width="1"
      >
        <path d="M2 30C2 14 14 2 30 2" />
        <path d="M8 30C8 18 18 8 30 8" />
        <circle cx="30" cy="2" r="1.6" fill="currentColor" stroke="none" />
      </svg>
      <svg
        viewBox="0 0 60 60"
        class="absolute -bottom-3 -right-3 h-10 w-10 rotate-180 text-brown/25"
        fill="none"
        stroke="currentColor"
        stroke-width="1"
      >
        <path d="M2 30C2 14 14 2 30 2" />
        <path d="M8 30C8 18 18 8 30 8" />
        <circle cx="30" cy="2" r="1.6" fill="currentColor" stroke="none" />
      </svg>

      <!-- heading -->
      <div class="mb-8 flex flex-col items-center gap-2 text-center">
        <p class="font-script text-4xl text-gold">Between the Lines</p>
        <h1 class="font-heading text-2xl font-medium text-ink">
          {{ mode === "signup" ? "Begin your page" : "Welcome back" }}
        </h1>
        <p class="font-body text-xs italic text-ink/60">
          {{
            mode === "signup"
              ? "Every poem starts with a single line."
              : "Your unfinished verses are waiting."
          }}
        </p>
      </div>

      <!-- tabs -->
      <div
        class="mb-8 flex items-center justify-center gap-8 font-body text-xs text-brown"
      >
        <button
          type="button"
          class="border-b pb-1 tracking-wide transition-colors"
          :class="
            mode === 'login'
              ? 'border-brown/60 text-ink'
              : 'border-transparent hover:text-ink'
          "
          @click="switchMode('login')"
        >
          LOG IN
        </button>
        <button
          type="button"
          class="border-b pb-1 tracking-wide transition-colors"
          :class="
            mode === 'signup'
              ? 'border-brown/60 text-ink'
              : 'border-transparent hover:text-ink'
          "
          @click="switchMode('signup')"
        >
          SIGN UP
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <input
          v-if="mode === 'signup'"
          v-model="username"
          type="text"
          placeholder="Username"
          required
          class="rounded-lg border border-brown/20 bg-parchment/40 px-4 py-2.5 font-body text-sm text-ink placeholder-brown/40 outline-none transition focus:border-gold/60 focus:ring-1 focus:ring-gold/40"
        />
        <input
          v-model="email"
          type="email"
          placeholder="Email"
          required
          class="rounded-lg border border-brown/20 bg-parchment/40 px-4 py-2.5 font-body text-sm text-ink placeholder-brown/40 outline-none transition focus:border-gold/60 focus:ring-1 focus:ring-gold/40"
        />
        <input
          v-model="password"
          type="password"
          placeholder="Password"
          required
          class="rounded-lg border border-brown/20 bg-parchment/40 px-4 py-2.5 font-body text-sm text-ink placeholder-brown/40 outline-none transition focus:border-gold/60 focus:ring-1 focus:ring-gold/40"
        />

        <p v-if="errorMessage" class="font-body text-sm text-red-700/90">
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="mt-2 rounded-lg bg-brown px-4 py-2.5 font-body text-sm tracking-wide text-card transition hover:bg-brown/90 disabled:opacity-60"
        >
          {{
            isSubmitting
              ? "Please wait…"
              : mode === "signup"
                ? "Sign up"
                : "Log in"
          }}
        </button>

        <button
          type="button"
          class="mt-1 font-body text-xs text-brown/70 transition hover:text-ink"
          @click="switchMode(mode === 'signup' ? 'login' : 'signup')"
        >
          {{
            mode === "signup"
              ? "Already have an account? Log in"
              : "Don't have an account? Sign up"
          }}
        </button>
      </form>
    </div>
  </div>
</template>
