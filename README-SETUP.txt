LUMIERE SALON OWNER DASHBOARD PATCH

Files:
- owner.html: owner dashboard page, does not load customer script.js (avoids duplicate SUPABASE_URL declaration)
- owner.js: dashboard logic with realtime popup and Firebase token registration
- style.css: existing salon stylesheet plus popup styles
- firebase-messaging-sw.js: Firebase background notification service worker

IMPORTANT:
1. Back up your existing files first.
2. Copy these files into the same folder as index.html and replace owner.html, owner.js, and style.css.
3. In owner.js, replace PASTE_YOUR_VAPID_PUBLIC_KEY_HERE with your saved Firebase Web Push public key.
4. Firebase push messages while the page is closed still require a trusted server-side sender (for example, a Supabase Edge Function). Do not put a Firebase service-account/private key in these files.
5. This dashboard must be served from HTTPS (GitHub Pages is fine) or localhost; opening owner.html directly as file:// prevents service workers and realtime WebSocket use reliably.
6. Supabase anonymous update/read policies in the current demo are not secure for a real salon. Add owner authentication and restrictive policies before production.
