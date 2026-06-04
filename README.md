# Digit Duel

Digit Duel is a Supabase-powered multiplayer number guessing game built with Vite and React. Players register with a username and password, search for rivals, send challenges, and play a two-player secret-code duel in a shared game room.

## What is included

- A React frontend with pages for register, login, dashboard, game selection, player search, challenge inbox, profile management, head-to-head stats, and the realtime game room.
- A Supabase service layer for auth, challenges, profile updates, avatar uploads, notifications, and game actions.
- A SQL migration at `supabase/migrations/001_digit_duel_initial.sql` covering tables, functions, row-level security, storage, and realtime configuration.

## Run it locally

1. Install dependencies with `npm install`.
2. Create a `.env.local` file based on `.env.example`.
3. Run the SQL migration inside your Supabase SQL editor.
4. In `Authentication -> Providers -> Email`, make sure the Email provider is enabled.
5. In that same Email provider configuration, disable email confirmation if you want username-only auth with generated `@digitduel.local` addresses.
6. Start the app with `npm run dev`.

## Project structure

- `src/context/AuthContext.jsx`: session and profile bootstrap logic.
- `src/lib/auth.js`: username-based register/login helpers.
- `src/lib/api.js`: game, challenge, profile, and notification queries.
- `src/pages/*`: route-level UI for each part of the product.
- `supabase/migrations/001_digit_duel_initial.sql`: schema and database logic.

## Notes

- Secret numbers are stored as text so leading zeroes are preserved.
- The frontend only uses the Supabase anon key. Do not place any `service_role` key in the app.
- Realtime listeners refresh the dashboard and game room as rows change.
