<script setup>
import { ref } from "vue";
import { useAuth } from "../composables/useAuth";
const { signUp, signIn } = useAuth();

const mode = ref("login"); // 'login' or 'signup'
const email = ref("");
const password = ref("");
const username = ref("");
const errorMessage = ref("");

async function handleSubmit() {
  errorMessage.value = "";
  try {
    if (mode.value === "signup") {
      await signUp(email.value, password.value, username.value);
    } else {
      await signIn(email.value, password.value);
    }
  } catch (err) {
    errorMessage.value = err.message;
  }
}
</script>

<template>
  <form
    @submit.prevent="handleSubmit"
    class="flex flex-col gap-4 max-w-sm mx-auto"
  >
    <input
      v-if="mode === 'signup'"
      v-model="username"
      type="text"
      placeholder="Username"
      required
      class="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white"
    />
    <input
      v-model="email"
      type="email"
      placeholder="Email"
      required
      class="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white"
    />
    <input
      v-model="password"
      type="password"
      placeholder="Password"
      required
      class="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white"
    />
    <p v-if="errorMessage" class="text-sm text-red-400">{{ errorMessage }}</p>
    <button
      type="submit"
      class="rounded-lg bg-amber-300/20 px-4 py-2 text-amber-200 hover:bg-amber-300/30"
    >
      {{ mode === "signup" ? "Sign up" : "Log in" }}
    </button>
    <button
      type="button"
      class="text-sm text-white/50 hover:text-white/80"
      @click="mode = mode === 'signup' ? 'login' : 'signup'"
    >
      {{
        mode === "signup"
          ? "Already have an account? Log in"
          : "Don't have an account? Sign up"
      }}
    </button>
  </form>
</template>
