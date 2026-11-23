# MERIDIAN — AI Business Tower

[![Made with pollinations.ai](https://raw.githubusercontent.com/pollinations/pollinations/main/packages/ui/src/brand/badge-made-with.svg)](https://pollinations.ai/?ref=badge)

A live skyscraper of AI-run companies built for Pollinations Quest #17999. Six floors, six original companies, real published Pollinations agents, and Pollinations Pay (BYOP) so every run is billed to the visitor's own Pollen.

Live app: https://mattsurini.github.io/pollinations-ai-business-tower/
Quest: https://github.com/pollinations/pollinations/issues/17999

## What it does

- Turn or drag the cinematic 3D tower, ride the elevator between six floors, and step into an office.
- Browse the company directory, read each company's crew, goals, tools and work orders.
- Connect with Pollinations Pay (OAuth 2.1 authorization code + PKCE) and run real agents via `POST /v1/chat/completions`.
- Watch multi-stage work, review the deliverable, then approve, reject or request a revision. Revision requests make another real agent call.
- See token usage and the cost of each run, computed from the discovered agent's published rates.
- Apply to rent a floor. Applications are saved in the browser only — this MVP has no leasing backend.
- If WebGL is unavailable or reduced motion is requested, the tower becomes an accessible floor-stack view.

## How it differs from the existing submissions

Polli Towers and Towers centre on rotating a tower and running a generic "workday". MERIDIAN is built around the **work order**: every company has named agent roles, explicit stage-by-stage workflows, a founder decision gate with real revision loops, and per-run usage/cost accounting from live API responses. The tower is an operator console rather than a directory with a 3D wrapper, and the branded identity (obsidian + teal + amber, architectural grid, mono data labels) is original.

## Real API integration

- Agents are **discovered at runtime** from `GET https://gen.pollinations.ai/text/models?agent=true`, filtered to healthy agents that support `/v1/chat/completions`. Company configs only hold a priority list of preferred agent IDs; if one is unpublished the app falls back to another live agent.
- Authorization: in-browser OAuth code flow with PKCE against `https://enter.pollinations.ai`, optional `pk_` App Key via `VITE_POLLINATIONS_APP_KEY`. The returned `sk_` key is kept in memory and `sessionStorage` only — never `localStorage`, never logged.
- Generation: `POST https://gen.pollinations.ai/v1/chat/completions` with the visitor's key. Budget/expiry are chosen on the consent screen (defaults 10 USD / 7 days).
- Balance: `GET /account/balance`; key validity: `GET /account/key`.
- Failures (401, 402, 403, 404, 429, 400, 5xx, network) map to specific messages. A failed run never produces a fake deliverable.
- **Demo mode is explicit.** With no connected wallet, "Run demo" prints a labelled sample containing no agent output and no usage. It is never presented as a live result.

No app-owner key is embedded, and no request is proxied through a server the owner pays for.

## Local setup

```bash
npm install
cp .env.example .env      # optional: add a pk_ App Key created at enter.pollinations.ai/keys
npm run dev
npm test
npm run build
```

If an App Key is set, add `http://localhost:5173/` as a Redirect URI on that key. Without one, BYOP still works and the consent screen shows your hostname.

## Deploy

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`. Pages must be configured with the "GitHub Actions" build source. Set `VITE_POLLINATIONS_APP_KEY` as a repository variable only if you have an App Key; add the live Pages URL as its Redirect URI.

## Layout

```
src/data/companies.ts   six companies, crews, work orders, preferred agent IDs
src/lib/pollinations.ts OAuth PKCE, discovery, generation, balance, error mapping
src/lib/cost.ts         token aggregation and pollen cost
src/lib/demo.ts         explicitly labelled sample output
src/lib/storage.ts      local run/application persistence
src/components/         tower (R3F + CSS fallback), office, directory, dashboard, lease form
src/App.tsx             state, run orchestration, human decision loop
```

## Tests

`npm test` covers PKCE shape, error mapping, agent fallback, cost arithmetic and demo labelling. `npm run build` type-checks and produces the static bundle.
