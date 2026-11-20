import { ref } from "vue";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export function useAccount() {
  const { user, signOut } = useAuth();
  const isSaving = ref(false);
  const errorMessage = ref("");
  const successMessage = ref("");

  async function updateUsername(newUsername) {
    isSaving.value = true;
    errorMessage.value = "";
    successMessage.value = "";
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username: newUsername })
        .eq("id", user.value.id);
      if (error) throw error;
      // Keep the auth metadata in sync — the header reads the name from it
      const { data } = await supabase.auth.updateUser({
        data: { username: newUsername },
      });
      if (data?.user) user.value = data.user;
      successMessage.value = "Username updated.";
    } catch (err) {
      errorMessage.value = err.message;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateBio(bio) {
    isSaving.value = true;
    errorMessage.value = "";
    successMessage.value = "";
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ bio: bio || null })
        .eq("id", user.value.id);
      if (error) throw error;
      successMessage.value = "Bio updated.";
    } catch (err) {
      errorMessage.value = err.message;
    } finally {
      isSaving.value = false;
    }
  }

  async function updatePassword(newPassword) {
    isSaving.value = true;
    errorMessage.value = "";
    successMessage.value = "";
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      successMessage.value = "Password updated.";
    } catch (err) {
      errorMessage.value = err.message;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteAccount() {
    isSaving.value = true;
    errorMessage.value = "";
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      await signOut();
    } catch (err) {
      errorMessage.value = err.message;
    } finally {
      isSaving.value = false;
    }
  }

  return {
    isSaving,
    errorMessage,
    successMessage,
    updateUsername,
    updateBio,
    updatePassword,
    deleteAccount,
  };
}
