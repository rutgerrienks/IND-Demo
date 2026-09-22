# Basisarchitectuur


De app is een single-page React-frontend met een dunne
Express-backend die uitsluitend als beveiligde proxy naar externe AI-diensten
dient (API-sleutels blijven server-side).

---

## 1. Overzicht op hoofdlijnen

```
Browser (React SPA)
   │
   │  statische assets + /api/*  (zelfde origin)
   ▼
Express server.js  ── proxy ──►  Azure OpenAI   (/api/generate)
   │
   └── serveert dist/ (Vite build) + SPA-fallback
```

- **Eén container, één poort (80).** De Express-server serveert zowel de
  gebouwde frontend (`dist/`) als de `/api/*`-endpoints. 
---

## 2. Frontend

### Framework & build
| Onderdeel | Library | Versie | Rol |
|-----------|---------|--------|-----|
| UI-framework | `react` / `react-dom` | ^19.2.7 | Component-UI, hooks-gebaseerd |
| Bundler/dev-server | `vite` | ^8.1.1 | Build (`vite build`) + dev-proxy naar `/api` |
| React-plugin | `@vitejs/plugin-react` | ^6.0.3 | JSX/Fast Refresh |
| Styling | `tailwindcss` | 3.4.17 | Utility-first styling, huisstijl van de client|
| CSS-pipeline | `postcss` + `autoprefixer` | ^8.5 / ^10.5 | Tailwind-compilatie, vendor-prefixes |
| Linting | `eslint` (+ react-hooks/react-refresh plugins) | ^10.6 | Code-kwaliteit |

Entry: [main.jsx] rendert
[App.jsx] in een `StrictMode`-root.

---

## 3. Backend (Express proxy)

[server.js]
`express` ^4.21.2. Serveert `dist/` statisch met SPA-fallback en biedt 
proxy-endpoints. Alle geheimen komen uit environment-variabelen (`.env`), nooit
uit de browser.

## 4. Runtime & deployment

| Onderdeel | Technologie | Detail |
|-----------|-------------|--------|
| Runtime | Node.js 22 (alpine) | |
| Container-build | Multi-stage Docker | Stage 1 `npm run build`; stage 2 productie met alleen `server.js` + `dist/` |
| Lokaal draaien | `docker-compose.yml` | Poort `8081:80`, `.env` injectie |
| Hosting | Azure App Service for Containers | |
| AI-model (tekst) | Azure OpenAI deployment `gpt-chat-latest` | Via `/api/generate` |

> `nginx.conf` is aanwezig als restant van een eerdere static-only opzet; de
> huidige container serveert via Node/Express, niet via nginx.
