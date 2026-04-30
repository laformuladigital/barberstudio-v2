const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Missing Supabase environment variables. Copy the root .env.example into apps/web/.env.local.");
}

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const env = {
  appName: (import.meta.env.VITE_APP_NAME as string | undefined) ?? "Barber Studio",
  appDomain: (import.meta.env.VITE_APP_DOMAIN as string | undefined) ?? "http://localhost:5173",
  supabaseUrl: supabaseUrl ?? "https://missing-config.supabase.co",
  supabaseAnonKey: supabaseAnonKey ?? "missing-anon-key",
};
