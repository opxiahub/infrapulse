<p align="center">
  <img src="client/public/infrapulse.png" alt="InfraPulse" width="640" />
</p>

<h1 align="center">InfraPulse</h1>

<p align="center">
  Connect your cloud and Kubernetes environments, discover what's running, and explore it as an interactive dependency graph.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
</p>

---

## Why InfraPulse?

Cloud consoles show your resources one service and one account at a time, leaving you to piece together how things actually connect. InfraPulse pulls AWS, GCP, Azure, and Kubernetes into a single, self-hosted view and renders the relationships as a graph you can explore — so you can understand your infrastructure at a glance instead of clicking through a dozen console tabs.

## What it does

InfraPulse is a self-hosted, full-stack app that gives you a live, visual map of your infrastructure.

- **Connect anywhere** — AWS, GCP, Azure, and Kubernetes clusters (EKS, GKE, AKS, ROSA), using read-only credentials you provide.
- **Discover resources** — scan accounts and clusters to pull in compute, networking, storage, database, security, and messaging resources.
- **Visualize dependencies** — see how resources relate to each other as an interactive graph, and drill into any node for details.
- **Inspect Kubernetes** — view deployment details and stream pod logs.
- **Ask questions** — query your scanned AWS infrastructure in plain English with optional AI chat.

All credentials are encrypted at rest, and scanned data is cached locally in SQLite — nothing leaves your machine except calls to the cloud providers you connect (and OpenAI, if you enable AI chat).

## Tech stack

| Layer    | Technologies |
|----------|--------------|
| Frontend | React, Vite, TypeScript, Tailwind CSS, React Flow |
| Backend  | Node.js, Express, TypeScript, Passport.js, Socket.IO |
| Data     | SQLite (with SQL migrations) |
| Cloud    | AWS SDK v3, GCP, Azure, and Kubernetes clients |
| AI       | OpenAI API (optional) |

## Quick start

**Prerequisites:** Node.js `>=20.19.0 <23` (Node 22 recommended) and npm.

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env

# 3. Set the required secrets in .env (see below)

# 4. Run the app
npm run dev
```

Then open **http://localhost:5173**. The backend runs on `http://localhost:3000`, and Vite proxies `/api` and `/socket.io` to it in development.

### Configuration

At minimum, set these in `.env`:

```env
SESSION_SECRET=replace-with-a-long-random-secret
CREDENTIAL_ENCRYPTION_KEY=replace-with-a-32-character-or-longer-secret
```

Optional features:

```env
# Google OAuth login
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AI chat
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4
```

## Connecting providers

Connect providers from within the app using **read-only** credentials. Least-privilege is recommended everywhere.

| Provider | Credentials | Suggested access |
|----------|-------------|------------------|
| **AWS** | Access key ID + secret (optional session token for temporary credentials) | Read-only on the services you scan |
| **GCP** | Service account JSON key | `Viewer` at project scope |
| **Azure** | Tenant ID, Client ID, Client Secret, Subscription ID | `Reader` at subscription/resource-group scope |
| **Kubernetes** | API server URL + bearer token, or discovered via cloud credentials (EKS/GKE/AKS) | Read access per cluster RBAC |

**Supported resources** span compute, networking, storage, databases & cache, security, content/API, and messaging across all four providers — plus core Kubernetes workloads (Deployments, StatefulSets, DaemonSets, Pods, Jobs, Services, Ingresses, ConfigMaps, Secrets, PVCs, and more).

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Run backend + frontend locally |
| `npm run dev:server` | Run the backend only |
| `npm run dev:client` | Run the frontend only |
| `npm run build` | Build both workspaces |
| `npm run start` | Start the production backend (after build) |

## Data & storage

InfraPulse uses SQLite for local persistence. The database is created automatically at `server/infrapulse.db` and migrations are applied on startup. Override the location with `DB_PATH` (full path) or `DATA_DIR` (directory).

> Keep `.env`, database files, API keys, and cloud credentials out of version control.

## Project structure

```text
.
├── client/   # React + Vite frontend
├── server/   # Express + TypeScript backend (db/, aws/, gcp/, azure/, kubernetes/, chatbot/)
└── package.json
```

## License

MIT — see [LICENSE](LICENSE).
