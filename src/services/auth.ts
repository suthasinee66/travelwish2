
import { supabase } from "@/lib/supabase";

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    console.error("Google OAuth error:", error);
    throw error;
  }

  console.log("Google OAuth URL:", data.url);

  return data;
};
