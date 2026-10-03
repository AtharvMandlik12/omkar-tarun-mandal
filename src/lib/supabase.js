import { createClient } from "@supabase/supabase-js";

const normalizeSupabaseUrl = (value) => {
  if (!value) return "";
  const trimmed = String(value).trim().replace(/\/+$/, "");
  return trimmed
    .replace(/\/rest\/v1$/i, "")
    .replace(/\/auth\/v1$/i, "")
    .replace(/\/storage\/v1$/i, "")
    .replace(/\/functions\/v1$/i, "");
};

const isPlaceholderValue = (value) => {
  if (!value) return true;
  return (
    value.includes("your-project") ||
    value.includes("your-anon-key") ||
    value.includes("example.com") ||
    value.includes("placeholder") ||
    value.includes("/rest/v1")
  );
};

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !isPlaceholderValue(supabaseUrl) &&
    !isPlaceholderValue(supabaseAnonKey),
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const getSupabaseErrorMessage = (error) =>
  error?.message || "Unable to save information. Please try again.";
