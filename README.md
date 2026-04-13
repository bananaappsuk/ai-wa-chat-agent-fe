# AI WhatsApp Chat Agent — Frontend

React + Vite + Tailwind UI for the WhatsApp AI CRM. Talks to the FastAPI backend at `VITE_API_URL`.

## Run locally

Prereqs: Node 18+, the backend running on `http://localhost:8000` (see `../be/README.md`).

```bash
npm install
cp .env.example .env   # then edit if your API URL is different
npm run dev
```

App runs on http://localhost:8080.

## Environment variables

| Name | Example | Notes |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8000` | Base URL of the FastAPI backend. The WebSocket URL is derived from this (`ws://…/ws/chat`). |

`VITE_*` vars are inlined at build time — restart `npm run dev` after changing `.env`.

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build locally
- `npm run lint` — eslint
- `npm test` — vitest run

## Deploy (Vercel)

1. Import the repo in Vercel — framework auto-detects as Vite.
2. Set `VITE_API_URL` to your deployed backend URL **before** the first build (Vite inlines it).
3. `vercel.json` handles the SPA rewrite, no extra config needed.
