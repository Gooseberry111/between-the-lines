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
    class="mx-auto flex max-w-sm flex-col gap-4 p-8"
  >
    <input
      v-if="mode === 'signup'"
      v-model="username"
      type="text"
      placeholder="Username"
      required
      class="rounded-lg border border-brown/20 bg-card px-4 py-2 font-body text-ink placeholder-brown/40"
    />
    <input
      v-model="email"
      type="email"
      placeholder="Email"
      required
      class="rounded-lg border border-brown/20 bg-card px-4 py-2 font-body text-ink placeholder-brown/40"
    />
    <input
      v-model="password"
      type="password"
      placeholder="Password"
      required
      class="rounded-lg border border-brown/20 bg-card px-4 py-2 font-body text-ink placeholder-brown/40"
    />
    <p v-if="errorMessage" class="font-body text-sm text-red-700">
      {{ errorMessage }}
    </p>
    <p v-if="successMessage" class="font-body text-sm text-green-700">
      {{ successMessage }}
    </p>
    <button
      type="submit"
      class="rounded-lg bg-brown px-4 py-2 font-body text-sm text-card hover:bg-brown/90"
    >
      {{ mode === "signup" ? "Sign up" : "Log in" }}
    </button>
    <button
      type="button"
      class="font-body text-sm text-brown/70 hover:text-ink"
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
