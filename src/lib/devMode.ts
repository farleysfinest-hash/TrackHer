export const IS_DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

if (IS_DEV_MODE) {
  console.log(
    '%c🧪 DEV MODE ACTIVE — Supabase bypassed, using mock data',
    'background: #BE739A; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold;',
  );
}
