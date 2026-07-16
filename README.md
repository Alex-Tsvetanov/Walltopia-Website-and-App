# Walltopia Preliminary Loads — web + mobile

A tool that reproduces Walltopia's preliminary-load Excel tables and manuals for artificial
climbing / boulder structures, with accounts, saved projects (tags + custom properties), a
filterable dashboard, and per-project questions. One backend, two clients that call the **same
REST API**.

```
VasiDiplomna/
├── server/    Node/Express + MongoDB Atlas backend + REST API   (see server/API.md)
├── web/       React (Vite) frontend — same features as the mobile app
├── mobile/    React Native (Expo) app — same REST calls as web
└── website/   the original vanilla-JS site (superseded by web/; kept for reference)
```

## How the pieces fit

- **server/** exposes `/api/*` (auth, projects, questions) and `GET /api/loads` (the load
  tables). Auth is a JWT accepted from **either** an httpOnly cookie (web) **or** an
  `Authorization: Bearer` header (mobile); login/register return the token in the body.
  It also serves the built web app (`web/dist`) in production.
- **web/** and **mobile/** share the calculation logic verbatim (`src/lib/loads.js`) and hit the
  same endpoints — the difference is only the auth transport (cookie vs Bearer/SecureStore) and
  the UI layer (DOM vs React Native).

## Run everything

1. **Backend** — `cd server && npm install && npm start` → `http://localhost:8787`
   (needs `server/.env`; see [server/README.md](server/README.md) for MongoDB Atlas + DNS notes).
2. **Web** — dev: `cd web && npm install && npm run dev` → `http://localhost:5173` (proxies `/api`
   to the backend). Prod: `npm run build` → the backend serves `web/dist` at `http://localhost:8787`.
3. **Mobile** — `cd mobile && npm install && npm start`, open in Expo Go / a simulator. Set
   `expo.extra.apiBase` in `mobile/app.json` to a URL the phone can reach (your machine's LAN IP,
   e.g. `http://192.168.1.100:8787/api`, or a deployed server).

## Features (all clients)

Load calculator (wall/boulder, EU/US units, force levels, applicability check) · register/login ·
save calculations as **projects** with **tags** + **custom properties** · **dashboard** with
search / tag filter / sort · open & edit a project, save changes or save-as-new · **ask Walltopia**
questions about a saved design. Branded 1-to-1 to walltopia.com.

See [server/API.md](server/API.md) for the endpoint contract shared by both clients.
