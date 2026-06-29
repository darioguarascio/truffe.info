# Truffe.info

Database collettivo di informazioni sulle truffe online in Italia.

Progetto open source: [Astro](https://astro.build) + PostgreSQL. Sostituisce la precedente stack Next.js + Directus + Jotform.

## Funzionalità

- Guide sulle truffe più comuni (markdown statico)
- Modulo multi-step per segnalare truffe con allegati
- Dichiarazione di responsabilità e conservazione metadati legali (IP, user agent)
- Database truffatori (in costruzione dalle segnalazioni)

## Sviluppo locale

```bash
cp .env.example .env
docker compose up -d postgresql
npm install
npm run dev
```

Apri http://localhost:4321

## Produzione con Docker

```bash
docker compose up -d
```

## Deploy

Il push di un tag `v*` (es. `v2.0.0`) attiva la GitHub Action che:

1. Costruisce e pubblica l'immagine su Docker Hub (`darioguarascio/truffe.info`)
2. Genera `docker-compose.prod.yml` dal template
3. Deploy via SSH sul server di produzione

### Secrets GitHub richiesti

| Secret | Descrizione |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Username Docker Hub |
| `DOCKERHUB_TOKEN` | Token Docker Hub |
| `DEPLOY_HOST` | Hostname/IP del server |
| `DEPLOY_USER` | Username SSH |
| `DEPLOY_SSH_KEY` | Chiave SSH privata |
| `DEPLOY_PORT` | Porta SSH (default 22) |
| `DEPLOY_PATH` | Path sul server (es. `/opt/truffe.info`) |
| `POSTGRES_USER` | User PostgreSQL produzione |
| `POSTGRES_PASSWORD` | Password PostgreSQL produzione |
| `POSTGRES_DB` | Nome database (default: truffe) |
| `APP_PORT` | Porta esposta (default: 4321) |

## Licenza

MIT — vedi [LICENSE](LICENSE)
