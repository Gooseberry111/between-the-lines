<script setup>
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "../composables/useAuth";
import { useTheme } from "../composables/useTheme";
import { safeRedirect } from "../lib/redirect";
import Icon from "./ui/Icon.vue";

const { signUp, signIn } = useAuth();
const { isDark, toggleTheme } = useTheme();
const router = useRouter();
const route = useRoute();

const mode = ref("login"); // "login" | "signup"
const email = ref("");
const password = ref("");
const username = ref("");
const showPassword = ref(false);
const errorMessage = ref("");
const infoMessage = ref("");
const isSubmitting = ref(false);

const isSignup = computed(() => mode.value === "signup");

// Go back to the page the reader was trying to open, if any
function goOnward() {
  router.push(safeRedirect(route.query.redirect) ?? "/");
}

async function handleSubmit() {
  errorMessage.value = "";
  infoMessage.value = "";
  isSubmitting.value = true;
  try {
    if (isSignup.value) {
      const data = await signUp(email.value, password.value, username.value.trim());
      password.value = "";
      if (data.session) {
        goOnward(); // email confirmation is off
      } else {
        switchMode("login");
        infoMessage.value = "Account created. Check your email to confirm it, then log in.";
      }
    } else {
      await signIn(email.value, password.value);
      goOnward();
    }
  } catch (err) {
    errorMessage.value = err.message;
  } finally {
    isSubmitting.value = false;
  }
}

function switchMode(next) {
  if (mode.value === next) return;
  errorMessage.value = "";
  infoMessage.value = "";
  mode.value = next;
}
</script>

<template>
  <div class="grid min-h-screen lg:grid-cols-2">
    <!-- Left: a poem -->
    <aside class="relative hidden flex-col justify-between bg-ink p-12 text-paper lg:flex">
      <p class="font-serif text-2xl tracking-tight">
        Between <span class="italic">the</span> Lines
      </p>

      <figure class="max-w-lg">
        <blockquote class="font-serif text-[1.7rem] leading-snug italic xl:text-3xl">
          <p>“Hope” is the thing with feathers</p>
          <p>That perches in the soul</p>
          <p>And sings the tune without the words</p>
          <p>And never stops at all</p>
        </blockquote>
        <figcaption class="mt-6 text-sm text-paper/60">Emily Dickinson</figcaption>
      </figure>

      <p class="text-sm text-paper/50">A quiet place to write, read and listen to poetry.</p>
    </aside>

    <!-- Right: form -->
    <main class="relative flex items-center justify-center px-6 py-16">
      <button
        class="icon-btn absolute top-5 right-5"
        :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="toggleTheme"
      >
        <Icon :name="isDark ? 'sun' : 'moon'" />
      </button>

      <div class="w-full max-w-sm">
        <p class="mb-10 text-center font-serif text-2xl tracking-tight lg:hidden">
          Between <span class="italic">the</span> Lines
        </p>

        <h1 class="font-serif text-4xl tracking-tight text-ink">
          {{ isSignup ? "Begin your page." : "Welcome back." }}
        </h1>
        <p class="mt-2 text-sm text-muted">
          {{ isSignup ? "Every poem starts with a single line." : "Your unfinished verses are waiting." }}
        </p>

        <!-- Segmented control -->
        <div class="mt-8 flex gap-1 rounded-full bg-ink/5 p-1" role="tablist">
          <button
            v-for="m in [{ key: 'login', label: 'Log in' }, { key: 'signup', label: 'Sign up' }]"
            :key="m.key"
            type="button"
            role="tab"
            :aria-selected="mode === m.key"
            class="flex-1 rounded-full py-2 text-sm transition"
            :class="mode === m.key ? 'bg-surface font-medium text-ink shadow-sm' : 'text-muted hover:text-ink'"
            @click="switchMode(m.key)"
          >
            {{ m.label }}
          </button>
        </div>

        <form class="mt-6 flex flex-col gap-4" @submit.prevent="handleSubmit">
          <div v-if="isSignup">
            <label for="username" class="label">Pen name</label>
            <input id="username" v-model="username" type="text" class="input" autocomplete="username" required maxlength="40" />
          </div>
          <div>
            <label for="email" class="label">Email</label>
            <input id="email" v-model="email" type="email" class="input" autocomplete="email" required />
          </div>
          <div>
            <label for="password" class="label">Password</label>
            <div class="relative">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="input pr-11"
                :autocomplete="isSignup ? 'new-password' : 'current-password'"
                :minlength="isSignup ? 6 : undefined"
                required
              />
              <button
                type="button"
                class="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1.5 text-faint hover:text-ink"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              >
                <Icon :name="showPassword ? 'eye-off' : 'eye'" :size="16" />
              </button>
            </div>
            <p v-if="isSignup" class="mt-1.5 text-xs text-faint">At least 6 characters.</p>
          </div>

          <p v-if="errorMessage" class="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent" role="alert">
            {{ errorMessage }}
          </p>
          <p v-if="infoMessage" class="rounded-lg bg-ink/5 px-3 py-2 text-sm text-ink" role="status">
            {{ infoMessage }}
          </p>

          <button type="submit" class="btn btn-primary mt-2 w-full py-2.5" :disabled="isSubmitting">
            {{ isSubmitting ? "One moment…" : isSignup ? "Create account" : "Log in" }}
          </button>
        </form>
      </div>
    </main>
  </div>
</template>
