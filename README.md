# Truffe.info

Collective database of online scam information in Italy.

Open source project built with [Astro](https://astro.build) + PostgreSQL. Replaces the previous Next.js + Directus + Jotform stack.

**Codebase language:** English  
**User-facing content:** Italian

## Features

- Guides on common scams (static markdown)
- Multi-step scam report form with file uploads
- Legal declarations and submission metadata storage (IP, user agent)
- Content moderation workflow with email notifications
- Notice-and-takedown content reporting

## Local development

```bash
cp .env.example .env
docker compose up -d postgresql
npm install
npm run dev
```

Open http://localhost:4321

## Production with Docker

```bash
docker compose up -d
```

## Deploy

Pushing a `v*` tag (e.g. `v2.0.0`) triggers the GitHub Action that:

1. Builds and publishes the image to Docker Hub (`darioguarascio/truffe.info`)
2. Generates `docker-compose.prod.yml` from the template
3. Deploys via SSH to the production server

### Required GitHub secrets

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `DEPLOY_HOST` | Server hostname/IP |
| `DEPLOY_USER` | SSH username |
| `DEPLOY_SSH_KEY` | SSH private key |
| `DEPLOY_PORT` | SSH port (default: 22) |
| `DEPLOY_PATH` | Deploy path on server (e.g. `/opt/truffe.info`) |
| `POSTGRES_USER` | PostgreSQL user |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `POSTGRES_DB` | Database name (default: `truffe`) |
| `POSTGRES_HOST` | PostgreSQL host |
| `POSTGRES_PORT` | PostgreSQL port (default: `5432`) |
| `APP_PORT` | Host port binding for Docker (production: `127.0.0.1:8012`) |
| `SMTP_HOST` | SMTP server |
| `SMTP_PORT` | SMTP port (default: `587`) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASSWORD` | SMTP password |
| `SMTP_FROM` | Sender address (default: `noreply@truffe.info`) |
| `ADMIN_EMAIL` | Admin notification email |
| `ADMIN_TOKEN` | Bearer token for moderation API |

## Moderation API

```bash
# Reject or remove a story
curl -X PATCH https://truffe.info/api/admin/moderation \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_type":"story","id":1,"status":"rejected","notes":"Contains personal data"}'

# Resolve a content report
curl -X PATCH https://truffe.info/api/admin/moderation \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_type":"content","id":1,"status":"resolved","notes":"Content removed"}'
```

Story statuses: `approved` | `rejected` | `removed`  
Content report statuses: `resolved` | `dismissed`

## License

MIT — see [LICENSE](LICENSE)
