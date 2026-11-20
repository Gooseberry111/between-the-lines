import { ref } from "vue";
import { supabase } from "../lib/supabase";

const user = ref(null);

export function useAuth() {
  async function signUp(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });
    if (error) throw error;
    return data;
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    user.value = data.user;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
    user.value = null;
    // Drop cached API responses so the next person on this device
    // can't read this account's poems offline
    try {
      await caches.delete("btl-api");
    } catch {
      /* Cache API unavailable */
    }
  }

  async function getCurrentUser() {
    const { data } = await supabase.auth.getUser();
    user.value = data.user;
    return data.user;
  }

  return { user, signUp, signIn, signOut, getCurrentUser };
}
