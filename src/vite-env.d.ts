/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Public site origin for auth email redirects (no trailing slash). */
  readonly VITE_APP_URL?: string;
  /** Public RevenueCat iOS SDK key. Optional until App Store products are live. */
  readonly VITE_REVENUECAT_IOS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
