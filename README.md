# CleanMatch — frontend

**CleanMatch** connects homeowners with independent cleaners. You swipe through profiles,
a mutual like opens a chat, and you book a cleaning slot that the other side confirms.

This repository is the Angular web app. The REST API lives in
[cleanersapp-backend](https://github.com/annekwaro/cleanersapp-backend) (Spring Boot, JWT,
PostgreSQL).

<!-- Live demo: add the Vercel link here -->

## Tech stack

Angular 17 (standalone components, signals, functional guards and interceptors) ·
TypeScript · Tailwind CSS 4 · deployed on Vercel, with the API on Render

## Features

- **Browse without an account.** First-time visitors see a one-screen welcome, then the
  swipe deck. Their likes are kept in the browser and sent to the API as soon as they sign
  up or log in, so nothing is lost. Screens that need an account show a sign-up prompt instead of blocking the visitor.
- **Swipe and match.** Homeowners see cleaners and cleaners see homeowners. A mutual like
  shows a "match" screen and opens a conversation.
- **Chat.** A full-screen conversation view for each match.
- **Bookings.** Propose a date, duration, address and notes; the other person confirms or
  declines. Bookings can then be cancelled, completed by the cleaner and rated by the
  homeowner. The buttons shown come from flags the API sends (`canRespond`, `canCancel`,
  `canComplete`, `canRate`), so the screen always matches the server's rules.
- **Direct requests.** Homeowners can request a cleaner straight from their profile when
  the cleaner allows it, without waiting for a match.
- **Earnings tab for cleaners**, only reachable with the cleaner role (route guard).
- **Profile strength.** A weighted checklist shows users which details make their profile
  more likely to be matched; the checks differ for cleaners and homeowners.
- **Fast first load.** At build time, a script saves the public cleaner list into the app.
  The landing page can show profiles immediately while the free-tier backend on Render is
  still waking up, and the build still succeeds if the backend doesn't answer.

## Project structure

```
src/app/
├── core/       API service, auth service and JWT interceptor, route guards,
│               booking store, models and formatting helpers
├── features/   one folder per screen: auth, home and swipe, messages, chat,
│               bookings (schedule), earnings, profile
└── shared/     reusable UI: swipe deck, profile card, booking sheet, match modal…
```

Routes use guards for three cases: guests only (login and sign-up pages), logged-in users,
and cleaners only. The JWT is added to API requests by an HTTP interceptor.

## Run it locally

Requires Node.js 18.13+ or 20.

```bash
npm install
npm start          # http://localhost:4200
```

The app talks to the deployed API (`src/app/core/services/api.service.ts`). To use a local
backend, change `API_URL` to `http://localhost:8080/api`.

```bash
npm run build      # saves the cleaner snapshot, then builds to dist/
```
