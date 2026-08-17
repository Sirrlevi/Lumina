# Production Telegram identity-data fix

The research delivery endpoint now verifies the Firebase ID token server-side with Firebase Admin and loads the authenticated user's canonical profile from `users/{uid}` before building the Telegram message.

Telegram identity fields are therefore sourced from Firestore server-side:
- name
- username
- email
- countryCode + phone
- account status based on prior history

The browser can no longer override username or phone in the Telegram payload.

## Required production environment variables

Keep the existing Firebase and Telegram variables, and ensure these Firebase Admin variables are configured on the server/runtime (never `NEXT_PUBLIC_`):

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

`FIREBASE_ADMIN_PRIVATE_KEY` may contain escaped `\\n`; the server normalizes it.

## Test

Register a fresh test account with a deliberately recognizable username and phone number, complete an opted-in research scan, then verify the Telegram message contains the same username and phone. Do not put passwords in Telegram or environment variables intended for the browser.
