import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fnwkzvntkjjzqxerqxvs.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZud2t6dm50a2pqenF4ZXJxeHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MTUzMTksImV4cCI6MjEwMDI5MTMxOX0.ZAMgkAOx38CxCdhKJvyOl76n5bAo5wxKCBju8Q9GVaY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
